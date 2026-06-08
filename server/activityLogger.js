import { useEffect, useMemo, useState, useCallback } from "react";
import BASE_URL from "../config";

const CATEGORIES = ["ALL", "AUTH", "ATTENDANCE", "LEAVE", "WORK", "EMPLOYEE"];

const CATEGORY_CONFIG = {
  AUTH:       { color: "#3B82F6", bg: "rgba(59,130,246,0.1)",  label: "Auth",       icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ATTENDANCE: { color: "#14B8A6", bg: "rgba(20,184,166,0.1)",  label: "Attendance", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg> },
  LEAVE:      { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  label: "Leave",      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  WORK:       { color: "#10B981", bg: "rgba(16,185,129,0.1)",  label: "Work",       icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  EMPLOYEE:   { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  label: "Employee",   icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  DEFAULT:    { color: "#64748B", bg: "rgba(100,116,139,0.1)", label: "Other",      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> },
}

const getCfg = (cat) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.DEFAULT

// ── Live relative time — ticks every 30s ──────────────────────────────────────
function useNow() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])
  return now
}

function relativeTime(dateStr, now) {
  const diff = now - new Date(dateStr).getTime()
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(diff / 60000)
  const hrs  = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (secs < 10)  return 'Just now'
  if (secs < 60)  return `${secs}s ago`
  if (mins < 60)  return `${mins}m ago`
  if (hrs  < 24)  return `${hrs}h ago`
  if (days <  7)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fullTime(dateStr) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

// Today's date as YYYY-MM-DD for date inputs
const todayISO = () => new Date().toISOString().split('T')[0]

const PER_PAGE = 20

export default function ActivityLog() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading]       = useState(true)
  const [category, setCategory]     = useState("ALL")
  const [search, setSearch]         = useState("")
  const [fromDate, setFromDate]     = useState("")
  const [toDate, setToDate]         = useState("")
  const [page, setPage]             = useState(1)
  const now = useNow()

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'ALL') params.set('category', category)
      if (fromDate)           params.set('from', fromDate)
      if (toDate)             params.set('to', toDate)
      if (search.trim())      params.set('search', search.trim())

      const res  = await fetch(`${BASE_URL}/api/activity?${params}`)
      const data = await res.json()
      setActivities(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Activity fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [category, fromDate, toDate, search])

  // Refetch whenever filters change (debounced for search)
  useEffect(() => {
    const id = setTimeout(() => fetchActivities(), search ? 400 : 0)
    return () => clearTimeout(id)
  }, [fetchActivities])

  // Reset page on any filter change
  useEffect(() => { setPage(1) }, [category, fromDate, toDate, search])

  const totalPages = Math.ceil(activities.length / PER_PAGE)
  const paginated  = activities.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // Stats
  const todayCount = useMemo(() =>
    activities.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length,
    [activities]
  )
  const catCounts = useMemo(() => {
    const c = {}
    activities.forEach(a => { c[a.category] = (c[a.category] || 0) + 1 })
    return c
  }, [activities])
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  const clearFilters = () => {
    setCategory('ALL'); setFromDate(''); setToDate(''); setSearch('')
  }
  const hasFilters = category !== 'ALL' || fromDate || toDate || search

  const inputStyle = {
    background: 'var(--input-bg, var(--surface2))',
    border: '1px solid var(--card-border)',
    color: 'var(--text-primary)',
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 rounded-full" style={{ background: "#1AABDB" }} />
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Activity Log</h1>
          </div>
          <p className="text-sm ml-3" style={{ color: "var(--text-secondary)" }}>
            System audit trail — employee and admin actions
          </p>
        </div>
        <button onClick={fetchActivities}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1AABDB'; e.currentTarget.style.color = '#1AABDB' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Activities', value: activities.length, color: '#1AABDB', bg: 'rgba(26,171,219,0.08)' },
          { label: "Today's Activities", value: todayCount, color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Most Active Category', value: topCategory, color: getCfg(topCategory).color, bg: getCfg(topCategory).bg },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-5 transition-all duration-200"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'translateY(0)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Category pills ── */}
      <div className="flex gap-2 flex-wrap mb-4">
        {CATEGORIES.map(cat => {
          const cfg   = getCfg(cat)
          const active = category === cat
          const count  = cat === 'ALL' ? activities.length : (catCounts[cat] || 0)
          return (
            <button key={cat} onClick={() => setCategory(cat)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={active
                ? { background: cat === 'ALL' ? '#1AABDB' : cfg.color, color: '#fff' }
                : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }
              }
              onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = cat === 'ALL' ? '#1AABDB' : cfg.color }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--card-border)' }}>
              {cat !== 'ALL' && cfg.icon}
              {cat === 'ALL' ? 'All' : cfg.label}
              <span className="opacity-60 text-xs">({count})</span>
            </button>
          )
        })}
      </div>

      {/* ── Search + date filters ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search employee, action, details…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={inputStyle}
            onFocus={e => e.target.style.border = '1px solid #1AABDB'}
            onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
        </div>

        {/* From date */}
        <div className="relative">
          <label className="absolute -top-2 left-3 text-xs px-1 font-medium"
            style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>From</label>
          <input type="date" value={fromDate}
            max={toDate || todayISO()}
            onChange={e => setFromDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ ...inputStyle, minWidth: 150 }}
            onFocus={e => e.target.style.border = '1px solid #1AABDB'}
            onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
        </div>

        {/* To date */}
        <div className="relative">
          <label className="absolute -top-2 left-3 text-xs px-1 font-medium"
            style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>To</label>
          <input type="date" value={toDate}
            min={fromDate} max={todayISO()}
            onChange={e => setToDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{ ...inputStyle, minWidth: 150 }}
            onFocus={e => e.target.style.border = '1px solid #1AABDB'}
            onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
        </div>

        {/* Quick date shortcuts */}
        <div className="flex gap-2 items-center flex-wrap">
          {[
            { label: 'Today',    from: todayISO(), to: todayISO() },
            { label: 'This week', from: (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0] })(), to: todayISO() },
            { label: 'This month', from: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` })(), to: todayISO() },
          ].map(s => (
            <button key={s.label}
              onClick={() => { setFromDate(s.from); setToDate(s.to) }}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: fromDate === s.from && toDate === s.to ? '#1AABDB' : 'var(--card-bg)',
                color: fromDate === s.from && toDate === s.to ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--card-border)',
              }}>
              {s.label}
            </button>
          ))}

          {/* Clear filters */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Activity table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

        {/* Desktop header */}
        <div className="hidden md:grid px-5 py-3 text-xs font-semibold"
          style={{
            borderBottom: '1px solid var(--card-border)',
            background: 'var(--surface2)',
            color: 'var(--text-secondary)',
            gridTemplateColumns: '170px 160px 130px 1fr 220px',
          }}>
          <span>Time</span>
          <span>Person</span>
          <span>Category</span>
          <span>Action</span>
          <span>Details</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#1AABDB] border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading activities…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(26,171,219,0.08)', color: '#1AABDB' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No activity found</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or date range</p>
          </div>
        ) : paginated.map((activity, i) => {
          const cfg = getCfg(activity.category)
          const isLast = i === paginated.length - 1
          return (
            <div key={activity.id}
              style={{ borderBottom: isLast ? 'none' : '1px solid var(--card-border)' }}>

              {/* ── Desktop row ── */}
              <div className="hidden md:grid px-5 py-3.5 items-center transition-colors text-sm"
                style={{ gridTemplateColumns: '170px 160px 130px 1fr 220px' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Time */}
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {relativeTime(activity.createdAt, now)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {fullTime(activity.createdAt)}
                  </p>
                </div>

                {/* Person */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: activity.employeeName ? '#1AABDB' : '#94A3B8' }}>
                    {activity.employeeName ? activity.employeeName.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {activity.employeeName || 'System'}
                    </p>
                    {activity.empId && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{activity.empId}</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </div>

                {/* Action */}
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {activity.action}
                </p>

                {/* Details */}
                <p className="text-xs truncate" title={activity.details || ''}
                  style={{ color: 'var(--text-secondary)' }}>
                  {activity.details || '—'}
                </p>
              </div>

              {/* ── Mobile row ── */}
              <div className="flex md:hidden gap-3 px-4 py-3.5 items-start"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ background: activity.employeeName ? '#1AABDB' : '#94A3B8' }}>
                  {activity.employeeName ? activity.employeeName.charAt(0).toUpperCase() : 'S'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {activity.employeeName || 'System'}
                    </p>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {relativeTime(activity.createdAt, now)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon}{cfg.label}
                    </span>
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {activity.action}
                    </p>
                  </div>
                  {activity.details && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {activity.details}
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {fullTime(activity.createdAt)}
                  </p>
                </div>
              </div>

            </div>
          )
        })}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1 flex-wrap gap-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, activities.length)} of {activities.length}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
              «
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : Math.min(page - 2 + i, totalPages - 4 + i)
              if (p < 1 || p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-xl text-xs font-semibold transition-all"
                  style={page === p
                    ? { background: '#1AABDB', color: '#fff' }
                    : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
              Next →
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-30"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
              »
            </button>
          </div>
        </div>
      )}
    </div>
  )
}