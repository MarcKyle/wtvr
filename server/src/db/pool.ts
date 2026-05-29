import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

// Single shared connection pool. All queries go through here using
// parameterized prepared statements (mysql2 .execute / pool.execute).
export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: env.db.connectionLimit,
  multipleStatements: false,
  namedPlaceholders: true,
  charset: 'utf8mb4_unicode_ci',
})
