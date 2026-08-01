import { useEffect, useState } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

export default function Teams() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      const res = await axios.get(`${BASE_URL}/api/employees`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setEmployees(res.data)
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch employees. Please verify admin privileges.')
      setLoading(false)
    }
  }

  // Grouping logic
  const activeLeads = employees.filter(emp => emp.isAttendanceLeader === true)
  const activeLeadNames = new Set(activeLeads.map(l => l.name))

  // Map each team lead name to an array of members
  const teamsMap = {}
  activeLeads.forEach(lead => {
    teamsMap[lead.name] = {
      lead: lead,
      members: []
    }
  })

  // Unassigned / other group
  const unassignedMembers = []

  employees.forEach(emp => {
    // If they are not a team lead themselves (or if they are, they could still have a lead, but usually leads don't have leads in simple structure)
    // Wait, let's just group everyone by their teamLead if it matches an active lead
    if (emp.teamLead && activeLeadNames.has(emp.teamLead)) {
      teamsMap[emp.teamLead].members.push(emp)
    } else {
      unassignedMembers.push(emp)
    }
  })

  // Filter based on search query
  const matchesSearch = (emp) => {
    return (
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.empId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredTeams = Object.keys(teamsMap).reduce((acc, leadName) => {
    const team = teamsMap[leadName]
    const matchedMembers = team.members.filter(matchesSearch)
    const matchesLead = matchesSearch(team.lead)

    // Include the team if the lead matches search OR any member matches search
    if (matchesLead || matchedMembers.length > 0 || !searchQuery) {
      acc[leadName] = {
        ...team,
        members: searchQuery ? matchedMembers : team.members
      }
    }
    return acc
  }, {})

  const filteredUnassigned = unassignedMembers.filter(matchesSearch)

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
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Company Teams</h1>
          <p style={{ marginTop: 6, fontSize: 14, color: 'var(--text-secondary)' }}>
            Overview of all organizational structures and direct reports
          </p>
        </div>
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

      {/* Search Filter */}
      <div style={{ marginBottom: 32, position: 'relative' }}>
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
          placeholder="Search teams by employee name, ID, department..."
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

      {/* Grid of Teams */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {Object.keys(filteredTeams).map(leadName => {
          const team = filteredTeams[leadName]
          return (
            <div key={leadName} style={{
              borderRadius: 24, background: 'var(--card-bg)', border: '1px solid var(--card-border)',
              padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}>
              {/* Team Leader Section */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 20,
                flexWrap: 'wrap', gap: 16
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: 'linear-gradient(135deg, #1AABDB 0%, #1595c0 100%)',
                    color: '#fff', fontSize: 18, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {team.lead.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {team.lead.name}'s Team
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      Lead: <span style={{ fontWeight: 600 }}>{team.lead.position}</span> · {team.lead.department}
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(26,171,219,0.08)', border: '1px solid rgba(26,171,219,0.2)',
                  color: '#1AABDB', fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 12
                }}>
                  {team.members.length} direct report{team.members.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Team Members List */}
              {team.members.length === 0 ? (
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                  No active team members assigned to this lead.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {team.members.map(member => (
                    <div key={member.empId} style={{
                      padding: 16, borderRadius: 16, background: 'var(--surface2)',
                      border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center'
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: '#1AABDB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0
                      }}>
                        {member.name?.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {member.name}
                        </h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {member.position || 'Employee'} · {member.empId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Unassigned / Independent Group */}
        {(filteredUnassigned.length > 0 || !searchQuery) && (
          <div style={{
            borderRadius: 24, background: 'var(--card-bg)', border: '1px dashed var(--card-border)',
            padding: 24
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px dashed var(--border)', paddingBottom: 20, marginBottom: 20,
              flexWrap: 'wrap', gap: 16
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Unassigned / Other Staff
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Employees not reports of active team leads or self-directed
                </p>
              </div>
              <div style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 12
              }}>
                {filteredUnassigned.length} employee{filteredUnassigned.length !== 1 ? 's' : ''}
              </div>
            </div>

            {filteredUnassigned.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
                All active employees are mapped to a team lead.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {filteredUnassigned.map(member => (
                  <div key={member.empId} style={{
                    padding: 16, borderRadius: 16, background: 'var(--surface2)',
                    border: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0
                    }}>
                      {member.name?.charAt(0)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.name}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {member.position || 'Employee'} · {member.empId}
                      </p>
                      {member.teamLead && (
                        <p style={{ fontSize: 11, color: '#dc2626', margin: '2px 0 0 0', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Lead: {member.teamLead} (Inactive)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
