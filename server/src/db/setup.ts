// One-shot bootstrap script. Connects as a privileged MySQL account, creates
// the database and the least-privilege application user, then applies schema.sql.
//
// Run once per environment:   npm run db:setup
//
// Required env: DB_ROOT_USER, DB_ROOT_PASSWORD (privileged account),
//               DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'
import { env, isProd } from '../config/env.js'

const here = dirname(fileURLToPath(import.meta.url))
const schemaPath = resolve(here, 'schema.sql')

async function main() {
  const root = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.rootUser,
    password: env.db.rootPassword,
    multipleStatements: true,
  })

  // Database. Identifier is interpolated because MySQL doesn't support
  // parameter binding for DDL identifiers; it's validated against a strict
  // pattern first to keep the surface tight.
  if (!/^[a-zA-Z0-9_]+$/.test(env.db.name)) {
    throw new Error(`Invalid DB_NAME: ${env.db.name}`)
  }
  if (!/^[a-zA-Z0-9_]+$/.test(env.db.user)) {
    throw new Error(`Invalid DB_USER: ${env.db.user}`)
  }

  console.log(`> Creating database \`${env.db.name}\` if missing...`)
  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\`
       CHARACTER SET utf8mb4
       COLLATE utf8mb4_unicode_ci`,
  )

  console.log(`> Creating least-privilege user '${env.db.user}'@'%' if missing...`)
  await root.query(
    `CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?`,
    [env.db.user, env.db.password],
  )
  await root.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON \`${env.db.name}\`.* TO ?@'%'`,
    [env.db.user],
  )
  await root.query('FLUSH PRIVILEGES')

  console.log('> Applying schema.sql...')
  const schema = readFileSync(schemaPath, 'utf8')
  // Switch into the target database and run the schema as multi-statement DDL.
  await root.query(`USE \`${env.db.name}\``)
  await root.query(schema)

  await root.end()

  if (isProd) {
    console.log('> Production setup complete.')
  } else {
    console.log('> Done. Next: npm run db:seed')
  }
}

main().catch((err) => {
  console.error('db:setup failed:', err)
  process.exit(1)
})
