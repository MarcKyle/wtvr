import type { NextFunction, Request, Response } from 'express'
import type { ZodTypeAny, z } from 'zod'

// Generic body validator. Replaces req.body with the parsed (typed) value so
// downstream handlers can rely on shape and unknown fields are dropped.
export function validateBody<S extends ZodTypeAny>(schema: S) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      res.status(400).json({ error: 'Invalid request body.', issues })
      return
    }
    req.body = result.data as z.infer<S>
    next()
  }
}
