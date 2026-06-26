import { useState, useEffect } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const YEARS = [2024, 2025, 2026, 2027]

const SORT_OPTIONS = [
  { key: 'name',    label: 'Name'       },
  { key: 'rate',    label: 'Rate'       },
  { key: 'present', label: 'Present'    },
  { key: 'absent',  label: 'Absent'     },
]

function getRateColor(rate) {
  if (rate >= 90) return { color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.18)'  }
  if (rate >= 75) return { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)'  }
  return           { color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)'   }
}

// ─── Small atoms ─────────────────────────────────────────────────────────────

function Avatar({ name }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#fff', background: '#1AABDB',
    }}>
      {name?.charAt(0)?.toUpperCase()}
    </div>
  )
}

function RateBadge({ rate }) {
  const rc = getRateColor(rate)
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 9999, flexShrink: 0,
      background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
    }}>
      {rate}%
    </span>
  )
}

function RateBar({ rate }) {
  const rc = getRateColor(rate)
  return (
    <div style={{ width: '100%', height: 5, borderRadius: 9999, overflow: 'hidden', background: 'var(--surface2)' }}>
      <div style={{ height: '100%', borderRadius: 9999, width: `${rate}%`, background: rc.color, transition: 'width 0.3s' }} />
    </div>
  )
}

function StatCell({ label, value, color }) {
  return (
    <div style={{ borderRadius: 10, padding: '8px 4px', background: 'var(--surface2)', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color }}>{value}</p>
      <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  )
}

function PillBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, padding: '6px 14px', borderRadius: 9999, fontWeight: 600,
        cursor: 'pointer', border: 'none', transition: 'background 0.15s',
        background: active ? '#1AABDB' : 'var(--surface2)',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const [employees,      setEmployees]      = useState([])
  const [allAttendance,  setAllAttendance]  = useState([])
  const [loading,        setLoading]        = useState(true)
  const [selectedMonth,  setSelectedMonth]  = useState(new Date().getMonth())
  const [selectedYear,   setSelectedYear]   = useState(new Date().getFullYear())
  const [sortBy,         setSortBy]         = useState('name')

  useEffect(() => {
    const fetch = async () => {
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
    fetch()
  }, [])

  const filtered = allAttendance.filter(r => {
    const d = new Date(r.timestamp)
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear
  })

  const employeeStats = employees.map(emp => {
    const records = filtered.filter(r => r.empId === emp.empId)
    const present    = records.filter(r => r.status === 'Present').length
    const late       = records.filter(r => r.status === 'Late').length
    const absent     = records.filter(r => r.status === 'Absent').length
    const leave      = records.filter(r => r.status === 'Leave' || r.status === 'On Leave').length
    const wfh        = records.filter(r => r.status === 'WFH').length
    const onDuty     = records.filter(r => r.status === 'On Duty').length
    const permission = records.filter(r => r.status === 'Permission').length
    const halfDay    = records.filter(r => r.status === 'Half Day').length

    const total = present + late + absent + leave + wfh + onDuty + permission + halfDay
    const workedDays = present + late + wfh + onDuty + permission + (halfDay * 0.5)
    const rate = total > 0 ? Math.round((workedDays / total) * 100) : 0
    return { ...emp, present, late, absent, leave, wfh, onDuty, permission, halfDay, total, rate }
  })

  const sorted = [...employeeStats].sort((a, b) => {
    if (sortBy === 'name')    return a.name.localeCompare(b.name)
    if (sortBy === 'present') return b.present - a.present
    if (sortBy === 'absent')  return b.absent - a.absent
    if (sortBy === 'rate')    return b.rate - a.rate
    return 0
  })

  const totals = {
    present:    filtered.filter(r => r.status === 'Present').length,
    late:       filtered.filter(r => r.status === 'Late').length,
    absent:     filtered.filter(r => r.status === 'Absent').length,
    leave:      filtered.filter(r => r.status === 'Leave' || r.status === 'On Leave').length,
    wfh:        filtered.filter(r => r.status === 'WFH').length,
    onDuty:     filtered.filter(r => r.status === 'On Duty').length,
    permission: filtered.filter(r => r.status === 'Permission').length,
    halfDay:    filtered.filter(r => r.status === 'Half Day').length,
  }
  const totalScans  = totals.present + totals.late + totals.absent + totals.leave + totals.wfh + totals.onDuty + totals.permission + totals.halfDay
  const workedScans = totals.present + totals.late + totals.wfh + totals.onDuty + totals.permission + (totals.halfDay * 0.5)
  const overallRate = totalScans > 0 ? Math.round((workedScans / totalScans) * 100) : 0

  const exportCSV = () => {
    const headers = ['Name','EmpID','Position','Department','Present','Late','Absent','Leave','WFH','On Duty','Permission','Half Day','Total','Attendance %']
    const rows = sorted.map(e => [
      e.name, e.empId, e.position || '—', e.department || '—',
      e.present, e.late, e.absent, e.leave, e.wfh, e.onDuty, e.permission, e.halfDay, e.total, `${e.rate}%`
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `report-${MONTHS[selectedMonth]}-${selectedYear}.csv`
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Reports</h1>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </p>
        </div>
        <button
          onClick={exportCSV}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 12,
            fontSize: 13, fontWeight: 600, color: '#fff',
            background: '#1AABDB', border: 'none', cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0e8ab5'}
          onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Month + Year pickers ── */}
      <div className="report-pickers-container">
        {/* Desktop Strips */}
        <div className="report-pickers-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Month strip */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{
              display: 'flex', width: 'max-content',
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--card-border)', background: 'var(--card-bg)',
            }}>
              {MONTHS.map((m, i) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(i)}
                  style={{
                    padding: '8px 13px', fontSize: 12, fontWeight: 600,
                    whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                    background: selectedMonth === i ? '#1AABDB' : 'transparent',
                    color:      selectedMonth === i ? '#fff'    : 'var(--text-secondary)',
                  }}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Year strip */}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{
              display: 'flex', width: 'max-content',
              borderRadius: 12, overflow: 'hidden',
              border: '1px solid var(--card-border)', background: 'var(--card-bg)',
            }}>
              {YEARS.map(y => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  style={{
                    padding: '8px 18px', fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'background 0.15s',
                    background: selectedYear === y ? '#1AABDB' : 'transparent',
                    color:      selectedYear === y ? '#fff'    : 'var(--text-secondary)',
                  }}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Dropdowns */}
        <div className="report-pickers-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Month</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(parseInt(e.target.value))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none'
              }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(parseInt(e.target.value))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--card-border)', background: 'var(--card-bg)',
                color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, outline: 'none'
              }}
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {/* Overall Rate — always full width */}
      <div style={{ borderRadius: 14, padding: '16px 18px', background: 'rgba(26,171,219,0.08)', border: '1px solid rgba(26,171,219,0.18)' }}>
        <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1AABDB' }}>{overallRate}%</p>
        <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, color: '#1AABDB', opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Attendance Rate</p>
      </div>
      {/* 8 stats — 2×2 on mobile, 4-col on wider */}
      <div className="report-stat-grid">
        {[
          { label: 'Present',    value: totals.present,    color: '#10B981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.18)'  },
          { label: 'Late',       value: totals.late,       color: '#F59E0B', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)'  },
          { label: 'Absent',     value: totals.absent,     color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)'   },
          { label: 'Leave',      value: totals.leave,      color: '#475569', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.18)' },
          { label: 'WFH',        value: totals.wfh,        color: '#1AABDB', bg: 'rgba(26,171,219,0.08)',  border: 'rgba(26,171,219,0.18)'  },
          { label: 'On Duty',    value: totals.onDuty,     color: '#7C3AED', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.18)'  },
          { label: 'Permission', value: totals.permission, color: '#D97706', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)'  },
          { label: 'Half Day',   value: totals.halfDay,    color: '#9333EA', bg: 'rgba(147,51,234,0.08)',  border: 'rgba(147,51,234,0.18)'  },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 14, padding: '14px 16px', background: s.bg, border: `1px solid ${s.border}` }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Sort controls ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sort</span>
        {SORT_OPTIONS.map(s => (
          <PillBtn key={s.key} active={sortBy === s.key} onClick={() => setSortBy(s.key)}>
            {s.label}
          </PillBtn>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
          {sorted.length} employees
        </span>
      </div>

      {/* ── States ── */}
      {loading ? (
        <div style={{ borderRadius: 14, padding: 32, textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', display: 'block', margin: '0 auto 8px' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Loading…</p>
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ borderRadius: 14, padding: '48px 32px', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,171,219,0.08)', color: '#1AABDB', margin: '0 auto 12px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          </div>
          <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', margin: '0 0 4px' }}>No data for this period</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Try a different month or year</p>
        </div>
      ) : (
        <>
          {/* ── Mobile cards ── */}
          <div className="report-cards">
            {sorted.map(emp => (
              <div key={emp.empId} style={{ borderRadius: 14, padding: '14px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={emp.name} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{emp.empId}{emp.department ? ` · ${emp.department}` : ''}</p>
                    </div>
                  </div>
                  <RateBadge rate={emp.rate} />
                </div>
                <RateBar rate={emp.rate} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginTop: 10 }}>
                  <StatCell label="Pres"    value={emp.present}    color="#10B981" />
                  <StatCell label="Late"    value={emp.late}       color="#F59E0B" />
                  <StatCell label="Abs"     value={emp.absent}     color="#EF4444" />
                  <StatCell label="Leave"   value={emp.leave}      color="#475569" />
                  <StatCell label="WFH"     value={emp.wfh}        color="#1AABDB" />
                  <StatCell label="OD"      value={emp.onDuty}     color="#7C3AED" />
                  <StatCell label="Perm"    value={emp.permission} color="#D97706" />
                  <StatCell label="Half"    value={emp.halfDay}    color="#9333EA" />
                </div>
              </div>
            ))}

            <div style={{ borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sorted.length} employees · {MONTHS[selectedMonth]} {selectedYear}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1AABDB' }}>Overall {overallRate}%</span>
            </div>
          </div>

           {/* ── Desktop table ── */}
          <div className="report-table" style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)', overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
                  {['Employee','Department','Present','Late','Absent','Leave','WFH','On Duty','Perm','Half Day','Rate'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 700, padding: '14px 18px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(emp => {
                  const rc = getRateColor(emp.rate)
                  return (
                    <tr
                       key={emp.empId}
                      style={{ borderBottom: '1px solid var(--card-border)', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={emp.name} />
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{emp.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{emp.empId}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{emp.department || '—'}</td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{emp.present}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B' }}>{emp.late}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#EF4444' }}>{emp.absent}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>{emp.leave}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#1AABDB' }}>{emp.wfh}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>{emp.onDuty}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#D97706' }}>{emp.permission}</span></td>
                      <td style={{ padding: '14px 18px' }}><span style={{ fontSize: 13, fontWeight: 700, color: '#9333EA' }}>{emp.halfDay}</span></td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 70, height: 5, borderRadius: 9999, overflow: 'hidden', background: 'var(--surface2)' }}>
                            <div style={{ height: '100%', borderRadius: 9999, width: `${emp.rate}%`, background: rc.color, transition: 'width 0.3s' }} />
                          </div>
                          <RateBadge rate={emp.rate} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sorted.length} employees · {MONTHS[selectedMonth]} {selectedYear}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1AABDB' }}>Overall {overallRate}%</span>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        .report-stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .report-cards { display: flex; flex-direction: column; gap: 10px; }
        .report-table { display: none; }

        .report-pickers-mobile { display: grid !important; }
        .report-pickers-desktop { display: none !important; }

        @media (min-width: 640px) {
          .report-stat-grid {
            grid-template-columns: repeat(4, 1fr);
          }
          .report-cards { display: none; }
          .report-table { display: block; }
        }

        @media (min-width: 768px) {
          .report-pickers-mobile { display: none !important; }
          .report-pickers-desktop { display: flex !important; }
        }
      `}</style>
    </div>
  )
}