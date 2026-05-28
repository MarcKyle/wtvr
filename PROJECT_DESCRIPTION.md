# Project Description

A detailed specification for a secure, role-based web application built with React + TypeScript (Vite) on the frontend and a MySQL-backed backend. This document expands the original brief into concrete requirements, architecture, and standard configurations.

---

## 1. Project Overview

In this project, students will develop a simple but secure system that demonstrates the security concepts learned during the whole period, including:

- **Authentication** — verifying user identity using credentials and secure session/token handling.
- **Authorization** — granting or denying access to features based on user roles.
- **Database Security** — protecting stored data with hashing, parameterized queries, and least-privilege accounts.
- **Input Validation** — sanitizing and validating all user-supplied data on both client and server.
- **Activity Monitoring** — recording user actions and security events for auditing.

The system must allow users to log in securely and access features based on their assigned role.

---

## 2. Project Objectives

By completing this project, students should be able to:

- ✓ Create a functional login system
- ✓ Apply role-based access control (RBAC)
- ✓ Secure user credentials and inputs
- ✓ Connect and manage a MySQL database
- ✓ Implement basic security practices (hashing, HTTPS, CSRF/XSS protection, audit logging)

---

## 3. Tech Stack

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite                  |
| Styling      | CSS (App.css, index.css)                    |
| Linting      | ESLint (flat config)                        |
| Backend      | Node.js + Express (recommended)             |
| Database     | **MySQL 8.x**                               |
| Auth         | bcrypt for password hashing, JWT or session cookies |
| Validation   | Zod or express-validator                    |
| ORM / Query  | Prisma, Sequelize, or `mysql2` with prepared statements |
| Logging      | Winston or Pino                             |

---

## 4. User Roles

At minimum, the system should support three roles:

| Role     | Description                                                      |
| -------- | ---------------------------------------------------------------- |
| `admin`  | Full access: manage users, view audit logs, change roles.        |
| `user`   | Limited access: view and edit only their own profile/data.       |

Role enforcement must happen on the **server**. Frontend role checks are for UX only.

---

## 5. Functional Requirements

### 5.1 Authentication
- Registration with email + strong password (min 8 chars, mixed case, number, symbol).
- Login with email and password.
- Logout invalidates the session/token.
- Account lockout after 5 failed attempts within 15 minutes.
- Optional: password reset via emailed time-limited token.

### 5.2 Authorization
- Every protected route checks the authenticated user's role server-side.
- Middleware-based RBAC, e.g. `requireRole('admin')`.
- Return `401` for unauthenticated and `403` for forbidden access.

### 5.3 Database Security
- Passwords stored using **bcrypt** with cost factor ≥ 12.
- Use **prepared statements / parameterized queries** for every SQL call.
- Database user has only the privileges it needs (no `GRANT ALL` in production).
- Sensitive columns (e.g., tokens) stored hashed where feasible.

### 5.4 Input Validation
- Validate all inputs on the server (never trust the client).
- Reject unknown fields; enforce types, lengths, and formats.
- Escape output rendered in HTML to prevent XSS.
- Use CSRF tokens for cookie-based sessions.

### 5.5 Activity Monitoring
- Log security-relevant events: login success/failure, logout, role changes, permission denials, data mutations.
- Each log entry: timestamp, user id, action, IP address, user-agent, outcome.
- Admin UI to view and filter recent events.

---

## 6. Database Schema (MySQL)

```sql
CREATE DATABASE IF NOT EXISTS secure_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE secure_app;

CREATE TABLE roles (
  id           INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(32) NOT NULL UNIQUE,
  description  VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE users (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role_id         INT UNSIGNED NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE sessions (
  id          CHAR(36) PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
                              ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
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

INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access'),
  ('user',  'Limited self access');
```

---

## 7. Standard Configuration

### 7.1 Environment Variables (`.env`)

```env
# App
NODE_ENV=development
PORT=3000
CLIENT_ORIGIN=http://localhost:5173

# MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=secure_app
DB_USER=secure_app_user
DB_PASSWORD=change_me_strong_password
DB_CONNECTION_LIMIT=10

# Auth
JWT_SECRET=replace_with_64_char_random_string
JWT_EXPIRES_IN=1h
BCRYPT_COST=12
SESSION_COOKIE_NAME=sid
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAMESITE=lax

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

> Never commit `.env`. Add it to `.gitignore` and provide a sanitized `.env.example`.

### 7.2 MySQL Connection Pool (`mysql2`)

```ts
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
  multipleStatements: false,
  namedPlaceholders: true,
});
```

### 7.3 Recommended Least-Privilege MySQL User

```sql
CREATE USER 'secure_app_user'@'%' IDENTIFIED BY 'change_me_strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON secure_app.* TO 'secure_app_user'@'%';
FLUSH PRIVILEGES;
```

### 7.4 Frontend (Vite) Proxy Example

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
```

---

## 8. Project Structure (Suggested)

```
wtvr/
├── public/
├── src/                  # React + TS frontend
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   └── lib/api.ts        # fetch wrapper for /api
├── server/               # Node + Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/   # auth, rbac, rateLimit, validation
│   │   ├── db/           # pool, migrations, queries
│   │   ├── services/
│   │   └── utils/logger.ts
│   └── migrations/
├── .env.example
├── package.json
└── README.md
```

---

## 9. Security Checklist

- [ ] Passwords hashed with bcrypt (cost ≥ 12).
- [ ] All SQL via prepared statements.
- [ ] Server-side input validation on every endpoint.
- [ ] HTTPS enforced in production; secure, HttpOnly, SameSite cookies.
- [ ] CSRF protection for cookie-based sessions.
- [ ] Helmet middleware for HTTP security headers.
- [ ] Rate limiting on auth endpoints.
- [ ] Account lockout after repeated failures.
- [ ] Secrets stored in environment variables, not in source.
- [ ] Audit logs written for all sensitive actions.
- [ ] Dependencies kept current; `npm audit` clean.

---

## 10. Deliverables

1. Working application (frontend + backend) runnable locally.
2. MySQL schema script and seed data.
3. `.env.example` with all required variables.
4. Short report covering implemented security controls and known limitations.
5. Demo credentials for each role.
