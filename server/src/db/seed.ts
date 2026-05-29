// Seeds the three predefined accounts: one admin, one author, one reader.
// Also seeds sample posts attributed to the predefined author account.
// Idempotent: re-running will not create duplicate users and will refuse to
// create a second admin if one already exists with a different email.
// Posts are keyed by title — existing posts with the same title and author
// are skipped so re-runs stay safe.
import bcrypt from 'bcryptjs'
import type { RowDataPacket } from 'mysql2'
import { env, isProd } from '../config/env.js'
import { pool } from './pool.js'

type RoleRow = RowDataPacket & { id: number; name: string }
type UserRow = RowDataPacket & { id: number; email: string; role_id: number }
type PostRow = RowDataPacket & { id: number; title: string }

async function getRoleId(name: 'admin' | 'author' | 'reader'): Promise<number> {
  const [rows] = await pool.execute<RoleRow[]>(
    'SELECT id, name FROM roles WHERE name = ? LIMIT 1',
    [name],
  )
  const row = rows[0]
  if (!row) {
    throw new Error(`Missing role '${name}'. Run db:setup first.`)
  }
  return row.id
}

async function upsertUser(opts: {
  email: string
  password: string
  roleId: number
  label: string
}): Promise<void> {
  const { email, password, roleId, label } = opts

  if (!password || password.length < 8) {
    throw new Error(
      `Refusing to seed ${label}: password is empty or too short. Set SEED_${label.toUpperCase()}_PASSWORD.`,
    )
  }

  const [existing] = await pool.execute<UserRow[]>(
    'SELECT id, email, role_id FROM users WHERE email = ? LIMIT 1',
    [email],
  )
  const hash = await bcrypt.hash(password, env.auth.bcryptCost)

  if (existing[0]) {
    await pool.execute(
      `UPDATE users
         SET password_hash = ?, role_id = ?, is_active = 1,
             failed_attempts = 0, locked_until = NULL
       WHERE id = ?`,
      [hash, roleId, existing[0].id],
    )
    console.log(`= ${label.padEnd(6)} ${email} (updated)`)
  } else {
    await pool.execute(
      `INSERT INTO users (email, password_hash, role_id, is_active)
       VALUES (?, ?, ?, 1)`,
      [email, hash, roleId],
    )
    console.log(`+ ${label.padEnd(6)} ${email} (created)`)
  }
}

async function ensureSingleAdmin(adminRoleId: number, adminEmail: string) {
  const [admins] = await pool.execute<UserRow[]>(
    'SELECT id, email, role_id FROM users WHERE role_id = ?',
    [adminRoleId],
  )

  const others = admins.filter((a) => a.email !== adminEmail)
  if (others.length > 0) {
    const list = others.map((a) => `${a.id}:${a.email}`).join(', ')
    throw new Error(
      `Refusing to seed: another admin already exists (${list}). ` +
        `WTVR allows exactly one admin. Remove the extra row or update SEED_ADMIN_EMAIL.`,
    )
  }
}

// ---------------------------------------------------------------------------
// Sample posts for the predefined author account
// ---------------------------------------------------------------------------

interface SeedPost {
  title: string
  body: string
  status: 'draft' | 'published' | 'hidden'
}

const SEED_POSTS: SeedPost[] = [
  {
    title: 'Hello, WTVR',
    body: `This is my first post on WTVR. No images, no embeds — just words. That is kind of the point, and I think I like it.

I have been looking for a place to write without the usual noise. Social media wants you to perform. Long-form platforms want you to build an audience. WTVR just wants you to write. So here I am, writing.

If you are reading this, welcome. I do not know what I will post here yet. Probably whatever is on my mind. Hence the name.`,
    status: 'published',
  },
  {
    title: 'On Writing Without an Audience',
    body: `Most writing advice assumes you want readers. Build a following. Optimize for engagement. Write headlines that get clicks.

But there is a different kind of writing — the kind you do because the thought needs to exist outside your head. Not for anyone in particular. Just out there.

I am not sure WTVR is meant to be anonymous, but it feels like it could be. You can write here and nobody might ever read it. That is oddly freeing. The pressure to perform disappears and what is left is just the act of putting words together.

I think I write better when I forget about the audience. Maybe that is what this place is for.`,
    status: 'published',
  },
  {
    title: 'Three Things I Noticed This Week',
    body: `1. Coffee tastes better when you make it slowly. I have been rushing through mornings for months. This week I had ten extra minutes and made coffee the long way. Same beans, same water. Completely different experience.

2. Most arguments are about tone, not content. I watched two people agree on every fact in a conversation and still walk away angry at each other. What they disagreed on was how the facts were being delivered.

3. Silence in a room full of people is different from silence when you are alone. One is uncomfortable. The other is necessary. I keep confusing the two.

That is it. Nothing profound. Just things I noticed.`,
    status: 'published',
  },
  {
    title: 'Why I Deleted My Social Media (Draft)',
    body: `I have started this post four times. Each time I get halfway through and realize I am writing it for the people I unfollowed, not for myself. That is probably the most honest thing I can say about why I left.

The short version: I was spending more time thinking about how to describe my life than actually living it. The longer version is still being figured out.

I will finish this when I have something real to say instead of something that sounds good.`,
    status: 'draft',
  },
  {
    title: 'A Note on Plain Text',
    body: `WTVR only supports plain text. No bold, no italics, no headers, no links. When I first heard that I thought it was a limitation. Now I think it is a feature.

Formatting is a crutch. Bold text says "this part matters more" so you do not have to write in a way that makes it obvious. Headers break up walls of text so you do not have to write transitions. Links let you gesture at an idea instead of explaining it.

Take all of that away and you are left with sentences. Sentences that have to carry their own weight.

It is harder. I think it is better.`,
    status: 'published',
  },
  {
    title: 'Unfinished Thoughts on Routine',
    body: `Routine gets a bad reputation. People talk about breaking out of it, shaking things up, living spontaneously. But I have noticed that my best days usually look a lot like my other best days.

Same rough schedule. Same morning habits. Same time I stop working. The spontaneous days are memorable but they are not usually the days I get things done or feel settled.

I wonder if the appeal of spontaneity is mostly about escaping a bad routine rather than routine itself. A good routine does not feel like a cage. It feels like a track — something that keeps you moving in the right direction without having to decide every five minutes which way to go.

Still thinking about this one.`,
    status: 'published',
  },
]

async function seedPosts(authorId: number): Promise<void> {
  let created = 0
  let skipped = 0

  for (const post of SEED_POSTS) {
    const [existing] = await pool.execute<PostRow[]>(
      'SELECT id, title FROM posts WHERE author_id = ? AND title = ? LIMIT 1',
      [authorId, post.title],
    )

    if (existing[0]) {
      skipped++
      continue
    }

    await pool.execute(
      `INSERT INTO posts (author_id, title, body, status)
       VALUES (?, ?, ?, ?)`,
      [authorId, post.title, post.body, post.status],
    )
    created++
  }

  console.log(
    `  posts   ${created} created, ${skipped} already existed (${SEED_POSTS.length} total)`,
  )
}

// ---------------------------------------------------------------------------

async function main() {
  if (isProd) {
    const weak = ['change_me', 'changeme', 'password', 'admin', 'adm1n!changeme']
    for (const [k, v] of Object.entries(env.seed)) {
      if (typeof v === 'string' && weak.some((w) => v.toLowerCase().includes(w))) {
        throw new Error(
          `Refusing to seed in production: ${k} looks like a placeholder.`,
        )
      }
    }
  }

  const adminRoleId = await getRoleId('admin')
  const authorRoleId = await getRoleId('author')
  const readerRoleId = await getRoleId('reader')

  // Enforce single-admin invariant *before* writing.
  await ensureSingleAdmin(adminRoleId, env.seed.adminEmail)

  await upsertUser({
    email: env.seed.adminEmail,
    password: env.seed.adminPassword,
    roleId: adminRoleId,
    label: 'admin',
  })
  await upsertUser({
    email: env.seed.authorEmail,
    password: env.seed.authorPassword,
    roleId: authorRoleId,
    label: 'author',
  })
  await upsertUser({
    email: env.seed.readerEmail,
    password: env.seed.readerPassword,
    roleId: readerRoleId,
    label: 'reader',
  })

  // Seed posts attributed to the predefined author account.
  const [authorRows] = await pool.execute<UserRow[]>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    [env.seed.authorEmail],
  )
  if (!authorRows[0]) {
    throw new Error(`Author user not found after upsert: ${env.seed.authorEmail}`)
  }
  await seedPosts(authorRows[0].id)

  // Re-check post-write to surface any race or manual tampering.
  await ensureSingleAdmin(adminRoleId, env.seed.adminEmail)

  console.log('\nDone. Demo credentials:')
  console.log(`  admin   ${env.seed.adminEmail}`)
  console.log(`  author  ${env.seed.authorEmail}`)
  console.log(`  reader  ${env.seed.readerEmail}`)

  await pool.end()
}

main().catch(async (err) => {
  console.error('db:seed failed:', err.message)
  await pool.end().catch(() => {})
  process.exit(1)
})
