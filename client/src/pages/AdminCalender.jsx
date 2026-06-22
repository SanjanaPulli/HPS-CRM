import { useEffect, useState } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS  = ['S','M','T','W','T','F','S']
const DAY_LABELS_FULL = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function toYMD(date) {
  if (!date) return ''
  // Strip Z/UTC offset so it's treated as local time
  const clean = date.toString().replace('Z', '').replace('+00:00', '')
  const d = new Date(clean)
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

function isBeforeCurrentMonth(year, month) {
  const now = new Date()
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())
}

const HOLIDAY_COLORS = {
  National: { color: '#DC2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.18)'  },
  Optional: { color: '#D97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.18)'  },
  Company:  { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.18)' },
}

const LEAVE_TYPE_COLORS = {
  Leave:      { color: '#64748B', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
  WFH:        { color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)',  border: 'rgba(14,165,233,0.2)'  },
  Permission: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.2)'  },
  'On Duty':  { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)'  },
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

  const presentCount = attendances.filter(a => a.status === 'Present').length
  const lateCount    = attendances.filter(a => a.status === 'Late').length

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          borderRadius: '20px 20px 0 0',
          background: 'var(--card-bg)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--card-border)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 14px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{dateStr}</p>
                {isToday && (
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(14,165,233,0.12)', color: '#0EA5E9', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    Today
                  </span>
                )}
              </div>

              {/* Summary row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {presentCount > 0 && (
                  <SummaryChip color="#10B981" bg="rgba(16,185,129,0.08)" border="rgba(16,185,129,0.18)">
                    {presentCount} Present
                  </SummaryChip>
                )}
                {lateCount > 0 && (
                  <SummaryChip color="#F59E0B" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.18)">
                    {lateCount} Late
                  </SummaryChip>
                )}
                {pendingLeaves.length > 0 && (
                  <SummaryChip color="#F59E0B" bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.18)">
                    {pendingLeaves.length} Pending
                  </SummaryChip>
                )}
                {approvedLeaves.length > 0 && (
                  <SummaryChip color="#64748B" bg="rgba(100,116,139,0.08)" border="rgba(100,116,139,0.18)">
                    {approvedLeaves.length} On Leave
                  </SummaryChip>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              style={{ background: 'var(--surface2)', border: 'none', cursor: 'pointer', borderRadius: 9999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Holiday banner */}
          {holiday && (() => {
            const c = HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.National
            return (
              <div style={{ padding: '14px 16px', borderRadius: 12, background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>🎉</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: c.color }}>{holiday.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: c.color, opacity: 0.75 }}>{holiday.type} Holiday</p>
                </div>
              </div>
            )
          })()}

          {/* Weekend */}
          {isWeekend && !holiday && (
            <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16 }}>😴</span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Non-working day</p>
            </div>
          )}

          {/* Pending leaves */}
          {pendingLeaves.length > 0 && (
            <section>
              <SectionLabel color="#F59E0B">Pending Approval</SectionLabel>
              {pendingLeaves.map(l => {
                const type = resolveLeaveType(l)
                const cfg  = LEAVE_TYPE_COLORS[type] || LEAVE_TYPE_COLORS.Leave
                return (
                  <div key={l.id} style={{ padding: '14px', borderRadius: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 8, flexWrap: 'wrap' }}>
                      <EmployeeBadge name={l.employee?.name} empId={l.empId} />
                      <TypePill cfg={cfg} type={type} />
                    </div>
                    {l.reason && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{l.reason}</p>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ActionBtn
                        disabled={updating === l.id}
                        onClick={() => handleStatus(l.id, 'Approved')}
                        color="#10B981"
                      >
                        Approve
                      </ActionBtn>
                      <ActionBtn
                        disabled={updating === l.id}
                        onClick={() => handleStatus(l.id, 'Rejected')}
                        color="#EF4444"
                      >
                        Reject
                      </ActionBtn>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* Attendance */}
          {attendances.length > 0 && (
            <section>
              <SectionLabel>Attendance</SectionLabel>
              {attendances.map(a => {
                const statusColor = a.status === 'Present' ? '#10B981' : a.status === 'Late' ? '#F59E0B' : '#EF4444'
                const statusBg    = a.status === 'Present' ? 'rgba(16,185,129,0.08)' : a.status === 'Late' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)'
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--card-border)', marginBottom: 6 }}>
                    <Avatar name={a.employee?.name || a.empId} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {a.employee?.name || a.empId}
                      </p>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
                        {fmtTime(a.checkInTime)  && <TimeTag label="In"  value={fmtTime(a.checkInTime)}  color="#10B981" />}
                        {fmtTime(a.checkOutTime) && <TimeTag label="Out" value={fmtTime(a.checkOutTime)} color="#64748B" />}
                        {a.hoursWorked != null   && <span style={{ fontSize: 11, color: '#0EA5E9', fontWeight: 600 }}>{fmtHours(a.hoursWorked)}</span>}
                        {a.overtimeMinutes > 0   && <span style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>+{a.overtimeMinutes}m OT</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: statusBg, color: statusColor, flexShrink: 0 }}>{a.status}</span>
                  </div>
                )
              })}
            </section>
          )}

          {/* Approved leaves */}
          {approvedLeaves.length > 0 && (
            <section>
              <SectionLabel>On Leave / WFH / On Duty</SectionLabel>
              {approvedLeaves.map(l => {
                const type = resolveLeaveType(l)
                const cfg  = LEAVE_TYPE_COLORS[type] || LEAVE_TYPE_COLORS.Leave
                const hrs  = calcHours(l.fromTime, l.toTime)
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px', borderRadius: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 6 }}>
                    <Avatar name={l.employee?.name} color={cfg.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.employee?.name}
                      </p>
                      {l.reason && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{l.reason}</p>}
                      {hrs && <p style={{ margin: '3px 0 0', fontSize: 11, color: cfg.color, fontWeight: 600 }}>{l.fromTime} – {l.toTime} · {hrs}</p>}
                    </div>
                    <TypePill cfg={cfg} type={type} />
                  </div>
                )
              })}
            </section>
          )}

          {/* Rejected leaves */}
          {rejectedLeaves.length > 0 && (
            <section>
              <SectionLabel color="#EF4444">Rejected</SectionLabel>
              {rejectedLeaves.map(l => (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)', marginBottom: 6, opacity: 0.65 }}>
                  <Avatar name={l.employee?.name} color="#EF4444" size={22} />
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{l.employee?.name}</strong>
                    {' · '}{resolveLeaveType(l)}
                    {l.reason ? ` · ${l.reason}` : ''}
                  </p>
                </div>
              ))}
            </section>
          )}

          {!holiday && !isWeekend && attendances.length === 0 && leaves.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '24px 0' }}>No records for this day.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Small reusable atoms ─────────────────────────────────────────────────────

function Avatar({ name, color = '#1AABDB', size = 28 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: size * 0.4, fontWeight: 700, flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  )
}

function EmployeeBadge({ name, empId }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Avatar name={name} />
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{name}</p>
        {empId && <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{empId}</p>}
      </div>
    </div>
  )
}

function TypePill({ cfg, type }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, flexShrink: 0 }}>
      {type}
    </span>
  )
}

function SectionLabel({ children, color = 'var(--text-secondary)' }) {
  return (
    <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </p>
  )
}

function TimeTag({ label, value, color }) {
  return (
    <span style={{ fontSize: 11, color, fontWeight: 600 }}>
      <span style={{ opacity: 0.6, fontWeight: 500 }}>{label} </span>{value}
    </span>
  )
}

function ActionBtn({ children, onClick, disabled, color }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1, padding: '9px', borderRadius: 9, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13, fontWeight: 700, background: color, color: '#fff',
        opacity: disabled ? 0.5 : 1, letterSpacing: '0.01em',
      }}
    >
      {children}
    </button>
  )
}
function SummaryChip({ children, color, bg, border }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 10px',
      borderRadius: 9999, background: bg, color: color,
      border: `1px solid ${border}`,
    }}>
      {children}
    </span>
  )
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function AdminCalendarCell({ dayData, onClick }) {
  if (!dayData) return <div style={{ aspectRatio: '1' }} />

  const { dayNum, isCurrentMonth, isToday, isWeekend, holiday, attendances, leaves } = dayData

  const presentCount = attendances.filter(a => a.status === 'Present').length
  const lateCount    = attendances.filter(a => a.status === 'Late').length
  const onLeaveCount = leaves.filter(l => l.status === 'Approved').length
  const pendingCount = leaves.filter(l => l.status === 'Pending').length
  const hasActivity  = isCurrentMonth && !holiday && !isWeekend && (presentCount + lateCount + onLeaveCount + pendingCount > 0)

  const isHoliday = !!holiday
  const hc = holiday ? (HOLIDAY_COLORS[holiday.type] || HOLIDAY_COLORS.National) : null

  let cellBg = 'transparent'
  if (isHoliday) cellBg = hc.bg
  else if (isWeekend) cellBg = 'rgba(148,163,184,0.04)'

  // Dot indicators — max 3 dots, each color represents a category
  const dots = []
  if (presentCount > 0 || lateCount > 0) dots.push(lateCount > 0 ? '#F59E0B' : '#10B981')
  if (onLeaveCount > 0) dots.push('#64748B')
  if (pendingCount > 0) dots.push('#F59E0B')

  return (
    <button
      onClick={() => onClick(dayData)}
      style={{
        aspectRatio: '1',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 4, borderRadius: 8, position: 'relative',
        border: isToday ? '2px solid #1AABDB' : '1px solid transparent',
        background: isToday ? 'rgba(14,165,233,0.06)' : cellBg,
        cursor: 'pointer',
        opacity: isCurrentMonth ? 1 : 0.2,
        padding: '2px',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Day number */}
      <span style={{
        fontSize: 13,
        fontWeight: isToday ? 800 : isCurrentMonth ? 500 : 400,
        lineHeight: 1,
        color: isToday ? '#1AABDB' : isHoliday ? hc.color : isWeekend ? '#94A3B8' : 'var(--text-primary)',
      }}>
        {dayNum}
      </span>

      {/* Dot cluster — compact, clean */}
      {hasActivity && (
        <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          {dots.slice(0, 3).map((color, i) => (
            <div key={i} style={{ width: 5, height: 5, borderRadius: 9999, background: color }} />
          ))}
        </div>
      )}

      {/* Holiday dot */}
      {isHoliday && (
        <div style={{ width: 5, height: 5, borderRadius: 9999, background: hc.color }} />
      )}

      {/* Pending badge — top-right corner */}
      {pendingCount > 0 && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          width: 7, height: 7, borderRadius: 9999,
          background: '#F59E0B',
          border: '1.5px solid var(--card-bg)',
        }} />
      )}
    </button>
  )
}

// ─── Legend ──────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { dot: '#10B981', label: 'Present'       },
    { dot: '#F59E0B', label: 'Late / Pending' },
    { dot: '#64748B', label: 'On Leave'       },
    { dot: '#DC2626', label: 'Holiday'        },
    { dot: '#94A3B8', label: 'Non-working'    },
  ]
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
      {items.map(({ dot, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: 9999, background: dot }} />
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
  const canGoPrevYear = pickerYear > currentYear

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 320, borderRadius: 18, background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
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
          <strong style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{pickerYear}</strong>
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
                  padding: '10px 6px', border: 'none', borderRadius: 8,
                  cursor: isPast ? 'not-allowed' : 'pointer',
                  fontSize: 13, fontWeight: isSelected ? 700 : 500,
                  background: isSelected ? '#1AABDB' : 'var(--surface2)',
                  color: isSelected ? '#fff' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                  opacity: isPast ? 0.3 : 1,
                  transition: 'background 0.12s',
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
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--card-border)' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Holidays This Month</p>
      </div>
      {upcoming.map((h, i) => {
        const c = HOLIDAY_COLORS[h.type] || HOLIDAY_COLORS.National
        const d = new Date(h.date)
        return (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: c.bg, border: `1px solid ${c.border}` }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: c.color, lineHeight: 1 }}>{d.getDate()}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: c.color, lineHeight: 1.4, letterSpacing: '0.03em' }}>{d.toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{h.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{d.toLocaleDateString('en-IN',{weekday:'long'})}</p>
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
      axios.get(`${BASE_URL}/api/attendance?all=true`).catch(() => ({ data: [] })),
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

  // AFTER (fixed - strip timezone before parsing)
  const attMap = {}
  attendance.forEach(a => {
    const raw = a.checkInTime || a.timestamp
    if (!raw) return
    // Treat stored time as local (IST), not UTC
    const clean = raw.toString().replace('Z', '').replace('+00:00', '')
    const key = toYMD(new Date(clean))
    if (!attMap[key]) attMap[key] = []
    attMap[key].push(a)
  })

  const holidayMap = {}
  holidays.forEach(h => { holidayMap[toYMD(h.date)] = h })

  const leaveMap = {}
  ;(allLeaves || []).forEach(l => {
    const fromRaw = (l.fromDate || l.date || '').toString().replace('Z','').replace('+00:00','')
    const toRaw   = (l.toDate   || l.date || '').toString().replace('Z','').replace('+00:00','')
    const from = new Date(fromRaw)
    const to   = new Date(toRaw)
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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 10px' }}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Loading…
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Month nav */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 14,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      }}>
        <NavBtn onClick={goToPrev} disabled={isPrevDisabled}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </NavBtn>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => setShowPicker(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}
          >
            {MONTH_NAMES[viewMonth]} {viewYear}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {!isCurrentMonthView && (
            <button onClick={goToToday} style={{ fontSize: 11, fontWeight: 600, color: '#1AABDB', background: 'none', border: 'none', cursor: 'pointer', marginTop: 2 }}>
              Back to today
            </button>
          )}
        </div>

        <NavBtn onClick={goToNext}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        </NavBtn>
      </div>

      {/* Office info bar */}
      {settings?.checkInTime && (
        <div style={{
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.1)',
          fontSize: 12, color: 'var(--text-secondary)',
          display: 'flex', flexWrap: 'wrap', gap: '4px 16px',
        }}>
          <span>Shift <strong style={{ color: 'var(--text-primary)' }}>{settings.checkInTime} – {settings.checkOutTime}</strong></span>
          <span>Late after <strong style={{ color: '#F59E0B' }}>{settings.lateAfter}</strong></span>
          <span>Working days <strong style={{ color: 'var(--text-primary)' }}>{settings.workingDays}</strong></span>
        </div>
      )}

      {/* Calendar grid */}
      <div style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--card-border)' }}>
          {DAY_LABELS_FULL.map((label, i) => {
            const isNonWorking = !workingDayNums.includes(i === 0 ? 0 : i)
            return (
              <div key={label} style={{ textAlign: 'center', padding: '10px 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: isNonWorking ? '#94A3B8' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {/* Show 3-letter on wider screens, 1-letter on very narrow — CSS media query via inline class trick */}
                <span className="cal-day-label-full">{label}</span>
                <span className="cal-day-label-short">{label.charAt(0)}</span>
              </div>
            )
          })}
        </div>

        {/* Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, padding: 4 }}>
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .cal-day-label-short { display: none; }
        .cal-day-label-full  { display: inline; }

        @media (max-width: 360px) {
          .cal-day-label-full  { display: none; }
          .cal-day-label-short { display: inline; }
        }
      `}</style>
    </div>
  )
}

function NavBtn({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36, height: 36, borderRadius: 9999,
        border: '1px solid var(--card-border)', background: 'var(--surface2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  )
}