import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/common/Button'

// Placeholder records so the page is meaningful before the posts API lands.
// Per APP_DEFINITION.md, posts have id, author_id, title, body, status,
// created_at, updated_at. Replace with GET /api/posts?author=me later.
type AuthorPost = {
  id: number
  title: string
  body: string
  status: 'draft' | 'published'
  updatedAt: string
}

const SAMPLE_AUTHOR_POSTS: AuthorPost[] = [
  {
    id: 101,
    title: 'First thoughts',
    body: 'Just a short note while the editor is still a placeholder.',
    status: 'published',
    updatedAt: '2 days ago',
  },
  {
    id: 102,
    title: 'Untitled draft',
    body: 'Working on a longer piece. Not ready yet.',
    status: 'draft',
    updatedAt: 'yesterday',
  },
]

// Author-only home: a compose panel plus the author's own posts list.
// Readers and admins are routed elsewhere by the router.
function AuthorHome() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [posts, setPosts] = useState<AuthorPost[]>(SAMPLE_AUTHOR_POSTS)
  const [notice, setNotice] = useState<string | null>(null)

  function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !body.trim()) {
      setNotice('Title and body are both required.')
      return
    }
    // Optimistic local insert. Real call lands when the posts API exists.
    const next: AuthorPost = {
      id: Date.now(),
      title: title.trim(),
      body: body.trim(),
      status: 'published',
      updatedAt: 'just now',
    }
    setPosts((current) => [next, ...current])
    setTitle('')
    setBody('')
    setNotice('Saved locally. Backend wiring is pending.')
  }

  function handleEdit(id: number) {
    // No-op until the posts API is wired up.
    setNotice(`Editing post #${id} is not available yet.`)
  }

  function handleDelete(id: number) {
    setPosts((current) => current.filter((p) => p.id !== id))
    setNotice('Removed locally. Backend wiring is pending.')
  }

  return (
    <section className="home-page">
      <header className="home-hero">
        <p className="eyebrow">Author</p>
        <h1>Your desk</h1>
        <p className="lede">
          Welcome back{user ? `, ${user.email}` : ''}. Plain text only — write
          whatever, no formatting needed.
        </p>
      </header>

      <section className="compose">
        <h2>Compose</h2>
        <form onSubmit={handlePublish} noValidate>
          <label htmlFor="compose-title">
            Title
            <input
              id="compose-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label htmlFor="compose-body">
            Body
            <textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              required
            />
          </label>

          {notice && (
            <p className="auth-error" role="status">
              {notice}
            </p>
          )}

          <Button type="submit">Publish</Button>
        </form>
      </section>

      <section className="author-posts">
        <h2>Your posts</h2>
        {posts.length === 0 ? (
          <p>No posts yet. Use the composer above to publish your first.</p>
        ) : (
          <ul className="feed">
            {posts.map((post) => (
              <li key={post.id} className="feed-item">
                <h3>{post.title}</h3>
                <p>{post.body}</p>
                <p className="feed-meta">
                  <span>{post.status}</span>
                  <span aria-hidden="true"> · </span>
                  <time>{post.updatedAt}</time>
                </p>
                <div>
                  <Button onClick={() => handleEdit(post.id)}>Edit</Button>
                  <Button onClick={() => handleDelete(post.id)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}

export default AuthorHome
