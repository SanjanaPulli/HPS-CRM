import { useState, useEffect } from 'react'
import axios from 'axios'
import BASE_URL from '../config'
import { useTheme } from '../context/ThemeContext'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function Reports() {
  const { theme } = useTheme()
  const [employees, setEmployees] = useState([])
  const [allAttendance, setAllAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [sortBy, setSortBy] = useState('name')
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    fetchData()
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [empRes, attRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/employees`),
        axios.get(`${BASE_URL}/api/attendance`),
      ])
      setEmployees(Array.isArray(empRes.data) ? empRes.data : [])
      setAllAttendance(Array.isArray(attRes.data) ? attRes.data : [])
    } catch (err) {
      console.error('Failed to fetch report data', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredAttendance = allAttendance.filter(r => {
    const d = new Date(r.timestamp)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const employeeStats = employees.map(emp => {
    const records = filteredAttendance.filter(r => r.empId === emp.empId)
    const present = records.filter(r => r.status === 'Present').length
    const late    = records.filter(r => r.status === 'Late').length
    const absent  = records.filter(r => r.status === 'Absent').length
    const onLeave = records.filter(r => r.status === 'On Leave').length
    const total   = present + late + absent + onLeave
    const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0
    return { ...emp, present, late, absent, onLeave, total, rate }
  }).filter(e => e.total > 0 || true)

  const sorted = [...employeeStats].sort((a, b) => {
    if (sortBy === 'name')    return a.name.localeCompare(b.name)
    if (sortBy === 'present') return b.present - a.present
    if (sortBy === 'absent')  return b.absent - a.absent
    if (sortBy === 'rate')    return b.rate - a.rate
    return 0
  })

  const totals = {
    present: filteredAttendance.filter(r => r.status === 'Present').length,
    late:    filteredAttendance.filter(r => r.status === 'Late').length,
    absent:  filteredAttendance.filter(r => r.status === 'Absent').length,
    onLeave: filteredAttendance.filter(r => r.status === 'On Leave').length,
  }
  const totalScans = totals.present + totals.late + totals.absent + totals.onLeave
  const overallRate = totalScans > 0
    ? Math.round(((totals.present + totals.late) / totalScans) * 100)
    : 0

  const years = [2024, 2025, 2026, 2027]

  const getRateColor = (rate) => {
    if (rate >= 90) return { color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' }
    if (rate >= 75) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' }
    return { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' }
  }

  const exportCSV = () => {
    const headers = ['Name', 'EmpID', 'Position', 'Department', 'Present', 'Late', 'Absent', 'On Leave', 'Total', 'Attendance %']
    const rows = sorted.map(e => [
      e.name, e.empId, e.position || '—', e.department || '—',
      e.present, e.late, e.absent, e.onLeave, e.total, `${e.rate}%`
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${MONTHS[selectedMonth]}-${selectedYear}.csv`
    a.click()
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: '12px',
        alignItems: isMobile ? 'flex-start' : 'flex-start',
        justifyContent: isMobile ? 'flex-start' : 'space-between',
        marginBottom: '32px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{ width: '4px', height: '24px', borderRadius: '4px', background: '#1AABDB' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Reports</h1>
          </div>
          <p style={{ fontSize: '0.875rem', marginLeft: '12px', color: 'var(--text-secondary)', margin: '0 0 0 12px' }}>
            Attendance summary · {MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            borderRadius: '16px',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#fff',
            background: '#1AABDB',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
            alignSelf: 'flex-start'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0e8ab5'}
          onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Month + Year picker */}
      <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Month strip — scrollable on mobile */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', margin: '0 -4px', padding: '0 4px' }}>
          <div style={{
            display: 'flex',
            borderRadius: '16px',
            overflow: 'hidden',
            width: 'max-content',
            border: '1px solid var(--card-border)',
            background: 'var(--card-bg)'
          }}>
            {MONTHS.map((m, i) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(i)}
                style={{
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  transition: 'background 0.2s',
                  whiteSpace: 'nowrap',
                  border: 'none',
                  cursor: 'pointer',
                  ...(selectedMonth === i
                    ? { background: '#1AABDB', color: '#fff' }
                    : { background: 'transparent', color: 'var(--text-secondary)' })
                }}
                onMouseEnter={e => { if (selectedMonth !== i) e.currentTarget.style.background = 'var(--surface2)' }}
                onMouseLeave={e => { if (selectedMonth !== i) e.currentTarget.style.background = 'transparent' }}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Year strip */}
        <div style={{
          display: 'flex',
          borderRadius: '16px',
          overflow: 'hidden',
          width: 'max-content',
          border: '1px solid var(--card-border)',
          background: 'var(--card-bg)'
        }}>
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                padding: '8px 16px',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'background 0.2s',
                border: 'none',
                cursor: 'pointer',
                ...(selectedYear === y
                  ? { background: '#1AABDB', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text-secondary)' })
              }}
              onMouseEnter={e => { if (selectedYear !== y) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (selectedYear !== y) e.currentTarget.style.background = 'transparent' }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
        gap: '16px',
        marginBottom: '32px'
      }}>
        {[
          { label: 'Overall Rate', value: `${overallRate}%`, color: '#1AABDB', bg: 'rgba(26,171,219,0.08)', border: 'rgba(26,171,219,0.2)' },
          { label: 'Present',      value: totals.present,   color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Late',         value: totals.late,      color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'Absent',       value: totals.absent,    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'  },
          { label: 'On Leave',     value: totals.onLeave,   color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
        ].map(s => (
          <div key={s.label} style={{
            borderRadius: '16px',
            padding: '16px',
            transition: 'all 0.2s',
            background: s.bg,
            border: `1px solid ${s.border}`
          }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: '0.75rem', fontWeight: 500, marginTop: '4px', color: s.color, opacity: 0.8, margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>SORT BY</p>
        {[
          { key: 'name',    label: 'Name' },
          { key: 'rate',    label: 'Attendance %' },
          { key: 'present', label: 'Most Present' },
          { key: 'absent',  label: 'Most Absent' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            style={{
              fontSize: '0.75rem',
              padding: '6px 12px',
              borderRadius: '9999px',
              fontWeight: 600,
              transition: 'all 0.2s',
              cursor: 'pointer',
              ...(sortBy === s.key
                ? { background: '#1AABDB', color: '#fff', border: '1px solid transparent' }
                : { background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' })
            }}
          >
            {s.label}
          </button>
        ))}
        <p style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0 auto' }}>
          {sorted.length} employees
        </p>
      </div>

      {/* Empty / loading states */}
      {loading ? (
        <div style={{
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)'
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Loading...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{
          borderRadius: '16px',
          padding: '64px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)'
        }}>
          <p style={{ fontSize: '2.25rem', marginBottom: '12px' }}>📊</p>
          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>No data for this period</p>
          <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Try selecting a different month</p>
        </div>
      ) : (
        <>
          {/* ── MOBILE CARDS (hidden on md+) ── */}
          {isMobile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sorted.map(emp => {
                const rc = getRateColor(emp.rate)
                return (
                  <div key={emp.empId} style={{
                    borderRadius: '16px',
                    padding: '16px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)'
                  }}>
                    {/* Top: avatar + name + rate badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                          background: '#1AABDB', flexShrink: 0
                        }}>
                          {emp.name?.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.25, color: 'var(--text-primary)', margin: 0 }}>{emp.name}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{emp.empId}</p>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px',
                        borderRadius: '9999px', flexShrink: 0,
                        background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`
                      }}>
                        {emp.rate}%
                      </span>
                    </div>

                    {/* Department */}
                    {emp.department && (
                      <p style={{ fontSize: '0.75rem', marginBottom: '8px', color: 'var(--text-muted)', margin: '0 0 8px' }}>{emp.department}</p>
                    )}

                    {/* Progress bar */}
                    <div style={{
                      width: '100%', height: '6px', borderRadius: '9999px',
                      overflow: 'hidden', marginBottom: '12px', background: 'var(--surface2)'
                    }}>
                      <div style={{ height: '100%', borderRadius: '9999px', transition: 'width 0.3s', width: `${emp.rate}%`, background: rc.color }} />
                    </div>

                    {/* Stats grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                      {[
                        { label: 'Present', value: emp.present, color: '#10B981' },
                        { label: 'Late',    value: emp.late,    color: '#F59E0B' },
                        { label: 'Absent',  value: emp.absent,  color: '#EF4444' },
                        { label: 'Leave',   value: emp.onLeave, color: '#8B5CF6' },
                      ].map(s => (
                        <div key={s.label} style={{ borderRadius: '12px', padding: '8px 0', background: 'var(--surface2)' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {/* Mobile footer summary */}
              <div style={{
                borderRadius: '16px', padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--surface2)', border: '1px solid var(--card-border)'
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                  {sorted.length} employees · {MONTHS[selectedMonth]} {selectedYear}
                </p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1AABDB', margin: 0 }}>
                  Overall: {overallRate}%
                </p>
              </div>
            </div>
          )}

          {/* ── DESKTOP TABLE (hidden on mobile) ── */}
          {!isMobile && (
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
                    {['Employee', 'Department', 'Present', 'Late', 'Absent', 'On Leave', 'Attendance %'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', fontSize: '0.75rem', fontWeight: 600,
                        padding: '16px 20px', color: 'var(--text-secondary)'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(emp => {
                    const rc = getRateColor(emp.rate)
                    return (
                      <tr
                        key={emp.empId}
                        style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '12px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.875rem', fontWeight: 700, color: '#fff',
                              background: '#1AABDB', flexShrink: 0
                            }}>
                              {emp.name?.charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{emp.name}</p>
                              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{emp.empId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{emp.department || '—'}</td>
                        <td style={{ padding: '16px 20px' }}><span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#10B981' }}>{emp.present}</span></td>
                        <td style={{ padding: '16px 20px' }}><span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#F59E0B' }}>{emp.late}</span></td>
                        <td style={{ padding: '16px 20px' }}><span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#EF4444' }}>{emp.absent}</span></td>
                        <td style={{ padding: '16px 20px' }}><span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#8B5CF6' }}>{emp.onLeave}</span></td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '80px', height: '6px', borderRadius: '9999px', overflow: 'hidden', background: 'var(--surface2)' }}>
                              <div style={{ height: '100%', borderRadius: '9999px', transition: 'width 0.3s', width: `${emp.rate}%`, background: rc.color }} />
                            </div>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px',
                              borderRadius: '9999px',
                              background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`
                            }}>
                              {emp.rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', borderTop: '1px solid var(--card-border)',
                background: 'var(--surface2)'
              }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                  {sorted.length} employees · {MONTHS[selectedMonth]} {selectedYear}
                </p>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1AABDB', margin: 0 }}>
                  Overall: {overallRate}% attendance
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}