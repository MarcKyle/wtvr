import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'

// ─── Mock data ────────────────────────────────────────────────────────────────

const FOLLOWED_AUTHORS = [
  { id: 1, handle: 'ada_writes', displayName: 'Ada Lovelace', initials: 'AL', color: '#7c3aed' },
  { id: 2, handle: 'turing_ink', displayName: 'Alan Turing', initials: 'AT', color: '#0ea5e9' },
  { id: 3, handle: 'grace_h', displayName: 'Grace Hopper', initials: 'GH', color: '#10b981' },
  { id: 4, handle: 'djikstra_d', displayName: 'Edsger Dijkstra', initials: 'ED', color: '#f59e0b' },
]

const CATEGORIES = [
  { label: 'All posts', icon: '◈', active: true },
  { label: 'Technology', icon: '⬡' },
  { label: 'Philosophy', icon: '◎' },
  { label: 'Science', icon: '◇' },
  { label: 'Culture', icon: '◉' },
  { label: 'Personal', icon: '◌' },
]

const TRENDING_TOPICS = [
  'consciousness', 'distributed systems', 'stoicism', 'climate',
  'language models', 'urban design', 'epistemology', 'open source',
  'longevity', 'creative writing',
]

const READING_STATS = [
  { label: 'Posts read', value: '92' },
  { label: 'This month', value: '33 posts' },
  { label: 'Avg. read time', value: '4 min' },
  { label: 'Reading streak', value: '12 days' },
]

type FeedItem = {
  id: number
  author: { handle: string; displayName: string; initials: string; color: string }
  action: 'published' | 'recommended'
  title: string
  preview: string
  timestamp: string
  readTime: string
  likes: number
  bookmarks: number
  comments: number
  thumbnailLabel: string
  thumbnailColor: string
}

const FEED: FeedItem[] = [
  {
    id: 1,
    author: { handle: 'ada_writes', displayName: 'Ada Lovelace', initials: 'AL', color: '#7c3aed' },
    action: 'published',
    title: 'On the Nature of Analytical Engines',
    preview: 'The engine can arrange and combine its numerical quantities exactly as if they were letters or any other general symbols — and in fact it might bring out its results in algebraical notation.',
    timestamp: '3 minutes ago',
    readTime: '5 min read',
    likes: 142,
    bookmarks: 38,
    comments: 17,
    thumbnailLabel: 'ESSAY',
    thumbnailColor: '#1e1b4b',
  },
  {
    id: 2,
    author: { handle: 'turing_ink', displayName: 'Alan Turing', initials: 'AT', color: '#0ea5e9' },
    action: 'published',
    title: 'Can Machines Think? A Revisitation',
    preview: 'I propose to consider the question "Can machines think?" This should begin with definitions of the meaning of the terms "machine" and "think" — but the definitions might be framed so as to reflect so far as possible the normal use of the words.',
    timestamp: '23 minutes ago',
    readTime: '8 min read',
    likes: 289,
    bookmarks: 91,
    comments: 44,
    thumbnailLabel: 'THEORY',
    thumbnailColor: '#0c1a2e',
  },
  {
    id: 3,
    author: { handle: 'grace_h', displayName: 'Grace Hopper', initials: 'GH', color: '#10b981' },
    action: 'recommended',
    title: 'The Most Dangerous Phrase in Engineering',
    preview: '"We\'ve always done it this way." Those six words have killed more good ideas than any budget cut or technical constraint. The willingness to question inherited assumptions is the single most valuable trait in any engineer.',
    timestamp: '2 hours ago',
    readTime: '3 min read',
    likes: 517,
    bookmarks: 204,
    comments: 63,
    thumbnailLabel: 'OPINION',
    thumbnailColor: '#052e16',
  },
  {
    id: 4,
    author: { handle: 'djikstra_d', displayName: 'Edsger Dijkstra', initials: 'ED', color: '#f59e0b' },
    action: 'published',
    title: 'Why Simplicity Is the Ultimate Sophistication',
    preview: 'Simplicity is a great virtue but it requires hard work to achieve it and education to appreciate it. And to make matters worse: complexity sells better. We must resist the temptation to equate sophistication with complication.',
    timestamp: '5 hours ago',
    readTime: '6 min read',
    likes: 388,
    bookmarks: 127,
    comments: 29,
    thumbnailLabel: 'CRAFT',
    thumbnailColor: '#1c1400',
  },
  {
    id: 5,
    author: { handle: 'ada_writes', displayName: 'Ada Lovelace', initials: 'AL', color: '#7c3aed' },
    action: 'published',
    title: 'Notes on Imagination and Formal Systems',
    preview: 'Imagination is the faculty of discovering things unknown to us, by forming new combinations of ideas. The Analytical Engine has no power of originating anything — it can only do what we know how to order it to perform.',
    timestamp: '13 hours ago',
    readTime: '4 min read',
    likes: 201,
    bookmarks: 55,
    comments: 11,
    thumbnailLabel: 'NOTES',
    thumbnailColor: '#1e1b4b',
  },
  {
    id: 6,
    author: { handle: 'turing_ink', displayName: 'Alan Turing', initials: 'AT', color: '#0ea5e9' },
    action: 'recommended',
    title: 'Morphogenesis and the Mathematics of Form',
    preview: 'The purpose of this paper is to discuss a possible mechanism by which the genes of a zygote may determine the anatomical structure of the resulting organism. A model of the embryo will be described in which the chemical reaction and diffusion are the only processes assumed.',
    timestamp: '1 day ago',
    readTime: '11 min read',
    likes: 176,
    bookmarks: 82,
    comments: 22,
    thumbnailLabel: 'SCIENCE',
    thumbnailColor: '#0c1a2e',
  },
  {
    id: 7,
    author: { handle: 'grace_h', displayName: 'Grace Hopper', initials: 'GH', color: '#10b981' },
    action: 'published',
    title: 'Debugging as a Way of Thinking',
    preview: 'A ship in port is safe, but that\'s not what ships are for. The same is true of software. A program that never runs never fails — but it also never does anything. Debugging is not a sign of failure; it is the practice of understanding.',
    timestamp: '2 days ago',
    readTime: '5 min read',
    likes: 443,
    bookmarks: 168,
    comments: 37,
    thumbnailLabel: 'CRAFT',
    thumbnailColor: '#052e16',
  },
  {
    id: 8,
    author: { handle: 'djikstra_d', displayName: 'Edsger Dijkstra', initials: 'ED', color: '#f59e0b' },
    action: 'recommended',
    title: 'The Humble Programmer',
    preview: 'The competent programmer is fully aware of the strictly limited size of his own skull; therefore he approaches the programming task in full humility, and among other things he avoids clever tricks like the plague.',
    timestamp: '3 days ago',
    readTime: '7 min read',
    likes: 612,
    bookmarks: 241,
    comments: 58,
    thumbnailLabel: 'CLASSIC',
    thumbnailColor: '#1c1400',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({
  initials,
  color,
  size = 'md',
}: {
  initials: string
  color: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const dim = size === 'sm' ? 'w-6 h-6 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <span
      className={`${dim} rounded-full inline-flex items-center justify-center font-bold shrink-0 select-none`}
      style={{ backgroundColor: color, color: '#fff' }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

function IconBtn({
  label,
  count,
  icon,
}: {
  label: string
  count: number
  icon: React.ReactNode
}) {
  return (
    <button
      aria-label={label}
      className="flex items-center gap-1 text-[#768390] hover:text-[#adbac7] transition-colors text-xs tabular-nums"
    >
      {icon}
      <span>{count}</span>
    </button>
  )
}

function Thumbnail({
  label,
  color,
}: {
  label: string
  color: string
}) {
  return (
    <div
      className="w-16 h-16 rounded shrink-0 flex items-end p-1.5 select-none"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      <span className="text-[9px] font-bold tracking-widest text-white/50 uppercase leading-none">
        {label}
      </span>
    </div>
  )
}

function FeedCard({ item }: { item: FeedItem }) {
  return (
    <article className="px-4 py-3 border-b border-[#30363d] hover:bg-[#161b22] transition-colors cursor-pointer group">
      {/* Author row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar initials={item.author.initials} color={item.author.color} size="sm" />
          <span className="text-[#768390] text-xs truncate">
            <span className="text-[#adbac7] font-medium">{item.author.displayName}</span>
            {' '}
            <span className="text-[#768390]">{item.action}</span>
          </span>
          <span className="text-[#636e7b] text-xs shrink-0">· {item.timestamp}</span>
        </div>
        <button
          aria-label="More options"
          className="text-[#636e7b] hover:text-[#adbac7] transition-colors opacity-0 group-hover:opacity-100 text-sm leading-none px-1"
        >
          ···
        </button>
      </div>

      {/* Content row */}
      <div className="flex gap-3 items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-[#e6edf3] text-sm font-semibold leading-snug mb-1 group-hover:text-white transition-colors line-clamp-1">
            {item.title}
          </h3>
          <p className="text-[#768390] text-xs leading-relaxed line-clamp-2">
            {item.preview}
          </p>
        </div>
        <Thumbnail label={item.thumbnailLabel} color={item.thumbnailColor} />
      </div>

      {/* Interaction row */}
      <div className="flex items-center gap-4 mt-2.5">
        <span className="text-[#636e7b] text-xs">{item.readTime}</span>
        <div className="flex items-center gap-3 ml-auto">
          <IconBtn
            label={`${item.likes} likes`}
            count={item.likes}
            icon={
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
              </svg>
            }
          />
          <IconBtn
            label={`${item.bookmarks} bookmarks`}
            count={item.bookmarks}
            icon={
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M3 2.75C3 1.784 3.784 1 4.75 1h6.5c.966 0 1.75.784 1.75 1.75v11.5a.75.75 0 0 1-1.227.579L8 11.722l-3.773 3.107A.75.75 0 0 1 3 14.25Z" />
              </svg>
            }
          />
          <IconBtn
            label={`${item.comments} comments`}
            count={item.comments}
            icon={
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Z" />
              </svg>
            }
          />
          <button
            aria-label="Share"
            className="text-[#768390] hover:text-[#adbac7] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M7.47 1.97a.75.75 0 0 1 1.06 0l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.31v7.44a.75.75 0 0 1-1.5 0V4.31L4.03 7.53a.75.75 0 0 1-1.06-1.06l4.5-4.5Z" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function ReaderHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All posts')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredFeed = FEED.filter((item) =>
    searchQuery.trim() === '' ||
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.author.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="page-reset min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans text-left">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-[#161b22] border-b border-[#30363d] px-4 h-12 flex items-center gap-3">
        {/* Logo */}
        <span className="text-[#e6edf3] font-bold text-sm tracking-tight mr-2 shrink-0">wtvr</span>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#636e7b] pointer-events-none"
            width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
          >
            <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
          </svg>
          <input
            type="search"
            placeholder="Search posts…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-8 pr-3 py-1 text-xs text-[#e6edf3] placeholder-[#636e7b] focus:outline-none focus:border-[#388bfd] focus:ring-1 focus:ring-[#388bfd] transition-colors"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Notification bell */}
          <button aria-label="Notifications" className="text-[#768390] hover:text-[#e6edf3] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Z" />
            </svg>
          </button>

          {/* User avatar → profile */}
          {user && (
            <button
              onClick={() => navigate(ROUTES.PROFILE)}
              title="Go to profile"
              aria-label="Go to your profile"
              className="flex items-center gap-1.5 text-xs text-[#768390] hover:text-[#e6edf3] transition-colors rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#388bfd]"
            >
              <Avatar
                initials={(user.email ?? '?')[0].toUpperCase()}
                color="#388bfd"
                size="sm"
              />
            </button>
          )}
        </div>
      </div>

      {/* ── Three-column layout ── */}
      <div className="max-w-[1280px] mx-auto flex gap-0">

        {/* ── Left sidebar ── */}
        <aside
          className="w-56 shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto border-r border-[#30363d] py-4 px-3 hidden md:block"
          aria-label="Navigation"
        >
          {/* Home link */}
          <nav>
            <a
              href="#"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium text-[#e6edf3] bg-[#21262d] mb-4"
              aria-current="page"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#768390]" aria-hidden="true">
                <path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366l5.25-4.2Z" />
              </svg>
              Home
            </a>

            {/* Followed authors */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#636e7b] px-2 mb-2">
              Following
            </p>
            <ul className="space-y-0.5 mb-5">
              {FOLLOWED_AUTHORS.map((author) => (
                <li key={author.id}>
                  <a
                    href="#"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#adbac7] hover:bg-[#21262d] hover:text-[#e6edf3] transition-colors"
                  >
                    <Avatar initials={author.initials} color={author.color} size="sm" />
                    <span className="truncate">{author.displayName}</span>
                  </a>
                </li>
              ))}
            </ul>

            {/* Categories */}
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#636e7b] px-2 mb-2">
              Categories
            </p>
            <ul className="space-y-0.5 mb-5">
              {CATEGORIES.map((cat) => (
                <li key={cat.label}>
                  <button
                    onClick={() => setActiveCategory(cat.label)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                      activeCategory === cat.label
                        ? 'bg-[#21262d] text-[#e6edf3] font-medium'
                        : 'text-[#adbac7] hover:bg-[#21262d] hover:text-[#e6edf3]'
                    }`}
                  >
                    <span className="text-[#636e7b] text-sm leading-none w-4 text-center">{cat.icon}</span>
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>

            {/* Misc links */}
            <ul className="space-y-0.5 border-t border-[#30363d] pt-4">
              {['Tags', 'Bookmarks', 'About'].map((label) => (
                <li key={label}>
                  <a
                    href="#"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-[#768390] hover:bg-[#21262d] hover:text-[#adbac7] transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── Central feed ── */}
        <main className="flex-1 min-w-0" aria-label="Article feed">
          {/* Feed header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] sticky top-12 bg-[#0d1117] z-10">
            <h2 className="text-sm font-semibold text-[#e6edf3]">
              {activeCategory}
              <span className="ml-2 text-xs font-normal text-[#636e7b]">
                {filteredFeed.length} posts
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#636e7b] uppercase tracking-widest">Sort:</span>
              <button className="text-xs text-[#388bfd] hover:underline">Latest</button>
            </div>
          </div>

          {/* Feed cards */}
          {filteredFeed.length > 0 ? (
            <div>
              {filteredFeed.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-[#636e7b]">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="mb-3 opacity-40" aria-hidden="true">
                <path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z" />
              </svg>
              <p className="text-sm">No posts match your search.</p>
            </div>
          )}
        </main>

        {/* ── Right sidebar ── */}
        <aside
          className="w-64 shrink-0 sticky top-12 h-[calc(100vh-3rem)] overflow-y-auto border-l border-[#30363d] py-4 px-4 hidden lg:block"
          aria-label="Trending and stats"
        >
          {/* Trending topics */}
          <section aria-labelledby="trending-heading" className="mb-6">
            <h3
              id="trending-heading"
              className="text-xs font-semibold text-[#e6edf3] mb-3"
            >
              Trending topics
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {TRENDING_TOPICS.map((topic) => (
                <button
                  key={topic}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-[#21262d] text-[#adbac7] hover:bg-[#30363d] hover:text-[#e6edf3] border border-[#30363d] hover:border-[#636e7b] transition-colors"
                >
                  {topic}
                </button>
              ))}
            </div>
            <button className="mt-3 text-xs text-[#388bfd] hover:underline">
              See more…
            </button>
          </section>

          {/* Reading stats */}
          <section aria-labelledby="stats-heading" className="mb-6">
            <h3
              id="stats-heading"
              className="text-xs font-semibold text-[#e6edf3] mb-3"
            >
              Reading stats
            </h3>
            <dl className="space-y-2">
              {READING_STATS.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <dt className="text-xs text-[#768390]">{stat.label}</dt>
                  <dd className="text-xs font-semibold text-[#adbac7] tabular-nums">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Suggested authors */}
          <section aria-labelledby="suggested-heading">
            <h3
              id="suggested-heading"
              className="text-xs font-semibold text-[#e6edf3] mb-3"
            >
              Suggested authors
            </h3>
            <ul className="space-y-3">
              {FOLLOWED_AUTHORS.slice(0, 3).map((author) => (
                <li key={author.id} className="flex items-center gap-2">
                  <Avatar initials={author.initials} color={author.color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#adbac7] truncate">{author.displayName}</p>
                    <p className="text-[10px] text-[#636e7b] truncate">@{author.handle}</p>
                  </div>
                  <button className="text-[11px] px-2 py-0.5 rounded-full border border-[#30363d] text-[#adbac7] hover:bg-[#21262d] hover:border-[#636e7b] transition-colors shrink-0">
                    Follow
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

export default ReaderHome
