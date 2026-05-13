require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MySQLStoreFactory = require('express-mysql-session');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { pool, ensureCourseEnrollmentTables } = require('./db');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const enrollmentsRoutes = require('./routes/enrollments');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

const MySQLStore = MySQLStoreFactory(session);
const sessionStore = new MySQLStore(
  {
    clearExpired: true,
    checkExpirationInterval: 60 * 1000,
    expiration: 1000 * 60 * 60 * 24 * 7,
  },
  pool
);

app.use(
  session({
    key: process.env.SESSION_COOKIE_NAME || 'sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
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


console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
