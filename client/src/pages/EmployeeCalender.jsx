import { useEffect, useState } from 'react'
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

const STATUS_NOTATION = {
  Present: 'P',
  Late: 'Late',
  Absent: 'Abs',
  Leave: 'Leave',
  WFH: 'WFH',
  Permission: 'Perm',
  'On Duty': 'OD',
  Holiday: 'Hol',
  Weekend: 'WE',
  Pending: 'Req',
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

function resolveRequestType(leave) {
  const known = ['Leave', 'WFH', 'Permission', 'On Duty']
  if (leave?.type && known.includes(leave.type)) return leave.type
  if (!leave?.type && (leave?.fromTime || leave?.toTime)) return 'Permission'
  return 'Leave'
}

// Returns true if (year, month) is before the current month
function isBeforeCurrentMonth(year, month) {
  const now = new Date()
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())
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
  const approvedType   = approvedLeaves[0] ? resolveRequestType(approvedLeaves[0]) : null

  // A day counts as "covered" if there's an approved leave/WFH/OD
  const isCoveredByLeave = approvedType !== null

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

          {/* Approved leave/WFH/OD — shown prominently, replaces "absent" display */}
          {isCoveredByLeave && (
            <div style={{ padding: '12px 14px', borderRadius: 12, background: (STATUS_CONFIG[approvedType] || STATUS_CONFIG.Leave).bg, border: `1px solid ${(STATUS_CONFIG[approvedType] || STATUS_CONFIG.Leave).border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 8px', borderRadius: 8, background: 'var(--card-bg)', color: (STATUS_CONFIG[approvedType] || STATUS_CONFIG.Leave).color }}>
                {STATUS_NOTATION[approvedType] || approvedType}
              </span>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: (STATUS_CONFIG[approvedType] || STATUS_CONFIG.Leave).color }}>{approvedType}</p>
            </div>
          )}

          {/* Attendance — only show if NOT covered by leave */}
          {attendance && !isCoveredByLeave ? (
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
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#10B981' }}>{fmtTime(attendance.checkInTime) || '—'}</p>
                </div>
                <div style={{ padding: '10px', borderRadius: 10, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CHECK OUT</p>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#64748B' }}>{fmtTime(attendance.checkOutTime) || '—'}</p>
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
          ) : !isCoveredByLeave && !isWeekend && !holiday && (
            // Only show "no attendance" if not a leave/WFH/OD day
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#EF4444' }}>No attendance recorded</p>
            </div>
          )}

          {/* Approved Leaves detail */}
          {approvedLeaves.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approved Requests</p>
              {approvedLeaves.map(l => {
                const type = resolveRequestType(l)
                const cfg = STATUS_CONFIG[type] || STATUS_CONFIG.Leave
                return (
                  <div key={l.id} style={{ padding: '12px 14px', borderRadius: 12, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{type}</span>
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B' }}>{resolveRequestType(l)}</span>
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

  const { dayNum, isToday, isCurrentMonth, isWeekend, holiday, attendance, leaves } = dayData

  const approvedLeaves = leaves.filter(l => l.status === 'Approved')
  const pendingLeaves  = leaves.filter(l => l.status === 'Pending')
  const approvedType   = approvedLeaves[0] ? resolveRequestType(approvedLeaves[0]) : null

  // Priority: approved leave/WFH/OD > holiday > weekend > attendance status
  const primaryStatus = approvedType
    ? approvedType
    : holiday
    ? 'Holiday'
    : isWeekend
      ? 'Weekend'
      : attendance
        ? attendance.status
        : null

  const cfg = primaryStatus ? (STATUS_CONFIG[primaryStatus] || STATUS_CONFIG.Leave) : null
  const hasPending = pendingLeaves.length > 0
  const cfgBg = cfg ? cfg.bg : 'transparent'

  return (
    <button
      onClick={() => onClick(dayData)}
      style={{
        aspectRatio: '1', minHeight: 36,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, borderRadius: 10, position: 'relative',
        border: isToday ? '2px solid #1AABDB' : '1px solid transparent',
        background: cfgBg,
        cursor: 'pointer', transition: 'all 0.15s',
        opacity: isCurrentMonth ? 1 : 0.3,
        padding: '4px 2px',
      }}
    >
      {/* Day number */}
      <span style={{
        fontSize: 12, fontWeight: isToday ? 800 : 600, lineHeight: 1,
        color: isToday ? '#1AABDB' : cfg ? cfg.color : 'var(--text-primary)',
      }}>
        {dayNum}
      </span>

      <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', minHeight: 15 }}>
        {primaryStatus && (
          <span style={{ fontSize: 8, fontWeight: 800, lineHeight: 1, padding: '3px 4px', borderRadius: 5, background: 'var(--card-bg)', color: cfg?.color || 'var(--text-primary)', border: `1px solid ${cfg?.border || 'var(--card-border)'}` }}>
            {STATUS_NOTATION[primaryStatus] || primaryStatus}
          </span>
        )}
        {hasPending && !approvedType && (
          <span style={{ fontSize: 8, fontWeight: 800, lineHeight: 1, padding: '3px 4px', borderRadius: 5, background: 'var(--card-bg)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.25)' }}>
            Req
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { key: 'P',     label: 'Present'          },
    { key: 'Late',  label: 'Late'             },
    { key: 'Leave', label: 'Leave'            },
    { key: 'WFH',   label: 'Work from home'   },
    { key: 'OD',    label: 'On duty'          },
    { key: 'Hol',   label: 'Holiday'          },
    { key: 'WE',    label: 'Weekend'          },
    { key: 'Req',   label: 'Request pending'  },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 0 2px' }}>
      {items.map(({ key, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ minWidth: 24, textAlign: 'center', fontSize: 9, fontWeight: 800, padding: '3px 5px', borderRadius: 6, color: 'var(--text-primary)', background: 'var(--surface2)', border: '1px solid var(--card-border)' }}>{key}</span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Month/Year Picker ────────────────────────────────────────────────────────

function MonthYearPicker({ viewYear, viewMonth, onChange, onClose }) {
  const [pickerYear, setPickerYear] = useState(viewYear)
  const now = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth()

  // Can't go to a year before current
  const canGoPrevYear = pickerYear > currentYear

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: 300, borderRadius: 18, background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Year row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
          <button
            onClick={() => canGoPrevYear && setPickerYear(y => y - 1)}
            disabled={!canGoPrevYear}
            style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: canGoPrevYear ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: canGoPrevYear ? 1 : 0.3 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{pickerYear}</span>
          <button
            onClick={() => setPickerYear(y => y + 1)}
            style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: 12 }}>
          {MONTH_NAMES.map((name, idx) => {
            const isSelected = idx === viewMonth && pickerYear === viewYear
            const isPast = pickerYear < currentYear || (pickerYear === currentYear && idx < currentMonth)

            return (
              <button
                key={name}
                disabled={isPast}
                onClick={() => { onChange(pickerYear, idx); onClose() }}
                style={{
                  padding: '9px 4px', borderRadius: 10, border: 'none',
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: isSelected ? 800 : 500,
                  background: isSelected ? '#1AABDB' : 'var(--surface2)',
                  color: isSelected ? '#fff' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                  opacity: isPast ? 0.35 : 1,
                  transition: 'all 0.12s',
                }}
              >
                {name.slice(0, 3)}
              </button>
            )
          })}
        </div>
      </div>
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
  const [showPicker, setShowPicker] = useState(false)

  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    let targetEmpId = empId
    if (!targetEmpId) {
      const stored = localStorage.getItem('employeeAuth')
      if (stored) {
        targetEmpId = JSON.parse(stored).empId
      } else {
        const isAdmin = localStorage.getItem('adminAuth')
        const role = localStorage.getItem('role')
        if (isAdmin && role === 'manager') {
          targetEmpId = 'HPS250025'
        }
      }
    }
    if (!targetEmpId) return
    Promise.all([
      axios.get(`${BASE_URL}/api/attendance/${targetEmpId}`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/holidays`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/leave/${targetEmpId}`).catch(() => ({ data: [] })),
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
  holidays.forEach(h => { holidayMap[toYMD(h.date)] = h })

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

  const calendarDays = () => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startDow = firstOfMonth.getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const todayStr = toYMD(new Date())
    const cells = []

    for (let i = 0; i < startDow; i++) {
      const d = new Date(viewYear, viewMonth, 1 - (startDow - i))
      const dateStr = toYMD(d)
      cells.push({ date: dateStr, dayNum: d.getDate(), isCurrentMonth: false, isToday: dateStr === todayStr, isWeekend: !workingDayNums.includes(d.getDay()), holiday: holidayMap[dateStr] || null, attendance: attMap[dateStr] || null, leaves: leaveMap[dateStr] || [] })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(viewYear, viewMonth, i)
      const dateStr = toYMD(d)
      cells.push({ date: dateStr, dayNum: i, isCurrentMonth: true, isToday: dateStr === todayStr, isWeekend: !workingDayNums.includes(d.getDay()), holiday: holidayMap[dateStr] || null, attendance: attMap[dateStr] || null, leaves: leaveMap[dateStr] || [] })
    }
    const remaining = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(viewYear, viewMonth + 1, i)
      const dateStr = toYMD(d)
      cells.push({ date: dateStr, dayNum: d.getDate(), isCurrentMonth: false, isToday: dateStr === todayStr, isWeekend: !workingDayNums.includes(d.getDay()), holiday: holidayMap[dateStr] || null, attendance: attMap[dateStr] || null, leaves: leaveMap[dateStr] || [] })
    }
    return cells
  }

  const days = calendarDays()

  // ── Navigation: future-only ──
  const isPrevDisabled = isBeforeCurrentMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  const goToPrevMonth = () => {
    if (isPrevDisabled) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const goToToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }

  const isCurrentMonthView = viewYear === now.getFullYear() && viewMonth === now.getMonth()

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <button
          onClick={goToPrevMonth}
          disabled={isPrevDisabled}
          style={{ width: 36, height: 36, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--surface2)', cursor: isPrevDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPrevDisabled ? 'var(--text-muted)' : 'var(--text-secondary)', opacity: isPrevDisabled ? 0.35 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setShowPicker(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', padding: '2px 8px', borderRadius: 8 }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#1AABDB' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {!isCurrentMonthView && (
            <button onClick={goToToday} style={{ fontSize: 11, fontWeight: 600, color: '#1AABDB', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
              Back to today
            </button>
          )}
        </div>

        <button onClick={goToNextMonth} style={{ width: 36, height: 36, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--surface2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {showPicker && (
        <MonthYearPicker
          viewYear={viewYear}
          viewMonth={viewMonth}
          onChange={(year, month) => { setViewYear(year); setViewMonth(month) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Calendar grid */}
      <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--card-border)' }}>
          {DAY_LABELS.map(d => {
            const isNonWorking = !workingDayNums.includes(DAY_LABELS.indexOf(d) === 0 ? 0 : DAY_LABELS.indexOf(d))
            return (
              <div key={d} style={{ textAlign: 'center', padding: '7px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: isNonWorking ? '#94A3B8' : 'var(--text-secondary)' }}>
                {d}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: 4 }}>
          {days.map((day, i) => (
            <CalendarCell key={i} dayData={day} onClick={setSelectedDay} />
          ))}
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Office settings info */}
      {settings && (
        <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.12)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Shift: <strong style={{ color: 'var(--text-primary)' }}>{settings.checkInTime} – {settings.checkOutTime}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Late after: <strong style={{ color: '#F59E0B' }}>{settings.lateAfter}</strong>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Working: <strong style={{ color: 'var(--text-primary)' }}>{settings.workingDays}</strong>
          </span>
        </div>
      )}

      {/* Upcoming holidays */}
      {upcomingHolidays.length > 0 && (
        <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              Upcoming Holidays
            </p>
          </div>
          {upcomingHolidays.map((h, i) => {
            const c = HOLIDAY_TYPE_COLORS[h.type] || HOLIDAY_TYPE_COLORS.National
            const d = new Date(h.date)
            return (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < upcomingHolidays.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: c.bg, border: `1px solid ${c.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c.color, lineHeight: 1 }}>{d.getDate()}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: c.color, lineHeight: 1.3 }}>{d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN', { weekday: 'long' })}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: c.bg, color: c.color, border: `1px solid ${c.border}`, flexShrink: 0 }}>{h.type}</span>
              </div>
            )
          })}
        </div>
      )}

      {selectedDay && <DaySheet day={selectedDay} onClose={() => setSelectedDay(null)} />}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}