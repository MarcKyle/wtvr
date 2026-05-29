import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { pool } from '../pool.js'

export type DbPost = {
  id: number
  authorId: number
  title: string
  body: string
  status: 'draft' | 'published' | 'hidden'
  createdAt: Date
  updatedAt: Date
  // Author info joined from users table
  authorEmail: string
  authorDisplayName: string | null
}

type PostJoinRow = RowDataPacket & {
  id: number
  author_id: number
  title: string
  body: string
  status: 'draft' | 'published' | 'hidden'
  created_at: Date
  updated_at: Date
  author_email: string
  author_display_name: string | null
}

const SELECT_POST = `
  SELECT p.id, p.author_id, p.title, p.body, p.status,
         p.created_at, p.updated_at,
         u.email AS author_email,
         u.display_name AS author_display_name
    FROM posts p
    JOIN users u ON u.id = p.author_id
`

function mapPost(row: PostJoinRow): DbPost {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorEmail: row.author_email,
    authorDisplayName: row.author_display_name,
  }
}

export const postRepo = {
  /** Get all published posts ordered by creation date (newest first) */
  async listPublished(limit: number = 50, offset: number = 0): Promise<DbPost[]> {
    const [rows] = await pool.execute<PostJoinRow[]>(
      `${SELECT_POST}
       WHERE p.status = 'published'
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    )
    return rows.map(mapPost)
  },

  /** Get a single post by ID */
  async findById(id: number): Promise<DbPost | null> {
    const [rows] = await pool.execute<PostJoinRow[]>(
      `${SELECT_POST} WHERE p.id = ? LIMIT 1`,
      [id],
    )
    return rows[0] ? mapPost(rows[0]) : null
  },

  /** Get posts by author ID */
  async findByAuthor(authorId: number, limit: number = 50, offset: number = 0): Promise<DbPost[]> {
    const [rows] = await pool.execute<PostJoinRow[]>(
      `${SELECT_POST}
       WHERE p.author_id = ?
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [authorId, limit, offset],
    )
    return rows.map(mapPost)
  },

  /** Create a new post */
  async create(opts: {
    authorId: number
    title: string
    body: string
    status?: 'draft' | 'published' | 'hidden'
  }): Promise<DbPost> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO posts (author_id, title, body, status)
       VALUES (?, ?, ?, ?)`,
      [opts.authorId, opts.title, opts.body, opts.status ?? 'draft'],
    )
    if (res.affectedRows !== 1) {
      throw new Error('Post insert failed')
    }
    const post = await this.findById(res.insertId)
    if (!post) throw new Error('Post insert succeeded but row not found')
    return post
  },

  /** Update a post */
  async update(
    postId: number,
    fields: {
      title?: string
      body?: string
      status?: 'draft' | 'published' | 'hidden'
    },
  ): Promise<DbPost> {
    const setClauses: string[] = []
    const params: (string | number)[] = []

    if (fields.title !== undefined) { setClauses.push('title = ?'); params.push(fields.title) }
    if (fields.body !== undefined) { setClauses.push('body = ?'); params.push(fields.body) }
    if (fields.status !== undefined) { setClauses.push('status = ?'); params.push(fields.status) }

    if (setClauses.length === 0) {
      const post = await this.findById(postId)
      if (!post) throw new Error('Post not found')
      return post
    }

    params.push(postId)
    await pool.execute(
      `UPDATE posts SET ${setClauses.join(', ')} WHERE id = ?`,
      params,
    )

    const updated = await this.findById(postId)
    if (!updated) throw new Error('Post not found after update')
    return updated
  },

  /** Delete a post */
  async delete(postId: number): Promise<void> {
    const [res] = await pool.execute<ResultSetHeader>(
      'DELETE FROM posts WHERE id = ?',
      [postId],
    )
    if (res.affectedRows === 0) {
      throw new Error('Post not found')
    }
  },
}
