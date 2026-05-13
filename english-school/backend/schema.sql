CREATE DATABASE IF NOT EXISTS english_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE english_school;

SELECT * FROM english_school.posts;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  role VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_posts_user_id (user_id),
  CONSTRAINT fk_posts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_groups (
  id INT NOT NULL AUTO_INCREMENT,
  course_code VARCHAR(32) NOT NULL,
  year SMALLINT NOT NULL,
  group_number INT NOT NULL,
  name VARCHAR(64) NOT NULL,
  days_key VARCHAR(64) NOT NULL,
  times_key VARCHAR(128) NOT NULL,
  member_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_course_groups_name (name),
  UNIQUE KEY uq_course_groups_course_year_number (course_code, year, group_number),
  INDEX idx_course_groups_schedule (course_code, year, days_key, times_key, member_count)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS course_group_members (
  id INT NOT NULL AUTO_INCREMENT,
  group_id INT NOT NULL,
  full_name VARCHAR(190) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  email VARCHAR(190) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_course_group_members_group_id (group_id),
  CONSTRAINT fk_course_group_members_group_id
    FOREIGN KEY (group_id) REFERENCES course_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB;
