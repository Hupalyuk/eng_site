require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { pool, ensureCourseEnrollmentTables } = require('./db');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const enrollmentsRoutes = require('./routes/enrollments');
const classRoutes = require('./routes/class');
const googleRoutes = require('./routes/google');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const normalizeOrigin = (value = '') => String(value).trim().replace(/\/+$/, '');
const allowAllOrigins = process.env.CORS_ALLOW_ALL === 'true';

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => normalizeOrigin(value))
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return true;
  if (allowAllOrigins) return true;

  return allowedOrigins.some((rule) => {
    if (rule.startsWith('*.')) {
      const domain = rule.slice(2);
      return normalized.endsWith(`.${domain}`);
    }

    return normalized === rule;
  });
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

const PgSession = require('connect-pg-simple')(session);
const sessionStore = new PgSession({
  pool,
  tableName: process.env.SESSION_TABLE_NAME || 'session',
  createTableIfMissing: true,
});

const sameSite = process.env.SESSION_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax');
const secureCookie = process.env.SESSION_SECURE === 'true' || process.env.NODE_ENV === 'production';

app.use(
  session({
    key: process.env.SESSION_COOKIE_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite,
      secure: secureCookie,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (error) {
    res.status(500).json({ ok: false, db: 'error' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/class', classRoutes);
app.use('/api/google', googleRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Auth server running on http://localhost:${PORT}`);
});

ensureCourseEnrollmentTables().catch((error) => {
  console.error('Failed to ensure course enrollment tables:', error);
});
