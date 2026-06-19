import { useEffect, useState } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function toYMD(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function fmtTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function fmtHours(h) {
  if (h == null) return null
  const hrs  = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
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

function parseDays(str) {
  const map = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 }
  return (str || 'Mon,Tue,Wed,Thu,Fri,Sat').split(',').map(d => map[d.trim()]).filter(d => d !== undefined)
}

function resolveLeaveType(leave) {
  const KNOWN = ['Leave', 'WFH', 'Permission', 'On Duty']
  if (leave.type && KNOWN.includes(leave.type)) return leave.type
  if (!leave.type && (leave.fromTime || leave.toTime)) return 'Permission'
  return 'Leave'
}

// Returns true if the given year/month is before the current month
function isBeforeCurrentMonth(year, month) {
  const now = new Date()
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())
}

const HOLIDAY_COLORS = {
  National: { color: '#DC2626', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)'   },
  Optional: { color: '#D97706', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)'  },
  Company:  { color: '#7C3AED', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)'  },
}

const LEAVE_TYPE_COLORS = {
  Leave:      { color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.2)' },
  WFH:        { color: '#1AABDB', bg: 'rgba(26,171,219,0.12)',  border: 'rgba(26,171,219,0.2)'  },
  Permission: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.2)'  },
  'On Duty':  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.2)'  },
}

// ─── Day Detail Sheet ─────────────────────────────────────────────────────────

function AdminDaySheet({ dayData, onClose, onUpdateLeave }) {
  const [updating, setUpdating] = useState(null)

  if (!dayData) return null
  const { date, holiday, isWeekend, attendances, leaves } = dayData
  const d = new Date(date + 'T00:00:00')
  const dateStr = d.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const todayStr = toYMD(new Date())
  const isToday = date === todayStr

  const approvedLeaves = leaves.filter(l => l.status === 'Approved')
  const pendingLeaves  = leaves.filter(l => l.status === 'Pending')
  const rejectedLeaves = leaves.filter(l => l.status === 'Rejected')

  const handleStatus = async (leaveId, status) => {
    setUpdating(leaveId)
    try {
      await axios.put(`${BASE_URL}/api/leave/${leaveId}`, { status })
      onUpdateLeave(leaveId, status)
    } catch (error) {
      console.error('Failed to update leave status', error)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '24px 24px 0 0', background: 'var(--card-bg)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 9999, background: 'var(--card-border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{dateStr}</p>
              {isToday && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(26,171,219,0.15)', color: '#1AABDB' }}>Today</span>}
            </div>
            {/* Summary chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {attendances.filter(a => a.status === 'Present').length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                  ✓ {attendances.filter(a => a.status === 'Present').length} Present
                </span>
              )}
              {attendances.filter(a => a.status === 'Late').length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  ⚠ {attendances.filter(a => a.status === 'Late').length} Late
                </span>
              )}
              {pendingLeaves.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>
                  ⏳ {pendingLeaves.length} Pending
                </span>
              )}
              {approvedLeaves.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', color: '#10B981' }}>
                  {approvedLeaves.length} On Leave/WFH/OD
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface2)', border: 'none', cursor: 'pointer', borderRadius: 9999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Holiday banner */}
          {holiday && (() => {
            const c = HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.National
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
            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(148,163,184,0.07)', border: '1px solid rgba(148,163,184,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>😴</span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Non-working day</p>
            </div>
          )}

          {/* Pending leaves — with approve/reject */}
          {pendingLeaves.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>⏳ Pending Approval</p>
              {pendingLeaves.map(l => {
                const type = resolveLeaveType(l)
                const cfg  = LEAVE_TYPE_COLORS[type] || LEAVE_TYPE_COLORS.Leave
                return (
                  <div key={l.id} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1AABDB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {l.employee?.name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{l.employee?.name}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{l.empId}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{type}</span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--text-secondary)' }}>{l.reason}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button disabled={updating === l.id} onClick={() => handleStatus(l.id, 'Approved')} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#10B981', color: '#fff', opacity: updating === l.id ? 0.5 : 1 }}>✓ Approve</button>
                      <button disabled={updating === l.id} onClick={() => handleStatus(l.id, 'Rejected')} style={{ flex: 1, padding: '7px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#EF4444', color: '#fff', opacity: updating === l.id ? 0.5 : 1 }}>✕ Reject</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Attendance list */}
          {attendances.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attendance</p>
              {attendances.map(a => {
                const statusColor = a.status === 'Present' ? '#10B981' : a.status === 'Late' ? '#F59E0B' : '#EF4444'
                const statusBg    = a.status === 'Present' ? 'rgba(16,185,129,0.1)' : a.status === 'Late' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--card-border)', marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#1AABDB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {a.employee?.name?.charAt(0) || a.empId?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.employee?.name || a.empId}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
                        {fmtTime(a.checkInTime)  && <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>In: {fmtTime(a.checkInTime)}</span>}
                        {fmtTime(a.checkOutTime) && <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Out: {fmtTime(a.checkOutTime)}</span>}
                        {a.hoursWorked != null   && <span style={{ fontSize: 11, color: '#1AABDB', fontWeight: 600 }}>{fmtHours(a.hoursWorked)}</span>}
                        {a.overtimeMinutes > 0   && <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>+{a.overtimeMinutes}m OT</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: statusBg, color: statusColor, flexShrink: 0 }}>{a.status}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Approved leaves — shown as Leave/WFH/OD, never "Absent" */}
          {approvedLeaves.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>On Leave / WFH / OD</p>
              {approvedLeaves.map(l => {
                const type = resolveLeaveType(l)
                const cfg  = LEAVE_TYPE_COLORS[type] || LEAVE_TYPE_COLORS.Leave
                const hrs  = calcHours(l.fromTime, l.toTime)
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {l.employee?.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.employee?.name}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{l.reason}</p>
                      {hrs && <p style={{ margin: '2px 0 0', fontSize: 11, color: cfg.color, fontWeight: 600 }}>{l.fromTime} – {l.toTime} ({hrs})</p>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: 'rgba(255,255,255,0.3)', color: cfg.color, flexShrink: 0 }}>{type}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Rejected leaves */}
          {rejectedLeaves.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rejected</p>
              {rejectedLeaves.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', marginBottom: 6, opacity: 0.7 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {l.employee?.name?.charAt(0)}
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{l.employee?.name} — {resolveLeaveType(l)} — {l.reason}</p>
                </div>
              ))}
            </div>
          )}

          {!holiday && !isWeekend && attendances.length === 0 && leaves.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '16px 0' }}>No records for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function AdminCalendarCell({ dayData, onClick }) {
  if (!dayData) return <div style={{ aspectRatio: '1', minHeight: 48 }} />

  const { dayNum, isCurrentMonth, isToday, isWeekend, holiday, attendances, leaves } = dayData

  const presentCount  = attendances.filter(a => a.status === 'Present').length
  const lateCount     = attendances.filter(a => a.status === 'Late').length
  const onLeaveCount  = leaves.filter(l => l.status === 'Approved').length
  const pendingCount  = leaves.filter(l => l.status === 'Pending').length

  const isHoliday = !!holiday
  const hc = holiday ? (HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.National) : null

  let cellBg = 'transparent'
  if (isHoliday)   cellBg = hc.bg
  else if (isWeekend) cellBg = 'rgba(148,163,184,0.05)'

  return (
    <button
      onClick={() => onClick(dayData)}
      style={{
        aspectRatio: '1', minHeight: 48,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 3, borderRadius: 10, position: 'relative',
        border: isToday ? '2px solid #1AABDB' : '1px solid transparent',
        background: cellBg,
        cursor: 'pointer', transition: 'all 0.15s',
        opacity: isCurrentMonth ? 1 : 0.25,
        padding: '4px 2px',
      }}
      onMouseEnter={e => { if (!isHoliday) e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = cellBg }}
    >
      {/* Day number */}
      <span style={{
        fontSize: 12, fontWeight: isToday ? 800 : 600, lineHeight: 1,
        color: isToday ? '#1AABDB' : isHoliday ? hc.color : isWeekend ? '#94A3B8' : 'var(--text-primary)',
      }}>
        {dayNum}
      </span>

      {/* Clean count row — only for current month, non-holiday working days */}
      {isCurrentMonth && !isHoliday && !isWeekend && (presentCount + lateCount + onLeaveCount + pendingCount > 0) && (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {presentCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: 'rgba(16,185,129,0.15)', color: '#10B981', lineHeight: 1.4 }}>
              {presentCount}P
            </span>
          )}
          {lateCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', lineHeight: 1.4 }}>
              {lateCount}L
            </span>
          )}
          {onLeaveCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: 'rgba(100,116,139,0.15)', color: '#64748B', lineHeight: 1.4 }}>
              {onLeaveCount}Off
            </span>
          )}
          {pendingCount > 0 && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: 'rgba(245,158,11,0.15)', color: '#F59E0B', lineHeight: 1.4 }}>
              {pendingCount}⏳
            </span>
          )}
        </div>
      )}

      {/* Holiday dot */}
      {isHoliday && (
        <div style={{ width: 5, height: 5, borderRadius: 9999, background: hc.color }} />
      )}

      {/* Pending indicator dot */}
      {pendingCount > 0 && (
        <div style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, borderRadius: 9999, background: '#F59E0B' }} />
      )}
    </button>
  )
}

// ─── Monthly Stats ────────────────────────────────────────────────────────────

function MonthlyStats({ days }) {
  let totalPresent = 0, totalLate = 0, totalLeave = 0, totalPending = 0, totalHolidays = 0
  const todayStr = toYMD(new Date())

  days.forEach(d => {
    if (!d?.isCurrentMonth || d.date > todayStr) return
    if (d.holiday) { totalHolidays++; return }
    if (d.isWeekend) return
    totalPresent  += d.attendances.filter(a => a.status === 'Present').length
    totalLate     += d.attendances.filter(a => a.status === 'Late').length
    totalLeave    += d.leaves.filter(l => l.status === 'Approved').length
    totalPending  += d.leaves.filter(l => l.status === 'Pending').length
  })

  const items = [
    { label: 'Present',     value: totalPresent,  color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)'  },
    { label: 'Late',        value: totalLate,     color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
    { label: 'On Leave',    value: totalLeave,    color: '#64748B', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' },
    { label: 'Pending',     value: totalPending,  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)'  },
    { label: 'Holidays',    value: totalHolidays, color: '#DC2626', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)'   },
  ].filter(i => i.value > 0)

  if (!items.length) return null

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
      {items.map(({ label, value, color, bg, border }) => (
        <div key={label} style={{ flexShrink: 0, padding: '10px 14px', borderRadius: 12, background: bg, border: `1px solid ${border}`, textAlign: 'center', minWidth: 70 }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{value}</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color, opacity: 0.8, marginTop: 1 }}>{label}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', paddingTop: 4 }}>
      {[
        { dot: '#10B981', label: 'P = Present'       },
        { dot: '#F59E0B', label: 'L = Late'          },
        { dot: '#64748B', label: 'Off = On Leave/WFH/OD' },
        { dot: '#F59E0B', label: '⏳ = Pending'      },
        { dot: '#DC2626', label: 'Holiday'           },
        { dot: '#94A3B8', label: 'Non-working day'   },
      ].map(({ dot, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: dot }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Month/Year Picker — with past month restriction ──────────────────────────

function MonthYearPicker({ viewYear, viewMonth, onChange, onClose }) {
  const [pickerYear, setPickerYear] = useState(viewYear)
  const now = new Date()
  const currentYear  = now.getFullYear()
  const currentMonth = now.getMonth()

  const canGoPrevYear = pickerYear > currentYear

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: 300, borderRadius: 18, background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
      >
        {/* Year row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
          <button
            onClick={() => canGoPrevYear && setPickerYear(y => y - 1)}
            disabled={!canGoPrevYear}
            style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: canGoPrevYear ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: canGoPrevYear ? 1 : 0.3 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <strong style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{pickerYear}</strong>
          <button
            onClick={() => setPickerYear(y => y + 1)}
            style={{ width: 32, height: 32, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Month grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, padding: 12 }}>
          {MONTH_NAMES.map((month, idx) => {
            const isSelected = idx === viewMonth && pickerYear === viewYear
            const isPast = pickerYear < currentYear || (pickerYear === currentYear && idx < currentMonth)
            return (
              <button
                key={month}
                disabled={isPast}
                onClick={() => { onChange(pickerYear, idx); onClose() }}
                style={{
                  padding: '10px', border: 'none', borderRadius: 8,
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: isSelected ? 800 : 500,
                  background: isSelected ? '#1AABDB' : 'var(--surface2)',
                  color: isSelected ? '#fff' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                  opacity: isPast ? 0.35 : 1,
                  transition: 'all 0.12s',
                }}
              >
                {month.slice(0, 3)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Upcoming Holidays ────────────────────────────────────────────────────────

function UpcomingHolidays({ holidays, viewYear, viewMonth }) {
  const todayStr = toYMD(new Date())
  const upcoming = holidays
    .filter(h => {
      const d = new Date(h.date)
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && toYMD(h.date) >= todayStr
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  if (!upcoming.length) return null

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
      <div style={{ padding: '11px 16px', borderBottom: '1px solid var(--card-border)' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>🗓 Holidays this month</p>
      </div>
      {upcoming.map((h, i) => {
        const c = HOLIDAY_COLORS[h.type] || HOLIDAY_COLORS.National
        const d = new Date(h.date)
        return (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: c.bg, border: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: c.color, lineHeight: 1 }}>{d.getDate()}</span>
              <span style={{ fontSize: 8, fontWeight: 700, color: c.color, lineHeight: 1.3 }}>{d.toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</p>
              <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN',{weekday:'long'})}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: c.bg, color: c.color, border: `1px solid ${c.border}`, flexShrink: 0 }}>{h.type}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main AdminCalendar ───────────────────────────────────────────────────────

export default function AdminCalendar({ allLeaves, onLeaveUpdate }) {
  const [attendance, setAttendance] = useState([])
  const [holidays,   setHolidays]   = useState([])
  const [settings,   setSettings]   = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [selectedDay,setSelectedDay]= useState(null)
  const [showPicker, setShowPicker] = useState(false)

  const now = new Date()
  const [viewYear,  setViewYear]  = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  useEffect(() => {
    Promise.all([
      axios.get(`${BASE_URL}/api/attendance`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/holidays`).catch(() => ({ data: [] })),
      axios.get(`${BASE_URL}/api/settings`).catch(() => ({ data: {} })),
    ]).then(([attRes, holRes, settingsRes]) => {
      setAttendance(attRes.data || [])
      setHolidays(holRes.data || [])
      setSettings(settingsRes.data || {})
      setLoading(false)
    })
  }, [])

  const workingDayNums = parseDays(settings?.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat')

  const attMap = {}
  attendance.forEach(a => {
    const key = toYMD(a.checkInTime || a.timestamp)
    if (!attMap[key]) attMap[key] = []
    attMap[key].push(a)
  })

  const holidayMap = {}
  holidays.forEach(h => { holidayMap[toYMD(h.date)] = h })

  const leaveMap = {}
  ;(allLeaves || []).forEach(l => {
    const from = new Date(l.fromDate || l.date)
    const to   = new Date(l.toDate   || l.date)
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const key = toYMD(d)
      if (!leaveMap[key]) leaveMap[key] = []
      leaveMap[key].push(l)
    }
  })

  const calendarDays = () => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startDow     = firstOfMonth.getDay()
    const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
    const todayStr     = toYMD(new Date())
    const cells        = []

    const makeCell = (date, isCurrentMonth) => {
      const dateStr = toYMD(date)
      return {
        date: dateStr, dayNum: date.getDate(), isCurrentMonth,
        isToday: dateStr === todayStr,
        isWeekend: !workingDayNums.includes(date.getDay()),
        holiday: holidayMap[dateStr] || null,
        attendances: attMap[dateStr] || [],
        leaves: leaveMap[dateStr] || [],
      }
    }

    for (let i = 0; i < startDow; i++) cells.push(makeCell(new Date(viewYear, viewMonth, 1 - (startDow - i)), false))
    for (let i = 1; i <= daysInMonth; i++) cells.push(makeCell(new Date(viewYear, viewMonth, i), true))
    const rem = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= rem; i++) cells.push(makeCell(new Date(viewYear, viewMonth + 1, i), false))
    return cells
  }

  const days = calendarDays()

  // ── Navigation: future-only ──
  const isPrevDisabled = isBeforeCurrentMonth(
    viewMonth === 0 ? viewYear - 1 : viewYear,
    viewMonth === 0 ? 11 : viewMonth - 1
  )

  const goToPrev = () => {
    if (isPrevDisabled) return
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }
  const goToToday = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()) }
  const isCurrentMonthView = viewYear === now.getFullYear() && viewMonth === now.getMonth()

  const handleLeaveUpdate = (leaveId, status) => {
    if (onLeaveUpdate) onLeaveUpdate(leaveId, status)
    Object.keys(leaveMap).forEach(key => {
      leaveMap[key] = leaveMap[key].map(l => l.id === leaveId ? { ...l, status } : l)
    })
    if (selectedDay) {
      setSelectedDay(prev => ({
        ...prev,
        leaves: (prev.leaves || []).map(l => l.id === leaveId ? { ...l, status } : l),
      }))
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: 14 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 8px' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading calendar…
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <button
          onClick={goToPrev}
          disabled={isPrevDisabled}
          style={{ width: 36, height: 36, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--surface2)', cursor: isPrevDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isPrevDisabled ? 'var(--text-muted)' : 'var(--text-secondary)', opacity: isPrevDisabled ? 0.35 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setShowPicker(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {!isCurrentMonthView && (
            <button onClick={goToToday} style={{ fontSize: 11, fontWeight: 600, color: '#1AABDB', background: 'none', border: 'none', cursor: 'pointer' }}>
              Back to today
            </button>
          )}
        </div>

        <button onClick={goToNext} style={{ width: 36, height: 36, borderRadius: 9999, border: '1px solid var(--card-border)', background: 'var(--surface2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* Office settings bar */}
      {settings?.checkInTime && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.12)', fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
          <span>🕘 Shift: <strong style={{ color: 'var(--text-primary)' }}>{settings.checkInTime} – {settings.checkOutTime}</strong></span>
          <span>⚠️ Late after: <strong style={{ color: '#F59E0B' }}>{settings.lateAfter}</strong></span>
          <span>📅 Working: <strong style={{ color: 'var(--text-primary)' }}>{settings.workingDays}</strong></span>
        </div>
      )}

      <MonthlyStats days={days} />

      {/* Calendar grid */}
      <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--card-border)' }}>
          {DAY_LABELS.map((d, i) => {
            const isNonWorking = !workingDayNums.includes(i === 0 ? 0 : i)
            return (
              <div key={d} style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: isNonWorking ? '#94A3B8' : 'var(--text-secondary)' }}>
                {d}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: 6 }}>
          {days.map((day, i) => (
            <AdminCalendarCell key={i} dayData={day} onClick={setSelectedDay} />
          ))}
        </div>
      </div>

      <Legend />

      <UpcomingHolidays holidays={holidays} viewYear={viewYear} viewMonth={viewMonth} />

      {selectedDay && (
        <AdminDaySheet dayData={selectedDay} onClose={() => setSelectedDay(null)} onUpdateLeave={handleLeaveUpdate} />
      )}

      {showPicker && (
        <MonthYearPicker
          viewYear={viewYear} viewMonth={viewMonth}
          onChange={(y, m) => { setViewYear(y); setViewMonth(m) }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}