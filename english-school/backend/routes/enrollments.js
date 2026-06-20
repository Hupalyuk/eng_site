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
  let client;
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

    client = await pool.connect();
    await client.query('BEGIN');

    const groupsResult = await client.query(
      `SELECT cg.id, cg.group_number, cg.name, cg.member_count,
              teacher.name AS teacher_name, teacher.email AS teacher_email
       FROM course_groups cg
       LEFT JOIN users teacher ON teacher.id = cg.teacher_id
       WHERE cg.course_code = $1 AND cg.year = $2 AND cg.days_key = $3 AND cg.times_key = $4 AND cg.member_count < 5
       ORDER BY cg.group_number ASC
       LIMIT 1
       FOR UPDATE OF cg`,
      [courseCode, year2, daysKey, timesKey]
    );

    let groupId;
    let groupName;
    let teacherName = '';
    let teacherEmail = '';

    if (groupsResult.rows.length > 0) {
      groupId = groupsResult.rows[0].id;
      groupName = groupsResult.rows[0].name;
      teacherName = groupsResult.rows[0].teacher_name || '';
      teacherEmail = groupsResult.rows[0].teacher_email || '';
    } else {
      const lastGroupResult = await client.query(
        `SELECT group_number
         FROM course_groups
         WHERE course_code = $1 AND year = $2
         ORDER BY group_number DESC
         LIMIT 1
         FOR UPDATE`,
        [courseCode, year2]
      );

      const lastNumber = Number(lastGroupResult?.rows?.[0]?.group_number || 0);
      const nextNumber = lastNumber + 1;
      groupName = formatGroupName(courseCode, nextNumber, year2);

      const insertGroupResult = await client.query(
        `INSERT INTO course_groups (course_code, year, group_number, name, days_key, times_key, member_count)
         VALUES ($1, $2, $3, $4, $5, $6, 0)
         RETURNING id`,
        [courseCode, year2, nextNumber, groupName, daysKey, timesKey]
      );

      groupId = insertGroupResult.rows[0].id;
    }

    await client.query(
      `INSERT INTO course_group_members (group_id, user_id, full_name, phone, email, status)
       VALUES ($1, $2, $3, $4, $5, 'new')`,
      [groupId, req.session.userId, safeName, safePhone, safeEmail]
    );

    await client.query('COMMIT');
    res.status(201).json({
      ok: true,
      status: 'new',
      pendingGroup: {
        id: groupId,
        name: groupName,
        course: courseCode.toUpperCase(),
        year: year2,
        teacherName,
        teacherEmail,
      },
      teacher: teacherName ? { name: teacherName, email: teacherEmail } : null,
    });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
    }
    next(error);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
