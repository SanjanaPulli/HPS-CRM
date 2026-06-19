import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import BASE_URL from '../config'
import { useTheme } from '../context/ThemeContext'

const POSITION_RANK = {
  'innovation manager': 1, 'tech lead': 2,
  'computer research analyst': 3, 'product designer': 3, 'ui/ux designer': 3,
  'associate sde': 4, 'sde intern': 5,
}
const RANK_LABELS = {
  1: { label: 'Management',  color: { background: 'rgba(168,85,247,0.1)',  color: '#7C3AED' } },
  2: { label: 'Tech Lead',   color: { background: 'rgba(59,130,246,0.1)',  color: '#2563EB' } },
  3: { label: 'Specialist',  color: { background: 'rgba(6,182,212,0.1)',   color: '#0891B2' } },
  4: { label: 'Associate',   color: { background: 'rgba(16,185,129,0.1)',  color: '#059669' } },
  5: { label: 'Intern',      color: { background: 'rgba(100,116,139,0.1)', color: '#475569' } },
}
const getRank = (position) => {
  if (!position) return 99
  return POSITION_RANK[position.toLowerCase().trim()] ?? 99
}

const todayStr = () => new Date().toISOString().split('T')[0]

function toYMD(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Resolve the true leave type from a leave record
function resolveLeaveType(leave) {
  if (!leave) return null
  const KNOWN = ['Leave', 'WFH', 'Permission', 'On Duty']
  if (leave.type && KNOWN.includes(leave.type)) return leave.type
  if (!leave.type && (leave.fromTime || leave.toTime)) return 'Permission'
  return 'Leave'
}

// All possible display statuses including resolved leave types
const STATUS_STYLE = {
  'Present':    { background: 'rgba(16,185,129,0.1)',  color: '#059669' },
  'Late':       { background: 'rgba(245,158,11,0.1)',  color: '#D97706' },
  'WFH':        { background: 'rgba(26,171,219,0.1)',  color: '#1AABDB' },
  'On Duty':    { background: 'rgba(139,92,246,0.1)',  color: '#7C3AED' },
  'Leave':      { background: 'rgba(100,116,139,0.1)', color: '#475569' },
  'Permission': { background: 'rgba(245,158,11,0.1)',  color: '#D97706' },
  'On Leave':   { background: 'rgba(100,116,139,0.1)', color: '#475569' },
  'Absent':     { background: 'rgba(239,68,68,0.1)',   color: '#DC2626' },
}
const getStatusStyle = (status) => STATUS_STYLE[status] || STATUS_STYLE['Absent']

// Filters shown in the UI — includes WFH and OD
const FILTERS = ['All', 'Present', 'Late', 'WFH', 'On Duty', 'Leave', 'Absent']

function Attendance() {
  const [records,   setRecords]   = useState([])
  const [employees, setEmployees] = useState([])
  const [leaves,    setLeaves]    = useState([])   // all leaves for selected date
  const [loading,   setLoading]   = useState(true)
  const [filter,    setFilter]    = useState('All')
  const [search,    setSearch]    = useState('')
  const [groupByHierarchy, setGroupByHierarchy] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [togglingId,   setTogglingId]   = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const { theme } = useTheme()

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { fetchData(selectedDate) }, [selectedDate])
  useEffect(() => { fetchEmployees() }, [])

  const fetchData = async (date) => {
    setLoading(true)
    try {
      const [attRes, leaveRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/attendance?date=${date}`).catch(() => ({ data: [] })),
        axios.get(`${BASE_URL}/api/leave`).catch(() => ({ data: [] })),
      ])
      setRecords(attRes.data || [])
      setLeaves(leaveRes.data  || [])
    } catch {
      console.error('Failed to fetch attendance/leave data')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/employees`)
      setEmployees(res.data)
    } catch { console.error('Failed to fetch employees') }
  }

  const toggleLeader = async (empId, current) => {
    setTogglingId(empId)
    try {
      await axios.patch(`${BASE_URL}/api/employees/${empId}/leader`, { isAttendanceLeader: !current })
      await fetchEmployees()
    } catch { console.error('Failed to toggle leader') }
    finally { setTogglingId(null) }
  }

  const leaderMap = useMemo(() => {
    const map = {}
    employees.forEach(e => { map[e.empId] = e.isAttendanceLeader })
    return map
  }, [employees])

  // Build a map: empId → approved leave record for the selected date
  const leaveDateMap = useMemo(() => {
    const map = {}
    leaves.forEach(l => {
      if (l.status !== 'Approved') return
      const from = new Date(l.fromDate || l.date)
      const to   = new Date(l.toDate   || l.date)
      const sel  = new Date(selectedDate)
      if (sel >= from && sel <= to) {
        // Keep first approved leave per employee
        if (!map[l.empId]) map[l.empId] = l
      }
    })
    return map
  }, [leaves, selectedDate])

  // Resolve the true display status for a record:
  // If the backend says 'On Leave', look up the leave table to get WFH / OD / Leave
  const resolveStatus = (record) => {
    if (record.status === 'On Leave' || record.status === 'Absent') {
      const leave = leaveDateMap[record.empId]
      if (leave) {
        const type = resolveLeaveType(leave)
        // Map internal types to display labels
        if (type === 'On Duty') return 'On Duty'
        if (type === 'WFH')     return 'WFH'
        if (type === 'Permission') return 'Permission'
        return 'Leave'
      }
    }
    return record.status
  }

  const exportCSV = () => {
    const headers = ['Employee','ID','Position','Department','Status','Check In','Check Out','Hours','Overtime (min)','Leader']
    const rows = filtered.map(r => {
      const displayStatus = resolveStatus(r)
      return [
        r.employee.name, r.empId,
        r.employee.position || '—', r.employee.department || '—',
        displayStatus,
        (r.checkInTime || r.timestamp) ? new Date(r.checkInTime || r.timestamp).toLocaleTimeString() : '—',
        r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '—',
        r.hoursWorked  ?? '—',
        r.overtimeMinutes ?? '—',
        leaderMap[r.empId] ? 'Yes' : 'No',
      ]
    })
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `attendance-${selectedDate}.csv`; a.click()
  }

  // Filter using resolved status
  const filtered = records
    .filter(r => {
      if (filter === 'All') return true
      return resolveStatus(r) === filter
    })
    .filter(r =>
      search === '' ||
      r.employee.name.toLowerCase().includes(search.toLowerCase()) ||
      r.empId.toLowerCase().includes(search.toLowerCase()) ||
      r.employee.position?.toLowerCase().includes(search.toLowerCase())
    )

  const sortedFiltered = groupByHierarchy
    ? [...filtered].sort((a, b) => getRank(a.employee.position) - getRank(b.employee.position))
    : filtered

  const groupedRecords = () => {
    const groups = {}
    sortedFiltered.forEach(r => {
      const rank = getRank(r.employee.position)
      if (!groups[rank]) groups[rank] = []
      groups[rank].push(r)
    })
    return Object.entries(groups).sort((a, b) => Number(a[0]) - Number(b[0]))
  }

  // Stats using resolved status
  const stats = useMemo(() => ({
    present:  records.filter(r => resolveStatus(r) === 'Present').length,
    late:     records.filter(r => resolveStatus(r) === 'Late').length,
    wfh:      records.filter(r => resolveStatus(r) === 'WFH').length,
    onDuty:   records.filter(r => resolveStatus(r) === 'On Duty').length,
    leave:    records.filter(r => resolveStatus(r) === 'Leave').length,
    absent:   records.filter(r => resolveStatus(r) === 'Absent').length,
  }), [records, leaveDateMap])

  const isToday = selectedDate === todayStr()

  // ── MOBILE CARD ────────────────────────────────────────────────────────────
  const renderCard = (record) => {
    const isLeader      = leaderMap[record.empId] ?? false
    const isToggling    = togglingId === record.empId
    const displayStatus = resolveStatus(record)
    const ss            = getStatusStyle(displayStatus)

    return (
      <div key={record.id} style={{
        borderRadius: 16, padding: 16,
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
      }}>
        {/* Top: avatar + name + status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#1AABDB',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {record.employee.name.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)', margin: 0 }}>
                  {record.employee.name}
                </p>
                {isLeader && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, fontWeight: 600, background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}>
                    Leader
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{record.empId}</p>
            </div>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, flexShrink: 0, ...ss }}>
            {displayStatus}
          </span>
        </div>

        {/* Detail grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 16, rowGap: 6, marginBottom: 12 }}>
          {[
            { label: 'Position',   value: record.employee.position || '—' },
            { label: 'Department', value: record.employee.department || '—' },
            {
              label: 'Check In',
              value: (record.checkInTime || record.timestamp)
                ? <strong>{new Date(record.checkInTime || record.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
                : '—',
            },
            {
              label: 'Check Out',
              value: record.checkOutTime
                ? <><strong>✅ {new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></>
                : '⏳ Pending',
            },
            { label: 'Hours', value: record.hoursWorked != null ? `${record.hoursWorked}h` : '—' },
            { label: 'OT', value: record.overtimeMinutes != null
                ? record.overtimeMinutes > 0
                  ? <span style={{ fontWeight: 700, color: '#059669' }}>+{record.overtimeMinutes}m</span>
                  : record.overtimeMinutes < 0
                    ? <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{record.overtimeMinutes}m</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>
                : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', margin: 0 }}>{label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Leave reason if applicable */}
        {['Leave','WFH','On Duty','Permission'].includes(displayStatus) && leaveDateMap[record.empId]?.reason && (
          <div style={{ padding: '8px 10px', borderRadius: 10, background: ss.background, marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: ss.color, margin: '0 0 2px' }}>{displayStatus} Reason</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{leaveDateMap[record.empId].reason}</p>
          </div>
        )}

        {/* Leader toggle */}
        <div style={{ paddingTop: 8, borderTop: '1px solid var(--card-border)' }}>
          <button
            onClick={() => toggleLeader(record.empId, isLeader)}
            disabled={isToggling}
            style={{
              width: '100%', fontSize: 12, fontWeight: 600, padding: '8px 0', borderRadius: 12,
              cursor: isToggling ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: isToggling ? 0.5 : 1,
              background: isLeader ? 'rgba(26,171,219,0.12)' : 'var(--surface2)',
              color:      isLeader ? '#1AABDB' : 'var(--text-muted)',
              border:     isLeader ? '1px solid rgba(26,171,219,0.3)' : '1px solid var(--card-border)',
            }}>
            {isLeader ? '★ Leader' : '☆ Set Leader'}
          </button>
        </div>
      </div>
    )
  }

  // ── DESKTOP ROW ────────────────────────────────────────────────────────────
  const renderRow = (record) => {
    const isLeader      = leaderMap[record.empId] ?? false
    const isToggling    = togglingId === record.empId
    const displayStatus = resolveStatus(record)
    const ss            = getStatusStyle(displayStatus)
    const leaveRecord   = leaveDateMap[record.empId]

    return (
      <tr key={record.id}
        style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>

        {/* Name */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1AABDB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {record.employee.name.charAt(0)}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{record.employee.name}</p>
                {isLeader && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, fontWeight: 600, background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}>
                    Leader
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{record.empId}</p>
            </div>
          </div>
        </td>

        {/* Position */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>{record.employee.position || '—'}</td>

        {/* Department */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>{record.employee.department || '—'}</td>

        {/* Status — resolved to WFH/OD/Leave */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, display: 'inline-block', width: 'fit-content', ...ss }}>
              {displayStatus}
            </span>
            {/* Show leave reason inline for leave types */}
            {['Leave','WFH','On Duty','Permission'].includes(displayStatus) && leaveRecord?.reason && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={leaveRecord.reason}>
                {leaveRecord.reason}
              </span>
            )}
          </div>
        </td>

        {/* Check In */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {record.checkInTime || record.timestamp
            ? <strong style={{ color: 'var(--text-primary)' }}>{new Date(record.checkInTime || record.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
            : '—'}
        </td>

        {/* Check Out */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {record.checkOutTime
            ? <strong style={{ color: 'var(--text-primary)' }}>{new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
            : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>Pending</span>}
        </td>

        {/* Hours */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {record.hoursWorked != null ? `${record.hoursWorked}h` : '—'}
        </td>

        {/* OT */}
        <td style={{ padding: '16px 24px', fontSize: 13 }}>
          {record.overtimeMinutes != null ? (
            record.overtimeMinutes > 0 ? (
              <span style={{ fontWeight: 700, color: '#059669' }}>+{record.overtimeMinutes}m</span>
            ) : record.overtimeMinutes < 0 ? (
              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{record.overtimeMinutes}m</span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>—</span>
            )
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>—</span>
          )}
        </td>

        {/* Scan access */}
        <td style={{ padding: '16px 24px' }}>
          <button
            onClick={() => toggleLeader(record.empId, isLeader)}
            disabled={isToggling}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12,
              cursor: isToggling ? 'not-allowed' : 'pointer', transition: 'all 0.15s', opacity: isToggling ? 0.5 : 1,
              background: isLeader ? 'rgba(26,171,219,0.12)' : 'var(--surface2)',
              color:      isLeader ? '#1AABDB' : 'var(--text-muted)',
              border:     isLeader ? '1px solid rgba(26,171,219,0.3)' : '1px solid var(--card-border)',
            }}>
            {isLeader ? '★ Leader' : '☆ Set Leader'}
          </button>
        </td>
      </tr>
    )
  }

  const tableHead = (
    <thead>
      <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--card-border)' }}>
        {['Employee','Position','Department','Status','Check In','Check Out','Hours','OT (min)','Scan Access'].map(h => (
          <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 600, padding: '16px 24px', color: 'var(--text-secondary)' }}>{h}</th>
        ))}
      </tr>
    </thead>
  )

  const RankBadge = ({ rankNum }) => {
    const info = RANK_LABELS[rankNum] || { label: 'Other', color: { background: 'rgba(100,116,139,0.1)', color: '#475569' } }
    return <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, ...info.color }}>{info.label}</span>
  }

  const renderMobileGroups = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groupedRecords().map(([rank, rows]) => {
        const rankNum = Number(rank)
        return (
          <div key={rank}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '0 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TIER {rankNum === 99 ? '—' : rankNum}</span>
              <RankBadge rankNum={rankNum} />
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{rows.map(renderCard)}</div>
          </div>
        )
      })}
    </div>
  )

  // Stat cards — now includes WFH and On Duty
  const STAT_STYLES = [
    { label: 'Present',  value: stats.present, border: 'rgba(16,185,129,0.35)',  color: '#059669' },
    { label: 'Late',     value: stats.late,    border: 'rgba(245,158,11,0.35)',  color: '#D97706' },
    { label: 'WFH',      value: stats.wfh,     border: 'rgba(26,171,219,0.35)',  color: '#1AABDB' },
    { label: 'On Duty',  value: stats.onDuty,  border: 'rgba(139,92,246,0.35)', color: '#7C3AED' },
    { label: 'Leave',    value: stats.leave,   border: 'rgba(100,116,139,0.35)', color: '#475569' },
    { label: 'Absent',   value: stats.absent,  border: 'rgba(239,68,68,0.35)',   color: '#DC2626' },
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Attendance</h1>
          <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
            {isToday
              ? "Today's records"
              : `Records for ${new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`}
            {' · '}{records.length} total
          </p>
        </div>
        <button onClick={exportCSV}
          style={{ background: '#1AABDB', color: '#fff', padding: '10px 20px', borderRadius: 16, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1595c0'}
          onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}>
          Export CSV
        </button>
      </div>

      {/* Stats — 6 cards now */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 24 }}>
        {STAT_STYLES.filter(s => s.value > 0 || ['Present','Absent'].includes(s.label)).map(s => (
          <div key={s.label} style={{ border: `1px solid ${s.border}`, borderRadius: 16, padding: '12px 16px', textAlign: 'center', background: 'rgba(26,171,219,0.03)' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, fontWeight: 500, marginTop: 4, color: s.color, margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24, alignItems: 'center' }}>
        {/* Date picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 16, padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ fontSize: 14, outline: 'none', background: 'transparent', color: 'var(--text-primary)', border: 'none' }} />
        </div>

        {!isToday && (
          <button onClick={() => setSelectedDate(todayStr())}
            style={{ fontSize: 12, padding: '8px 16px', borderRadius: 9999, fontWeight: 600, background: '#1AABDB', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Back to Today
          </button>
        )}

        {/* Search */}
        <input type="text" placeholder="Search name, ID, position..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 16, padding: '8px 16px', fontSize: 14, outline: 'none', width: isMobile ? '100%' : 224, boxSizing: 'border-box', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }} />

        {/* Status filters — now includes WFH and On Duty */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {FILTERS.map(f => {
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  fontSize: 12, padding: '7px 14px', borderRadius: 9999, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  ...(active
                    ? { background: '#1AABDB', color: '#fff', border: '1px solid #1AABDB' }
                    : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }),
                }}
                onMouseEnter={active ? undefined : e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={active ? undefined : e => e.currentTarget.style.background = 'var(--card-bg)'}>
                {f}
              </button>
            )
          })}
        </div>

        {/* Hierarchy toggle */}
        <button onClick={() => setGroupByHierarchy(prev => !prev)}
          style={{
            marginLeft: isMobile ? 0 : 'auto',
            fontSize: 12, padding: '8px 16px', borderRadius: 9999, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 8,
            ...(groupByHierarchy
              ? { background: '#1C2333', color: '#fff', border: '1px solid #1C2333' }
              : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }),
          }}
          onMouseEnter={groupByHierarchy ? undefined : e => e.currentTarget.style.background = 'var(--surface2)'}
          onMouseLeave={groupByHierarchy ? undefined : e => e.currentTarget.style.background = 'var(--card-bg)'}>
          <span>🏛</span>{groupByHierarchy ? 'Hierarchy: On' : 'Group by Hierarchy'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</p>
      ) : sortedFiltered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', borderRadius: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No records found for this date.</p>
        </div>
      ) : (
        <>
          {isMobile && (
            groupByHierarchy
              ? renderMobileGroups()
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{sortedFiltered.map(renderCard)}</div>
          )}

          {!isMobile && (
            groupByHierarchy ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {groupedRecords().map(([rank, rows]) => {
                  const rankNum = Number(rank)
                  return (
                    <div key={rank} style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px', background: 'var(--surface2)', borderBottom: '1px solid var(--card-border)' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TIER {rankNum === 99 ? '—' : rankNum}</span>
                        <RankBadge rankNum={rankNum} />
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        {tableHead}<tbody>{rows.map(renderRow)}</tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  {tableHead}<tbody>{sortedFiltered.map(renderRow)}</tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}

function RankBadge({ rankNum }) {
  const info = RANK_LABELS[rankNum] || { label: 'Other', color: { background: 'rgba(100,116,139,0.1)', color: '#475569' } }
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, ...info.color }}>{info.label}</span>
}

export default Attendance