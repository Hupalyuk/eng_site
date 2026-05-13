const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const DAYS = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const TIMES = new Set(['09:00', '11:00', '13:00', '15:00', '17:00', '19:00']);

const normalizeListKey = (values = []) =>
  Array.from(new Set(values))
    .map((v) => String(v).trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(',');

const toYear2 = (date = new Date()) => Number(String(date.getFullYear()).slice(-2));

const formatGroupName = (courseCode, groupNumber, year2) => {
  const num = String(groupNumber).padStart(2, '0');
  const yr = String(year2).padStart(2, '0');
  return `${courseCode.toUpperCase()}-${num}-${yr}`;
};

router.post('/', requireAuth, async (req, res, next) => {
  let connection;
  try {
    const { courseId, fullName, phone, email, days, times } = req.body || {};

    const courseCode = String(courseId || '').trim().toLowerCase();
    if (!courseCode) {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const safeName = String(fullName || '').trim();
    const safePhone = String(phone || '').trim();
    const safeEmail = String(email || '').trim().toLowerCase();

    if (!safeName) return res.status(400).json({ error: "fullName is required." });
    if (!safePhone) return res.status(400).json({ error: 'phone is required.' });
    if (!safeEmail) return res.status(400).json({ error: 'email is required.' });

    const daysArr = Array.isArray(days) ? days : [];
    const timesArr = Array.isArray(times) ? times : [];

    const daysKey = normalizeListKey(daysArr);
    const timesKey = normalizeListKey(timesArr);

    if (!daysKey) return res.status(400).json({ error: 'days is required.' });
    if (!timesKey) return res.status(400).json({ error: 'times is required.' });

    const daysOk = daysKey.split(',').every((d) => DAYS.has(d));
    const timesOk = timesKey.split(',').every((t) => TIMES.has(t));
    if (!daysOk) return res.status(400).json({ error: 'Invalid day value.' });
    if (!timesOk) return res.status(400).json({ error: 'Invalid time value.' });

    const year2 = toYear2(new Date());

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [groups] = await connection.query(
      `SELECT id, group_number, name, member_count
       FROM course_groups
       WHERE course_code = ? AND year = ? AND days_key = ? AND times_key = ? AND member_count < 5
       ORDER BY group_number ASC
       LIMIT 1
       FOR UPDATE`,
      [courseCode, year2, daysKey, timesKey]
    );

    let groupId;
    let groupName;

    if (groups.length > 0) {
      groupId = groups[0].id;
      groupName = groups[0].name;
    } else {
      const [maxRows] = await connection.query(
        `SELECT COALESCE(MAX(group_number), 0) AS max_number
         FROM course_groups
         WHERE course_code = ? AND year = ?
         FOR UPDATE`,
        [courseCode, year2]
      );

      const nextNumber = Number(maxRows?.[0]?.max_number || 0) + 1;
      groupName = formatGroupName(courseCode, nextNumber, year2);

      const [insertGroupResult] = await connection.query(
        `INSERT INTO course_groups (course_code, year, group_number, name, days_key, times_key, member_count)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [courseCode, year2, nextNumber, groupName, daysKey, timesKey]
      );

      groupId = insertGroupResult.insertId;
    }

    await connection.query(
      `INSERT INTO course_group_members (group_id, full_name, phone, email)
       VALUES (?, ?, ?, ?)`,
      [groupId, safeName, safePhone, safeEmail]
    );

    const [updateResult] = await connection.query(
      `UPDATE course_groups
       SET member_count = member_count + 1
       WHERE id = ? AND member_count < 5`,
      [groupId]
    );

    if (updateResult.affectedRows !== 1) {
      throw new Error('Group is full. Please try again.');
    }

    await connection.commit();
    res.status(201).json({
      ok: true,
      group: { id: groupId, name: groupName, course: courseCode.toUpperCase(), year: year2 },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // ignore
      }
    }
    next(error);
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
