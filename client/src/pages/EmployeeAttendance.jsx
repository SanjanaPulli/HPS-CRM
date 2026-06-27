import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import BASE_URL from '../config'

function EmployeeAttendance() {
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [employee, setEmployee] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    let emp = null
    const stored = localStorage.getItem('employeeAuth')
    if (stored) {
      emp = JSON.parse(stored)
    } else {
      const isAdmin = localStorage.getItem('adminAuth')
      const role = localStorage.getItem('role')
      if (isAdmin && role === 'manager') {
        // Allow manager to access
      } else {
        navigate('/employee/login')
        return
      }
    }

    const loadData = (targetEmp) => {
      setEmployee(targetEmp)
      fetchAttendance(targetEmp.empId)
    }

    if (emp) {
      loadData(emp)
    } else {
      axios.get(`${BASE_URL}/api/employees/HPS250025`)
        .then(res => {
          localStorage.setItem('employeeAuth', JSON.stringify(res.data))
          loadData(res.data)
        })
        .catch(err => {
          console.error("Failed to load manager employee details", err)
          setLoading(false)
        })
    }

    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchAttendance = async (empId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/attendance/${empId}`)
      setRecords(res.data)
    } catch {
      console.error('Failed to fetch attendance')
    } finally {
      setLoading(false)
    }
  }

  const statusStyle = (status) => {
    if (status === 'Present' || status === 'WFH' || status === 'On Duty' || status === 'Permission') return { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
    if (status === 'Late') return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }
    if (status === 'Leave' || status === 'On Leave' || status === 'Half Day') return { background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }
    return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
  }

  const filtered = filter === 'All' ? records : records.filter(r => {
    if (filter === 'Present') return ['Present', 'On Duty', 'Permission'].includes(r.status);
    if (filter === 'On Leave') return ['Leave', 'On Leave', 'Half Day'].includes(r.status);
    return r.status === filter;
  })

  const stats = {
    present: records.filter(r => ['Present', 'On Duty', 'Permission'].includes(r.status)).length,
    wfh: records.filter(r => r.status === 'WFH').length,
    late: records.filter(r => r.status === 'Late').length,
    absent: records.filter(r => r.status === 'Absent').length,
    onLeave: records.filter(r => ['Leave', 'On Leave', 'Half Day'].includes(r.status)).length,
  }
  const total = records.length
  const attendancePct = total > 0 ? Math.round(((stats.present + stats.wfh + stats.late) / total) * 100) : 0

  const statCards = [
    { label: 'Present', value: stats.present, color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: 'WFH', value: stats.wfh, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
    { label: 'Late', value: stats.late, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Absent', value: stats.absent, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    { label: 'On Leave', value: stats.onLeave, color: '#1AABDB', bg: 'rgba(26,171,219,0.08)', border: 'rgba(26,171,219,0.2)' },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        marginBottom: '32px', display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '24px', borderRadius: '4px', background: '#1AABDB', flexShrink: 0 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My Attendance</h1>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0 12px' }}>
            {records.length} total records
          </p>
        </div>

        {/* Attendance % badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 20px', borderRadius: '16px',
          background: 'rgba(26,171,219,0.08)', border: '1px solid rgba(26,171,219,0.2)'
        }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(26,171,219,0.7)', margin: '0 0 2px' }}>Attendance Rate</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1AABDB', margin: 0 }}>{attendancePct}%</p>
          </div>
          {/* Mini progress ring */}
          <svg width="44" height="44" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(26,171,219,0.15)" strokeWidth="4"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke="#1AABDB" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - attendancePct / 100)}`}
              strokeLinecap="round"
              style={{ transformOrigin: 'center', transform: 'rotate(-90deg)' }}/>
          </svg>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {statCards.map(stat => (
          <div key={stat.label}
            style={{
              borderRadius: '16px', padding: '16px', transition: 'all 0.2s',
              background: stat.bg, border: `1px solid ${stat.border}`
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${stat.border}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
            <p style={{ fontSize: '1.875rem', fontWeight: 700, color: stat.color, margin: '0 0 4px' }}>{stat.value}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: stat.color, opacity: 0.8, margin: 0 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {['All', 'Present', 'WFH', 'Late', 'Absent', 'On Leave'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              fontSize: '0.75rem', padding: '8px 16px', borderRadius: '9999px',
              fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer',
              ...(filter === f
                ? { background: '#1AABDB', color: '#fff', border: '1px solid #1AABDB' }
                : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' })
            }}
            onMouseEnter={e => { if (filter !== f) e.currentTarget.style.borderColor = '#1AABDB' }}
            onMouseLeave={e => { if (filter !== f) e.currentTarget.style.borderColor = 'var(--card-border)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table / Empty / Loading */}
      {loading ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 16px', borderRadius: '16px',
          background: 'var(--card-bg)', border: '1px solid var(--card-border)'
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No attendance records found.</p>
        </div>
      ) : isMobile ? (
        /* Mobile card list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(record => (
            <div key={record.id} style={{
              borderRadius: '16px', padding: '16px',
              background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                    {new Date(record.checkInTime || record.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {new Date(record.checkInTime || record.timestamp).toLocaleDateString('en-IN', { weekday: 'long' })}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '4px 10px',
                  borderRadius: '9999px', flexShrink: 0, ...statusStyle(record.status)
                }}>
                  {record.status}
                </span>
              </div>
              {record.status !== 'Absent' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                  <div>
                    <p style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 2px' }}>Check In</p>
                    <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {record.checkInTime
                        ? new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 2px' }}>Check Out</p>
                    <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {record.checkInTime && record.checkOutTime
                        ? new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 2px' }}>Hours Worked</p>
                    <p style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      {record.hoursWorked != null ? `${record.hoursWorked.toFixed(2)}h` : '—'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.675rem', color: 'var(--text-secondary)', textTransform: 'uppercase', margin: '0 0 2px' }}>Overtime</p>
                    <p style={{ fontSize: '0.825rem', fontWeight: 600, color: record.overtimeMinutes > 0 ? '#10B981' : record.overtimeMinutes < 0 ? '#EF4444' : 'var(--text-primary)', margin: 0 }}>
                      {record.overtimeMinutes != null
                        ? (record.overtimeMinutes > 0 ? `+${record.overtimeMinutes}m` : `${record.overtimeMinutes}m`)
                        : '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                  No punch records for this day.
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(26,171,219,0.03)' }}>
                {['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Hours Worked', 'Overtime'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', fontSize: '0.75rem', fontWeight: 600,
                    padding: '16px 24px', color: 'var(--text-secondary)'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(record => (
                <tr key={record.id}
                  style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {new Date(record.checkInTime || record.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {new Date(record.checkInTime || record.timestamp).toLocaleDateString('en-IN', { weekday: 'long' })}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px',
                      borderRadius: '9999px', ...statusStyle(record.status)
                    }}>
                      {record.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {record.checkInTime
                      ? new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {record.checkInTime && record.checkOutTime
                      ? new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {record.hoursWorked != null ? `${record.hoursWorked.toFixed(2)}h` : '—'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '0.875rem', fontWeight: 500, color: record.overtimeMinutes > 0 ? '#10B981' : record.overtimeMinutes < 0 ? '#EF4444' : 'var(--text-secondary)' }}>
                    {record.overtimeMinutes != null
                      ? (record.overtimeMinutes > 0 ? `+${record.overtimeMinutes}m` : `${record.overtimeMinutes}m`)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default EmployeeAttendance