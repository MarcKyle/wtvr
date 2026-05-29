import 'dotenv/config'

function required(name: string): string {
  const v = process.env[name]
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var: ${name}`)
  }
  return v
}

function optional(name: string, fallback: string): string {
  const v = process.env[name]
  return v === undefined || v === '' ? fallback : v
}

function asNumber(value: string, name: string): number {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    throw new Error(`Env var ${name} must be a number, got: ${value}`)
  }
  return n
}

function asBoolean(value: string): boolean {
  return value === '1' || value.toLowerCase() === 'true'
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: asNumber(optional('PORT', '3000'), 'PORT'),
  clientOrigin: optional('CLIENT_ORIGIN', 'http://localhost:5173'),

  db: {
    host: optional('DB_HOST', '127.0.0.1'),
    port: asNumber(optional('DB_PORT', '3306'), 'DB_PORT'),
    name: optional('DB_NAME', 'wtvr'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    connectionLimit: asNumber(
      optional('DB_CONNECTION_LIMIT', '10'),
      'DB_CONNECTION_LIMIT',
    ),
    rootUser: optional('DB_ROOT_USER', 'root'),
    rootPassword: optional('DB_ROOT_PASSWORD', ''),
  },

  auth: {
    bcryptCost: asNumber(optional('BCRYPT_COST', '12'), 'BCRYPT_COST'),
    cookieName: optional('SESSION_COOKIE_NAME', 'wtvr_sid'),
    cookieSecure: asBoolean(optional('SESSION_COOKIE_SECURE', 'false')),
    cookieSameSite: optional('SESSION_COOKIE_SAMESITE', 'lax') as
      | 'lax'
      | 'strict'
      | 'none',
    sessionTtlHours: asNumber(
      optional('SESSION_TTL_HOURS', '8'),
      'SESSION_TTL_HOURS',
    ),
  },

  rateLimit: {
    windowMs: asNumber(
      optional('RATE_LIMIT_WINDOW_MS', '900000'),
      'RATE_LIMIT_WINDOW_MS',
    ),
    max: asNumber(optional('RATE_LIMIT_MAX', '100'), 'RATE_LIMIT_MAX'),
    authMax: asNumber(
      optional('AUTH_RATE_LIMIT_MAX', '10'),
      'AUTH_RATE_LIMIT_MAX',
    ),
  },

  seed: {
    adminEmail: optional('SEED_ADMIN_EMAIL', 'admin@wtvr.local'),
    adminPassword: optional('SEED_ADMIN_PASSWORD', ''),
    authorEmail: optional('SEED_AUTHOR_EMAIL', 'author@wtvr.local'),
    authorPassword: optional('SEED_AUTHOR_PASSWORD', ''),
    readerEmail: optional('SEED_READER_EMAIL', 'reader@wtvr.local'),
    readerPassword: optional('SEED_READER_PASSWORD', ''),
  },
}

export const isProd = env.nodeEnv === 'production'
