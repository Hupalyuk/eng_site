CREATE DATABASE IF NOT EXISTS english_school CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE english_school;

CREATE TABLE IF NOT EXISTS users (
  id INT NOT NULL AUTO_INCREMENT,
  role VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

ALTER TABLE users 
MODIFY role VARCHAR(20) NOT NULL DEFAULT 'user';

select * from users;

-- drop database english_school;
-- express-mysql-session will create its own table named `sessions` automatically.
