import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

function formatDateIN(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getDayCount(fromDate, toDate, isHalfDay) {
  if (isHalfDay) return '0.5'
  if (!fromDate || !toDate) return '1'
  const days = Math.floor((new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? String(days) : '1'
}

function DaysBadge({ leave }) {
  const days = getDayCount(leave.fromDate || leave.date, leave.toDate || leave.date, leave.isHalfDay)
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
      background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
    }}>
      {days}d
    </span>
  )
}

function TypeBadge({ leave }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{
        padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
        width: 'fit-content',
        background: leave.type === 'WFH' ? 'rgba(59,130,246,0.12)' : 'rgba(100,116,139,0.12)',
        color: leave.type === 'WFH' ? '#2563eb' : '#475569',
      }}>{leave.type}</span>
      {leave.isHalfDay && (
        <span style={{
          padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          width: 'fit-content',
          background: 'rgba(168,85,247,0.1)', color: '#a855f7',
        }}>
          {leave.halfDaySession}
        </span>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    Approved: { background: 'rgba(16,185,129,0.12)', color: '#059669' },
    Rejected: { background: 'rgba(239,68,68,0.12)',  color: '#DC2626' },
    Pending:  { background: 'rgba(245,158,11,0.12)', color: '#D97706' },
  }
  const s = styles[status] || styles.Pending
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
      whiteSpace: 'nowrap', ...s,
    }}>{status}</span>
  )
}

function exportCSV(data) {
  const headers = ['Employee', 'Emp ID', 'Department', 'From', 'To', 'Days', 'Type', 'Half Day', 'Session', 'Reason', 'Status', 'Applied On']
  const rows = data.map(l => [
    l.employee?.name || '',
    l.empId,
    l.employee?.department || '',
    formatDateIN(l.fromDate || l.date),
    formatDateIN(l.toDate || l.date),
    getDayCount(l.fromDate || l.date, l.toDate || l.date, l.isHalfDay),
    l.type,
    l.isHalfDay ? 'Yes' : 'No',
    l.halfDaySession || '',
    l.reason,
    l.status,
    formatDateIN(l.createdAt),
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leave_requests_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest first' },
  { value: 'date_asc',  label: 'Oldest first' },
  { value: 'name_asc',  label: 'Name A→Z' },
  { value: 'name_desc', label: 'Name Z→A' },
  { value: 'days_desc', label: 'Most days' },
]

export default function AdminLeave() {
  const [leaves, setLeaves]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [updating, setUpdating]       = useState(null)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('Pending')
  const [typeFilter, setTypeFilter]   = useState('All')
  const [deptFilter, setDeptFilter]   = useState('All')
  const [dateFrom, setDateFrom]       = useState('')
  const [dateTo, setDateTo]           = useState('')
  const [sortBy, setSortBy]           = useState('date_desc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [isMobile, setIsMobile]       = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => { fetchLeaves() }, [])

  const fetchLeaves = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${BASE_URL}/api/leave`)
      setLeaves(res.data)
    } catch { setError('Failed to fetch leave requests') }
    finally { setLoading(false) }
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await axios.put(`${BASE_URL}/api/leave/${id}`, { status })
      setLeaves(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    } catch { setError('Failed to update leave status') }
    finally { setUpdating(null) }
  }
  const deleteLeave = async (id) => {
  if (!window.confirm('Are you sure you want to delete this leave request?')) return
  try {
    await axios.delete(`${BASE_URL}/api/leave/${id}`)
    fetchLeaves()
  } catch {
    setError('Failed to delete leave request')
  }
  }

  const departments = useMemo(() =>
    ['All', ...new Set(leaves.map(l => l.employee?.department).filter(Boolean))],
    [leaves]
  )

  const filtered = useMemo(() => {
    let result = leaves
    if (statusFilter !== 'All') result = result.filter(l => l.status === statusFilter)
    if (typeFilter !== 'All')   result = result.filter(l => l.type === typeFilter)
    if (deptFilter !== 'All')   result = result.filter(l => l.employee?.department === deptFilter)
    if (dateFrom) result = result.filter(l => new Date(l.fromDate || l.date) >= new Date(dateFrom))
    if (dateTo)   result = result.filter(l => new Date(l.fromDate || l.date) <= new Date(dateTo + 'T23:59:59'))
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.employee?.name?.toLowerCase().includes(q) ||
        l.empId?.toLowerCase().includes(q) ||
        l.reason?.toLowerCase().includes(q)
      )
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.fromDate || b.date) - new Date(a.fromDate || a.date)
      if (sortBy === 'date_asc')  return new Date(a.fromDate || a.date) - new Date(b.fromDate || b.date)
      if (sortBy === 'name_asc')  return (a.employee?.name || '').localeCompare(b.employee?.name || '')
      if (sortBy === 'name_desc') return (b.employee?.name || '').localeCompare(a.employee?.name || '')
      if (sortBy === 'days_desc') return parseFloat(getDayCount(b.fromDate||b.date,b.toDate||b.date,b.isHalfDay)) - parseFloat(getDayCount(a.fromDate||a.date,a.toDate||a.date,a.isHalfDay))
      return 0
    })
  }, [leaves, statusFilter, typeFilter, deptFilter, dateFrom, dateTo, search, sortBy])

  const pendingCount  = leaves.filter(l => l.status === 'Pending').length
  const approvedCount = leaves.filter(l => l.status === 'Approved').length
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length
  const totalDays     = leaves.filter(l => l.status === 'Approved')
    .reduce((sum, l) => sum + parseFloat(getDayCount(l.fromDate||l.date, l.toDate||l.date, l.isHalfDay)), 0)

  const hasActiveFilters = typeFilter !== 'All' || deptFilter !== 'All' || dateFrom || dateTo || search

  const clearAllFilters = () => {
    setSearch(''); setTypeFilter('All'); setDeptFilter('All')
    setDateFrom(''); setDateTo(''); setSortBy('date_desc')
  }

  const inputStyle = {
    background: 'var(--surface2, rgba(0,0,0,0.03))',
    border: '1px solid var(--card-border)',
    color: 'var(--text-primary)',
    borderRadius: 10,
    fontSize: 12,
    outline: 'none',
    fontFamily: 'inherit',
    padding: '6px 12px',
  }

  const statPills = [
    { label: 'Pending',       value: pendingCount,         color: '#D97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  onClick: () => setStatusFilter('Pending')  },
    { label: 'Deleted',       value: leaves.filter(l => l.status === 'Deleted').length, color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', onClick: () => setStatusFilter('Deleted')  },
    { label: 'Approved',      value: approvedCount,        color: '#059669', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)', onClick: () => setStatusFilter('Approved') },
    { label: 'Rejected',      value: rejectedCount,        color: '#DC2626', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  onClick: () => setStatusFilter('Rejected') },
    { label: 'Approved Days', value: `${totalDays}d`,      color: '#1AABDB', bg: 'rgba(26,171,219,0.08)', border: 'rgba(26,171,219,0.2)', onClick: () => {}                          },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 999, background: '#1AABDB', flexShrink: 0 }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Leave Requests</h1>
          </div>
          <p style={{ fontSize: 14, margin: '0 0 0 12px', color: 'var(--text-secondary)' }}>
            Manage and approve employee leave and WFH requests
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px', borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
            border: '1px solid rgba(26,171,219,0.2)', cursor: 'pointer',
            flexShrink: 0, fontFamily: 'inherit', transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.1)'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {isMobile ? 'CSV' : 'Export CSV'}
        </button>
      </div>

      {/* ── Stat pills ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 24,
      }}>
        {statPills.map(s => (
          <button key={s.label} onClick={s.onClick}
            style={{
              background: s.bg, border: `1px solid ${s.border}`,
              borderRadius: 16, padding: 16, textAlign: 'left',
              cursor: 'pointer', transition: 'transform 0.15s', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <p style={{ fontSize: 11, fontWeight: 500, margin: '0 0 4px', color: s.color, whiteSpace: 'nowrap' }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
          </button>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 16, marginBottom: 20, overflow: 'hidden',
      }}>
        {/* Always-visible row */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12,
          padding: '12px 16px',
          borderBottom: filtersOpen ? '1px solid var(--card-border)' : 'none',
        }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['All', 'Pending', 'Approved', 'Rejected'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 8, fontWeight: 600,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4, transition: 'background 0.15s',
                  ...(statusFilter === f
                    ? { background: '#1AABDB', color: '#fff' }
                    : { background: 'var(--surface2, rgba(0,0,0,0.04))', color: 'var(--text-secondary)' }
                  ),
                }}>
                {f}
                {f === 'Pending' && pendingCount > 0 && statusFilter !== 'Pending' && (
                  <span style={{
                    background: '#FBBF24', color: '#78350F',
                    borderRadius: 999, padding: '0 6px', fontSize: 11, fontWeight: 700,
                  }}>{pendingCount}</span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, reason…"
              style={{ ...inputStyle, paddingLeft: 30, width: isMobile ? '100%' : 176 }}
              onFocus={e => e.target.style.border = '1px solid #1AABDB'}
              onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
          </div>

          {/* Filter toggle */}
          <button onClick={() => setFiltersOpen(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'background 0.15s',
              ...(filtersOpen || hasActiveFilters
                ? { background: '#1AABDB', color: '#fff' }
                : { background: 'var(--surface2, rgba(0,0,0,0.04))', color: 'var(--text-secondary)' }
              ),
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filters {hasActiveFilters && '•'}
          </button>
        </div>

        {/* Expandable advanced filters */}
        {filtersOpen && (
          <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

            {/* Type */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-muted)' }}>Type</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {['All', 'Leave', 'WFH'].map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    style={{
                      fontSize: 12, padding: '6px 12px', borderRadius: 8, fontWeight: 600,
                      cursor: 'pointer', border: 'none', fontFamily: 'inherit', transition: 'background 0.15s',
                      ...(typeFilter === t
                        ? { background: t === 'WFH' ? '#3b82f6' : '#64748b', color: '#fff' }
                        : { background: 'var(--surface2, rgba(0,0,0,0.04))', color: 'var(--text-secondary)' }
                      ),
                    }}>
                    {t === 'All' ? 'All Types' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Department */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-muted)' }}>Department</p>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                style={{ ...inputStyle, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                onBlur={e => e.target.style.border = '1px solid var(--card-border)'}>
                {departments.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Date from */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-muted)' }}>From date</p>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
            </div>

            {/* Date to */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-muted)' }}>To date</p>
              <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
                style={inputStyle}
                onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
            </div>

            {/* Sort */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-muted)' }}>Sort by</p>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ ...inputStyle, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                onBlur={e => e.target.style.border = '1px solid var(--card-border)'}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {hasActiveFilters && (
              <button onClick={clearAllFilters}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  color: '#EF4444', background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                  fontFamily: 'inherit', alignSelf: 'flex-end',
                }}>
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Result count */}
      <p style={{ fontSize: 12, marginBottom: 12, color: 'var(--text-muted)' }}>
        {filtered.length} request{filtered.length !== 1 ? 's' : ''}
        {hasActiveFilters ? ' matching filters' : ''}
      </p>

      {error && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 16, fontSize: 14,
          background: 'rgba(239,68,68,0.08)', color: '#EF4444',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 64 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '2px solid #1AABDB', borderTopColor: 'transparent',
              animation: 'spin 0.7s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16, margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(26,171,219,0.08)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, margin: '0 0 8px', color: 'var(--text-secondary)' }}>No requests found</p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters}
                style={{ fontSize: 12, color: '#1AABDB', background: 'none', border: 'none', cursor: 'pointer' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--card-border)' }}>
                  {['Employee', 'Dept', 'From', 'To', 'Days', 'Type', 'Reason', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 11, fontWeight: 600,
                      padding: '12px 16px', color: 'var(--text-secondary)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(leave => (
                  <tr key={leave.id}
                    style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>

                    {/* Employee */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: '#1AABDB',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {leave.employee?.name?.charAt(0)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 1px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {leave.employee?.name}
                          </p>
                          <p style={{ fontSize: 11, margin: 0, color: 'var(--text-muted)' }}>{leave.empId}</p>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {leave.employee?.department || '—'}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {formatDateIN(leave.fromDate || leave.date)}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {formatDateIN(leave.toDate || leave.date)}
                    </td>

                    <td style={{ padding: '12px 16px' }}><DaysBadge leave={leave} /></td>

                    <td style={{ padding: '12px 16px' }}><TypeBadge leave={leave} /></td>

                    <td style={{ padding: '12px 16px', fontSize: 12, maxWidth: 150, color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={leave.reason}>{leave.reason}</span>
                    </td>

                    <td style={{ padding: '12px 16px' }}><StatusBadge status={leave.status} /></td>

                    <td style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                       display: 'flex',
                       gap: 6,
                       alignItems: 'center',
                       flexWrap: 'wrap',
                      }}
                    >
                     {leave.status === 'Pending' ? (
                      <>
                         <button
                           onClick={() => updateStatus(leave.id, 'Approved')}
                           disabled={updating === leave.id}
                           style={{
                             background: '#16a34a',
                             color: '#fff',
                             border: 'none',
                             padding: '4px 10px',
                             borderRadius: 8,
                             fontSize: 11,
                             fontWeight: 600,
                             cursor: 'pointer',
                             whiteSpace: 'nowrap',
                             fontFamily: 'inherit',
                            opacity: updating === leave.id ? 0.5 : 1,
                         }}
        >
          Approve
        </button>

        <button
          onClick={() => updateStatus(leave.id, 'Rejected')}
          disabled={updating === leave.id}
          style={{
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
            opacity: updating === leave.id ? 0.5 : 1,
          }}
        >
          Reject
        </button>
      </>
    ) : (
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        —
      </span>
    )}

    <button
      onClick={() => deleteLeave(leave.id)}
      style={{
        background: 'rgba(239,68,68,0.1)',
        color: '#EF4444',
        border: '1px solid rgba(239,68,68,0.2)',
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')
      }
    >
      Delete
    </button>
                    </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}