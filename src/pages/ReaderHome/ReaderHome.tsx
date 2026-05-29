import { useAuth } from '../../hooks/useAuth'

// Placeholder records so the layout is meaningful before the posts API
// lands. Replace with a fetch from /api/posts once the backend is wired up.
type FeedItem = {
  id: number
  title: string
  excerpt: string
  author: string
  publishedAt: string
}

const SAMPLE_FEED: FeedItem[] = [
  {
    id: 1,
    title: 'Welcome to WTVR',
    excerpt:
      'A small, text-only space for whatever is on your mind. No images, no embeds, no fluff.',
    author: 'wtvr-team',
    publishedAt: 'just now',
  },
  {
    id: 2,
    title: 'On writing without distractions',
    excerpt:
      'When the page is just words, the work is just thinking. That is the whole pitch.',
    author: 'jane.doe',
    publishedAt: '2 hours ago',
  },
]

// Reader-only home: a feed of recent posts. Authors and admins are routed to
// their own dashboards by the router, so this page assumes a reader audience.
function ReaderHome() {
  const { user } = useAuth()

  return (
    <section className="home-page">
      <header className="home-hero">
        <p className="eyebrow">Reader</p>
        <h1>Today on WTVR</h1>
        <p className="lede">
          Welcome back{user ? `, ${user.email}` : ''}. Here are the latest
          posts from the community.
        </p>
      </header>

      <ul className="feed">
        {SAMPLE_FEED.map((item) => (
          <li key={item.id} className="feed-item">
            <h2>{item.title}</h2>
            <p>{item.excerpt}</p>
            <p className="feed-meta">
              <span>@{item.author}</span>
              <span aria-hidden="true"> · </span>
              <time>{item.publishedAt}</time>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ReaderHome
