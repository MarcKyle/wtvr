import { Router } from 'express'
import { ERROR_CODES } from '../constants/errors.js'
import { postRepo } from '../db/repositories/postRepo.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = Router()

/**
 * GET /api/posts
 * List all published posts (public access)
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

    const posts = await postRepo.listPublished(limit, offset)

    // Transform to a cleaner response format
    const response = posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      author: {
        id: post.authorId,
        email: post.authorEmail,
        displayName: post.authorDisplayName,
      },
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }))

    res.json({ posts: response })
  } catch (err) {
    logger.error({ err }, 'Failed to list posts')
    res.status(500).json({
      error: 'Failed to retrieve posts',
      code: ERROR_CODES.SERVER_ERROR,
    })
  }
})

/**
 * GET /api/posts/my-posts
 * Get all posts by the authenticated author
 */
router.get('/my-posts', requireAuth, requireRole(['author', 'admin']), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 100)
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0)

    const posts = await postRepo.findByAuthor(req.user!.id, limit, offset)

    const response = posts.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }))

    res.json({ posts: response })
  } catch (err) {
    logger.error({ err }, 'Failed to list author posts')
    res.status(500).json({
      error: 'Failed to retrieve your posts',
      code: ERROR_CODES.SERVER_ERROR,
    })
  }
})

/**
 * GET /api/posts/:id
 * Get a single post by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Invalid post ID',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    const post = await postRepo.findById(postId)
    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
        code: ERROR_CODES.REQUEST_FAILED,
      })
    }

    // Only show published posts to non-authors
    if (post.status !== 'published' && req.user?.id !== post.authorId) {
      return res.status(404).json({
        error: 'Post not found',
        code: ERROR_CODES.REQUEST_FAILED,
      })
    }

    res.json({
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        status: post.status,
        author: {
          id: post.authorId,
          email: post.authorEmail,
          displayName: post.authorDisplayName,
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    })
  } catch (err) {
    logger.error({ err }, 'Failed to get post')
    res.status(500).json({
      error: 'Failed to retrieve post',
      code: ERROR_CODES.SERVER_ERROR,
    })
  }
})

/**
 * POST /api/posts
 * Create a new post (authors only)
 */
router.post('/', requireAuth, requireRole(['author', 'admin']), async (req, res) => {
  try {
    const { title, body, status } = req.body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Title is required',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    if (title.length > 160) {
      return res.status(400).json({
        error: 'Title must be 160 characters or less',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({
        error: 'Body is required',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    if (status && !['draft', 'published', 'hidden'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    const post = await postRepo.create({
      authorId: req.user!.id,
      title: title.trim(),
      body: body.trim(),
      status: status || 'draft',
    })

    res.status(201).json({
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        status: post.status,
        author: {
          id: post.authorId,
          email: post.authorEmail,
          displayName: post.authorDisplayName,
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    })
  } catch (err) {
    logger.error({ err }, 'Failed to create post')
    res.status(500).json({
      error: 'Failed to create post',
      code: ERROR_CODES.SERVER_ERROR,
    })
  }
})

/**
 * PATCH /api/posts/:id
 * Update a post (author or admin only)
 */
router.patch('/:id', requireAuth, requireRole(['author', 'admin']), async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Invalid post ID',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    const existingPost = await postRepo.findById(postId)
    if (!existingPost) {
      return res.status(404).json({
        error: 'Post not found',
        code: ERROR_CODES.REQUEST_FAILED,
      })
    }

    // Only the author or admin can update
    if (existingPost.authorId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Not authorized to update this post',
        code: ERROR_CODES.FORBIDDEN,
      })
    }

    const { title, body, status } = req.body
    const updates: {
      title?: string
      body?: string
      status?: 'draft' | 'published' | 'hidden'
    } = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({
          error: 'Title cannot be empty',
          code: ERROR_CODES.VALIDATION_ERROR,
        })
      }
      if (title.length > 160) {
        return res.status(400).json({
          error: 'Title must be 160 characters or less',
          code: ERROR_CODES.VALIDATION_ERROR,
        })
      }
      updates.title = title.trim()
    }

    if (body !== undefined) {
      if (typeof body !== 'string' || body.trim().length === 0) {
        return res.status(400).json({
          error: 'Body cannot be empty',
          code: ERROR_CODES.VALIDATION_ERROR,
        })
      }
      updates.body = body.trim()
    }

    if (status !== undefined) {
      if (!['draft', 'published', 'hidden'].includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          code: ERROR_CODES.VALIDATION_ERROR,
        })
      }
      updates.status = status
    }

    const post = await postRepo.update(postId, updates)

    res.json({
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        status: post.status,
        author: {
          id: post.authorId,
          email: post.authorEmail,
          displayName: post.authorDisplayName,
        },
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    })
  } catch (err) {
    logger.error({ err }, 'Failed to update post')
    res.status(500).json({
      error: 'Failed to update post',
      code: ERROR_CODES.SERVER_ERROR,
    })
  }
})

/**
 * DELETE /api/posts/:id
 * Delete a post (author or admin only)
 */
router.delete('/:id', requireAuth, requireRole(['author', 'admin']), async (req, res) => {
  try {
    const postId = parseInt(req.params.id)
    if (isNaN(postId)) {
      return res.status(400).json({
        error: 'Invalid post ID',
        code: ERROR_CODES.VALIDATION_ERROR,
      })
    }

    const existingPost = await postRepo.findById(postId)
    if (!existingPost) {
      return res.status(404).json({
        error: 'Post not found',
        code: ERROR_CODES.REQUEST_FAILED,
      })
    }

    // Only the author or admin can delete
    if (existingPost.authorId !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Not authorized to delete this post',
        code: ERROR_CODES.FORBIDDEN,
      })
    }

    await postRepo.delete(postId)

    res.status(204).send()
  } catch (err) {
    logger.error({ err }, 'Failed to delete post')
    res.status(500).json({
      error: 'Failed to delete post',
      code: ERROR_CODES.SERVER_ERROR,
    })
  }
})

export default router
