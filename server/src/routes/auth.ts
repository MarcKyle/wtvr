import { Router, type CookieOptions } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { env, isProd } from '../config/env.js'
import { activityRepo } from '../db/repositories/activityRepo.js'
import { requireAuth } from '../middleware/auth.js'
import { validateBody } from '../middleware/validate.js'
import {
  login,
  logout,
  register,
  toPublicUser,
} from '../services/authService.js'

const router = Router()

const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Try again later.' },
})

// Strong password: min 8, mixed case, number, symbol. Mirrors src/utils/validators.ts.
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[a-z]/, 'Password must contain a lowercase letter.')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
  .regex(/\d/, 'Password must contain a number.')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol.')

const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: z.string().min(1).max(200),
  })
  .strict()

const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
    password: strongPassword.max(200),
    // Admin is intentionally not allowed at registration. Exactly one admin
    // exists in the system, provisioned via `npm run db:seed`.
    role: z.enum(['reader', 'author']),
  })
  .strict()

function sessionCookieOptions(expiresAt: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: env.auth.cookieSecure || isProd,
    sameSite: env.auth.cookieSameSite,
    expires: expiresAt,
    path: '/',
  }
}

function clientCtx(req: import('express').Request) {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  }
}

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>
    const result = await login(email, password, clientCtx(req))

    if (!result.ok) {
      const status = result.reason === 'locked' ? 423 : 401
      const message =
        result.reason === 'locked'
          ? 'Account temporarily locked. Try again later.'
          : result.reason === 'inactive'
            ? 'Account is disabled.'
            : 'Invalid email or password.'
      res.status(status).json({ error: message })
      return
    }

    res.cookie(
      env.auth.cookieName,
      result.sessionId,
      sessionCookieOptions(result.expiresAt),
    )
    res.json({ user: toPublicUser(result.user) })
  },
)

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  async (req, res) => {
    const { email, password, role } = req.body as z.infer<typeof registerSchema>
    const result = await register(email, password, role, clientCtx(req))

    if (!result.ok) {
      const status = result.reason === 'forbidden_role' ? 403 : 409
      const message =
        result.reason === 'forbidden_role'
          ? 'That role cannot be selected at registration.'
          : 'An account with that email already exists.'
      res.status(status).json({ error: message })
      return
    }

    res.cookie(
      env.auth.cookieName,
      result.sessionId,
      sessionCookieOptions(result.expiresAt),
    )
    res.status(201).json({ user: toPublicUser(result.user) })
  },
)

router.post('/logout', async (req, res) => {
  const sid = req.sessionId
  if (sid) {
    await logout(sid)
    await activityRepo.record({
      userId: req.user?.id ?? null,
      action: 'auth.logout',
      outcome: 'success',
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    })
  }
  res.clearCookie(env.auth.cookieName, {
    httpOnly: true,
    secure: env.auth.cookieSecure || isProd,
    sameSite: env.auth.cookieSameSite,
    path: '/',
  })
  res.status(204).end()
})

router.get('/me', requireAuth, (req, res) => {
  // requireAuth guarantees req.user is set.
  res.json(toPublicUser(req.user!))
})

export default router
