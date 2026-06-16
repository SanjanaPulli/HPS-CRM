import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import BASE_URL from '../config'
import EmployeeCalendar from './EmployeeCalender'   // ← add this import

const LeaveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="12" y2="17"/>
  </svg>
)
const WFHIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)
const PermissionIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)
const OnDutyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/>
    <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)

const TYPE_CONFIG = {
  Leave:      { label: 'Leave',      color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
  WFH:        { label: 'WFH',        color: '#1AABDB', bg: 'rgba(26,171,219,0.1)',  border: 'rgba(26,171,219,0.2)'  },
  Permission: { label: 'Permission', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)'  },
  'On Duty':  { label: 'On Duty',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.2)'  },
}

const HOLIDAY_COLORS = {
  National: { bg: 'rgba(239,68,68,0.1)',  color: '#DC2626', border: 'rgba(239,68,68,0.2)'  },
  Optional: { bg: 'rgba(245,158,11,0.1)', color: '#D97706', border: 'rgba(245,158,11,0.2)' },
  Company:  { bg: 'rgba(139,92,246,0.1)', color: '#7C3AED', border: 'rgba(139,92,246,0.2)' },
}

function resolveType(leave) {
  if (leave.type && TYPE_CONFIG[leave.type]) return leave.type
  if (leave.fromTime || leave.toTime) return 'Permission'
  return 'Leave'
}

function getDayCount(from, to, isHalfDay) {
  if (isHalfDay) return 0.5
  if (!from || !to) return 1
  const days = Math.floor((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? days : 1
}

function formatDateIN(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calcHours(fromTime, toTime) {
  if (!fromTime || !toTime) return null
  const [fh, fm] = fromTime.split(':').map(Number)
  const [th, tm] = toTime.split(':').map(Number)
  const mins = (th * 60 + tm) - (fh * 60 + fm)
  if (mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function getHolidayForDate(dateStr, holidays) {
  if (!dateStr || !holidays.length) return null
  return holidays.find(h => new Date(h.date).toISOString().split('T')[0] === dateStr) || null
}

function getHolidaysInRange(fromDate, toDate, holidays) {
  if (!fromDate || !toDate || !holidays.length) return []
  const from = new Date(fromDate)
  const to   = new Date(toDate)
  return holidays.filter(h => {
    const d = new Date(h.date)
    return d >= from && d <= to
  })
}

function HolidayBanner({ holiday }) {
  if (!holiday) return null
  const c = HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.National
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 10, fontSize: 13,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <div>
        <strong>{holiday.name}</strong> is a <strong>{holiday.type}</strong> holiday.
        {holiday.type === 'National' && ' You may not need to apply for leave.'}
        {holiday.type === 'Optional' && ' This is an optional holiday — check with your team lead.'}
        {holiday.type === 'Company'  && ' This is a company holiday — office is closed.'}
      </div>
    </div>
  )
}

function HolidaysInRangeBanner({ holidays }) {
  if (!holidays.length) return null
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, fontSize: 13,
      background: 'rgba(245,158,11,0.08)', color: '#D97706',
      border: '1px solid rgba(245,158,11,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontWeight: 600 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        {holidays.length} holiday{holidays.length > 1 ? 's' : ''} in this range
      </div>
      {holidays.map(h => (
        <div key={h.id} style={{ fontSize: 12, marginBottom: 2 }}>
          • <strong>{h.name}</strong> — {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', weekday: 'short' })}
          {' '}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999,
            background: HOLIDAY_COLORS[h.type]?.bg, color: HOLIDAY_COLORS[h.type]?.color,
          }}>{h.type}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function EmployeeLeave() {
  const navigate = useNavigate()
  const [myLeaves, setMyLeaves]       = useState([])
  const [employee, setEmployee]       = useState(null)
  const [holidays, setHolidays]       = useState([])
  const [requestType, setRequestType] = useState('Leave')
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [isMobile, setIsMobile]       = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  // ← NEW: top-level view: 'apply' | 'calendar'
  const [pageView, setPageView] = useState('apply')

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    fromDate: '', toDate: '', reason: '',
    isHalfDay: false, halfDaySession: 'Morning',
    fromTime: '', toTime: '',
  })

  useEffect(() => {
    const stored = localStorage.getItem('employeeAuth')
    if (!stored) { navigate('/employee/login'); return }
    const emp = JSON.parse(stored)
    setEmployee(emp)
    fetchMyLeaves(emp.empId)
    fetchHolidays()
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (form.isHalfDay && form.fromDate) {
      setForm(p => ({ ...p, toDate: p.fromDate }))
    }
  }, [form.isHalfDay, form.fromDate])

  useEffect(() => {
    setForm({ fromDate: '', toDate: '', reason: '', isHalfDay: false, halfDaySession: 'Morning', fromTime: '', toTime: '' })
    setError('')
    setSuccess('')
  }, [requestType])

  const fetchMyLeaves = async (empId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/leave/${empId}`)
      const sorted = [...res.data].sort((a, b) =>
        new Date(b.fromDate || b.date || 0) - new Date(a.fromDate || a.date || 0)
      )
      setMyLeaves(sorted)
    } catch {
      setError('Failed to fetch leave history')
    }
  }

  const fetchHolidays = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/holidays`)
      setHolidays(res.data)
    } catch { /* silently fail */ }
  }

  const singleDayHoliday = getHolidayForDate(form.fromDate, holidays)
  const isPermission      = requestType === 'Permission'
  const isOnDuty          = requestType === 'On Duty'
  const rangeHolidays     = (!isPermission && form.fromDate && form.toDate && form.fromDate !== form.toDate)
    ? getHolidaysInRange(form.fromDate, form.toDate, holidays)
    : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')

    if (requestType === 'Permission') {
      if (!form.fromDate)  return setError('Please select a date')
      if (!form.fromTime)  return setError('Please enter from time')
      if (!form.toTime)    return setError('Please enter to time')
      if (form.toTime <= form.fromTime) return setError('To time must be after from time')
      if (!form.reason.trim()) return setError('Please enter a reason')
    } else {
      if (!form.fromDate)  return setError('Please select a start date')
      if (!form.toDate)    return setError('Please select an end date')
      if (new Date(form.toDate) < new Date(form.fromDate))
        return setError('End date cannot be before start date')
      if (!form.reason.trim()) return setError('Please enter a reason')
    }

    setSubmitting(true)
    try {
      await axios.post(`${BASE_URL}/api/leave`, {
        empId:          employee.empId,
        date:           form.fromDate,
        fromDate:       form.fromDate,
        toDate:         requestType === 'Permission' ? form.fromDate : form.toDate,
        isHalfDay:      form.isHalfDay,
        halfDaySession: form.isHalfDay ? form.halfDaySession : null,
        reason:         form.reason,
        type:           requestType,
        fromTime:       (requestType === 'Permission' || requestType === 'On Duty') ? form.fromTime || null : null,
        toTime:         (requestType === 'Permission' || requestType === 'On Duty') ? form.toTime   || null : null,
      })

      const label = requestType === 'Permission'
        ? `permission (${form.fromTime}–${form.toTime})`
        : requestType === 'On Duty'
          ? (form.fromTime && form.toTime ? `on duty (${form.fromTime}–${form.toTime})` : 'on duty')
          : form.isHalfDay ? '0.5 day' : `${getDayCount(form.fromDate, form.toDate, false)} day(s)`

      setSuccess(`${requestType} request for ${label} submitted! Waiting for admin approval.`)
      setForm({ fromDate: '', toDate: '', reason: '', isHalfDay: false, halfDaySession: 'Morning', fromTime: '', toTime: '' })
      fetchMyLeaves(employee.empId)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const statusStyle = (status) => {
    if (status === 'Approved') return { background: 'rgba(16,185,129,0.1)',  color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
    if (status === 'Rejected') return { background: 'rgba(239,68,68,0.1)',   color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)'  }
    return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }
  }

  const pending  = myLeaves.filter(l => l.status === 'Pending').length
  const approved = myLeaves.filter(l => l.status === 'Approved').length
  const rejected = myLeaves.filter(l => l.status === 'Rejected').length

  const previewDays  = getDayCount(form.fromDate, form.toDate, form.isHalfDay)
  const previewHours = calcHours(form.fromTime, form.toTime)

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border 0.2s',
    background: 'var(--surface2, rgba(255,255,255,0.04))',
    border: '1px solid var(--card-border)', color: 'var(--text-primary)',
  }

  const tabItems = [
    { key: 'Leave',      label: 'Leave',           icon: <LeaveIcon />      },
    { key: 'WFH',        label: 'Work from Home',  icon: <WFHIcon />        },
    { key: 'Permission', label: 'Permission',      icon: <PermissionIcon /> },
    { key: 'On Duty',    label: 'On Duty',         icon: <OnDutyIcon />     },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, borderRadius: 4, background: '#1AABDB', flexShrink: 0 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Leave Portal</h1>
        </div>
        <p style={{ fontSize: 14, margin: '0 0 0 12px', color: 'var(--text-secondary)' }}>
          Apply for leave, WFH, permission or on duty and track approval status
        </p>
      </div>

      {/* ── Page View Toggle (Apply / Calendar) ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        borderRadius: 12, padding: 4,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        width: 'fit-content',
      }}>
        {[
          { key: 'apply',    label: 'Apply & History', icon: <LeaveIcon /> },
          { key: 'calendar', label: 'My Calendar',     icon: <CalendarIcon /> },
        ].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setPageView(key)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            transition: 'all 0.2s', border: 'none', cursor: 'pointer',
            ...(pageView === key
              ? { background: '#1AABDB', color: '#fff', boxShadow: '0 2px 8px rgba(26,171,219,0.3)' }
              : { color: 'var(--text-secondary)', background: 'transparent' })
          }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── Calendar View ── */}
      {pageView === 'calendar' && employee && (
        <EmployeeCalendar empId={employee.empId} />
      )}

      {/* ── Apply View ── */}
      {pageView === 'apply' && (
        <>
          {/* Request type toggle */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 4,
            borderRadius: 12, padding: 4, marginBottom: 24,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            width: 'fit-content'
          }}>
            {tabItems.map(({ key, label, icon }) => (
              <button key={key} type="button" onClick={() => setRequestType(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 8,
                  fontSize: 13, fontWeight: 600,
                  transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                  ...(requestType === key
                    ? { background: '#1AABDB', color: '#fff', boxShadow: '0 2px 8px rgba(26,171,219,0.3)' }
                    : { color: 'var(--text-secondary)', background: 'transparent' })
                }}>
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Form card */}
          <div style={{
            borderRadius: 16, padding: 28, marginBottom: 24,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                  Apply for {requestType === 'WFH' ? 'Work from Home' : requestType}
                </h2>
                <p style={{ fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>
                  Submitting as{' '}
                  <span style={{ color: '#1AABDB', fontWeight: 600 }}>{employee?.name}</span>
                  {' '}· {employee?.empId}
                </p>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(26,171,219,0.1)', color: '#1AABDB', flexShrink: 0
              }}>
                {tabItems.find(t => t.key === requestType)?.icon}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {isPermission ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Date</label>
                    <input type="date" required min={today}
                      value={form.fromDate}
                      onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                      onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                    />
                  </div>
                  {singleDayHoliday && <HolidayBanner holiday={singleDayHoliday} />}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>From Time</label>
                      <input type="time" required value={form.fromTime}
                        onChange={e => setForm(p => ({ ...p, fromTime: e.target.value }))}
                        style={inputStyle}
                        onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                        onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>To Time</label>
                      <input type="time" required value={form.toTime}
                        onChange={e => setForm(p => ({ ...p, toTime: e.target.value }))}
                        style={inputStyle}
                        onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                        onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                      />
                    </div>
                  </div>
                  {previewHours && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                      background: 'rgba(245,158,11,0.1)', color: '#D97706',
                      border: '1px solid rgba(245,158,11,0.2)', alignSelf: 'flex-start'
                    }}>
                      ⏱ {previewHours} permission
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>From Date</label>
                      <input type="date" required min={today}
                        value={form.fromDate}
                        onChange={e => setForm(p => ({
                          ...p, fromDate: e.target.value,
                          toDate: p.isHalfDay ? e.target.value : (p.toDate < e.target.value ? e.target.value : p.toDate)
                        }))}
                        style={inputStyle}
                        onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                        onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                        To Date{form.isHalfDay && <span style={{ color: '#1AABDB' }}> (same as from — half day)</span>}
                      </label>
                      <input type="date" required
                        min={form.fromDate || today}
                        value={form.toDate}
                        disabled={form.isHalfDay}
                        onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                        style={{ ...inputStyle, opacity: form.isHalfDay ? 0.5 : 1, cursor: form.isHalfDay ? 'not-allowed' : 'auto' }}
                        onFocus={e => { if (!form.isHalfDay) e.target.style.border = '1px solid #1AABDB' }}
                        onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                      />
                    </div>
                  </div>

                  {form.fromDate && form.toDate && form.fromDate === form.toDate && singleDayHoliday && (
                    <HolidayBanner holiday={singleDayHoliday} />
                  )}
                  {rangeHolidays.length > 0 && (
                    <HolidaysInRangeBanner holidays={rangeHolidays} />
                  )}

                  {form.fromDate && form.toDate && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                      background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
                      border: '1px solid rgba(26,171,219,0.2)', alignSelf: 'flex-start'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {previewDays} day{previewDays !== 1 ? 's' : ''} selected
                    </div>
                  )}

                  {isOnDuty && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Time Range</label>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', fontWeight: 600 }}>Optional</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>From Time</label>
                          <input type="time" value={form.fromTime}
                            onChange={e => setForm(p => ({ ...p, fromTime: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => e.target.style.border = '1px solid #8B5CF6'}
                            onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>To Time</label>
                          <input type="time" value={form.toTime}
                            onChange={e => setForm(p => ({ ...p, toTime: e.target.value }))}
                            style={inputStyle}
                            onFocus={e => e.target.style.border = '1px solid #8B5CF6'}
                            onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                          />
                        </div>
                      </div>
                      {previewHours && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '6px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>
                          ⏱ {previewHours} on duty
                        </div>
                      )}
                    </div>
                  )}

                  {(requestType === 'Leave' || requestType === 'WFH') && (
                    <>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', borderRadius: 12,
                        background: 'var(--surface2, rgba(0,0,0,0.03))', border: '1px solid var(--card-border)'
                      }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: 'var(--text-primary)' }}>Half Day</p>
                          <p style={{ fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>
                            Only need {requestType === 'WFH' ? 'WFH for' : 'leave for'} half the day?
                          </p>
                        </div>
                        <button type="button"
                          onClick={() => setForm(p => ({ ...p, isHalfDay: !p.isHalfDay }))}
                          style={{
                            position: 'relative', display: 'inline-flex', height: 24, width: 44,
                            alignItems: 'center', borderRadius: 9999, transition: 'background 0.2s',
                            flexShrink: 0, border: 'none', cursor: 'pointer',
                            background: form.isHalfDay ? '#1AABDB' : 'var(--card-border)'
                          }}>
                          <span style={{
                            display: 'inline-block', height: 16, width: 16, borderRadius: 9999,
                            background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'transform 0.2s',
                            transform: form.isHalfDay ? 'translateX(22px)' : 'translateX(4px)'
                          }} />
                        </button>
                      </div>
                      {form.isHalfDay && (
                        <div>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Which session?</label>
                          <div style={{ display: 'flex', gap: 12 }}>
                            {['Morning', 'Afternoon'].map(session => (
                              <button key={session} type="button"
                                onClick={() => setForm(p => ({ ...p, halfDaySession: session }))}
                                style={{
                                  flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                                  cursor: 'pointer', transition: 'all 0.2s',
                                  ...(form.halfDaySession === session
                                    ? { background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '2px solid #1AABDB' }
                                    : { background: 'transparent', color: 'var(--text-secondary)', border: '2px solid var(--card-border)' })
                                }}>
                                {session === 'Morning' ? '🌅 Morning' : '🌇 Afternoon'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>Reason</label>
                <input type="text" required
                  placeholder={
                    requestType === 'WFH'       ? 'e.g. Internet issues, Health concerns, Travel' :
                    requestType === 'Permission' ? 'e.g. Bank work, Doctor appointment' :
                    requestType === 'On Duty'   ? 'e.g. Client visit, Site inspection, Off-site meeting' :
                    'e.g. Sick, Personal, Family event'
                  }
                  value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  style={inputStyle}
                  onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                  onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
                />
              </div>

              <div>
                <button type="submit" disabled={submitting}
                  style={{
                    padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#fff',
                    border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                    background: submitting ? 'rgba(26,171,219,0.5)' : '#1AABDB',
                    boxShadow: submitting ? 'none' : '0 4px 16px rgba(26,171,219,0.25)',
                  }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#0e8ab5' }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#1AABDB' }}>
                  {submitting ? 'Submitting…' : `Submit ${requestType} Request`}
                </button>
              </div>
            </form>

            {error && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, fontSize: 14, background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error}
              </div>
            )}
            {success && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 12, fontSize: 14, background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                {success}
              </div>
            )}
          </div>

          {/* History table */}
          <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--card-border)' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>My Request History</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontWeight: 500 }}>
                {pending  > 0 && <span style={{ padding: '4px 10px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)',  color: '#F59E0B' }}>{pending} Pending</span>}
                {approved > 0 && <span style={{ padding: '4px 10px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>{approved} Approved</span>}
                {rejected > 0 && <span style={{ padding: '4px 10px', borderRadius: 9999, background: 'rgba(239,68,68,0.1)',  color: '#EF4444' }}>{rejected} Rejected</span>}
              </div>
            </div>

            {myLeaves.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,171,219,0.08)', color: '#1AABDB' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <p style={{ fontSize: 14, margin: 0, color: 'var(--text-secondary)' }}>No requests yet</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--card-border)' }}>
                      {['Date / Time', 'Type', 'Reason', 'Status'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 600, padding: '12px 24px', color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myLeaves.map(leave => {
                      const type         = resolveType(leave)
                      const cfg          = TYPE_CONFIG[type]
                      const fromDate     = leave.fromDate || leave.date
                      const toDate       = leave.toDate   || leave.date
                      const isPermRecord = type === 'Permission'
                      const isODRecord   = type === 'On Duty'
                      const hasTime      = (isPermRecord || isODRecord) && leave.fromTime && leave.toTime
                      const days         = getDayCount(fromDate, toDate, leave.isHalfDay)
                      const hours        = hasTime ? calcHours(leave.fromTime, leave.toTime) : null
                      const holiday      = getHolidayForDate(fromDate, holidays)

                      return (
                        <tr key={leave.id}
                          style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                          <td style={{ padding: '16px 24px' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 2px', color: 'var(--text-primary)' }}>
                              {formatDateIN(fromDate)}
                              {holiday && (
                                <span style={{
                                  marginLeft: 6, fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999,
                                  background: HOLIDAY_COLORS[holiday.type]?.bg, color: HOLIDAY_COLORS[holiday.type]?.color,
                                }}>🎉 {holiday.name}</span>
                              )}
                            </p>
                            {hasTime ? (
                              <p style={{ fontSize: 12, margin: 0, fontWeight: 600, color: isPermRecord ? '#F59E0B' : '#8B5CF6' }}>
                                {leave.fromTime} – {leave.toTime}
                                {hours && <span style={{ marginLeft: 6, opacity: 0.7 }}>({hours})</span>}
                              </p>
                            ) : !isPermRecord && fromDate !== toDate ? (
                              <p style={{ fontSize: 12, margin: 0, color: 'var(--text-muted)' }}>
                                to {formatDateIN(toDate)} · <span style={{ color: '#1AABDB', fontWeight: 600 }}>{days}d</span>
                              </p>
                            ) : (
                              <p style={{ fontSize: 12, margin: 0, color: 'var(--text-muted)' }}>
                                {leave.isHalfDay ? `Half day (${leave.halfDaySession})` : '1 day'}
                              </p>
                            )}
                          </td>

                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                              {cfg.label}
                            </span>
                          </td>

                          <td style={{ padding: '16px 24px', fontSize: 14, maxWidth: 200, color: 'var(--text-secondary)' }}>
                            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leave.reason}>
                              {leave.reason}
                            </span>
                          </td>

                          <td style={{ padding: '16px 24px' }}>
                            <span style={{ padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600, ...statusStyle(leave.status) }}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default EmployeeLeave