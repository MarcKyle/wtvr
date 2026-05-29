import { Router } from 'express'
import { z } from 'zod'
import { hash } from 'bcrypt'
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

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Returns paginated list of all users. MKJ 05/30/26 Admin user listing endpoint.
const usersQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

router.get('/users', async (req, res) => {
  const parsed = usersQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid query parameters.', issues: parsed.error.issues })
    return
  }

  const { limit, offset } = parsed.data
  const [users, total] = await userRepo.list(limit, offset)
  
  res.json({ users, total, limit, offset })
})

// ── POST /api/admin/users ─────────────────────────────────────────────────────
// Creates a new user. MKJ 05/30/26 Admin user creation endpoint.
const createUserSchema = z.object({
  email:    z.string().email().min(3).max(254),
  password: z.string().min(8).max(128),
  role:     z.enum(['admin', 'author', 'reader']),
})

router.post('/users', async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body.', issues: parsed.error.issues })
    return
  }

  const { email, password, role } = parsed.data

  // Check if user already exists
  const existing = await userRepo.findByEmail(email)
  if (existing) {
    res.status(409).json({ error: 'User with this email already exists.' })
    return
  }

  // Hash password and create user
  const passwordHash = await hash(password, 12)
  const user = await userRepo.create({ email, passwordHash, role: role as 'author' | 'reader' })

  // If role is admin, update it after creation
  if (role === 'admin') {
    const updated = await userRepo.updateRole(user.id, 'admin')
    res.status(201).json(updated)
    return
  }

  res.status(201).json(user)
})

// ── PUT /api/admin/users/:id ──────────────────────────────────────────────────
// Updates a user's role and active status. MKJ 05/30/26 Admin user editing endpoint.
const updateUserSchema = z.object({
  role:     z.enum(['admin', 'author', 'reader']).optional(),
  isActive: z.boolean().optional(),
})

router.put('/users/:id', async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: 'Invalid user ID.' })
    return
  }

  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body.', issues: parsed.error.issues })
    return
  }

  const { role, isActive } = parsed.data

  const user = await userRepo.findById(userId)
  if (!user) {
    res.status(404).json({ error: 'User not found.' })
    return
  }

  let updated = user
  if (role !== undefined) {
    updated = await userRepo.updateRole(userId, role)
  }
  if (isActive !== undefined) {
    updated = await userRepo.updateActive(userId, isActive)
  }

  res.json(updated)
})

// ── DELETE /api/admin/users/:id ───────────────────────────────────────────────
// Deletes a user. MKJ 05/30/26 Admin user deletion endpoint.
router.delete('/users/:id', async (req, res) => {
  const userId = Number.parseInt(req.params.id, 10)
  if (Number.isNaN(userId)) {
    res.status(400).json({ error: 'Invalid user ID.' })
    return
  }

  const user = await userRepo.findById(userId)
  if (!user) {
    res.status(404).json({ error: 'User not found.' })
    return
  }

  await userRepo.delete(userId)
  res.json({ message: 'User deleted successfully.' })
})

export default router
