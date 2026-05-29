import { Router } from 'express'
import { z } from 'zod'
import { activityRepo } from '../db/repositories/activityRepo.js'
import { userRepo } from '../db/repositories/userRepo.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

// All admin routes require an authenticated admin session.
router.use(requireAuth, requireRole('admin'))

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
// Returns aggregate counts for the overview panel.
router.get('/stats', async (_req, res) => {
  const stats = await userRepo.getStats()
  res.json(stats)
})

// ── GET /api/admin/logs ───────────────────────────────────────────────────────
// Returns paginated activity logs with optional filters.
//
// Query params:
//   limit    number  (default 50, max 200)
//   offset   number  (default 0)
//   days     number  (filter to last N days; omit for all time)
//   outcome  'success' | 'failure'  (omit for all)
const logsQuerySchema = z.object({
  limit:   z.coerce.number().int().min(1).max(200).default(50),
  offset:  z.coerce.number().int().min(0).default(0),
  days:    z.coerce.number().int().min(1).optional(),
  outcome: z.enum(['success', 'failure']).optional(),
})

router.get('/logs', async (req, res) => {
  const parsed = logsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters.', issues: parsed.error.issues })
    return
  }

  const { limit, offset, days, outcome } = parsed.data
  const since = days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null

  const [logs, total] = await Promise.all([
    activityRepo.list({ limit, offset, since, outcome: outcome ?? null }),
    activityRepo.count({ since, outcome: outcome ?? null }),
  ])

  res.json({ logs, total, limit, offset })
})

export default router
