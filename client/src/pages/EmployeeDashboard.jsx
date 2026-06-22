import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import axios from 'axios'
import BASE_URL from '../config'
import AnnouncementBanner from '../components/AnnouncementBanner'

function EmployeeDashboard() {
  const navigate = useNavigate()
  const employee = JSON.parse(localStorage.getItem('employeeAuth') || 'null')
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, late: 0, absent: 0, onLeave: 0 })
  const [pendingLeave, setPendingLeave] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  

  useEffect(() => {
    if (!employee) { navigate('/employee/login'); return }
    fetchStats()
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchStats = async () => {
    try {
      const [attRes, leaveRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/attendance/${employee.empId}`),
        axios.get(`${BASE_URL}/api/leave/${employee.empId}`),
      ])
      const records = attRes.data
      setAttendanceStats({
        present:  records.filter(r => r.status === 'Present').length,
        late:     records.filter(r => r.status === 'Late').length,
        absent:   records.filter(r => r.status === 'Absent').length,
        onLeave:  records.filter(r => r.status === 'On Leave').length,
      })
      setPendingLeave(leaveRes.data.filter(l => l.status === 'Pending').length)
    } catch (err) {
      console.error('Failed to fetch stats', err)
    } finally {
      setLoading(false)
    }
  }

  if (!employee) return null

  // Card color mappings (bg + button colors)
  const cardStyles = [
    { bg: 'rgba(26,171,219,0.08)', btnBg: '#1AABDB', btnHover: '#1595c0' },
    { bg: 'rgba(147,51,234,0.06)', btnBg: '#9333EA', btnHover: '#7E22CE' },
    { bg: 'rgba(245,158,11,0.06)', btnBg: '#F59E0B', btnHover: '#D97706' },
    { bg: 'rgba(22,163,74,0.06)',  btnBg: '#16A34A', btnHover: '#15803D' },
  ]

  const cards = [
    {
      icon: '📝', label: 'Leave Portal',
      desc: 'Apply for leave and track approval status.',
      btn: 'Open Leave Portal',
      ...cardStyles[0],
      action: () => navigate('/employee/leave'),
      badge: pendingLeave > 0 ? `${pendingLeave} pending` : null,
    },
    {
      icon: '👤', label: 'My Profile',
      desc: 'View your employee details and work information.',
      btn: 'View Profile',
      ...cardStyles[1],
      action: () => navigate('/employee/profile'),
    },
    {
      icon: '📅', label: 'My Attendance',
      desc: 'View your full attendance history and records.',
      btn: 'View Attendance',
      ...cardStyles[2],
      action: () => navigate('/employee/attendance'),
    },
  ]

  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>

      {/* Announcement banner */}
      <div style={{ position: 'relative', zIndex: 0, marginBottom: '16px' }}>
        <AnnouncementBanner empId={employee.empId} />
      </div>

      {/* Welcome banner */}
      <div style={{
        background: '#1C2333',
        borderRadius: '24px',
        padding: isMobile ? '24px' : '32px',
        marginBottom: isMobile ? '24px' : '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: '192px', height: '192px', borderRadius: '9999px',
          background: 'rgba(26,171,219,0.1)',
          transform: 'translate(48px, -48px)'
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: '128px',
          width: '128px', height: '128px', borderRadius: '9999px',
          background: 'rgba(26,171,219,0.1)',
          transform: 'translateY(40px)'
        }} />
        <div style={{ position: 'relative' }}>
          <p style={{
            color: '#1AABDB', fontSize: '0.75rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px'
          }}>
            Employee Workspace
          </p>
          <h2 style={{
            fontSize: isMobile ? '1.25rem' : '1.875rem',
            fontWeight: 700, color: '#fff', lineHeight: 1.25,
            marginBottom: '8px', wordBreak: 'break-word'
          }}>
            Welcome back, {employee.name?.split(' ')[0]}! 👋
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {employee.position} · {employee.department}
          </p>
          <p style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '4px' }}>{employee.empId}</p>
        </div>
      </div>
      {/* Scanner CTA — team leads only */}
      {employee?.isAttendanceLeader && (
       <div
         onClick={() => navigate('/employee/scan')}
         style={{
           display: 'flex', alignItems: 'center', justifyContent: 'space-between',
           padding: '20px 24px', borderRadius: 16, marginBottom: 24, cursor: 'pointer',
           background: 'linear-gradient(135deg, #1AABDB, #0e8ab5)',
           boxShadow: '0 4px 20px rgba(26,171,219,0.3)',
           transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,171,219,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,171,219,0.3)' }}
      >
       <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
         <div style={{
           width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)',
           display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
         }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M20 14v2"/>
          </svg>
        </div>
        <div>
         <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Attendance Scanner</p>
         <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '2px 0 0' }}>Tap to open the barcode scanner terminal</p>
        </div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </div>
    )}
      
      {/* Attendance stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        gap: isMobile ? '12px' : '16px',
        marginBottom: isMobile ? '24px' : '32px'
      }}>
        {[
          { label: 'Present',  value: attendanceStats.present,  color: '#22C55E' },
          { label: 'Late',     value: attendanceStats.late,     color: '#EAB308' },
          { label: 'Absent',   value: attendanceStats.absent,   color: '#EF4444' },
          { label: 'On Leave', value: attendanceStats.onLeave,  color: '#3B82F6' },
        ].map(stat => (
          <div key={stat.label} style={{
            borderRadius: '16px', padding: '16px',
            background: 'var(--card-bg)', border: '1px solid var(--card-border)'
          }}>
            {loading ? (
              <div style={{
                height: '32px', width: '48px', borderRadius: '6px',
                background: 'rgba(148,163,184,0.2)', marginBottom: '4px',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} />
            ) : (
              <p style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 700, color: stat.color, margin: 0 }}>
                {stat.value}
              </p>
            )}
            <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick action cards */}
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
        Quick Actions
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        gap: isMobile ? '16px' : '20px'
      }}>
        {cards.map(card => (
          <div key={card.label} style={{
            borderRadius: '24px', padding: '24px',
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            transition: 'box-shadow 0.2s'
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '16px',
              background: card.bg, display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginBottom: '16px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>{card.icon}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {card.label}
              </h2>
              {card.badge && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px',
                  borderRadius: '9999px', marginLeft: '8px', flexShrink: 0,
                  background: 'rgba(234,179,8,0.12)', color: '#B45309'
                }}>
                  {card.badge}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', marginBottom: '20px', color: 'var(--text-secondary)', margin: '0 0 20px' }}>
              {card.desc}
            </p>
            <button
              onClick={card.action}
              style={{
                width: '100%', padding: '10px', borderRadius: '16px',
                fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                background: card.btnBg, border: 'none', cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = card.btnHover}
              onMouseLeave={e => e.currentTarget.style.background = card.btnBg}
            >
              {card.btn}
            </button>
          </div>
        ))}
      </div>

    </div>
  )
}

export default EmployeeDashboard