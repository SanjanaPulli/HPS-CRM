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

  useEffect(() => {
    const stored = localStorage.getItem('employeeAuth')
    if (!stored) { navigate('/employee/login'); return }
    const emp = JSON.parse(stored)
    setEmployee(emp)
    fetchAttendance(emp.empId)
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
    if (status === 'Present') return { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
    if (status === 'Late') return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }
    if (status === 'On Leave') return { background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }
    return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }
  }

  const filtered = filter === 'All' ? records : records.filter(r => r.status === filter)
  const stats = {
    present: records.filter(r => r.status === 'Present').length,
    late: records.filter(r => r.status === 'Late').length,
    absent: records.filter(r => r.status === 'Absent').length,
    onLeave: records.filter(r => r.status === 'On Leave').length,
  }
  const total = records.length
  const attendancePct = total > 0 ? Math.round(((stats.present + stats.late) / total) * 100) : 0

  const statCards = [
    { label: 'Present', value: stats.present, color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
    { label: 'Late', value: stats.late, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
    { label: 'Absent', value: stats.absent, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
    { label: 'On Leave', value: stats.onLeave, color: '#1AABDB', bg: 'rgba(26,171,219,0.08)', border: 'rgba(26,171,219,0.2)' },
  ]

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: '4px', height: '24px', borderRadius: '4px', background: '#1AABDB' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Attendance</h1>
          </div>
          <p className="text-sm ml-3" style={{ color: 'var(--text-secondary)' }}>{records.length} total records</p>
        </div>
        {/* Attendance % badge */}
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl" style={{ background: 'rgba(26,171,219,0.08)', border: '1px solid rgba(26,171,219,0.2)' }}>
          <div>
            <p className="text-xs font-medium" style={{ color: 'rgba(26,171,219,0.7)' }}>Attendance Rate</p>
            <p className="text-2xl font-bold" style={{ color: '#1AABDB' }}>{attendancePct}%</p>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(stat => (
          <div key={stat.label} className="rounded-2xl p-4 transition-all duration-200"
            style={{ background: stat.bg, border: `1px solid ${stat.border}` }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${stat.border}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs font-medium mt-1" style={{ color: stat.color, opacity: 0.8 }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['All', 'Present', 'Late', 'Absent', 'On Leave'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="text-xs px-4 py-2 rounded-full font-semibold transition-all"
            style={filter === f
              ? { background: '#1AABDB', color: '#fff', border: '1px solid #1AABDB' }
              : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { if (filter !== f) e.currentTarget.style.borderColor = '#1AABDB' }}
            onMouseLeave={(e) => { if (filter !== f) e.currentTarget.style.borderColor = 'var(--card-border)' }}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No attendance records found.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(26,171,219,0.03)' }}>
                {['Date', 'Day', 'Status', 'Time'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold px-6 py-4" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(record => (
                <tr key={record.id} style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(26,171,219,0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {new Date(record.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(record.timestamp).toLocaleDateString('en-IN', { weekday: 'long' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={statusStyle(record.status)}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {record.status === 'Absent' ? '—'
                      : new Date(record.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
