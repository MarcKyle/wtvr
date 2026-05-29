import type { RowDataPacket } from 'mysql2'
import { pool } from '../pool.js'

export type ActivityOutcome = 'success' | 'failure'

export type ActivityEntry = {
  userId: number | null
  action: string
  detail?: Record<string, unknown> | null
  ipAddress?: string | null
  userAgent?: string | null
  outcome: ActivityOutcome
}

export type ActivityLogRow = {
  id: number
  userId: number | null
  userEmail: string | null
  action: string
  ipAddress: string | null
  outcome: ActivityOutcome
  createdAt: string // ISO string
}

type RawLogRow = RowDataPacket & {
  id: number
  user_id: number | null
  user_email: string | null
  action: string
  ip_address: string | null
  outcome: ActivityOutcome
  created_at: Date
}

// Audit log writer. Failures are logged to stderr but never thrown — we don't
// want a logging hiccup to break a request path.
export const activityRepo = {
  async record(entry: ActivityEntry): Promise<void> {
    try {
      await pool.execute(
        `INSERT INTO activity_logs
           (user_id, action, detail, ip_address, user_agent, outcome)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entry.userId,
          entry.action,
          entry.detail ? JSON.stringify(entry.detail) : null,
          entry.ipAddress ?? null,
          (entry.userAgent ?? '').slice(0, 255) || null,
          entry.outcome,
        ],
      )
    } catch (err) {
      console.error('activityRepo.record failed:', err)
    }
  },

  /** Paginated list of logs, newest first, with optional date-range filter. */
  async list(opts: {
    limit: number
    offset: number
    since?: Date | null
    outcome?: ActivityOutcome | null
  }): Promise<ActivityLogRow[]> {
    const conditions: string[] = []
    const params: (string | number)[] = []

    if (opts.since) {
      conditions.push('al.created_at >= ?')
      params.push(opts.since.toISOString())
    }
    if (opts.outcome) {
      conditions.push('al.outcome = ?')
      params.push(opts.outcome)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = Math.floor(Number(opts.limit))
    const offset = Math.floor(Number(opts.offset))

    const [rows] = await pool.execute<RawLogRow[]>(
      `SELECT al.id, al.user_id, u.email AS user_email,
              al.action, al.ip_address, al.outcome, al.created_at
         FROM activity_logs al
         LEFT JOIN users u ON u.id = al.user_id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    )

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userEmail: r.user_email,
      action: r.action,
      ipAddress: r.ip_address,
      outcome: r.outcome,
      createdAt: r.created_at.toISOString(),
    }))
  },

  /** Total count matching the same filters (for pagination). */
  async count(opts: {
    since?: Date | null
    outcome?: ActivityOutcome | null
  }): Promise<number> {
    const conditions: string[] = []
    const params: (Date | string)[] = []

    if (opts.since) {
      conditions.push('created_at >= ?')
      params.push(opts.since)
    }
    if (opts.outcome) {
      conditions.push('outcome = ?')
      params.push(opts.outcome)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const [rows] = await pool.execute<(RowDataPacket & { n: number })[]>(
      `SELECT COUNT(*) AS n FROM activity_logs ${where}`,
      params,
    )
    return rows[0]?.n ?? 0
  },
}
