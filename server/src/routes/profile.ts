import { Router } from 'express'
import { z } from 'zod'
import { activityRepo } from '../db/repositories/activityRepo.js'
import { userRepo } from '../db/repositories/userRepo.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'

const router = Router()

// All profile routes require an active session.
router.use(requireAuth)

// ── GET /api/profile/me ───────────────────────────────────────────────────────
// Returns the current user's public profile fields.
router.get('/me', (req, res) => {
  const u = req.user!
  res.json({
    id:          u.id,
    email:       u.email,
    role:        u.role,
    displayName: u.displayName,
    bio:         u.bio,
    website:     u.website,
    location:    u.location,
    createdAt:   u.createdAt.toISOString(),
    updatedAt:   u.updatedAt.toISOString(),
  })
})

// ── PATCH /api/profile/me ─────────────────────────────────────────────────────
// Updates one or more editable profile fields and writes an audit log entry.
const patchSchema = z
  .object({
    displayName: z.string().trim().max(100).nullable().optional(),
    bio:         z.string().trim().max(2000).nullable().optional(),
    website:     z.string().trim().url('Must be a valid URL.').max(255).nullable().optional()
                   .or(z.literal('').transform(() => null)),
    location:    z.string().trim().max(100).nullable().optional(),
  })
  .strict()
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required.' })

router.patch('/me', validateBody(patchSchema), async (req, res) => {
  const userId = req.user!.id
  const fields = req.body as z.infer<typeof patchSchema>

  // Build a diff of which fields are actually changing for the audit log.
  const prev = req.user!
  const changed: Record<string, { from: unknown; to: unknown }> = {}
  if (fields.displayName !== undefined && fields.displayName !== prev.displayName) {
    changed.displayName = { from: prev.displayName, to: fields.displayName }
  }
  if (fields.bio !== undefined && fields.bio !== prev.bio) {
    changed.bio = { from: prev.bio !== null ? '[set]' : null, to: fields.bio !== null ? '[set]' : null }
  }
  if (fields.website !== undefined && fields.website !== prev.website) {
    changed.website = { from: prev.website, to: fields.website }
  }
  if (fields.location !== undefined && fields.location !== prev.location) {
    changed.location = { from: prev.location, to: fields.location }
  }

  const updated = await userRepo.updateProfile(userId, fields)

  await activityRepo.record({
    userId,
    action: 'profile.update',
    outcome: 'success',
    detail: { changed },
    ipAddress:  req.ip ?? null,
    userAgent:  req.headers['user-agent'] ?? null,
  })

  res.json({
    id:          updated.id,
    email:       updated.email,
    role:        updated.role,
    displayName: updated.displayName,
    bio:         updated.bio,
    website:     updated.website,
    location:    updated.location,
    createdAt:   updated.createdAt.toISOString(),
    updatedAt:   updated.updatedAt.toISOString(),
  })
})

export default router
