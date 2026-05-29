import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { pool } from '../pool.js'

export type DbUser = {
  id: number
  email: string
  passwordHash: string
  role: 'admin' | 'author' | 'reader'
  isActive: boolean
  failedAttempts: number
  lockedUntil: Date | null
  createdAt: Date
  updatedAt: Date
}

type UserJoinRow = RowDataPacket & {
  id: number
  email: string
  password_hash: string
  role_name: 'admin' | 'author' | 'reader'
  is_active: number
  failed_attempts: number
  locked_until: Date | null
  created_at: Date
  updated_at: Date
}

const SELECT_USER = `
  SELECT u.id, u.email, u.password_hash, r.name AS role_name,
         u.is_active, u.failed_attempts, u.locked_until,
         u.created_at, u.updated_at
    FROM users u
    JOIN roles r ON r.id = u.role_id
`

function mapUser(row: UserJoinRow): DbUser {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role_name,
    isActive: row.is_active === 1,
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const userRepo = {
  async findByEmail(email: string): Promise<DbUser | null> {
    const [rows] = await pool.execute<UserJoinRow[]>(
      `${SELECT_USER} WHERE u.email = ? LIMIT 1`,
      [email],
    )
    return rows[0] ? mapUser(rows[0]) : null
  },

  async findById(id: number): Promise<DbUser | null> {
    const [rows] = await pool.execute<UserJoinRow[]>(
      `${SELECT_USER} WHERE u.id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? mapUser(rows[0]) : null
  },

  async create(opts: {
    email: string
    passwordHash: string
    role: 'author' | 'reader'
  }): Promise<DbUser> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, role_id)
         SELECT ?, ?, r.id FROM roles r WHERE r.name = ? LIMIT 1`,
      [opts.email, opts.passwordHash, opts.role],
    )
    if (res.affectedRows !== 1) {
      throw new Error('User insert failed (role lookup miss?)')
    }
    const user = await this.findById(res.insertId)
    if (!user) throw new Error('User insert succeeded but row not found')
    return user
  },

  async recordFailedLogin(
    userId: number,
    lockUntil: Date | null,
  ): Promise<void> {
    await pool.execute(
      `UPDATE users
         SET failed_attempts = failed_attempts + 1,
             locked_until = ?
       WHERE id = ?`,
      [lockUntil, userId],
    )
  },

  async resetLoginAttempts(userId: number): Promise<void> {
    await pool.execute(
      `UPDATE users
         SET failed_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [userId],
    )
  },
}
