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
// Sample posts for author accounts
// ---------------------------------------------------------------------------

interface SeedPost {
  title: string
  body: string
  status: 'draft' | 'published' | 'hidden'
}

const AUTHOR_POSTS: Record<string, SeedPost[]> = {
  'author1@example.com': [
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
  ],
  'author2@example.com': [
    {
      title: 'The Art of Slow Mornings',
      body: `I used to think productivity meant waking up at 5 AM and hitting the ground running. Now I think it means waking up when your body is ready and taking the first hour slowly.

My best work happens after a slow morning. Not a lazy morning — a slow one. There is a difference. Lazy is avoiding. Slow is intentional.

I make tea. I sit by the window. I let my mind wander before I ask it to focus. By the time I start working, I am already awake in a way that rushing never achieved.`,
      status: 'published',
    },
    {
      title: 'Learning to Cook Again',
      body: `I have been cooking the same five meals for years. They are fine. They are efficient. But somewhere along the way, cooking became a chore instead of something I enjoyed.

This month I decided to learn one new recipe every week. Not complicated ones — just things I have never made before. The goal is not to become a chef. The goal is to remember why I liked cooking in the first place.

So far: pretty good. I burned the first attempt. The second one was bland. The third one actually worked. I am calling that progress.`,
      status: 'published',
    },
    {
      title: 'Notes on Walking',
      body: `I have been walking more. Not for exercise — just for the sake of walking. No destination, no route, no timer. Just out the door and see where I end up.

It is strange how much you notice when you are not trying to get anywhere. The way light hits buildings at different times of day. The same dog always barking from the same yard. The house with the garden that changes every week.

Walking without a purpose feels like the opposite of how I usually spend my time. Maybe that is why it works.`,
      status: 'published',
    },
    {
      title: 'Unfinished: On Friendship',
      body: `I have been thinking about what makes a good friend. Not the obvious stuff — loyalty, trust, all that. The smaller things.

Like: do they remember what you told them last time? Do they ask follow-up questions or just wait for their turn to talk? Do they let silence happen without filling it?

I am not sure where this is going yet. Still figuring it out.`,
      status: 'draft',
    },
  ],
  'author3@example.com': [
    {
      title: 'Why I Started Writing Again',
      body: `I stopped writing a few years ago. Not on purpose — it just happened. Life got busy, and writing felt like something I could skip.

But I kept having thoughts that felt too big to just think about. They needed to be written down. Not shared, necessarily. Just written.

So here I am. Writing again. Not because I have to, but because I forgot how much I needed to.`,
      status: 'published',
    },
    {
      title: 'The Problem with Productivity Culture',
      body: `Everyone wants to optimize everything. Morning routines, work schedules, sleep patterns. There is an app for tracking your water intake and another one for tracking how long you spend on the first app.

I tried it for a while. I tracked everything. And you know what I learned? I spent more time tracking my life than actually living it.

Productivity culture sells the idea that you are never doing enough. That there is always a better system, a better habit, a better version of yourself just around the corner. It is exhausting.

I am done optimizing. I am just going to do things and see what happens.`,
      status: 'published',
    },
    {
      title: 'Small Moments',
      body: `The best parts of my week are never the big events. They are always the small moments I almost missed.

The way my coffee smelled this morning. The song that came on shuffle at exactly the right time. The text from a friend I had not heard from in months.

I think happiness is mostly just noticing these things when they happen instead of rushing past them.`,
      status: 'published',
    },
  ],
  'author4@example.com': [
    {
      title: 'Digital Minimalism: Week One',
      body: `I deleted all social media apps from my phone a week ago. Not the accounts — just the apps. If I want to check something, I have to do it on my computer.

The first two days were rough. I kept reaching for my phone out of habit. By day three, the urge started fading. By day seven, I barely thought about it.

What I noticed: I have a lot more time than I thought I did. Turns out I was spending hours every day scrolling without realizing it.

I am not saying everyone should do this. But for me, it has been good.`,
      status: 'published',
    },
    {
      title: 'Books I Actually Finished This Year',
      body: `I used to start a lot of books and finish very few. This year I decided to only read books I actually wanted to read, not books I thought I should read.

The result: I have finished more books this year than in the last three years combined.

Turns out the problem was not that I did not like reading. The problem was that I was reading books to impress people instead of reading books I enjoyed.

No more of that. If I am not into it by page fifty, I am done. Life is too short for books you are not excited to pick up.`,
      status: 'published',
    },
    {
      title: 'Thoughts on Boredom',
      body: `I cannot remember the last time I was truly bored. There is always something to do, something to watch, something to scroll through.

But I think boredom might be important. It is the space where ideas happen. When your brain has nothing to do, it starts making connections on its own.

I have been trying to let myself be bored more often. Just sitting. Not meditating — I am not that disciplined. Just sitting and letting my mind wander.

It is uncomfortable at first. Then it is kind of nice.`,
      status: 'published',
    },
    {
      title: 'Draft: Rethinking Success',
      body: `I have been thinking about what success actually means to me, not what I have been told it should mean.

The usual markers — money, status, recognition — do not feel as important as they used to. What feels important now is harder to define.

Still working on this one.`,
      status: 'draft',
    },
  ],
  'author5@example.com': [
    {
      title: 'Learning in Public',
      body: `I have always been the type to hide my work until it is perfect. But perfect never comes, so nothing ever gets shared.

I am trying something different now: sharing things before they are ready. Writing posts that are half-formed. Publishing drafts. Letting people see the messy middle.

It is uncomfortable. But it is also freeing. Turns out the fear of being judged for imperfect work is worse than actually being judged for it.

Most people do not care. And the ones who do care are usually just glad someone else is willing to be imperfect in public.`,
      status: 'published',
    },
    {
      title: 'The Value of Doing Nothing',
      body: `I used to feel guilty whenever I was not being productive. Weekends were for catching up on work. Evenings were for side projects. Every moment had to be optimized.

Then I burned out. Hard.

Now I schedule time to do nothing. Literally nothing. No book, no podcast, no productive hobby. Just sitting on the couch and staring at the wall if that is what happens.

It felt wrong at first. Now it feels necessary. Doing nothing is not the same as wasting time. It is maintenance.`,
      status: 'published',
    },
    {
      title: 'Why I Write on WTVR',
      body: `I like that nobody is reading this. Or maybe someone is, but I will never know who or how many.

There are no likes, no comments, no follower counts. Just words on a page. It removes all the performance anxiety that comes with writing online.

I can write something and not worry about whether it will get engagement. I can be honest without wondering how it will be received. I can publish a half-thought and move on.

This is what writing should feel like.`,
      status: 'published',
    },
  ],
}

async function seedPosts(authorEmail: string, authorId: number): Promise<void> {
  const posts = AUTHOR_POSTS[authorEmail]
  if (!posts) {
    return
  }

  let created = 0
  let skipped = 0

  for (const post of posts) {
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

  if (created > 0 || skipped > 0) {
    console.log(
      `  posts for ${authorEmail}: ${created} created, ${skipped} already existed`,
    )
  }
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

  // Seed the main admin account
  await upsertUser({
    email: env.seed.adminEmail,
    password: env.seed.adminPassword,
    roleId: adminRoleId,
    label: 'admin',
  })

  // Seed 5 author accounts
  const authorAccounts = [
    { email: 'author1@example.com', password: 'author1pass123' },
    { email: 'author2@example.com', password: 'author2pass123' },
    { email: 'author3@example.com', password: 'author3pass123' },
    { email: 'author4@example.com', password: 'author4pass123' },
    { email: 'author5@example.com', password: 'author5pass123' },
  ]

  for (const author of authorAccounts) {
    await upsertUser({
      email: author.email,
      password: author.password,
      roleId: authorRoleId,
      label: 'author',
    })

    // Seed posts for each author
    const [authorRows] = await pool.execute<UserRow[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [author.email],
    )
    if (authorRows[0]) {
      await seedPosts(author.email, authorRows[0].id)
    }
  }

  // Seed 5 reader accounts
  const readerAccounts = [
    { email: 'reader1@example.com', password: 'reader1pass123' },
    { email: 'reader2@example.com', password: 'reader2pass123' },
    { email: 'reader3@example.com', password: 'reader3pass123' },
    { email: 'reader4@example.com', password: 'reader4pass123' },
    { email: 'reader5@example.com', password: 'reader5pass123' },
  ]

  for (const reader of readerAccounts) {
    await upsertUser({
      email: reader.email,
      password: reader.password,
      roleId: readerRoleId,
      label: 'reader',
    })
  }

  // Keep the original seed accounts for backward compatibility
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

  // Re-check post-write to surface any race or manual tampering.
  await ensureSingleAdmin(adminRoleId, env.seed.adminEmail)

  console.log('\nDone. Demo credentials:')
  console.log(`  admin   ${env.seed.adminEmail}`)
  console.log('\nAuthor accounts:')
  authorAccounts.forEach((a) => console.log(`  ${a.email}`))
  console.log(`  ${env.seed.authorEmail}`)
  console.log('\nReader accounts:')
  readerAccounts.forEach((r) => console.log(`  ${r.email}`))
  console.log(`  ${env.seed.readerEmail}`)

  await pool.end()
}

main().catch(async (err) => {
  console.error('db:seed failed:', err.message)
  await pool.end().catch(() => {})
  process.exit(1)
})
