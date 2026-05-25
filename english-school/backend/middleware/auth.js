function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

async function withUser(req, res, next) {
  const { pool } = require('../db');

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await pool.query(
      'SELECT id, role, name, email, is_blocked, teacher_status FROM users WHERE id = $1 LIMIT 1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = result.rows[0];

    if (req.user.is_blocked) {
      return res.status(403).json({ error: 'Account is blocked.' });
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAuth, requireRole, withUser };
