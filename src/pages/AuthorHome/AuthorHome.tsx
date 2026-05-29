import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import { api } from '../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = 'draft' | 'published' | 'hidden'

type AuthorPost = {
  id: number
  title: string
  body: string
  status: PostStatus
  createdAt: string
  updatedAt: string
}

type ApiPostResponse = {
  posts: AuthorPost[]
}

// ─── Navigation items ─────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: 'All posts',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M0 1.75A.75.75 0 0 1 .75 1h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 1.75Zm0 5A.75.75 0 0 1 .75 6h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 6.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75Z" />
      </svg>
    ),
  },
  {
    label: 'Published',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
      </svg>
    ),
  },
  {
    label: 'Drafts',
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286Z" />
      </svg>
    ),
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PostStatus }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1a4731] text-[#3fb950] border border-[#2ea043]/40">
        <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" aria-hidden="true" />
        Published
      </span>
    )
  }
  if (status === 'hidden') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#2d2d2d] text-[#8b949e] border border-[#30363d]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e]" aria-hidden="true" />
        Hidden
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#2d2208] text-[#d29922] border border-[#9e6a03]/40">
      <span className="w-1.5 h-1.5 rounded-full bg-[#d29922]" aria-hidden="true" />
      Draft
    </span>
  )
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteModal({
  post,
  onConfirm,
  onCancel,
}: {
  post: AuthorPost
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl p-6">
        {/* Warning icon */}
        <div className="w-10 h-10 rounded-full bg-[#3d1a1a] border border-[#f85149]/30 flex items-center justify-center mb-4">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="#f85149" aria-hidden="true">
            <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
          </svg>
        </div>

        <h2 id="delete-modal-title" className="text-[#e6edf3] text-base font-semibold mb-1">
          Delete post?
        </h2>
        <p className="text-[#768390] text-sm mb-1">
          <span className="text-[#adbac7] font-medium">"{post.title}"</span> will be permanently removed.
        </p>
        <p className="text-[#768390] text-sm mb-6">This action cannot be undone.</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-transparent border border-[#30363d] text-[#adbac7] hover:bg-[#21262d] hover:border-[#636e7b] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold bg-[#da3633] hover:bg-[#b91c1c] text-white border border-[#f85149]/30 transition-colors"
          >
            Delete post
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Compose / Edit Screen ────────────────────────────────────────────────────

type ComposeMode = { type: 'create' } | { type: 'edit'; post: AuthorPost }

function ComposeScreen({
  mode,
  onSave,
  onClose,
}: {
  mode: ComposeMode
  onSave: (data: Omit<AuthorPost, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
}) {
  const editing = mode.type === 'edit' ? mode.post : null
  const [title, setTitle] = useState(editing?.title ?? '')
  const [body, setBody] = useState(editing?.body ?? '')
  const [status, setStatus] = useState<PostStatus>(editing?.status ?? 'draft')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (!body.trim()) { setError('Body is required.'); return }
    
    setSaving(true)
    setError(null)
    try {
      await onSave({ title: title.trim(), body: body.trim(), status })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Slide-in panel */}
      <div className="relative z-10 ml-auto w-full max-w-2xl bg-[#0d1117] border-l border-[#30363d] flex flex-col h-full overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#30363d] sticky top-0 bg-[#0d1117] z-10">
          <h2 id="compose-title" className="text-[#e6edf3] text-base font-semibold">
            {mode.type === 'create' ? 'New post' : 'Edit post'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#768390] hover:text-[#e6edf3] transition-colors p-1 rounded-md hover:bg-[#21262d]"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 p-6 flex-1">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="post-title" className="text-xs font-semibold text-[#adbac7] tracking-wide uppercase">
              Title <span className="text-[#f85149]" aria-hidden="true">*</span>
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              placeholder="Give your post a title…"
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#636e7b] focus:outline-none focus:border-[#388bfd] focus:ring-1 focus:ring-[#388bfd] transition-colors"
              required
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="post-body" className="text-xs font-semibold text-[#adbac7] tracking-wide uppercase">
              Body <span className="text-[#f85149]" aria-hidden="true">*</span>
            </label>
            <textarea
              id="post-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your post here…"
              rows={12}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder-[#636e7b] focus:outline-none focus:border-[#388bfd] focus:ring-1 focus:ring-[#388bfd] transition-colors resize-y leading-relaxed"
              required
            />
          </div>

          {/* Error */}
          {error && (
            <p role="alert" className="text-xs text-[#f85149] bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-[#30363d]">
            {/* Status toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#768390]">Save as:</span>
              <div className="flex rounded-lg overflow-hidden border border-[#30363d]">
                {(['draft', 'published', 'hidden'] as PostStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    disabled={saving}
                    className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                      status === s
                        ? 'bg-[#388bfd] text-white'
                        : 'bg-[#161b22] text-[#768390] hover:text-[#adbac7] hover:bg-[#21262d]'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-transparent border border-[#30363d] text-[#adbac7] hover:bg-[#21262d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043]/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : mode.type === 'create' ? 'Publish' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type NavFilter = 'All posts' | 'Published' | 'Drafts'

function AuthorHome() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<AuthorPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState<NavFilter>('All posts')
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AuthorPost | null>(null)

  const initials = user?.email ? user.email[0].toUpperCase() : '?'

  // Fetch posts on mount
  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        const data = await api.get<ApiPostResponse>('/posts/my-posts')
        setPosts(data.posts)
      } catch (err) {
        console.error('Failed to fetch posts:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [])

  const filteredPosts = posts.filter((p) => {
    if (activeNav === 'Published') return p.status === 'published'
    if (activeNav === 'Drafts') return p.status === 'draft'
    return true
  })

  async function handleSave(data: Omit<AuthorPost, 'id' | 'createdAt' | 'updatedAt'>) {
    if (composeMode?.type === 'edit') {
      const id = composeMode.post.id
      const updated = await api.patch<{ post: AuthorPost }>(`/posts/${id}`, data)
      setPosts((prev) => prev.map((p) => p.id === id ? updated.post : p))
    } else {
      const created = await api.post<{ post: AuthorPost }>('/posts', data)
      setPosts((prev) => [created.post, ...prev])
    }
    setComposeMode(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await api.delete(`/posts/${deleteTarget.id}`)
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      console.error('Failed to delete post:', err)
    }
  }

  async function handleLogout() {
    try { await logout() } finally { navigate(ROUTES.LOGIN, { replace: true }) }
  }

  const publishedCount = posts.filter((p) => p.status === 'published').length
  const draftCount = posts.filter((p) => p.status === 'draft').length

  // Format relative time
  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="page-reset min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans text-left">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-[#161b22] border-b border-[#30363d] px-4 h-12 flex items-center gap-3">
        <span className="text-[#e6edf3] font-bold text-sm tracking-tight mr-2 shrink-0">wtvr</span>
        <span className="text-[#636e7b] text-xs">Author desk</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setComposeMode({ type: 'create' })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043]/40 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
            </svg>
            New post
          </button>
          <button
            onClick={() => navigate(ROUTES.PROFILE)}
            aria-label="Go to profile"
            className="w-7 h-7 rounded-full bg-[#388bfd]/20 border border-[#388bfd]/40 text-[#388bfd] text-xs font-bold flex items-center justify-center hover:bg-[#388bfd]/30 transition-colors"
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="max-w-[1100px] mx-auto flex gap-0">

        {/* ── Left sidebar ── */}
        <aside
          className="w-52 shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto border-r border-[#30363d] py-5 px-3 hidden md:flex flex-col gap-6"
          aria-label="Author navigation"
        >
          {/* Author card */}
          <div className="flex flex-col items-center gap-2 px-2 py-3 rounded-xl bg-[#161b22] border border-[#30363d]">
            <div className="w-12 h-12 rounded-full bg-[#388bfd]/20 border-2 border-[#388bfd]/40 text-[#388bfd] text-lg font-bold flex items-center justify-center select-none">
              {initials}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-xs font-semibold text-[#e6edf3] truncate">{user?.email ?? 'Author'}</p>
              <p className="text-[10px] text-[#636e7b] mt-0.5">Author</p>
            </div>
            <div className="flex gap-4 mt-1">
              <div className="text-center">
                <p className="text-sm font-bold text-[#e6edf3] tabular-nums">{publishedCount}</p>
                <p className="text-[10px] text-[#636e7b]">Published</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[#e6edf3] tabular-nums">{draftCount}</p>
                <p className="text-[10px] text-[#636e7b]">Drafts</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav aria-label="Filter posts">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#636e7b] px-2 mb-2">Posts</p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => setActiveNav(item.label as NavFilter)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                      activeNav === item.label
                        ? 'bg-[#21262d] text-[#e6edf3] font-medium'
                        : 'text-[#adbac7] hover:bg-[#21262d] hover:text-[#e6edf3]'
                    }`}
                  >
                    <span className={activeNav === item.label ? 'text-[#388bfd]' : 'text-[#636e7b]'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Bottom links */}
          <div className="mt-auto space-y-0.5 border-t border-[#30363d] pt-4">
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#768390] hover:bg-[#21262d] hover:text-[#adbac7] transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
              </svg>
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#768390] hover:bg-[#21262d] hover:text-[#f85149] transition-colors text-left"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M2 2.75C2 1.784 2.784 1 3.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 2 13.25Zm10.44 4.5-1.97-1.97a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.97-1.97H6.75a.75.75 0 0 1 0-1.5Z" />
              </svg>
              Log out
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0" aria-label="Your posts">
          {/* Section header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] sticky top-12 bg-[#0d1117] z-10">
            <div>
              <h1 className="text-sm font-semibold text-[#e6edf3] m-0" style={{ fontSize: '14px', letterSpacing: 'normal' }}>
                {activeNav}
              </h1>
              <p className="text-[11px] text-[#636e7b] mt-0.5">
                {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
              </p>
            </div>
            <button
              onClick={() => setComposeMode({ type: 'create' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043]/40 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z" />
              </svg>
              New post
            </button>
          </div>

          {/* Post list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#636e7b]">
              <svg className="animate-spin h-8 w-8 mb-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#636e7b]">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="mb-3 opacity-30" aria-hidden="true">
                <path d="M0 1.75A.75.75 0 0 1 .75 1h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 1.75Zm0 5A.75.75 0 0 1 .75 6h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 6.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75Z" />
              </svg>
              <p className="text-sm">No posts here yet.</p>
              <button
                onClick={() => setComposeMode({ type: 'create' })}
                className="mt-4 text-xs text-[#388bfd] hover:underline"
              >
                Write your first post →
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-[#30363d]" role="list">
              {filteredPosts.map((post) => (
                <li
                  key={post.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-[#161b22] transition-colors group"
                >
                  {/* Post info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2
                        className="text-sm font-semibold text-[#e6edf3] leading-snug truncate"
                        style={{ fontSize: '14px', letterSpacing: 'normal', margin: 0 }}
                      >
                        {post.title}
                      </h2>
                      <StatusBadge status={post.status} />
                    </div>
                    <p className="text-xs text-[#768390] line-clamp-2 leading-relaxed mb-2">
                      {post.body}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <time className="text-[10px] text-[#636e7b]">{formatRelativeTime(post.updatedAt)}</time>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setComposeMode({ type: 'edit', post })}
                      aria-label={`Edit "${post.title}"`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#adbac7] bg-[#21262d] border border-[#30363d] hover:border-[#636e7b] hover:text-[#e6edf3] transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286Z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(post)}
                      aria-label={`Delete "${post.title}"`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#f85149] bg-[#3d1a1a] border border-[#f85149]/20 hover:bg-[#da3633] hover:text-white hover:border-[#f85149]/40 transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15ZM6.5 1.75V3h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25Z" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </main>
      </div>

      {/* ── Overlays ── */}
      {composeMode && (
        <ComposeScreen
          mode={composeMode}
          onSave={handleSave}
          onClose={() => setComposeMode(null)}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          post={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default AuthorHome
