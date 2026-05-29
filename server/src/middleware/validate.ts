import type { NextFunction, Request, Response } from 'express'
import type { ZodTypeAny, z } from 'zod'
import { ERROR_CODES } from '../constants/errors.js'

// MKJ 05/29/26 Generic body validator with structured error responses
// Replaces req.body with parsed (typed) value; downstream handlers rely on shape
// and unknown fields are dropped.
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      // MKJ 05/29/26 Return structured error response with code
      res.status(400).json({ 
        error: 'Invalid request.', 
        code: ERROR_CODES.INVALID_REQUEST,
        issues 
      })
      return
    }
    req.body = result.data as z.infer<S>
    next()
  }
}
