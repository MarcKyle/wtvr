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
}
