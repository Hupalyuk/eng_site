const express = require('express');
const { pool } = require('../db');
const { requireAuth, withUser, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, withUser, requireRole('admin'));

const DAY_VALUES = new Set(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
const TIME_VALUES = new Set(['09:00', '11:00', '13:00', '15:00', '17:00', '19:00']);

const toInt = (value, fallback, { min = 1, max = 100 } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const toYear2 = (date = new Date()) => Number(String(date.getFullYear()).slice(-2));

const normalizeListKey = (value, allowedValues) => {
  const parts = Array.isArray(value) ? value : String(value || '').split(',');
  return Array.from(new Set(parts))
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => allowedValues.has(item))
    .sort()
    .join(',');
};

const splitPostText = (text = '') => {
  const normalized = String(text).replace(/\r\n/g, '\n');
  const [rawTitle = '', ...rest] = normalized.split('\n');
  const title = rawTitle.replace(/\s+/g, ' ').trim();
  const description = rest.join('\n').replace(/\s+/g, ' ').trim();
  return { title, description };
};

async function logAdminAction(adminId, action, entityType, entityId, details = {}) {
  await pool.query(
    `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [adminId, action, entityType, entityId || null, JSON.stringify(details || {})]
  );
}

async function countTable(query, values = []) {
  const result = await pool.query(query, values);
  return Number(result.rows[0]?.count || 0);
}

async function getNextGroupNumber(courseCode, year) {
  const result = await pool.query(
    `SELECT COALESCE(MAX(group_number), 0) + 1 AS next_number
     FROM course_groups
     WHERE course_code = $1 AND year = $2`,
    [courseCode, year]
  );
  return Number(result.rows[0]?.next_number || 1);
}

router.get('/stats', async (req, res, next) => {
  try {
    const [
      users,
      students,
      teachers,
      pendingTeachers,
      enrollments,
      pendingEnrollments,
      groups,
      posts,
      hiddenPosts,
    ] = await Promise.all([
      countTable('SELECT COUNT(*) FROM users'),
      countTable("SELECT COUNT(*) FROM users WHERE role = 'student'"),
      countTable("SELECT COUNT(*) FROM users WHERE role = 'teacher'"),
      countTable("SELECT COUNT(*) FROM users WHERE teacher_status = 'pending'"),
      countTable('SELECT COUNT(*) FROM course_group_members'),
      countTable("SELECT COUNT(*) FROM course_group_members WHERE status = 'new'"),
      countTable('SELECT COUNT(*) FROM course_groups'),
      countTable('SELECT COUNT(*) FROM posts'),
      countTable("SELECT COUNT(*) FROM posts WHERE status = 'hidden'"),
    ]);

    res.json({
      users,
      students,
      teachers,
      pendingTeachers,
      enrollments,
      pendingEnrollments,
      groups,
      posts,
      hiddenPosts,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/teachers', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE role = 'teacher' AND teacher_status = 'approved'
       ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const status = String(req.query.status || '').trim();
    const blocked = String(req.query.blocked || '').trim();
    const page = toInt(req.query.page, 1, { max: 100000 });
    const limit = toInt(req.query.limit, 12, { max: 100 });
    const offset = (page - 1) * limit;

    const clauses = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length})`);
    }

    if (role && role !== 'all') {
      values.push(role);
      clauses.push(`role = $${values.length}`);
    }

    if (status && status !== 'all') {
      values.push(status);
      clauses.push(`teacher_status = $${values.length}`);
    }

    if (blocked === 'true' || blocked === 'false') {
      values.push(blocked === 'true');
      clauses.push(`is_blocked = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM users ${where}`, values);
    const total = Number(countResult.rows[0]?.count || 0);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT id, name, email, role, is_blocked, teacher_status, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({ items: result.rows, total, page, limit });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/documents', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const docs = await pool.query(
      `SELECT id, file_url, file_name, file_mime, file_size, created_at
       FROM teacher_documents
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(docs.rows);
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    const { name, email, role, is_blocked } = req.body;
    const allowedRoles = ['admin', 'teacher', 'student'];

    if (!name || !email || !allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid payload.' });
    }

    if (req.user.id === userId && is_blocked === true) {
      return res.status(400).json({ error: 'Admin cannot block own account.' });
    }

    const result = await pool.query(
      `UPDATE users
       SET name = $1, email = $2, role = $3, is_blocked = $4,
           teacher_status = CASE
             WHEN $3 = 'teacher' AND teacher_status = 'none' THEN 'approved'
             WHEN $3 <> 'teacher' THEN 'none'
             ELSE teacher_status
           END
       WHERE id = $5
       RETURNING id, name, email, role, is_blocked, teacher_status, created_at`,
      [name, email, role, Boolean(is_blocked), userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await logAdminAction(req.user.id, 'user.update', 'user', userId, { name, email, role, is_blocked });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already in use.' });
    }
    next(error);
  }
});

router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const blocked = Boolean(req.body?.blocked);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (req.user.id === userId && blocked) {
      return res.status(400).json({ error: 'Admin cannot block own account.' });
    }

    const result = await pool.query(
      'UPDATE users SET is_blocked = $1 WHERE id = $2 RETURNING id, is_blocked',
      [blocked, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await logAdminAction(req.user.id, blocked ? 'user.block' : 'user.unblock', 'user', userId, { blocked });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Admin cannot delete own account.' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await logAdminAction(req.user.id, 'user.delete', 'user', userId);
    res.json({ ok: true, id: userId });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/teacher-status', async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { decision } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be approved or rejected.' });
    }

    const role = decision === 'approved' ? 'teacher' : 'student';

    const result = await pool.query(
      `UPDATE users
       SET teacher_status = $1, role = $2
       WHERE id = $3
       RETURNING id, name, email, role, teacher_status, is_blocked, created_at`,
      [decision, role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    await logAdminAction(req.user.id, `teacher.${decision}`, 'user', userId, { decision });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.get('/enrollments', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const course = String(req.query.course || '').trim().toLowerCase();
    const page = toInt(req.query.page, 1, { max: 100000 });
    const limit = toInt(req.query.limit, 12, { max: 100 });
    const offset = (page - 1) * limit;

    const clauses = [];
    const values = [];
    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(cgm.full_name ILIKE $${values.length} OR cgm.email ILIKE $${values.length} OR cgm.phone ILIKE $${values.length})`);
    }
    if (status && status !== 'all') {
      values.push(status);
      clauses.push(`cgm.status = $${values.length}`);
    }
    if (course && course !== 'all') {
      values.push(course);
      clauses.push(`cg.course_code = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await pool.query(
      `SELECT COUNT(*)
       FROM course_group_members cgm
       JOIN course_groups cg ON cg.id = cgm.group_id
       ${where}`,
      values
    );
    const total = Number(countResult.rows[0]?.count || 0);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT cgm.id, cgm.group_id, cgm.user_id, cgm.full_name, cgm.phone, cgm.email, cgm.status, cgm.admin_note,
              cgm.created_at, cg.name AS group_name, cg.course_code, cg.days_key, cg.times_key
       FROM course_group_members cgm
       JOIN course_groups cg ON cg.id = cgm.group_id
       ${where}
       ORDER BY cgm.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({ items: result.rows, total, page, limit });
  } catch (error) {
    next(error);
  }
});

router.patch('/enrollments/:id', async (req, res, next) => {
  let client;
  try {
    const enrollmentId = Number(req.params.id);
    const status = String(req.body?.status || '').trim();
    const adminNote = String(req.body?.adminNote || '').trim();

    if (!Number.isInteger(enrollmentId)) {
      return res.status(400).json({ error: 'Invalid enrollment id.' });
    }
    if (!['new', 'contacted', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid enrollment status.' });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const currentResult = await client.query(
      `SELECT id, group_id, status
       FROM course_group_members
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [enrollmentId]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Enrollment not found.' });
    }

    const current = currentResult.rows[0];
    if (current.status !== 'approved' && status === 'approved') {
      const updateGroup = await client.query(
        `UPDATE course_groups
         SET member_count = member_count + 1
         WHERE id = $1 AND member_count < 5`,
        [current.group_id]
      );
      if (updateGroup.rowCount !== 1) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Group is full. Create or choose another group.' });
      }
    }

    if (current.status === 'approved' && status !== 'approved') {
      await client.query(
        `UPDATE course_groups
         SET member_count = GREATEST(member_count - 1, 0)
         WHERE id = $1`,
        [current.group_id]
      );
    }

    const result = await client.query(
      `UPDATE course_group_members
       SET status = $1, admin_note = $2
       WHERE id = $3
       RETURNING id, group_id, full_name, phone, email, status, admin_note, created_at`,
      [status, adminNote || null, enrollmentId]
    );

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, details)
       VALUES ($1, 'enrollment.update', 'enrollment', $2, $3::jsonb)`,
      [req.user.id, enrollmentId, JSON.stringify({ from: current.status, to: status, adminNote })]
    );
    await client.query('COMMIT');
    res.json(result.rows[0]);
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

router.get('/groups', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT cg.id, cg.course_code, cg.year, cg.group_number, cg.name, cg.days_key, cg.times_key,
              cg.member_count, cg.meet_link, cg.teacher_id, cg.created_at,
              u.name AS teacher_name, u.email AS teacher_email,
              COUNT(cgm.id) FILTER (WHERE cgm.status = 'approved')::int AS actual_member_count
       FROM course_groups cg
       LEFT JOIN users u ON u.id = cg.teacher_id
       LEFT JOIN course_group_members cgm ON cgm.group_id = cg.id
       GROUP BY cg.id, u.name, u.email
       ORDER BY cg.created_at DESC, cg.name ASC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

router.post('/groups', async (req, res, next) => {
  try {
    const courseCode = String(req.body?.courseCode || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim();
    const daysKey = normalizeListKey(req.body?.daysKey, DAY_VALUES);
    const timesKey = normalizeListKey(req.body?.timesKey, TIME_VALUES);
    const meetLink = String(req.body?.meetLink || '').trim() || null;
    const teacherId = Number(req.body?.teacherId) || null;
    const year = toInt(req.body?.year, toYear2(), { min: 0, max: 99 });

    if (!courseCode || !daysKey || !timesKey) {
      return res.status(400).json({ error: 'Course, days, and times are required.' });
    }

    const groupNumber = await getNextGroupNumber(courseCode, year);
    const groupName = name || `${courseCode.toUpperCase()}-${String(groupNumber).padStart(2, '0')}-${String(year).padStart(2, '0')}`;

    const result = await pool.query(
      `INSERT INTO course_groups (course_code, year, group_number, name, days_key, times_key, meet_link, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, course_code, year, group_number, name, days_key, times_key, member_count, meet_link, teacher_id, created_at`,
      [courseCode, year, groupNumber, groupName, daysKey, timesKey, meetLink, teacherId]
    );

    await logAdminAction(req.user.id, 'group.create', 'group', result.rows[0].id, result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Group with this name or number already exists.' });
    }
    next(error);
  }
});

router.patch('/groups/:id', async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: 'Invalid group id.' });
    }

    const name = String(req.body?.name || '').trim();
    const courseCode = String(req.body?.courseCode || '').trim().toLowerCase();
    const daysKey = normalizeListKey(req.body?.daysKey, DAY_VALUES);
    const timesKey = normalizeListKey(req.body?.timesKey, TIME_VALUES);
    const meetLink = String(req.body?.meetLink || '').trim() || null;
    const teacherId = Number(req.body?.teacherId) || null;

    if (!name || !courseCode || !daysKey || !timesKey) {
      return res.status(400).json({ error: 'Name, course, days, and times are required.' });
    }

    const result = await pool.query(
      `UPDATE course_groups
       SET name = $1, course_code = $2, days_key = $3, times_key = $4, meet_link = $5, teacher_id = $6
       WHERE id = $7
       RETURNING id, course_code, year, group_number, name, days_key, times_key, member_count, meet_link, teacher_id, created_at`,
      [name, courseCode, daysKey, timesKey, meetLink, teacherId, groupId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    await logAdminAction(req.user.id, 'group.update', 'group', groupId, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Group with this name already exists.' });
    }
    next(error);
  }
});

router.delete('/groups/:id', async (req, res, next) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: 'Invalid group id.' });
    }

    const result = await pool.query('DELETE FROM course_groups WHERE id = $1 RETURNING id', [groupId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    await logAdminAction(req.user.id, 'group.delete', 'group', groupId);
    res.json({ ok: true, id: groupId });
  } catch (error) {
    next(error);
  }
});

router.get('/posts', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();
    const page = toInt(req.query.page, 1, { max: 100000 });
    const limit = toInt(req.query.limit, 12, { max: 100 });
    const offset = (page - 1) * limit;
    const clauses = [];
    const values = [];

    if (status && status !== 'all') {
      values.push(status);
      clauses.push(`p.status = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(p.content ILIKE $${values.length} OR u.name ILIKE $${values.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM posts p JOIN users u ON u.id = p.user_id ${where}`,
      values
    );
    const total = Number(countResult.rows[0]?.count || 0);
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT p.id, p.content, p.image_url, p.status, p.created_at, u.id AS user_id, u.name AS user_name
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    res.json({
      items: result.rows.map((row) => ({ ...row, ...splitPostText(row.content) })),
      total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/posts/:id', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const status = String(req.body?.status || '').trim();
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }
    if (!['published', 'hidden'].includes(status)) {
      return res.status(400).json({ error: 'Invalid post status.' });
    }

    const result = await pool.query(
      `UPDATE posts
       SET status = $1
       WHERE id = $2
       RETURNING id, status`,
      [status, postId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    await logAdminAction(req.user.id, 'post.status', 'post', postId, { status });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/posts/:id', async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }

    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [postId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    await logAdminAction(req.user.id, 'post.delete', 'post', postId);
    res.json({ ok: true, id: postId });
  } catch (error) {
    next(error);
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const page = toInt(req.query.page, 1, { max: 100000 });
    const limit = toInt(req.query.limit, 20, { max: 100 });
    const offset = (page - 1) * limit;
    const countResult = await pool.query('SELECT COUNT(*) FROM admin_audit_logs');
    const total = Number(countResult.rows[0]?.count || 0);
    const result = await pool.query(
      `SELECT aal.id, aal.action, aal.entity_type, aal.entity_id, aal.details, aal.created_at,
              u.name AS admin_name, u.email AS admin_email
       FROM admin_audit_logs aal
       LEFT JOIN users u ON u.id = aal.admin_id
       ORDER BY aal.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ items: result.rows, total, page, limit });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
