# WTVR Server

Express + MySQL backend for the WTVR text blog. Implements the auth and RBAC
contract the React frontend in `../src` already calls (`/api/auth/{login,register,logout,me}`).

## Prerequisites

- Node.js 20+
- MySQL 8.x running locally (or reachable over the network)

## First-time setup

1. Copy env template and fill in real values.

   ```cmd
   copy .env.example .env
   ```

   At minimum, set `DB_PASSWORD`, `DB_ROOT_PASSWORD`, and the three
   `SEED_*_PASSWORD` values.

2. Install dependencies.

   ```cmd
   npm install
   ```

3. Create the database, the least-privilege app user, and the schema.
   This connects with `DB_ROOT_USER` / `DB_ROOT_PASSWORD`.

   ```cmd
   npm run db:setup
   ```

4. Seed the three predefined accounts (one admin, one author, one reader).

   ```cmd
   npm run db:seed
   ```

5. Start the API.

   ```cmd
   npm run dev
   ```

   The Vite dev server (`npm run dev` from the project root) proxies
   `/api/*` to `http://localhost:3000`.

## Predefined accounts

The seeder creates exactly three users from the `SEED_*` env vars. Defaults
in `.env.example`:

| Role   | Email                 | Notes                                   |
| ------ | --------------------- | --------------------------------------- |
| admin  | `admin@wtvr.local`    | Only one admin can exist in the system. |
| author | `author@wtvr.local`   | Demo author account.                    |
| reader | `reader@wtvr.local`   | Demo reader account.                    |

Re-running `npm run db:seed` is idempotent: existing rows are updated in
place, and the script refuses to run if a *second* admin row is detected.

## Why exactly one admin?

`PROJECT_DESCRIPTION.md` defines `admin` as the privileged role. The frontend
also blocks the `admin` option on the registration form, and the `/api/auth/register`
handler rejects `role: 'admin'` outright. The seeder is the only path that
provisions an admin, and it enforces the singleton invariant before and
after writing.

## Security notes

- Passwords hashed with bcrypt (cost 12 by default, configurable).
- All SQL via `mysql2` prepared statements (`pool.execute`) — no string
  interpolation of user input.
- Cookie sessions: `httpOnly`, `SameSite=lax`, `Secure` in production.
- Account lockout: 5 failed logins → 15-minute lock.
- Rate limit on `/api/auth/*`: 10 requests per 15-minute window per IP.
- Helmet for HTTP security headers; CORS scoped to `CLIENT_ORIGIN`.
- Audit log entries written for login (success/failure), logout, register,
  account locks, and registration role rejections.
- App MySQL user is granted only `SELECT, INSERT, UPDATE, DELETE` — no DDL.

## Layout

```
server/
├── src/
│   ├── config/env.ts            # typed env loader
│   ├── db/
│   │   ├── pool.ts              # mysql2 connection pool
│   │   ├── schema.sql           # tables + role seed
│   │   ├── setup.ts             # bootstrap: create DB + app user
│   │   ├── seed.ts              # creates the 3 predefined accounts
│   │   └── repositories/        # parameterized queries only
│   ├── middleware/auth.ts       # session resolver, RBAC guards
│   ├── middleware/validate.ts   # zod body validator
│   ├── routes/auth.ts           # /api/auth/*
│   ├── services/authService.ts  # login / register / logout core
│   ├── utils/logger.ts          # pino
│   └── index.ts                 # app + middleware wiring
├── .env.example
├── package.json
└── tsconfig.json
```
