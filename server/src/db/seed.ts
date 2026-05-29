// Seeds the three predefined accounts: one admin, one author, one reader.
// Idempotent: re-running will not create duplicate users and will refuse to
// create a second admin if one already exists with a different email.
import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import { env, isProd } from '../config/env.js'
import { pool } from './pool.js'

type RoleRow = RowDataPacket & { id: number; name: string }
type UserRow = RowDataPacket & { id: number; email: string; role_id: number }

async function getRoleId(name: 'admin' | 'author' | 'reader'): Promise<number> {
  const [rows] = await pool.execute<RoleRow[]>(
    'SELECT id, name FROM roles WHERE name = ? LIMIT 1',
    [name],
  )
  const row = rows[0]
  if (!row) {
    throw new Error(`Missing role '${name}'. Run db:setup first.`)
  }
  return row.id
}

async function upsertUser(opts: {
  email: string
  password: string
  roleId: number
  label: string
}): Promise<void> {
  const { email, password, roleId, label } = opts

  if (!password || password.length < 8) {
    throw new Error(
      `Refusing to seed ${label}: password is empty or too short. Set SEED_${label.toUpperCase()}_PASSWORD.`,
    )
  }

  const [existing] = await pool.execute<UserRow[]>(
    'SELECT id, email, role_id FROM users WHERE email = ? LIMIT 1',
    [email],
  )
  const hash = await bcrypt.hash(password, env.auth.bcryptCost)

  if (existing[0]) {
    await pool.execute(
      `UPDATE users
         SET password_hash = ?, role_id = ?, is_active = 1,
             failed_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [hash, roleId, existing[0].id],
    )
    console.log(`= ${label.padEnd(6)} ${email} (updated)`)
  } else {
    await pool.execute(
      `INSERT INTO users (email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, 1)`,
      [email, hash, roleId],
    )
    console.log(`+ ${label.padEnd(6)} ${email} (created)`)
  }
}

async function ensureSingleAdmin(adminRoleId: number, adminEmail: string) {
  const [admins] = await pool.execute<UserRow[]>(
    'SELECT id, email, role_id FROM users WHERE role_id = ?',
    [adminRoleId],
  )

  const others = admins.filter((a) => a.email !== adminEmail)
  if (others.length > 0) {
    const list = others.map((a) => `${a.id}:${a.email}`).join(', ')
    throw new Error(
      `Refusing to seed: another admin already exists (${list}). ` +
        `WTVR allows exactly one admin. Remove the extra row or update SEED_ADMIN_EMAIL.`,
    )
  }
}

async function main() {
  if (isProd) {
    const weak = ['change_me', 'changeme', 'password', 'admin', 'adm1n!changeme']
    for (const [k, v] of Object.entries(env.seed)) {
      if (typeof v === 'string' && weak.some((w) => v.toLowerCase().includes(w))) {
        throw new Error(
          `Refusing to seed in production: ${k} looks like a placeholder.`,
        )
      }
    }
  }

  const adminRoleId = await getRoleId('admin')
  const authorRoleId = await getRoleId('author')
  const readerRoleId = await getRoleId('reader')

  // Enforce single-admin invariant *before* writing.
  await ensureSingleAdmin(adminRoleId, env.seed.adminEmail)

  await upsertUser({
    email: env.seed.adminEmail,
    password: env.seed.adminPassword,
    roleId: adminRoleId,
    label: 'admin',
  })
  await upsertUser({
    email: env.seed.authorEmail,
    password: env.seed.authorPassword,
    roleId: authorRoleId,
    label: 'author',
  })
  await upsertUser({
    email: env.seed.readerEmail,
    password: env.seed.readerPassword,
    roleId: readerRoleId,
    label: 'reader',
  })

  // Re-check post-write to surface any race or manual tampering.
  await ensureSingleAdmin(adminRoleId, env.seed.adminEmail)

  console.log('\nDone. Demo credentials:')
  console.log(`  admin   ${env.seed.adminEmail}`)
  console.log(`  author  ${env.seed.authorEmail}`)
  console.log(`  reader  ${env.seed.readerEmail}`)

  await pool.end()
}

main().catch(async (err) => {
  console.error('db:seed failed:', err.message)
  await pool.end().catch(() => {})
  process.exit(1)
})
