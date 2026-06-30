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
  'Half Day':   { background: 'rgba(147,51,234,0.1)',  color: '#9333EA' },
  'Absent':     { background: 'rgba(239,68,68,0.1)',   color: '#DC2626' },
}
const getStatusStyle = (status) => STATUS_STYLE[status] || STATUS_STYLE['Absent']

// Filters shown in the UI — includes WFH and OD
const FILTERS = ['All', 'Present', 'Late', 'WFH', 'On Duty', 'Leave', 'Permission', 'Half Day', 'Absent']

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
  const [settings, setSettings] = useState(null)
  const { theme } = useTheme()

  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({
    status: '',
    checkInTimeStr: '',
    checkOutTimeStr: '',
    hoursWorked: '',
    overtimeMinutes: ''
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState(false)

  const getISTTimeStr = (dateVal) => {
    if (!dateVal) return ''
    const date = new Date(dateVal)
    const istOffset = 5.5 * 60 * 60 * 1000
    const istDate = new Date(date.getTime() + istOffset)
    const hours = String(istDate.getUTCHours()).padStart(2, '0')
    const minutes = String(istDate.getUTCMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const openEditModal = (record) => {
    setEditingRecord(record)
    setEditForm({
      status: record.status,
      checkInTimeStr: getISTTimeStr(record.checkInTime || record.timestamp),
      checkOutTimeStr: getISTTimeStr(record.checkOutTime),
      hoursWorked: record.hoursWorked != null ? String(record.hoursWorked) : '',
      overtimeMinutes: record.overtimeMinutes != null ? String(record.overtimeMinutes) : ''
    })
  }

  const handleTimeChange = (type, value) => {
    setEditForm(prev => {
      const updated = { ...prev, [type]: value }
      const calc = calculateHoursAndOT(updated.checkInTimeStr, updated.checkOutTimeStr)
      return { ...updated, hoursWorked: calc.hours, overtimeMinutes: calc.ot }
    })
  }

  const calculateHoursAndOT = (checkInStr, checkOutStr) => {
    if (!checkInStr || !checkOutStr) return { hours: '', ot: '' }
    const partsIn = checkInStr.split(':')
    const partsOut = checkOutStr.split(':')
    if (partsIn.length < 2 || partsOut.length < 2) return { hours: '', ot: '' }

    const inH = Number(partsIn[0])
    const inM = Number(partsIn[1])
    const outH = Number(partsOut[0])
    const outM = Number(partsOut[1])

    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
      return { hours: '', ot: '' }
    }

    const checkInMins = inH * 60 + inM
    const checkOutMins = outH * 60 + outM

    let diffMins = checkOutMins - checkInMins
    if (diffMins < 0) diffMins += 24 * 60

    const calculatedHours = diffMins / 60
    const roundedHours = Math.round(calculatedHours * 100) / 100

    let standardHours = 8
    if (settings && settings.checkInTime && settings.checkOutTime) {
      const [sih, sim] = settings.checkInTime.split(':').map(Number)
      const [soh, som] = settings.checkOutTime.split(':').map(Number)
      if (!isNaN(sih) && !isNaN(sim) && !isNaN(soh) && !isNaN(som)) {
        standardHours = ((soh * 60 + som) - (sih * 60 + sim)) / 60
      }
    }
    const calculatedOT = Math.round((roundedHours - standardHours) * 60)

    return {
      hours: String(roundedHours),
      ot: String(calculatedOT)
    }
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingRecord) return
    setSavingEdit(true)
    try {
      const payload = {
        status: editForm.status,
        checkInTimeStr: editForm.checkInTimeStr || null,
        checkOutTimeStr: editForm.checkOutTimeStr || null,
        hoursWorked: editForm.hoursWorked === '' ? null : parseFloat(editForm.hoursWorked),
        overtimeMinutes: editForm.overtimeMinutes === '' ? null : parseInt(editForm.overtimeMinutes),
        date: selectedDate
      }
      await axios.put(`${BASE_URL}/api/attendance/${editingRecord.id}`, payload)
      setEditingRecord(null)
      fetchData(selectedDate)
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save attendance edits')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteRecord = async () => {
    if (!editingRecord) return
    if (!window.confirm(`Are you sure you want to delete this attendance record for ${editingRecord.employee.name}?`)) return
    setDeletingRecord(true)
    try {
      await axios.delete(`${BASE_URL}/api/attendance/${editingRecord.id}`)
      setEditingRecord(null)
      fetchData(selectedDate)
    } catch (err) {
      alert('Failed to delete attendance record')
    } finally {
      setDeletingRecord(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { fetchData(selectedDate) }, [selectedDate])
  useEffect(() => {
    fetchEmployees()
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/settings`)
      setSettings(res.data)
    } catch { console.error('Failed to fetch settings') }
  }

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
  // Backend now resolves status dynamically, we can use record.status directly
  const resolveStatus = (record) => {
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
    present:    records.filter(r => resolveStatus(r) === 'Present').length,
    late:       records.filter(r => resolveStatus(r) === 'Late').length,
    wfh:        records.filter(r => resolveStatus(r) === 'WFH').length,
    onDuty:     records.filter(r => resolveStatus(r) === 'On Duty').length,
    leave:      records.filter(r => resolveStatus(r) === 'Leave').length,
    permission: records.filter(r => resolveStatus(r) === 'Permission').length,
    halfDay:    records.filter(r => resolveStatus(r) === 'Half Day').length,
    absent:     records.filter(r => resolveStatus(r) === 'Absent').length,
  }), [records])

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
              value: record.checkInTime
                ? <strong>{new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
                : '—',
            },
            {
              label: 'Check Out',
              value: record.checkInTime ? (
                record.checkOutTime ? (
                  <><strong> {new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong></>
                ) : (
                  '⏳ Pending'
                )
              ) : (
                '—'
              ),
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

        {/* Actions row */}
        <div style={{ paddingTop: 8, borderTop: '1px solid var(--card-border)', display: 'flex', gap: 8 }}>
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
          <button
            onClick={() => openEditModal(record)}
            style={{
              flex: 1, fontSize: 12, fontWeight: 600, padding: '8px 0', borderRadius: 12,
              cursor: 'pointer', transition: 'all 0.15s',
              background: 'rgba(26,171,219,0.08)', color: '#1AABDB',
              border: '1px solid rgba(26,171,219,0.2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
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
          {record.checkInTime
            ? <strong style={{ color: 'var(--text-primary)' }}>{new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
            : '—'}
        </td>

        {/* Check Out */}
        <td style={{ padding: '16px 24px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {record.checkInTime ? (
            record.checkOutTime ? (
              <strong style={{ color: 'var(--text-primary)' }}>{new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</strong>
            ) : (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>Pending</span>
            )
          ) : (
            '—'
          )}
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

        {/* Actions */}
        <td style={{ padding: '16px 24px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            <button
              onClick={() => openEditModal(record)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12,
                cursor: 'pointer', transition: 'all 0.15s',
                background: 'rgba(26,171,219,0.08)', color: '#1AABDB',
                border: '1px solid rgba(26,171,219,0.2)',
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          </div>
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

  // Stat cards — now includes all 8 statuses
  const STAT_STYLES = [
    { label: 'Present',    value: stats.present,    border: 'rgba(16,185,129,0.35)',  color: '#059669' },
    { label: 'Late',       value: stats.late,       border: 'rgba(245,158,11,0.35)',  color: '#D97706' },
    { label: 'WFH',        value: stats.wfh,        border: 'rgba(26,171,219,0.35)',  color: '#1AABDB' },
    { label: 'On Duty',    value: stats.onDuty,     border: 'rgba(139,92,246,0.35)',  color: '#7C3AED' },
    { label: 'Leave',      value: stats.leave,      border: 'rgba(100,116,139,0.35)', color: '#475569' },
    { label: 'Permission', value: stats.permission, border: 'rgba(245,158,11,0.35)',  color: '#D97706' },
    { label: 'Half Day',   value: stats.halfDay,    border: 'rgba(147,51,234,0.35)',  color: '#9333EA' },
    { label: 'Absent',     value: stats.absent,     border: 'rgba(239,68,68,0.35)',   color: '#DC2626' },
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
                      <div style={{ overflowX: 'auto', width: '100%' }}>
                        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
                          {tableHead}<tbody>{rows.map(renderRow)}</tbody>
                        </table>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ borderRadius: 24, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
                    {tableHead}<tbody>{sortedFiltered.map(renderRow)}</tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </>
      )}

      {/* ── EDIT ATTENDANCE MODAL ── */}
      {editingRecord && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }} onClick={() => setEditingRecord(null)}>

          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: 20, padding: 24, width: '100%', maxWidth: 440,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Edit Attendance</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {editingRecord.employee.name} ({editingRecord.empId})
                </p>
              </div>
              <button onClick={() => setEditingRecord(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                    background: 'var(--input-bg)', color: 'var(--text-primary)',
                    border: '1px solid var(--input-border)', outline: 'none'
                  }}
                >
                  {['Present', 'Late', 'Absent', 'WFH', 'On Duty', 'Leave', 'Permission', 'Half Day'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Time inputs (side by side) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Check In (IST)</label>
                  <input
                    type="time"
                    value={editForm.checkInTimeStr}
                    onChange={e => handleTimeChange('checkInTimeStr', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                      background: 'var(--input-bg)', color: 'var(--text-primary)',
                      border: '1px solid var(--input-border)', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Check Out (IST)</label>
                  <input
                    type="time"
                    value={editForm.checkOutTimeStr}
                    onChange={e => handleTimeChange('checkOutTimeStr', e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                      background: 'var(--input-bg)', color: 'var(--text-primary)',
                      border: '1px solid var(--input-border)', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Hours & Overtime */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Hours Worked</label>
                  <input
                    type="number" step="0.01"
                    value={editForm.hoursWorked}
                    onChange={e => setEditForm(prev => ({ ...prev, hoursWorked: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                      background: 'var(--input-bg)', color: 'var(--text-primary)',
                      border: '1px solid var(--input-border)', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Overtime (mins)</label>
                  <input
                    type="number"
                    value={editForm.overtimeMinutes}
                    onChange={e => setEditForm(prev => ({ ...prev, overtimeMinutes: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 13,
                      background: 'var(--input-bg)', color: 'var(--text-primary)',
                      border: '1px solid var(--input-border)', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleDeleteRecord}
                  disabled={deletingRecord}
                  style={{
                    padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, background: 'rgba(239,68,68,0.08)', color: '#EF4444'
                  }}
                >
                  {deletingRecord ? 'Deleting…' : '🗑 Delete'}
                </button>
                <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    style={{
                      padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, background: 'var(--surface2)', color: 'var(--text-secondary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    style={{
                      padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, background: '#1AABDB', color: '#fff'
                    }}
                  >
                    {savingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
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