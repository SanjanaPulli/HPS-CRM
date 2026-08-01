import { useEffect, useState } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

export default function MyTeam() {
  const [teamMembers, setTeamMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTeamMembers()
  }, [])

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('employeeToken')
      const res = await axios.get(`${BASE_URL}/api/employees/my-team`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setTeamMembers(res.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.error || 'Failed to load team members')
      setLoading(false)
    }
  }

  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.empId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.department?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getAttendanceStatus = (member) => {
    if (!member.attendance || member.attendance.length === 0) {
      return { label: 'Not Checked In', color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' }
    }
    const todayAtt = member.attendance[0]
    if (todayAtt.status === 'Present') {
      return { label: 'Present', color: '#10B981', bg: 'rgba(16,185,129,0.1)' }
    }
    if (todayAtt.status === 'Late') {
      return { label: 'Late', color: '#EAB308', bg: 'rgba(234,179,8,0.1)' }
    }
    if (todayAtt.status === 'Absent') {
      return { label: 'Absent', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }
    }
    if (todayAtt.status === 'On Leave') {
      return { label: 'On Leave', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' }
    }
    return { label: todayAtt.status, color: '#1AABDB', bg: 'rgba(26,171,219,0.1)' }
  }

  const checkedInCount = teamMembers.filter(m => {
    const att = m.attendance?.[0]
    return att && (att.status === 'Present' || att.status === 'Late')
  }).length

  const onLeaveCount = teamMembers.filter(m => m.attendance?.[0]?.status === 'On Leave').length

  const notCheckedInCount = teamMembers.length - checkedInCount - onLeaveCount

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid #1AABDB', borderTopColor: 'transparent',
          animation: 'emp-spin 0.8s linear infinite'
        }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>My Team</h1>
        <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage and view daily status of your direct reports
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: 24, padding: '14px 18px', borderRadius: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#EF4444', fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {[
          { label: 'Total Members', value: teamMembers.length, color: '#1AABDB', bg: 'rgba(26,171,219,0.1)' },
          { label: 'Checked In Today', value: checkedInCount, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'On Leave', value: onLeaveCount, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Not Checked In', value: notCheckedInCount, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
        ].map((stat, idx) => (
          <div key={idx} style={{
            padding: '20px 24px', borderRadius: 16,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px 0', fontWeight: 500 }}>{stat.label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{stat.value}</p>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: stat.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color
            }}>
              {idx === 0 && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              )}
              {idx === 1 && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              )}
              {idx === 2 && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              )}
              {idx === 3 && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Search Filter */}
      <div style={{ marginBottom: 24, position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', display: 'flex'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search team member by name, ID, position..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', padding: '12px 16px 12px 48px', borderRadius: 16,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            color: 'var(--text-primary)', outline: 'none', fontSize: 14,
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.currentTarget.style.borderColor = '#1AABDB'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--card-border)'}
        />
      </div>

      {/* Members cards list */}
      {filteredMembers.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', borderRadius: 20,
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontSize: 15, margin: 0 }}>
            {searchQuery ? 'No team members match your search.' : 'You have no team members assigned.'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20
        }}>
          {filteredMembers.map(member => {
            const status = getAttendanceStatus(member)
            return (
              <div key={member.empId} style={{
                borderRadius: 20, background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)'
              }}
              >
                <div>
                  {/* Top info and status */}
                  <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #1AABDB 0%, #1595c0 100%)',
                        color: '#fff', fontSize: 16, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {member.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{member.name}</h3>
                        <span style={{ fontSize: 11, color: '#1AABDB', fontWeight: 600 }}>{member.empId}</span>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8,
                      color: status.color, background: status.bg
                    }}>
                      {status.label}
                    </span>
                  </div>

                  {/* Core details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16, marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Position</p>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{member.position || '—'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Department</p>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{member.department || '—'}</p>
                    </div>
                    {member.email && (
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Email</p>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, wordBreak: 'break-all', fontWeight: 500 }}>{member.email}</p>
                      </div>
                    )}
                    {member.contact && (
                      <div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px 0', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Contact</p>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>{member.contact}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer status / today work */}
                {member.dailyWorkStatus ? (
                  <div style={{
                    background: 'var(--surface2)', padding: '10px 12px', borderRadius: 10,
                    border: '1px solid var(--border)', fontSize: 12
                  }}>
                    <span style={{ color: '#1AABDB', fontWeight: 600, display: 'block', marginBottom: 2 }}>Today's Task:</span>
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{member.dailyWorkStatus}"</span>
                  </div>
                ) : (
                  <div style={{
                    padding: '10px 12px', fontSize: 12, color: 'var(--text-muted)',
                    textAlign: 'center', background: 'var(--surface2)', borderRadius: 10,
                    border: '1px dashed var(--border)'
                  }}>
                    No work status updated today
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
