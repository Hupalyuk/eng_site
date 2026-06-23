const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth, withUser } = require('../middleware/auth');
const { saveUploadedFile } = require('../lib/storage');

const router = express.Router();

const uploadTeacherDocs = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 },
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return EMAIL_PATTERN.test(value);
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a full email address, for example name@gmail.com.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (role, name, email, password_hash, teacher_status) VALUES ('student', $1, $2, $3, 'none') RETURNING id, role",
      [name, email, passwordHash]
    );

    const userId = result.rows[0].id;
    const role = result.rows[0].role;
    req.session.userId = userId;
    res.status(201).json({ id: userId, name, email, role, teacher_status: 'none' });
  } catch (error) {
    next(error);
  }
});

router.post('/register-teacher', uploadTeacherDocs.array('documents', 5), async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = normalizeEmail(req.body?.email);

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a full email address, for example name@gmail.com.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one document is required for teacher registration.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await pool.query(
      "INSERT INTO users (role, name, email, password_hash, teacher_status) VALUES ('teacher', $1, $2, $3, 'pending') RETURNING id, role, teacher_status",
      [name, email, passwordHash]
    );

    const user = userResult.rows[0];

    for (const file of req.files) {
      const storedFile = await saveUploadedFile(file, { folder: 'teacher-docs' });
      await pool.query(
        `INSERT INTO teacher_documents (user_id, file_url, file_name, file_mime, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          user.id,
          storedFile.url,
          file.originalname,
          file.mimetype,
          file.size,
        ]
      );
    }

    req.session.userId = user.id;
    res.status(201).json({
      id: user.id,
      role: user.role,
      name,
      email,
      teacher_status: user.teacher_status,
      message: 'Teacher application submitted and awaiting admin review.',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT id, role, name, email, password_hash, is_blocked, teacher_status FROM users WHERE email = $1 LIMIT 1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked by administrator.' });
    }

    req.session.userId = user.id;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacher_status: user.teacher_status,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie(process.env.SESSION_COOKIE_NAME || 'sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, withUser, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
