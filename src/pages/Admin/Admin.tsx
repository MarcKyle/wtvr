import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import { api } from '../../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type LogOutcome = 'success' | 'failure'

type ActivityLog = {
  id: number
  userId: number | null
  userEmail: string | null
  action: string
  ipAddress: string | null
  outcome: LogOutcome
  createdAt: string // ISO string
}

type LogsResponse = {
  logs: ActivityLog[]
  total: number
  limit: number
  offset: number
}

type Stats = {
  totalUsers: number
  activeUsers: number
  totalAuthors: number
  totalReaders: number
  totalPosts: number
  publishedPosts: number
}

type SortKey = 'userEmail' | 'action' | 'createdAt' | 'outcome'
type SortDir = 'asc' | 'desc'
type NavSection = 'overview' | 'users' | 'posts' | 'reports'
type DateFilter = 'all' | '7' | '30' | '90'
type OutcomeFilter = 'all' | 'success' | 'failure'


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function escapeCSV(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function downloadCSV(logs: ActivityLog[]) {
  const header = 'User,Action,Date,IP,Outcome'
  const rows = logs.map((l) =>
    [
      l.userEmail ?? '(deleted)',
      l.action,
      formatDate(l.createdAt),
      l.ipAddress ?? '',
      l.outcome,
    ]
      .map(escapeCSV)
      .join(','),
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'activity_logs.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function downloadPDF(logs: ActivityLog[]) {
  const rows = logs
    .map(
      (l) => `<tr>
        <td>${l.userEmail ?? '(deleted)'}</td>
        <td>${l.action}</td>
        <td>${formatDate(l.createdAt)}</td>
        <td>${l.ipAddress ?? ''}</td>
        <td>${l.outcome}</td>
      </tr>`,
    )
    .join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Activity Logs</title>
    <style>
      body{font-family:system-ui,sans-serif;font-size:13px;color:#111;padding:24px}
      h1{font-size:18px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #e5e7eb}
      th{background:#f3f4f6;font-weight:600}
      tr:last-child td{border-bottom:none}
    </style></head><body>
    <h1>Activity Logs — exported ${new Date().toLocaleDateString()}</h1>
    <table><thead><tr>
      <th>User</th><th>Action</th><th>Date</th><th>IP</th><th>Outcome</th>
    </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}


// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  color = '#388bfd',
  loading = false,
}: {
  label: string
  value: number
  sub?: string
  color?: string
  loading?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-xl bg-[#161b22] border border-[#30363d]">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#636e7b]">{label}</span>
      {loading ? (
        <span className="h-8 w-16 rounded bg-[#21262d] animate-pulse" />
      ) : (
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>{value}</span>
      )}
      {sub && <span className="text-[11px] text-[#636e7b]">{sub}</span>}
    </div>
  )
}

function OutcomeBadge({ outcome }: { outcome: LogOutcome }) {
  return outcome === 'success' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1a4731] text-[#3fb950] border border-[#2ea043]/40">
      <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" aria-hidden="true" />
      success
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#3d1a1a] text-[#f85149] border border-[#f85149]/30">
      <span className="w-1.5 h-1.5 rounded-full bg-[#f85149]" aria-hidden="true" />
      failure
    </span>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="currentColor"
      className={`inline ml-1 transition-opacity ${active ? 'opacity-100' : 'opacity-30'}`}
      aria-hidden="true"
    >
      {dir === 'asc' || !active
        ? <path d="M5 2 L8 7 L2 7 Z" />
        : <path d="M5 8 L8 3 L2 3 Z" />}
    </svg>
  )
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#3d1a1a] border border-[#f85149]/30 text-[#f85149] text-xs">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onRetry} className="underline hover:no-underline shrink-0">Retry</button>
    </div>
  )
}


// ─── Overview Panel ───────────────────────────────────────────────────────────

function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, l] = await Promise.all([
        api.get<Stats>('/admin/stats'),
        api.get<LogsResponse>('/admin/logs?limit=5&offset=0'),
      ])
      setStats(s)
      setRecentLogs(l.logs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-[#e6edf3] mb-1" style={{ fontSize: '14px', letterSpacing: 'normal', margin: '0 0 4px' }}>
          Platform overview
        </h2>
        <p className="text-xs text-[#636e7b]">A live snapshot of content and user activity across the platform.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard loading={loading} label="Total Posts"    value={stats?.totalPosts ?? 0}     sub={`${stats?.publishedPosts ?? 0} published`} />
        <MetricCard loading={loading} label="Active Users"   value={stats?.activeUsers ?? 0}    sub={`of ${stats?.totalUsers ?? 0} registered`} color="#3fb950" />
        <MetricCard loading={loading} label="Authors"        value={stats?.totalAuthors ?? 0}   sub="registered authors" color="#d29922" />
        <MetricCard loading={loading} label="Readers"        value={stats?.totalReaders ?? 0}   sub="registered readers" color="#a371f7" />
        <MetricCard loading={loading} label="Hidden Posts"   value={(stats?.totalPosts ?? 0) - (stats?.publishedPosts ?? 0)} sub="removed from feed" color="#f85149" />
        <MetricCard loading={loading} label="Total Users"    value={stats?.totalUsers ?? 0}     sub="all roles" color="#636e7b" />
      </div>

      {/* Recent activity preview */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#636e7b] mb-3">Recent activity</p>
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-[#161b22] animate-pulse border border-[#30363d]" />
            ))}
          </div>
        ) : recentLogs.length === 0 ? (
          <p className="text-xs text-[#636e7b]">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[#30363d] rounded-xl border border-[#30363d] overflow-hidden">
            {recentLogs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-2.5 bg-[#161b22] text-xs">
                <span className="font-mono text-[#388bfd] w-36 shrink-0 truncate">{log.userEmail ?? '(deleted)'}</span>
                <span className="text-[#adbac7] flex-1">{log.action}</span>
                <span className="text-[#636e7b] shrink-0">{formatDate(log.createdAt)}</span>
                <OutcomeBadge outcome={log.outcome} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


// ─── Placeholder panels ───────────────────────────────────────────────────────

function PlaceholderPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-[#636e7b] gap-3">
      <svg width="32" height="32" viewBox="0 0 16 16" fill="currentColor" className="opacity-25" aria-hidden="true">
        <path d="M0 1.75A.75.75 0 0 1 .75 1h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 1.75Zm0 5A.75.75 0 0 1 .75 6h14.5a.75.75 0 0 1 0 1.5H.75A.75.75 0 0 1 0 6.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75Z" />
      </svg>
      <p className="text-sm font-medium text-[#adbac7]">{title}</p>
      <p className="text-xs text-center max-w-xs">{description}</p>
    </div>
  )
}

// ─── Reports Panel ────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

function ReportsPanel() {
  const [dateFilter, setDateFilter]       = useState<DateFilter>('all')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('all')
  const [sortKey, setSortKey]             = useState<SortKey>('createdAt')
  const [sortDir, setSortDir]             = useState<SortDir>('desc')
  const [offset, setOffset]               = useState(0)

  const [logs, setLogs]     = useState<ActivityLog[]>([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      })
      if (dateFilter !== 'all') params.set('days', dateFilter)
      if (outcomeFilter !== 'all') params.set('outcome', outcomeFilter)

      const data = await api.get<LogsResponse>(`/admin/logs?${params.toString()}`)
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs.')
    } finally {
      setLoading(false)
    }
  }, [dateFilter, outcomeFilter, offset])

  useEffect(() => { void load() }, [load])

  // Reset to page 0 when filters change
  useEffect(() => { setOffset(0) }, [dateFilter, outcomeFilter])

  // Client-side sort of the current page
  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'createdAt') cmp = a.createdAt.localeCompare(b.createdAt)
      if (sortKey === 'userEmail') cmp = (a.userEmail ?? '').localeCompare(b.userEmail ?? '')
      if (sortKey === 'action')    cmp = a.action.localeCompare(b.action)
      if (sortKey === 'outcome')   cmp = a.outcome.localeCompare(b.outcome)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [logs, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const thClass = (key: SortKey) =>
    `px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest cursor-pointer select-none transition-colors ${
      sortKey === key ? 'text-[#e6edf3]' : 'text-[#636e7b] hover:text-[#adbac7]'
    }`

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-[#e6edf3] mb-1" style={{ fontSize: '14px', letterSpacing: 'normal', margin: '0 0 4px' }}>
          Activity logs
        </h2>
        <p className="text-xs text-[#636e7b]">Live audit trail from the database. Sort columns, filter by date or outcome, then export.</p>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor="date-filter" className="text-[11px] text-[#636e7b] shrink-0">Date range</label>
          <select
            id="date-filter"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="bg-[#21262d] border border-[#30363d] text-[#adbac7] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#388bfd] cursor-pointer"
          >
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label htmlFor="outcome-filter" className="text-[11px] text-[#636e7b] shrink-0">Outcome</label>
          <select
            id="outcome-filter"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as OutcomeFilter)}
            className="bg-[#21262d] border border-[#30363d] text-[#adbac7] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#388bfd] cursor-pointer"
          >
            <option value="all">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>

        <span className="text-[11px] text-[#636e7b] ml-1">
          {loading ? '…' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
        </span>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => downloadCSV(sorted)}
            disabled={loading || sorted.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#21262d] border border-[#30363d] text-[#adbac7] hover:bg-[#30363d] hover:border-[#636e7b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Zm-1-5.47 3.22 3.22a.749.749 0 0 0 1.06 0l3.22-3.22a.749.749 1 0-1.06-1.06l-1.97 1.97V1.75a.75.75 0 0 0-1.5 0v7.69L4.81 7.47a.749.749 1 0-1.06 1.06Z" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => downloadPDF(sorted)}
            disabled={loading || sorted.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#21262d] border border-[#30363d] text-[#adbac7] hover:bg-[#30363d] hover:border-[#636e7b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3.75 1.5a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.5Zm5.75.56v2.19c0 .138.112.25.25.25h2.19Zm-7.25-1.06A1.75 1.75 0 0 1 4 0h5.586c.464 0 .909.184 1.237.513l2.664 2.663A1.75 1.75 0 0 1 14 4.414V13.25A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25V1.75C2 1.288 2.184.843 2.513.513Z" />
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#30363d] overflow-hidden overflow-x-auto">
        <table className="w-full text-xs" role="grid" aria-label="Activity logs">
          <thead>
            <tr className="bg-[#161b22] border-b border-[#30363d]">
              <th className={thClass('userEmail')}  onClick={() => handleSort('userEmail')}>
                User <SortIcon active={sortKey === 'userEmail'} dir={sortDir} />
              </th>
              <th className={thClass('action')}     onClick={() => handleSort('action')}>
                Action <SortIcon active={sortKey === 'action'} dir={sortDir} />
              </th>
              <th className={thClass('createdAt')}  onClick={() => handleSort('createdAt')}>
                Date <SortIcon active={sortKey === 'createdAt'} dir={sortDir} />
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-[#636e7b]">IP</th>
              <th className={thClass('outcome')}    onClick={() => handleSort('outcome')}>
                Outcome <SortIcon active={sortKey === 'outcome'} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="bg-[#0d1117]">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <span className="block h-3 rounded bg-[#21262d] animate-pulse" style={{ width: `${60 + (i * j * 7) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#636e7b]">
                  No entries match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((log) => (
                <tr key={log.id} className="bg-[#0d1117] hover:bg-[#161b22] transition-colors">
                  <td className="px-4 py-2.5 font-mono text-[#388bfd] max-w-[180px] truncate">{log.userEmail ?? '(deleted)'}</td>
                  <td className="px-4 py-2.5 text-[#adbac7]">{log.action}</td>
                  <td className="px-4 py-2.5 text-[#636e7b] whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-2.5 text-[#636e7b] font-mono">{log.ipAddress ?? '—'}</td>
                  <td className="px-4 py-2.5"><OutcomeBadge outcome={log.outcome} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[#636e7b]">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0 || loading}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-[#adbac7] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total || loading}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] border border-[#30363d] text-[#adbac7] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


// ─── Sidebar nav config ───────────────────────────────────────────────────────

const NAV_ITEMS: { section: NavSection; label: string; icon: React.ReactNode }[] = [
  {
    section: 'overview',
    label: 'Overview',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75Zm0 5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Z" />
      </svg>
    ),
  },
  {
    section: 'users',
    label: 'User management',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
      </svg>
    ),
  },
  {
    section: 'posts',
    label: 'Content management',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064l6.286-6.286Z" />
      </svg>
    ),
  },
  {
    section: 'reports',
    label: 'Reports & logs',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 4.28 9.78a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l3.25-3.25a.75.75 0 0 1 1.06 0L9 7.94l4.72-4.72a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
      </svg>
    ),
  },
]


// ─── Main component ───────────────────────────────────────────────────────────

function Admin() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<NavSection>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const initials = user?.email ? user.email[0].toUpperCase() : 'A'

  async function handleLogout() {
    try { await logout() } finally { navigate(ROUTES.LOGIN, { replace: true }) }
  }

  function renderContent() {
    switch (activeSection) {
      case 'overview': return <OverviewPanel />
      case 'users':    return <PlaceholderPanel title="User management" description="Manage user accounts, roles, and access controls. Coming soon." />
      case 'posts':    return <PlaceholderPanel title="Content management" description="Review, hide, or remove posts across all authors. Coming soon." />
      case 'reports':  return <ReportsPanel />
    }
  }

  const activeLabel = NAV_ITEMS.find((n) => n.section === activeSection)?.label ?? ''

  return (
    <div className="page-reset min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans text-left">

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-20 bg-[#161b22] border-b border-[#30363d] px-4 h-12 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle navigation"
          aria-expanded={sidebarOpen}
          className="md:hidden text-[#768390] hover:text-[#e6edf3] p-1 rounded transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75Zm0 5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Z" />
          </svg>
        </button>
        <span className="text-[#e6edf3] font-bold text-sm tracking-tight mr-2 shrink-0">wtvr</span>
        <span className="text-[#636e7b] text-xs hidden sm:inline">Admin console</span>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => navigate(ROUTES.PROFILE)}
            aria-label="Go to profile"
            className="w-7 h-7 rounded-full bg-[#a371f7]/20 border border-[#a371f7]/40 text-[#a371f7] text-xs font-bold flex items-center justify-center hover:bg-[#a371f7]/30 transition-colors"
          >
            {initials}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-[1200px] mx-auto flex gap-0 relative">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Left sidebar ── */}
        <aside
          className={`
            fixed md:sticky top-0 md:top-12 z-40 md:z-auto
            h-screen md:h-[calc(100vh-3rem)]
            w-56 shrink-0 overflow-y-auto
            border-r border-[#30363d] py-5 px-3
            flex flex-col gap-6
            bg-[#0d1117]
            transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          aria-label="Admin navigation"
        >
          {/* Admin badge */}
          <div className="flex flex-col items-center gap-2 px-2 py-3 rounded-xl bg-[#161b22] border border-[#30363d]">
            <div className="w-12 h-12 rounded-full bg-[#a371f7]/20 border-2 border-[#a371f7]/40 text-[#a371f7] text-lg font-bold flex items-center justify-center select-none">
              {initials}
            </div>
            <div className="text-center min-w-0 w-full">
              <p className="text-xs font-semibold text-[#e6edf3] truncate">{user?.email ?? 'Admin'}</p>
              <p className="text-[10px] text-[#a371f7] mt-0.5 font-medium">Administrator</p>
            </div>
          </div>

          {/* Nav */}
          <nav aria-label="Admin sections">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#636e7b] px-2 mb-2">Console</p>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.section}>
                  <button
                    onClick={() => { setActiveSection(item.section); setSidebarOpen(false) }}
                    aria-current={activeSection === item.section ? 'page' : undefined}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                      activeSection === item.section
                        ? 'bg-[#21262d] text-[#e6edf3] font-medium'
                        : 'text-[#adbac7] hover:bg-[#21262d] hover:text-[#e6edf3]'
                    }`}
                  >
                    <span className={activeSection === item.section ? 'text-[#a371f7]' : 'text-[#636e7b]'}>
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
        <main className="flex-1 min-w-0" aria-label={activeLabel}>
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#30363d] sticky top-12 bg-[#0d1117] z-10">
            <div>
              <h1 className="text-sm font-semibold text-[#e6edf3] m-0" style={{ fontSize: '14px', letterSpacing: 'normal' }}>
                {activeLabel}
              </h1>
              <p className="text-[11px] text-[#636e7b] mt-0.5">Admin console</p>
            </div>
          </div>
          <div className="px-5 py-5">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Admin
