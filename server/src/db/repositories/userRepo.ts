import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { pool } from '../pool.js'

export type UserStats = {
  totalUsers: number
  activeUsers: number
  totalAuthors: number
  totalReaders: number
  totalPosts: number
  publishedPosts: number
}

export type DbUser = {
  id: number
  email: string
  passwordHash: string
  role: 'admin' | 'author' | 'reader'
  isActive: boolean
  failedAttempts: number
  lockedUntil: Date | null
  displayName: string | null
  bio: string | null
  website: string | null
  location: string | null
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
  display_name: string | null
  bio: string | null
  website: string | null
  location: string | null
  created_at: Date
  updated_at: Date
}

const SELECT_USER = `
  SELECT u.id, u.email, u.password_hash, r.name AS role_name,
         u.is_active, u.failed_attempts, u.locked_until,
         u.display_name, u.bio, u.website, u.location,
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
    displayName: row.display_name,
    bio: row.bio,
    website: row.website,
    location: row.location,
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

  /** Update editable profile fields for a user. Only non-undefined keys are written. */
  async updateProfile(
    userId: number,
    fields: {
      displayName?: string | null
      bio?: string | null
      website?: string | null
      location?: string | null
    },
  ): Promise<DbUser> {
    const setClauses: string[] = []
    const params: (string | number | null)[] = []

    if (fields.displayName !== undefined) { setClauses.push('display_name = ?'); params.push(fields.displayName) }
    if (fields.bio         !== undefined) { setClauses.push('bio = ?');          params.push(fields.bio) }
    if (fields.website     !== undefined) { setClauses.push('website = ?');      params.push(fields.website) }
    if (fields.location    !== undefined) { setClauses.push('location = ?');     params.push(fields.location) }

    if (setClauses.length === 0) {
      const user = await this.findById(userId)
      if (!user) throw new Error('User not found')
      return user
    }

    params.push(userId)
    await pool.execute(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      params,
    )

    const updated = await this.findById(userId)
    if (!updated) throw new Error('User not found after update')
    return updated
  },

  /** List all users with pagination. MKJ 05/30/26 Admin user listing. */
  async list(limit: number = 50, offset: number = 0): Promise<[users: DbUser[], total: number]> {
    const [rows] = await pool.execute<UserJoinRow[]>(
      `${SELECT_USER} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset],
    )
    
    const [[countRow]] = await pool.execute<(RowDataPacket & { total: number })[]>(
      'SELECT COUNT(*) AS total FROM users',
    )
    
    return [rows.map(mapUser), countRow?.total ?? 0]
  },

  /** Update user role. MKJ 05/30/26 Admin role management. */
  async updateRole(userId: number, newRole: 'admin' | 'author' | 'reader'): Promise<DbUser> {
    await pool.execute(
      `UPDATE users
         SET role_id = (SELECT id FROM roles WHERE name = ? LIMIT 1)
       WHERE id = ?`,
      [newRole, userId],
    )

    const updated = await this.findById(userId)
    if (!updated) throw new Error('User not found after role update')
    return updated
  },

  /** Update user active status. MKJ 05/30/26 Admin user activation. */
  async updateActive(userId: number, isActive: boolean): Promise<DbUser> {
    await pool.execute(
      `UPDATE users SET is_active = ? WHERE id = ?`,
      [isActive ? 1 : 0, userId],
    )

    const updated = await this.findById(userId)
    if (!updated) throw new Error('User not found after status update')
    return updated
  },

  /** Delete a user by ID. MKJ 05/30/26 Admin user deletion. */
  async delete(userId: number): Promise<void> {
    const [res] = await pool.execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [userId],
    )
    if (res.affectedRows === 0) {
      throw new Error('User not found')
    }
  },

  /** Aggregate counts used by the admin dashboard. */
  async getStats(): Promise<UserStats> {    const [[userRow]] = await pool.execute<(RowDataPacket & {
      total: number; active: number; authors: number; readers: number
    })[]>(
      `SELECT
         COUNT(*)                                          AS total,
         SUM(u.is_active = 1)                             AS active,
         SUM(r.name = 'author')                           AS authors,
         SUM(r.name = 'reader')                           AS readers
       FROM users u
       JOIN roles r ON r.id = u.role_id`,
    )

    const [[postRow]] = await pool.execute<(RowDataPacket & {
      total: number; published: number
    })[]>(
      `SELECT
         COUNT(*)                          AS total,
         SUM(status = 'published')         AS published
       FROM posts`,
    )

    return {
      totalUsers:     userRow?.total     ?? 0,
      activeUsers:    userRow?.active    ?? 0,
      totalAuthors:   userRow?.authors   ?? 0,
      totalReaders:   userRow?.readers   ?? 0,
      totalPosts:     postRow?.total     ?? 0,
      publishedPosts: postRow?.published ?? 0,
    }
  },
}
