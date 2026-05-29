import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/common/Button'
import Loader from '../../components/common/Loader'
import { ROUTES } from '../../constants/routes'
import { api } from '../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'saved' | 'comments'

type ProfileData = {
  id: number
  email: string
  role: string
  displayName: string | null
  bio: string | null
  website: string | null
  location: string | null
  createdAt: string
  updatedAt: string
}

// ── Placeholder data shapes ───────────────────────────────────────────────────
type SavedPost = { id: number; title: string; author: string; date: string }
type Comment   = { id: number; post: string; body: string; date: string }

const MOCK_SAVED: SavedPost[] = [
  { id: 1, title: 'Getting started with TypeScript', author: 'alice',  date: 'May 12, 2026' },
  { id: 2, title: 'CSS Grid deep dive',              author: 'bob',    date: 'Apr 30, 2026' },
  { id: 3, title: 'React patterns you should know',  author: 'carol',  date: 'Apr 18, 2026' },
]

const MOCK_COMMENTS: Comment[] = [
  { id: 1, post: 'Getting started with TypeScript', body: 'Really helpful, thanks!',               date: 'May 14, 2026' },
  { id: 2, post: 'CSS Grid deep dive',              body: 'The grid-template-areas tip saved me.', date: 'May 1, 2026'  },
]


// ── Sub-components ────────────────────────────────────────────────────────────

function OverviewTab({ bio }: { bio: string | null }) {
  return (
    <div className="profile-tab-panel">
      <h3 className="profile-tab-panel__heading">About</h3>
      {bio?.trim() ? (
        <p className="profile-tab-panel__bio">{bio}</p>
      ) : (
        <p className="profile-tab-panel__empty">No bio yet — add one in the sidebar.</p>
      )}
    </div>
  )
}

function SavedTab() {
  if (MOCK_SAVED.length === 0) {
    return (
      <div className="profile-tab-panel">
        <p className="profile-tab-panel__empty">No saved blogs yet.</p>
      </div>
    )
  }
  return (
    <div className="profile-tab-panel">
      <ul className="profile-post-list" aria-label="Saved blogs">
        {MOCK_SAVED.map((post) => (
          <li key={post.id} className="profile-post-list__item">
            <span className="profile-post-list__title">{post.title}</span>
            <span className="profile-post-list__meta">
              by <strong>{post.author}</strong> · {post.date}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CommentsTab() {
  if (MOCK_COMMENTS.length === 0) {
    return (
      <div className="profile-tab-panel">
        <p className="profile-tab-panel__empty">No comments yet.</p>
      </div>
    )
  }
  return (
    <div className="profile-tab-panel">
      <ul className="profile-comment-list" aria-label="Your comments">
        {MOCK_COMMENTS.map((c) => (
          <li key={c.id} className="profile-comment-list__item">
            <p className="profile-comment-list__body">"{c.body}"</p>
            <span className="profile-comment-list__meta">
              on <strong>{c.post}</strong> · {c.date}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}


// ── Main component ────────────────────────────────────────────────────────────

function Profile() {
  const { user, loading: authLoading, logout } = useAuth()
  const navigate = useNavigate()

  // Remote profile state
  const [profile, setProfile]       = useState<ProfileData | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Edit form state — mirrors the profile fields
  const [displayName, setDisplayName] = useState('')
  const [bio,         setBio]         = useState('')
  const [website,     setWebsite]     = useState('')
  const [location,    setLocation]    = useState('')
  const [editMode,    setEditMode]    = useState(false)
  const [saveStatus,  setSaveStatus]  = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError,   setSaveError]   = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Load profile from API
  const loadProfile = useCallback(async () => {
    setFetchError(null)
    try {
      const data = await api.get<ProfileData>('/profile/me')
      setProfile(data)
      // Seed edit fields from fetched data
      setDisplayName(data.displayName ?? '')
      setBio(data.bio ?? '')
      setWebsite(data.website ?? '')
      setLocation(data.location ?? '')
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load profile.')
    }
  }, [])

  useEffect(() => {
    if (!authLoading) void loadProfile()
  }, [authLoading, loadProfile])

  if (authLoading || (!profile && !fetchError)) return <Loader />

  const avatarInitial = (displayName || profile?.email || user?.email || '?')[0].toUpperCase()

  function handleEditOpen() {
    // Re-seed form from current profile before opening
    setDisplayName(profile?.displayName ?? '')
    setBio(profile?.bio ?? '')
    setWebsite(profile?.website ?? '')
    setLocation(profile?.location ?? '')
    setSaveStatus('idle')
    setSaveError(null)
    setEditMode(true)
  }

  async function handleSave() {
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const updated = await api.patch<ProfileData>('/profile/me', {
        displayName: displayName.trim() || null,
        bio:         bio.trim()         || null,
        website:     website.trim()     || null,
        location:    location.trim()    || null,
      })
      setProfile(updated)
      setSaveStatus('saved')
      setEditMode(false)
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed.')
      setSaveStatus('error')
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview'    },
    { id: 'saved',    label: 'Saved blogs' },
    { id: 'comments', label: 'Comments'   },
  ]

  return (
    <div className="page-reset profile-dark">
    <div className="profile-layout">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <aside className="profile-sidebar" aria-label="Profile details">

        {/* Avatar */}
        <div className="profile-sidebar__avatar" aria-hidden="true">
          {avatarInitial}
        </div>

        {/* Fetch error */}
        {fetchError && (
          <p className="text-xs text-[#f85149] bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg px-3 py-2">
            {fetchError}{' '}
            <button onClick={loadProfile} className="underline">Retry</button>
          </p>
        )}

        {/* Identity */}
        {editMode ? (
          <div className="profile-sidebar__fields">
            <label className="profile-field" htmlFor="profile-display-name">
              <span className="profile-field__label">Display name</span>
              <input
                id="profile-display-name"
                className="profile-field__input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                maxLength={100}
              />
            </label>

            <label className="profile-field" htmlFor="profile-bio">
              <span className="profile-field__label">Bio</span>
              <textarea
                id="profile-bio"
                className="profile-field__input profile-field__input--textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell readers a bit about yourself"
                rows={4}
                maxLength={2000}
              />
            </label>

            <label className="profile-field" htmlFor="profile-website">
              <span className="profile-field__label">Website</span>
              <input
                id="profile-website"
                className="profile-field__input"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yoursite.com"
                autoComplete="url"
                maxLength={255}
              />
            </label>

            <label className="profile-field" htmlFor="profile-location">
              <span className="profile-field__label">Location</span>
              <input
                id="profile-location"
                className="profile-field__input"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                autoComplete="address-level2"
                maxLength={100}
              />
            </label>

            {saveError && (
              <p className="text-xs text-[#f85149] bg-[#3d1a1a] border border-[#f85149]/30 rounded-lg px-3 py-2" role="alert">
                {saveError}
              </p>
            )}

            <div className="profile-sidebar__actions">
              <Button
                className="profile-btn profile-btn--primary"
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving…' : 'Save profile'}
              </Button>
              <Button
                className="profile-btn profile-btn--ghost"
                onClick={() => setEditMode(false)}
                disabled={saveStatus === 'saving'}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="profile-sidebar__info">
            <h2 className="profile-sidebar__name">{profile?.displayName || profile?.email?.split('@')[0] || '—'}</h2>
            <p className="profile-sidebar__email">{profile?.email ?? user?.email}</p>

            {profile?.bio && (
              <p className="profile-sidebar__bio">{profile.bio}</p>
            )}

            <ul className="profile-sidebar__meta-list">
              {profile?.location && (
                <li className="profile-sidebar__meta-item">
                  <svg className="profile-sidebar__meta-icon" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                    <path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
                  </svg>
                  {profile.location}
                </li>
              )}
              {profile?.website && (
                <li className="profile-sidebar__meta-item">
                  <svg className="profile-sidebar__meta-icon" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm-.5 2.1v1.4a5.5 5.5 0 0 0-3.3 1.6L3.1 4A6.5 6.5 0 0 1 7.5 2.1zm1 0a6.5 6.5 0 0 1 4.4 2l-1.1 1.1A5.5 5.5 0 0 0 8.5 3.5V2.1zM2.1 7.5h1.4a5.5 5.5 0 0 0 1.6 3.3L4 11.9A6.5 6.5 0 0 1 2.1 7.5zm10.4 0h1.4A6.5 6.5 0 0 1 12 11.9l-1.1-1.1a5.5 5.5 0 0 0 1.6-3.3zM7.5 13.9v-1.4a5.5 5.5 0 0 0 3.3-1.6l1.1 1.1a6.5 6.5 0 0 1-4.4 1.9zm1 0a6.5 6.5 0 0 1-4.4-1.9l1.1-1.1a5.5 5.5 0 0 0 3.3 1.6v1.4z"/>
                  </svg>
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="profile-sidebar__link"
                  >
                    {profile.website.replace(/^https?:\/\//, '')}
                  </a>
                </li>
              )}
              <li className="profile-sidebar__meta-item profile-sidebar__meta-item--role">
                <svg className="profile-sidebar__meta-icon" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
                  <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm5 5a5 5 0 0 0-10 0h10z"/>
                </svg>
                {profile?.role ?? user?.role ?? 'reader'}
              </li>
            </ul>

            {saveStatus === 'saved' && (
              <p className="profile-sidebar__save-confirm" role="status">
                Profile saved.
              </p>
            )}

            <Button
              className="profile-btn profile-btn--outline profile-btn--full"
              onClick={handleEditOpen}
            >
              Edit profile
            </Button>

            <Button
              className="profile-btn profile-btn--danger profile-btn--full"
              onClick={() => logout().then(() => navigate(ROUTES.ROOT))}
            >
              Log out
            </Button>
          </div>
        )}
      </aside>

      {/* ── Right main area ───────────────────────────────────────────────── */}
      <main className="profile-main">

        {/* Back to home */}
        <button
          className="profile-back-btn"
          onClick={() => navigate(ROUTES.ROOT)}
          aria-label="Back to home"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="currentColor" width="16" height="16">
            <path d="M10.5 3.5 5 8l5.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          Back to home
        </button>

        {/* Tab nav */}
        <nav className="profile-tabs" aria-label="Profile sections">
          <ul className="profile-tabs__list" role="tablist">
            {tabs.map(({ id, label }) => (
              <li key={id} role="presentation">
                <button
                  role="tab"
                  id={`profile-tab-${id}`}
                  aria-controls={`profile-panel-${id}`}
                  aria-selected={activeTab === id}
                  className={`profile-tabs__tab${activeTab === id ? ' profile-tabs__tab--active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Tab panels */}
        <div
          id={`profile-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`profile-tab-${activeTab}`}
          className="profile-main__panel"
        >
          {activeTab === 'overview'  && <OverviewTab bio={profile?.bio ?? null} />}
          {activeTab === 'saved'     && <SavedTab />}
          {activeTab === 'comments'  && <CommentsTab />}
        </div>

      </main>
    </div>
    </div>
  )
}

export default Profile
