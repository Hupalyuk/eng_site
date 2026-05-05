const path = require('path');
const express = require('express');
const multer = require('multer');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed.'));
    }
    cb(null, true);
  },
});

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.id, p.content, p.image_url, p.created_at, u.id AS user_id, u.name AS user_name
       FROM posts p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC`
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
      [req.session.userId, content.trim(), imageUrl]
    );

    const [rows] = await pool.query(
      `SELECT p.id, p.content, p.image_url, p.created_at, u.id AS user_id, u.name AS user_name
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ? LIMIT 1`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const { content, remove_image: removeImage } = req.body;

    if (!postId) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, user_id, image_url FROM posts WHERE id = ? LIMIT 1',
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (rows[0].user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    const shouldRemoveImage =
      !req.file && (removeImage === true || removeImage === 'true' || removeImage === '1');

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : shouldRemoveImage ? null : rows[0].image_url;

    await pool.query(
      'UPDATE posts SET content = ?, image_url = ? WHERE id = ?',
      [content.trim(), imageUrl, postId]
    );

    const [updatedRows] = await pool.query(
      `SELECT p.id, p.content, p.image_url, p.created_at, u.id AS user_id, u.name AS user_name
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = ? LIMIT 1`,
      [postId]
    );

    res.json(updatedRows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);

    if (!postId) {
      return res.status(400).json({ error: 'Invalid post id.' });
    }

    const [rows] = await pool.query(
      'SELECT id, user_id FROM posts WHERE id = ? LIMIT 1',
      [postId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    if (rows[0].user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Forbidden.' });
    }

    await pool.query('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
