-- PostgreSQL schema (run inside your database, e.g. english_school)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(120) NOT NULL DEFAULT 'student',
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);

CREATE TABLE IF NOT EXISTS course_groups (
  id BIGSERIAL PRIMARY KEY,
  course_code VARCHAR(32) NOT NULL,
  year SMALLINT NOT NULL,
  group_number INTEGER NOT NULL,
  name VARCHAR(64) NOT NULL UNIQUE,
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
  full_name VARCHAR(190) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(190) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_group_members_group_id
ON course_group_members (group_id);


SELECT * FROM users;
SELECT * FROM course_groups;
SELECT * FROM course_group_members;
