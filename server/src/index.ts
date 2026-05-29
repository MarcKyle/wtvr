import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { env, isProd } from './config/env.js'
import { attachUser } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import { logger } from './utils/logger.js'

const app = express()

app.set('trust proxy', 1)

app.use(helmet())
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
)
app.use(express.json({ limit: '64kb' }))
app.use(cookieParser())

// Global rate limit: protects against brute-force across all routes. The
// auth routes layer their own stricter limit on top.
app.use(
  rateLimit({
    windowMs: env.rateLimit.windowMs,
    max: env.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)

app.use(attachUser)

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: env.nodeEnv })
})

app.use('/api/auth', authRoutes)

// Final 404 for any unmatched /api/* route.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' })
})

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err }, 'Unhandled error')
    res.status(500).json({
      error: isProd ? 'Internal server error.' : (err as Error).message,
    })
  },
)

app.listen(env.port, () => {
  logger.info(`WTVR API listening on http://localhost:${env.port}`)
})
