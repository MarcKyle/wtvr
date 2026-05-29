import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { pool } from '../pool.js'

export type DbSession = {
  id: string
  userId: number
  expiresAt: Date
}

type SessionRow = RowDataPacket & {
  id: string
  user_id: number
  expires_at: Date
}

export const sessionRepo = {
  async create(userId: number, ttlHours: number): Promise<DbSession> {
    const id = randomUUID()
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)
    await pool.execute(
      'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      [id, userId, expiresAt],
    )
    return { id, userId, expiresAt }
  },

  async find(id: string): Promise<DbSession | null> {
    const [rows] = await pool.execute<SessionRow[]>(
      `SELECT id, user_id, expires_at
         FROM sessions
        WHERE id = ? AND expires_at > NOW()
        LIMIT 1`,
      [id],
    )
    const row = rows[0]
    return row
      ? { id: row.id, userId: row.user_id, expiresAt: row.expires_at }
      : null
  },

  async destroy(id: string): Promise<void> {
    await pool.execute('DELETE FROM sessions WHERE id = ?', [id])
  },

  async destroyExpired(): Promise<void> {
    await pool.execute('DELETE FROM sessions WHERE expires_at <= NOW()')
  },
}
