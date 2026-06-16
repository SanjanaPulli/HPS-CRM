import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const STATUS_CONFIG = {
  Present:  { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  label: 'Present'  },
  Late:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Late'     },
  Absent:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   label: 'Absent'   },
  Holiday:  { color: '#DC2626', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)',   label: 'Holiday'  },
  Weekend:  { color: '#94A3B8', bg: 'rgba(148,163,184,0.07)', border: 'rgba(148,163,184,0.15)', label: 'Weekend'  },
  Leave:    { color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.25)', label: 'Leave'    },
  WFH:      { color: '#1AABDB', bg: 'rgba(26,171,219,0.12)',  border: 'rgba(26,171,219,0.25)',  label: 'WFH'      },
  Permission:{ color: '#F59E0B',bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  label: 'Permission'},
  'On Duty':{ color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(139,92,246,0.25)',  label: 'On Duty'  },
}

const HOLIDAY_TYPE_COLORS = {
  National: { color: '#DC2626', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)'   },
  Optional: { color: '#D97706', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)'  },
  Company:  { color: '#7C3AED', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)'  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toYMD(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtTime(ts) {
  if (!ts) return null
  const d = new Date(ts)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtHours(h) {
  if (!h) return null
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
}

function parseDays(str) {
  const map = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 }
  return (str || 'Mon,Tue,Wed,Thu,Fri').split(',').map(d => map[d.trim()]).filter(d => d !== undefined)
}

// ─── Day Detail Bottom Sheet ─────────────────────────────────────────────────

function DaySheet({ day, onClose }) {
  if (!day) return null
  const { date, attendance, leaves, holiday, isWeekend, isToday } = day

  const d = new Date(date + 'T00:00:00')
  const dayName  = d.toLocaleDateString('en-IN', { weekday: 'long' })
  const dateStr  = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const approvedLeaves = leaves.filter(l => l.status === 'Approved')
  const pendingLeaves  = leaves.filter(l => l.status === 'Pending')

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxHeight: '80vh', overflowY: 'auto',
          borderRadius: '24px 24px 0 0',
          background: 'var(--card-bg)',
          padding: '0 0 env(safe-area-inset-bottom)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--card-border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {dayName}
                {isToday && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(26,171,219,0.15)', color: '#1AABDB' }}>Today</span>
                )}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{dateStr}</p>
            </div>
            <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', cursor: 'pointer', borderRadius: 9999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Holiday */}
          {holiday && (() => {
            const c = HOLIDAY_TYPE_COLORS[holiday.type] || HOLIDAY_TYPE_COLORS.National
            return (
              <div style={{ padding: '12px 14px', borderRadius: 12, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>🎉</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: c.color }}>{holiday.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: c.color, opacity: 0.8 }}>{holiday.type} Holiday</p>
                </div>
              </div>
            )
          })()}

          {/* Weekend */}
          {isWeekend && !holiday && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>😴</span>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>Non-working day</p>
            </div>
          )}

          {/* Attendance */}
          {attendance ? (
            <div style={{ padding: '14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</p>
                {(() => {
                  const cfg = STATUS_CONFIG[attendance.status] || STATUS_CONFIG.Present
                  return (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                      {attendance.status}
                    </span>
                  )
                })()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CHECK IN</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#10B981' }}>
                    {fmtTime(attendance.checkInTime) || '—'}
                  </p>
                </div>
                <div style={{ padding: '10px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CHECK OUT</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#64748B' }}>
                    {fmtTime(attendance.checkOutTime) || '—'}
                  </p>
                </div>
                {attendance.hoursWorked != null && (
                  <div style={{ padding: '10px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>HOURS</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1AABDB' }}>{fmtHours(attendance.hoursWorked)}</p>
                  </div>
                )}
                {attendance.overtimeMinutes > 0 && (
                  <div style={{ padding: '10px', borderRadius: 10, background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}>
                    <p style={{ margin: '0 0 3px', fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>OVERTIME</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#8B5CF6' }}>+{attendance.overtimeMinutes}m</p>
                  </div>
                )}
              </div>
            </div>
          ) : !isWeekend && !holiday && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#EF4444' }}>No attendance recorded</p>
            </div>
          )}

          {/* Approved Leaves */}
          {approvedLeaves.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved Requests</p>
              {approvedLeaves.map(l => {
                const cfg = STATUS_CONFIG[l.type] || STATUS_CONFIG.Leave
                return (
                  <div key={l.id} style={{ padding: '12px 14px', borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{l.type}</span>
                      {l.isHalfDay && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: 'rgba(26,171,219,0.1)', color: '#1AABDB', fontWeight: 600 }}>Half day</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>{l.reason}</p>
                    {l.fromTime && l.toTime && (
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{l.fromTime} – {l.toTime}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Pending Leaves */}
          {pendingLeaves.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Requests</p>
              {pendingLeaves.map(l => (
                <div key={l.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>{l.type}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontWeight: 600 }}>Pending</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>{l.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Nothing at all */}
          {!attendance && !holiday && !isWeekend && approvedLeaves.length === 0 && pendingLeaves.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No records for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function CalendarCell({ dayData, onClick }) {
  if (!dayData) return <div style={{ aspectRatio: '1', minHeight: 44 }} />

  const { date, dayNum, isToday, isCurrentMonth, isWeekend, holiday, attendance, leaves } = dayData

  const approvedLeaves = leaves.filter(l => l.status === 'Approved')
  const pendingLeaves  = leaves.filter(l => l.status === 'Pending')

  // Determine primary color of the cell
  let primaryStatus = null
  if (holiday)               primaryStatus = 'Holiday'
  else if (isWeekend)        primaryStatus = 'Weekend'
  else if (attendance)       primaryStatus = attendance.status
  else if (approvedLeaves.length > 0) primaryStatus = approvedLeaves[0].type
  else                       primaryStatus = null

  const cfg = primaryStatus ? (STATUS_CONFIG[primaryStatus] || STATUS_CONFIG.Leave) : null
  const isHoliday = !!holiday
  const hasLeave  = approvedLeaves.length > 0
  const hasPending = pendingLeaves.length > 0

  return (
    <button
      onClick={() => onClick(dayData)}
      style={{
        aspectRatio: '1', minHeight: 44,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, borderRadius: 10, position: 'relative',
        border: isToday ? '2px solid #1AABDB' : '1px solid transparent',
        background: cfg ? cfg.bg : 'transparent',
        cursor: 'pointer', transition: 'all 0.15s',
        opacity: isCurrentMonth ? 1 : 0.3,
        padding: '4px 2px',
      }}
    >
      {/* Day number */}
      <span style={{
        fontSize: 13, fontWeight: isToday ? 800 : 600, lineHeight: 1,
        color: isToday ? '#1AABDB' : cfg ? cfg.color : 'var(--text-primary)',
      }}>
        {dayNum}
      </span>

      {/* Dots row */}
      <div style={{ display: 'flex', gap: 2, alignItems: 'center', height: 6 }}>
        {attendance && (
          <div style={{ width: 5, height: 5, borderRadius: 9999, background: STATUS_CONFIG[attendance.status]?.color || '#10B981', flexShrink: 0 }} />
        )}
        {hasLeave && (
          <div style={{ width: 5, height: 5, borderRadius: 9999, background: STATUS_CONFIG[approvedLeaves[0].type]?.color || '#64748B', flexShrink: 0 }} />
        )}
        {hasPending && (
          <div style={{ width: 5, height: 5, borderRadius: 9999, background: '#F59E0B', flexShrink: 0 }} />
        )}
        {isHoliday && (
          <div style={{ width: 5, height: 5, borderRadius: 9999, background: HOLIDAY_TYPE_COLORS[holiday.type]?.color || '#DC2626', flexShrink: 0 }} />
        )}
      </div>
    </button>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: '#10B981', label: 'Present' },
    { color: '#F59E0B', label: 'Late'    },
    { color: '#EF4444', label: 'Absent'  },
    { color: '#1AABDB', label: 'WFH'     },
    { color: '#64748B', label: 'Leave'   },
    { color: '#8B5CF6', label: 'On Duty' },
    { color: '#DC2626', label: 'Holiday' },
    { color: '#94A3B8', label: 'Weekend' },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', padding: '12px 0 4px' }}>
      {items.map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 9999, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Monthly Summary Bar ─────────────────────────────────────────────────────

function MonthlySummary({ days, settings }) {
  const workingDayNums = parseDays(settings?.workingDays)
  const stats = { present: 0, late: 0, absent: 0, leave: 0, wfh: 0, holiday: 0 }
  const today = toYMD(new Date())

  days.forEach(d => {
    if (!d || !d.isCurrentMonth) return
    if (d.date > today) return
    if (d.holiday) { stats.holiday++; return }
    if (d.isWeekend) return
    if (d.attendance?.status === 'Present') stats.present++
    else if (d.attendance?.status === 'Late') stats.late++
    else {
      const approved = d.leaves.filter(l => l.status === 'Approved')
      if (approved.some(l => l.type === 'WFH')) stats.wfh++
      else if (approved.length > 0) stats.leave++
      else stats.absent++
    }
  })

  const items = [
    { label: 'Present', value: stats.present, color: '#10B981' },
    { label: 'Late',    value: stats.late,    color: '#F59E0B' },
    { label: 'Leave',   value: stats.leave,   color: '#64748B' },
    { label: 'WFH',     value: stats.wfh,     color: '#1AABDB' },
    { label: 'Absent',  value: stats.absent,  color: '#EF4444' },
  ].filter(i => i.value > 0)

  if (!items.length) return null

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {items.map(({ label, value, color }) => (
        <div key={label} style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 10,
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          textAlign: 'center', minWidth: 60,
        }}>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color }}>{value}</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginTop: 1 }}>{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main EmployeeCalendar ────────────────────────────────────────────────────

export default function EmployeeCalendar({ empId, holidays: propHolidays, myLeaves: propLeaves }) {
  const [attendance, setAttendance] = useState([])
  const [holidays,   setHolidays]   = useState(propHolidays || [])
  const [myLeaves,   setMyLeaves]   = useState(propLeaves   || [])
  const [settings,   setSettings]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [selectedDay,setSelectedDay]= useState(null)

  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  // Fetch all data
  useEffect(() => {
    if (!empId) return
    setLoading(true)
    Promise.all([
      axios.get(`${BASE_URL}/api/attendance/${empId}`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/holidays`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/leave/${empId}`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/settings`).catch(() => ({ data: {} })),
    ]).then(([attRes, holRes, leaveRes, settingsRes]) => {
      setAttendance(attRes.data || [])
      setHolidays(holRes.data || [])
      setMyLeaves(leaveRes.data || [])
      setSettings(settingsRes.data || {})
      setLoading(false)
    })
  }, [empId])

  // Build lookup maps
  const attMap = {}
  attendance.forEach(a => {
    const key = toYMD(a.checkInTime || a.timestamp)
    attMap[key] = a
  })

  const holidayMap = {}
  holidays.forEach(h => {
    const key = toYMD(h.date)
    holidayMap[key] = h
  })

  // Build leave map — a date can have multiple leaves
  const leaveMap = {}
  myLeaves.forEach(l => {
    const from = new Date(l.fromDate || l.date)
    const to   = new Date(l.toDate   || l.date)
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = toYMD(d)
      if (!leaveMap[key]) leaveMap[key] = []
      leaveMap[key].push(l)
    }
  })

  const workingDayNums = parseDays(settings?.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat')

  // Build calendar grid for current view month
  const calendarDays = useCallback(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startDow = firstOfMonth.getDay() // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const todayStr = toYMD(new Date())

    const cells = []

    // Padding before month start
    for (let i = 0; i < startDow; i++) {
      const d = new Date(viewYear, viewMonth, 1 - (startDow - i))
      const dateStr = toYMD(d)
      cells.push({
        date: dateStr, dayNum: d.getDate(), isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: !workingDayNums.includes(d.getDay()),
        holiday: holidayMap[dateStr] || null,
        attendance: attMap[dateStr] || null,
        leaves: leaveMap[dateStr] || [],
      })
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i)
      const dateStr = toYMD(d)
      cells.push({
        date: dateStr, dayNum: i, isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isWeekend: !workingDayNums.includes(d.getDay()),
        holiday: holidayMap[dateStr] || null,
        attendance: attMap[dateStr] || null,
        leaves: leaveMap[dateStr] || [],
      })
    }

    // Pad to complete last row
    const remaining = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i)
      const dateStr = toYMD(d)
      cells.push({
        date: dateStr, dayNum: d.getDate(), isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend: !workingDayNums.includes(d.getDay()),
        holiday: holidayMap[dateStr] || null,
        attendance: attMap[dateStr] || null,
        leaves: leaveMap[dateStr] || [],
      })
    }

    return cells
  }, [viewYear, viewMonth, attMap, holidayMap, leaveMap, workingDayNums])

  const days = calendarDays()

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const goToToday = () => {
    const n = new Date()
    setViewYear(n.getFullYear())
    setViewMonth(n.getMonth())
  }

  const isCurrentMonthView = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  // Upcoming holidays this month
  const todayStr = toYMD(new Date())
  const upcomingHolidays = holidays
    .filter(h => {
      const key = toYMD(h.date)
      const d = new Date(h.date)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && key >= todayStr
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        <div style={{ marginBottom: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
        </div>
        Loading calendar…
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Month nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderRadius: 14,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      }}>
        <button onClick={goToPrevMonth} style={{
          width: 36, height: 36, borderRadius: 9999, border: '1px solid var(--card-border)',
          background: 'var(--surface2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </p>
          {!isCurrentMonthView && (
            <button onClick={goToToday} style={{
              fontSize: 11, fontWeight: 600, color: '#1AABDB', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
            }}>Back to today</button>
          )}
        </div>

        <button onClick={goToNextMonth} style={{
          width: 36, height: 36, borderRadius: 9999, border: '1px solid var(--card-border)',
          background: 'var(--surface2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Monthly summary */}
      <MonthlySummary days={days} settings={settings} />

      {/* Calendar grid */}
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--card-border)' }}>
          {DAY_LABELS.map(d => {
            const isNonWorking = !workingDayNums.includes(DAY_LABELS.indexOf(d) === 0 ? 0 : DAY_LABELS.indexOf(d))
            return (
              <div key={d} style={{
                textAlign: 'center', padding: '10px 0',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                color: isNonWorking ? '#94A3B8' : 'var(--text-secondary)',
              }}>
                {d}
              </div>
            )
          })}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: 6 }}>
          {days.map((day, i) => (
            <CalendarCell key={i} dayData={day} onClick={setSelectedDay} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Office settings info */}
      {settings && (
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.12)',
          fontSize: 12, color: 'var(--text-secondary)',
          display: 'flex', flexWrap: 'wrap', gap: '6px 16px',
        }}>
          <span>🕘 Shift: <strong style={{ color: 'var(--text-primary)' }}>{settings.checkInTime} – {settings.checkOutTime}</strong></span>
          <span>⚠️ Late after: <strong style={{ color: '#F59E0B' }}>{settings.lateAfter}</strong></span>
          <span>📅 Working: <strong style={{ color: 'var(--text-primary)' }}>{settings.workingDays}</strong></span>
        </div>
      )}

      {/* Upcoming holidays in this month */}
      {upcomingHolidays.length > 0 && (
        <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              🗓 Upcoming Holidays
            </p>
          </div>
          {upcomingHolidays.map((h, i) => {
            const c = HOLIDAY_TYPE_COLORS[h.type] || HOLIDAY_TYPE_COLORS.National
            const d = new Date(h.date)
            return (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: i < upcomingHolidays.length - 1 ? '1px solid var(--card-border)' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: c.bg, border: `1px solid ${c.border}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c.color, lineHeight: 1 }}>{d.getDate()}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.color, lineHeight: 1.3 }}>
                    {d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    {d.toLocaleDateString('en-IN', { weekday: 'long' })}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: c.bg, color: c.color, border: `1px solid ${c.border}`, flexShrink: 0 }}>
                  {h.type}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Day detail sheet */}
      {selectedDay && <DaySheet day={selectedDay} onClose={() => setSelectedDay(null)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}