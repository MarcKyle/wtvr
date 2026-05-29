import type { NextFunction, Request, Response } from 'express'
import { env } from '../config/env.js'
import { ERROR_CODES } from '../constants/errors.js'
import { sessionRepo } from '../db/repositories/sessionRepo.js'
import { userRepo, type DbUser } from '../db/repositories/userRepo.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: DbUser
      sessionId?: string
    }
  }
}

// Reads the session cookie and attaches the current user (if any). Always
// continues — protected routes layer requireAuth / requireRole on top.
export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const sid = req.cookies?.[env.auth.cookieName]
  if (!sid || typeof sid !== 'string') return next()

  try {
    const session = await sessionRepo.find(sid)
    if (!session) return next()
    const user = await userRepo.findById(session.userId)
    if (user && user.isActive) {
      req.user = user
      req.sessionId = session.id
    }
  } catch {
    // Treat as anonymous on lookup failure.
  }
  next()
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    // MKJ 05/29/26 Return structured error response with code
    res.status(401).json({ 
      error: 'Authentication required.', 
      code: ERROR_CODES.AUTHENTICATION_REQUIRED 
    })
    return
  }
  next()
}

export function requireRole(...allowed: Array<DbUser['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      // MKJ 05/29/26 Return structured error response with code
      res.status(401).json({ 
        error: 'Authentication required.', 
        code: ERROR_CODES.AUTHENTICATION_REQUIRED 
      })
      return
    }
    if (!allowed.includes(req.user.role)) {
      // MKJ 05/29/26 Return structured error response with code
      res.status(403).json({ 
        error: 'You do not have permission to access this.', 
        code: ERROR_CODES.FORBIDDEN 
      })
      return
    }
    next()
  }
}
