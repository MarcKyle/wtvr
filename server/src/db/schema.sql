-- WTVR schema. Aligns with PROJECT_DESCRIPTION.md §6.
-- The "exactly one admin" rule is enforced at the application layer
-- (see src/db/seed.ts and the registration handler, which forbids the
-- `admin` role at sign-up).

CREATE TABLE IF NOT EXISTS roles (
  id           INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(32) NOT NULL UNIQUE,
  description  VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role_id         INT UNSIGNED NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME NULL,
  display_name    VARCHAR(100) NULL,
  bio             TEXT NULL,
  website         VARCHAR(255) NULL,
  location        VARCHAR(100) NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_role (role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  id          CHAR(36) PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
                              ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activity_logs (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,
  action      VARCHAR(64) NOT NULL,
  detail      JSON NULL,
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  outcome     ENUM('success','failure') NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_logs_user (user_id),
  INDEX idx_logs_created (created_at),
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
                          ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS posts (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  author_id   INT UNSIGNED NOT NULL,
  title       VARCHAR(160) NOT NULL,
  body        TEXT NOT NULL,
  status      ENUM('draft','published','hidden') NOT NULL DEFAULT 'draft',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
              ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_author FOREIGN KEY (author_id) REFERENCES users(id)
                             ON DELETE CASCADE,
  INDEX idx_posts_author (author_id),
  INDEX idx_posts_status_created (status, created_at)
) ENGINE=InnoDB;

INSERT IGNORE INTO roles (name, description) VALUES
  ('admin',  'Full access. Exactly one admin exists in the system.'),
  ('author', 'Registered user who can create, edit, and delete own posts.'),
  ('reader', 'Registered user who can browse and read posts.');
