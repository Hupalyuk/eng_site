const express = require('express');
const { pool } = require('../db');
const { requireAuth, withUser, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, withUser, requireRole('admin'));

router.get('/users', async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const role = String(req.query.role || '').trim();
    const status = String(req.query.status || '').trim();

    const clauses = [];
    const values = [];

    if (search) {
      values.push(`%${search}%`);
      clauses.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length})`);
    }

    if (role) {
      values.push(role);
      clauses.push(`role = $${values.length}`);
    }

    if (status) {
      values.push(status);
      clauses.push(`teacher_status = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, name, email, role, is_blocked, teacher_status, created_at
       FROM users
       ${where}
       ORDER BY created_at DESC`,
      values
    );

    res.json(result.rows);
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

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
