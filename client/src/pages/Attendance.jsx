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

function resolveLeaveType(leave) {
  if (!leave) return null
  const KNOWN = ['Leave', 'WFH', 'Permission', 'On Duty']
  if (leave.type && KNOWN.includes(leave.type)) return leave.type
  if (!leave.type && (leave.fromTime || leave.toTime)) return 'Permission'
  return 'Leave'
}

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

const FILTERS = ['All', 'Present', 'Late', 'WFH', 'On Duty', 'Leave', 'Absent']

// Add this constant at the top of the file
const TIMEZONE_FIX_DATE = new Date('2026-06-23T00:00:00+05:30') // date you deployed the fix

function displayTime(ts) {
  if (!ts) return null
  const d = new Date(ts)
  
  // Old records were double-offset — subtract 5.5hrs for display only
  const isOldRecord = d < TIMEZONE_FIX_DATE
  const display = isOldRecord
    ? new Date(d.getTime() - 5.5 * 60 * 60 * 1000)
    : d

  const h = display.getHours()
  const m = display.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`
}

function extractTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const isOldRecord = d < TIMEZONE_FIX_DATE
  const display = isOldRecord
    ? new Date(d.getTime() - 5.5 * 60 * 60 * 1000)
    : d
  return `${String(display.getHours()).padStart(2,'0')}:${String(display.getMinutes()).padStart(2,'0')}`
}

// REPLACE both extractTime and displayTime with these:

function extractTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function displayTime(ts) {
  if (!ts) return null
  const d = new Date(ts)
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${ampm}`
}

function Attendance() {
  // ── Edit modal state ──
  const [editRecord,  setEditRecord]  = useState(null)
  const [editForm,    setEditForm]    = useState({})
  const [saving,      setSaving]      = useState(false)

  // ── Main state ──
  const [records,   setRecords]   = useState([])
  const [employees, setEmployees] = useState([])
  const [leaves,    setLeaves]    = useState([])
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

  // ── Open edit modal ──
  const openEdit = (record) => {
    setEditForm({
      status:       record.status,
      checkInTime:  extractTime(record.checkInTime || record.timestamp),
      checkOutTime: extractTime(record.checkOutTime),
    })
    setEditRecord(record)
  }

  // ── Save edit ──
  const saveEdit = async () => {
    setSaving(true)
    try {
      const cin  = editForm.checkInTime  ? `${selectedDate}T${editForm.checkInTime}:00+05:30`  : null
      const cout = editForm.checkOutTime ? `${selectedDate}T${editForm.checkOutTime}:00+05:30` : null
      const hoursWorked = cin && cout
        ? (() => {
            const [ih, im] = editForm.checkInTime.split(':').map(Number)
            const [oh, om] = editForm.checkOutTime.split(':').map(Number)
            return ((oh * 60 + om) - (ih * 60 + im)) / 60
          })()
        : null

      await axios.patch(`${BASE_URL}/api/attendance/${editRecord.id}`, {
        status: editForm.status,
        checkInTime:  cin,
        checkOutTime: cout,
        hoursWorked,
      })
      await fetchData(selectedDate)
      setEditRecord(null)
    } catch { console.error('Failed to save attendance edit') }
    finally { setSaving(false) }
  }

  const leaderMap = useMemo(() => {
    const map = {}
    employees.forEach(e => { map[e.empId] = e.isAttendanceLeader })
    return map
  }, [employees])

  const leaveDateMap = useMemo(() => {
    const map = {}
    leaves.forEach(l => {
      if (l.status !== 'Approved') return
      const from = new Date(l.fromDate || l.date)
      const to   = new Date(l.toDate   || l.date)
      const sel  = new Date(selectedDate)
      if (sel >= from && sel <= to) {
        if (!map[l.empId]) map[l.empId] = l
      }
    })
    return map
  }, [leaves, selectedDate])

  const resolveStatus = (record) => {
    if (record.status === 'On Leave' || record.status === 'Absent') {
      const leave = leaveDateMap[record.empId]
      if (leave) {
        const type = resolveLeaveType(leave)
        if (type === 'On Duty')    return 'On Duty'
        if (type === 'WFH')        return 'WFH'
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
        (r.checkInTime || r.timestamp) ? displayTime(r.checkInTime || r.timestamp) : '—',
        r.checkOutTime ? displayTime(r.checkOutTime) : '—',
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

  const stats = useMemo(() => ({
    present:  records.filter(r => resolveStatus(r) === 'Present').length,
    late:     records.filter(r => resolveStatus(r) === 'Late').length,
    wfh:      records.filter(r => resolveStatus(r) === 'WFH').length,
    onDuty:   records.filter(r => resolveStatus(r) === 'On Duty').length,
    leave:    records.filter(r => resolveStatus(r) === 'Leave').length,
    absent:   records.filter(r => resolveStatus(r) === 'Absent').length,
  }), [records, leaveDateMap])

  const isToday = selectedDate === todayStr()

  // ── Hours preview helper ──
  const hoursPreview = () => {
    if (!editForm.checkInTime || !editForm.checkOutTime) return null
    const [ih, im] = editForm.checkInTime.split(':').map(Number)
    const [oh, om] = editForm.checkOutTime.split(':').map(Number)
    const mins = (oh * 60 + om) - (ih * 60 + im)
    if (mins <= 0) return null
    const h = Math.floor(mins / 60), m = mins % 60
    return `${h}h${m > 0 ? ` ${m}m` : ''}`
  }

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
                ? <strong>{displayTime(record.checkInTime || record.timestamp)}</strong>
                : '—',
            },
            {
              label: 'Check Out',
              value: record.checkOutTime
                ? <strong>✅ {displayTime(record.checkOutTime)}</strong>
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

        {/* Leave reason */}
        {['Leave','WFH','On Duty','Permission'].includes(displayStatus) && leaveDateMap[record.empId]?.reason && (
          <div style={{ padding: '8px 10px', borderRadius: 10, background: ss.background, marginBottom: 10 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: ss.color, margin: '0 0 2px' }}>{displayStatus} Reason</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{leaveDateMap[record.empId].reason}</p>
          </div>
        )}

        {/* Actions row */}
        <div style={{ paddingTop: 8, borderTop: '1px solid var(--card-border)', display: 'flex', gap: 8 }}>
          {/* Edit button */}
          <button
            onClick={() => openEdit(record)}
            style={{
              flex: 1, fontSize: 12, fontWeight: 600, padding: '8px 0', borderRadius: 12,
              cursor: 'pointer', background: 'rgba(26,171,219,0.1)',
              color: '#1AABDB', border: '1px solid rgba(26,171,219,0.3)',
            }}>
            ✏️ Edit
          </button>
          {/* Leader toggle */}
          <button
            onClick={() => toggleLeader(record.empId, isLeader)}
            disabled={isToggling}
            style={{
              flex: 1, fontSize: 12, fontWeight: 600, padding: '8px 0', borderRadius: 12,
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

        {/* Status */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, display: 'inline-block', width: 'fit-content', ...ss }}>
              {displayStatus}
            </span>
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
            ? <strong style={{ color: 'var(--text-primary)' }}>{displayTime(record.checkInTime || record.timestamp)}</strong>
            : '—'}
        </td>

        {/* Check Out */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {record.checkOutTime
            ? <strong style={{ color: 'var(--text-primary)' }}>{displayTime(record.checkOutTime)}</strong>
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

        {/* Scan access + Edit */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Edit button */}
            <button
              onClick={() => openEdit(record)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12,
                cursor: 'pointer', background: 'rgba(26,171,219,0.1)',
                color: '#1AABDB', border: '1px solid rgba(26,171,219,0.3)',
              }}>
              ✏️ Edit
            </button>
            {/* Leader toggle */}
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
          </div>
        </td>
      </tr>
    )
  }

  const tableHead = (
    <thead>
      <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--card-border)' }}>
        {['Employee','Position','Department','Status','Check In','Check Out','Hours','OT (min)','Actions'].map(h => (
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

  const STAT_STYLES = [
    { label: 'Present',  value: stats.present, border: 'rgba(16,185,129,0.35)',  color: '#059669' },
    { label: 'Late',     value: stats.late,    border: 'rgba(245,158,11,0.35)',  color: '#D97706' },
    { label: 'WFH',      value: stats.wfh,     border: 'rgba(26,171,219,0.35)',  color: '#1AABDB' },
    { label: 'On Duty',  value: stats.onDuty,  border: 'rgba(139,92,246,0.35)', color: '#7C3AED' },
    { label: 'Leave',    value: stats.leave,   border: 'rgba(100,116,139,0.35)', color: '#475569' },
    { label: 'Absent',   value: stats.absent,  border: 'rgba(239,68,68,0.35)',   color: '#DC2626' },
  ]

  const preview = hoursPreview()

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

      {/* Stats */}
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

        <input type="text" placeholder="Search name, ID, position..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 16, padding: '8px 16px', fontSize: 14, outline: 'none', width: isMobile ? '100%' : 224, boxSizing: 'border-box', background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }} />

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

      {/* ── EDIT ATTENDANCE MODAL ── */}
      {editRecord && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setEditRecord(null)}>
          <div
            style={{ background: 'var(--card-bg)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, border: '1px solid var(--card-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Edit Attendance</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {editRecord.employee.name} · {new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setEditRecord(null)}
                style={{ background: 'var(--surface2)', border: 'none', borderRadius: 9999, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✕
              </button>
            </div>

            {/* Status picker */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Present', 'Late', 'Absent', 'WFH', 'On Duty', 'Leave'].map(s => {
                  const active = editForm.status === s
                  const sStyle = getStatusStyle(s)
                  return (
                    <button key={s} onClick={() => setEditForm(f => ({ ...f, status: s }))}
                      style={{
                        padding: '6px 14px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: active ? sStyle.color : 'var(--surface2)',
                        color:      active ? '#fff' : 'var(--text-secondary)',
                        border:     active ? `1px solid ${sStyle.color}` : '1px solid var(--card-border)',
                      }}>
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Time pickers — only for Present / Late */}
            {['Present', 'Late'].includes(editForm.status) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check In</p>
                  <input type="time" value={editForm.checkInTime}
                    onChange={e => setEditForm(f => ({ ...f, checkInTime: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--card-border)', background: 'var(--surface2)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check Out</p>
                  <input type="time" value={editForm.checkOutTime}
                    onChange={e => setEditForm(f => ({ ...f, checkOutTime: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, fontSize: 14, border: '1px solid var(--card-border)', background: 'var(--surface2)', color: 'var(--text-primary)', boxSizing: 'border-box', outline: 'none' }} />
                </div>
              </div>
            )}

            {/* Hours preview */}
            {preview && ['Present','Late'].includes(editForm.status) && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(26,171,219,0.08)', border: '1px solid rgba(26,171,219,0.2)', marginBottom: 16, fontSize: 13, color: '#1AABDB', fontWeight: 600 }}>
                ⏱ {preview} worked
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditRecord(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                style={{ flex: 2, padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: '#1AABDB', color: '#fff', border: 'none', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RankBadge({ rankNum }) {
  const info = RANK_LABELS[rankNum] || { label: 'Other', color: { background: 'rgba(100,116,139,0.1)', color: '#475569' } }
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 9999, ...info.color }}>{info.label}</span>
}

export default Attendance