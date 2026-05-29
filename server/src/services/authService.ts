import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { activityRepo } from '../db/repositories/activityRepo.js'
import { sessionRepo } from '../db/repositories/sessionRepo.js'
import { userRepo, type DbUser } from '../db/repositories/userRepo.js'

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export type PublicUser = {
  id: number
  email: string
  role: DbUser['role']
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function toPublicUser(u: DbUser): PublicUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }
}

export type LoginContext = {
  ipAddress?: string | null
  userAgent?: string | null
}

export type LoginResult =
  | { ok: true; user: DbUser; sessionId: string; expiresAt: Date }
  | { ok: false; reason: 'invalid' | 'locked' | 'inactive' }

export async function login(
  email: string,
  password: string,
  ctx: LoginContext,
): Promise<LoginResult> {
  const user = await userRepo.findByEmail(email)

  // Generic failure response for unknown email — avoids leaking enumeration.
  if (!user) {
    await activityRepo.record({
      userId: null,
      action: 'auth.login',
      outcome: 'failure',
      detail: { email, reason: 'unknown_user' },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
    return { ok: false, reason: 'invalid' }
  }

  if (!user.isActive) {
    await activityRepo.record({
      userId: user.id,
      action: 'auth.login',
      outcome: 'failure',
      detail: { reason: 'inactive' },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
    return { ok: false, reason: 'inactive' }
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await activityRepo.record({
      userId: user.id,
      action: 'auth.login',
      outcome: 'failure',
      detail: { reason: 'locked', until: user.lockedUntil.toISOString() },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
    return { ok: false, reason: 'locked' }
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    const nextAttempts = user.failedAttempts + 1
    const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS
    const lockUntil = shouldLock
      ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      : user.lockedUntil
    await userRepo.recordFailedLogin(user.id, lockUntil)
    await activityRepo.record({
      userId: user.id,
      action: 'auth.login',
      outcome: 'failure',
      detail: {
        reason: 'bad_password',
        attempts: nextAttempts,
        locked: shouldLock,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
    return { ok: false, reason: shouldLock ? 'locked' : 'invalid' }
  }

  // Success. Reset counters and mint a session.
  await userRepo.resetLoginAttempts(user.id)
  const session = await sessionRepo.create(user.id, env.auth.sessionTtlHours)
  await activityRepo.record({
    userId: user.id,
    action: 'auth.login',
    outcome: 'success',
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  })
  return { ok: true, user, sessionId: session.id, expiresAt: session.expiresAt }
}

export type RegisterResult =
  | { ok: true; user: DbUser; sessionId: string; expiresAt: Date }
  | { ok: false; reason: 'taken' | 'forbidden_role' }

export async function register(
  email: string,
  password: string,
  role: 'reader' | 'author',
  ctx: LoginContext,
): Promise<RegisterResult> {
  // Defensive: even though the Zod schema rejects 'admin', double-check here.
  if ((role as string) === 'admin') {
    await activityRepo.record({
      userId: null,
      action: 'auth.register',
      outcome: 'failure',
      detail: { email, reason: 'forbidden_role' },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
    return { ok: false, reason: 'forbidden_role' }
  }

  const existing = await userRepo.findByEmail(email)
  if (existing) {
    await activityRepo.record({
      userId: null,
      action: 'auth.register',
      outcome: 'failure',
      detail: { email, reason: 'email_taken' },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    })
    return { ok: false, reason: 'taken' }
  }

  const passwordHash = await bcrypt.hash(password, env.auth.bcryptCost)
  const user = await userRepo.create({ email, passwordHash, role })
  const session = await sessionRepo.create(user.id, env.auth.sessionTtlHours)

  await activityRepo.record({
    userId: user.id,
    action: 'auth.register',
    outcome: 'success',
    detail: { role },
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  })

  return { ok: true, user, sessionId: session.id, expiresAt: session.expiresAt }
}

export async function logout(sessionId: string): Promise<void> {
  await sessionRepo.destroy(sessionId)
}
