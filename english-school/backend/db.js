const { Pool } = require('pg');
require('dotenv').config();

function toPgConfigFromUrl(connectionString) {
  const parsed = new URL(connectionString);
  const database = parsed.pathname.replace(/^\//, '');
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 5432),
    user: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    database,
  };
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const shouldUseSsl =
  process.env.PGSSLMODE === 'require' ||
  (hasDatabaseUrl && process.env.PGSSLMODE !== 'disable');

const baseConfig = hasDatabaseUrl
  ? toPgConfigFromUrl(process.env.DATABASE_URL)
  : {
      host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
      user: process.env.PGUSER || process.env.DB_USER || 'postgres',
      password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
      database: process.env.PGDATABASE || process.env.DB_NAME || 'english_school',
      port: Number(process.env.PGPORT || process.env.DB_PORT || 5432),
    };

const pool = new Pool({
  ...baseConfig,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

async function ensureCourseEnrollmentTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      role VARCHAR(120) NOT NULL DEFAULT 'student',
      name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS teacher_status VARCHAR(32) NOT NULL DEFAULT 'none';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      image_url VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_posts_user_id
    ON posts (user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_groups (
      id BIGSERIAL PRIMARY KEY,
      course_code VARCHAR(32) NOT NULL,
      year SMALLINT NOT NULL,
      group_number INTEGER NOT NULL,
      name VARCHAR(64) NOT NULL UNIQUE,
      meet_link TEXT,
      meet_space_name TEXT,
      days_key VARCHAR(64) NOT NULL,
      times_key VARCHAR(128) NOT NULL,
      member_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (course_code, year, group_number)
    );
  `);

  await pool.query(`
    ALTER TABLE course_groups
    ADD COLUMN IF NOT EXISTS meet_link TEXT;
  `);

  await pool.query(`
    ALTER TABLE course_groups
    ADD COLUMN IF NOT EXISTS meet_space_name TEXT;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_course_groups_schedule
    ON course_groups (course_code, year, days_key, times_key, member_count);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_group_members (
      id BIGSERIAL PRIMARY KEY,
      group_id BIGINT NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
      user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
      full_name VARCHAR(190) NOT NULL,
      phone VARCHAR(32) NOT NULL,
      email VARCHAR(190) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE course_group_members
    ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_course_group_members_group_id
    ON course_group_members (group_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_course_group_members_user_id
    ON course_group_members (user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_google_tokens (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_events (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(190) NOT NULL,
      description TEXT,
      location TEXT,
      meet_link TEXT,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      google_event_id VARCHAR(255),
      synced_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_class_events_user_start
    ON class_events (user_id, start_at);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS class_materials (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_mime VARCHAR(190),
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_class_materials_created
    ON class_materials (created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teacher_documents (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_url TEXT NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_mime VARCHAR(190),
      file_size BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_teacher_documents_user_id
    ON teacher_documents (user_id);
  `);
}

module.exports = { pool, ensureCourseEnrollmentTables };
