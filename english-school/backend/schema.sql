-- PostgreSQL schema (run inside your database, e.g. english_school)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(120) NOT NULL DEFAULT 'student',
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  teacher_status VARCHAR(32) NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts (status, created_at DESC);

CREATE TABLE IF NOT EXISTS course_groups (
  id BIGSERIAL PRIMARY KEY,
  course_code VARCHAR(32) NOT NULL,
  year SMALLINT NOT NULL,
  group_number INTEGER NOT NULL,
  name VARCHAR(64) NOT NULL UNIQUE,
  teacher_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  meet_link TEXT,
  meet_space_name TEXT,
  days_key VARCHAR(64) NOT NULL,
  times_key VARCHAR(128) NOT NULL,
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_code, year, group_number)
);

CREATE INDEX IF NOT EXISTS idx_course_groups_schedule
ON course_groups (course_code, year, days_key, times_key, member_count);

CREATE TABLE IF NOT EXISTS course_group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  full_name VARCHAR(190) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(190) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_group_members_group_id
ON course_group_members (group_id);

CREATE INDEX IF NOT EXISTS idx_course_group_members_user_id
ON course_group_members (user_id);

CREATE INDEX IF NOT EXISTS idx_course_group_members_status
ON course_group_members (status);

CREATE TABLE IF NOT EXISTS teacher_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_mime VARCHAR(190),
  file_size BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_documents_user_id
ON teacher_documents (user_id);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id BIGINT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created
ON admin_audit_logs (created_at DESC);

SELECT * FROM users;
SELECT * FROM course_groups;
SELECT * FROM course_group_members;
