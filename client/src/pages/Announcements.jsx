import { useState, useEffect } from 'react'
import axios from 'axios'
import BASE_URL from '../config'
import { useTheme } from '../context/ThemeContext'

const EMPTY_FORM = { title: '', body: '', type: 'global', targetEmpIds: [], priority: 'normal', expiresAt: '' }

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [employees, setEmployees] = useState([])
  const [employeeMap, setEmployeeMap] = useState({})
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const { theme } = useTheme()

  useEffect(() => {
    fetchAnnouncements()
    fetchEmployees()
  }, [])

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements`)
      const data = Array.isArray(res.data) ? res.data : []
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setAnnouncements(data)
    } catch { setError('Failed to fetch announcements') }
    finally { setLoading(false) }
  }

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/employees`)
      const list = Array.isArray(res.data) ? res.data : []
      setEmployees(list)
      const map = {}
      list.forEach(e => { map[e.empId] = e.name })
      setEmployeeMap(map)
    } catch {}
  }

  const toggleEmployee = (empId) => {
    setForm(prev => ({
      ...prev,
      targetEmpIds: prev.targetEmpIds.includes(empId)
        ? prev.targetEmpIds.filter(id => id !== empId)
        : [...prev.targetEmpIds, empId]
    }))
  }

  useEffect(() => {
    console.log("Selected employees:", form.targetEmpIds)
  }, [form.targetEmpIds])

  const toggleAll = () => {
    const filtered = employees.filter(e =>
      e.name?.toLowerCase().includes(search.toLowerCase()) ||
      e.empId?.toLowerCase().includes(search.toLowerCase())
    )
    const allSelected = filtered.every(e => form.targetEmpIds.includes(e.empId))
    if (allSelected) {
      setForm(prev => ({ ...prev, targetEmpIds: prev.targetEmpIds.filter(id => !filtered.map(e => e.empId).includes(id)) }))
    } else {
      const toAdd = filtered.map(e => e.empId).filter(id => !form.targetEmpIds.includes(id))
      setForm(prev => ({ ...prev, targetEmpIds: [...prev.targetEmpIds, ...toAdd] }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.type === 'targeted' && form.targetEmpIds.length === 0) {
      setError('Please select at least one employee')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: form.title,
        body: form.body,
        type: form.type,
        targetEmpIds: form.targetEmpIds,
        priority: form.priority,
        expiresAt: form.expiresAt || null
      }
      alert(JSON.stringify(payload))
      await axios.post(`${BASE_URL}/api/announcements`, payload)
      setForm(EMPTY_FORM)
      setSearch('')
      setShowForm(false)
      fetchAnnouncements()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create announcement')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      await axios.delete(`${BASE_URL}/api/announcements/${id}`)
      fetchAnnouncements()
    } catch { setError('Failed to delete') }
  }

  const inputStyle = {
    width: '100%',
    borderRadius: 16,
    padding: '10px 16px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: 'var(--input-bg)',
    border: '1px solid var(--input-border)',
    color: 'var(--text-primary)',
  }

  const filteredEmps = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.empId?.toLowerCase().includes(search.toLowerCase())
  )
  const allFilteredSelected = filteredEmps.length > 0 && filteredEmps.every(e => form.targetEmpIds.includes(e.empId))

  return (
    <div>

      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12,
        alignItems: 'center', justifyContent: 'space-between', marginBottom: 32,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Announcements</h1>
          <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
            {announcements.length} total · broadcast to employees
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setSearch('') }}
          style={{
            background: '#1AABDB', color: '#fff', fontSize: 14, fontWeight: 600,
            padding: '10px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1595c0'}
          onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}>
          + New Announcement
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#EF4444', padding: '12px 16px', borderRadius: 16, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{
          borderRadius: 24, padding: 24, marginBottom: 32,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        }}>
          {/* Form header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>New Announcement</h2>
            <button
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              style={{
                width: 32, height: 32, borderRadius: 12, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface2)', color: 'var(--text-muted)',
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Row 1: Title + Priority */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Title *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Office closed on Monday"
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  style={inputStyle}>
                  <option value="normal">Normal</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>
            </div>

            {/* Message */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Message *</label>
              <textarea required value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder="Write your announcement here..."
                rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>

            {/* Row 2: Audience + Expires */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Audience</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value, targetEmpIds: [] })}
                  style={inputStyle}>
                  <option value="global">🌐 All Employees</option>
                  <option value="targeted">🎯 Specific Employees</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Expires On (optional)</label>
                <input type="date" value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>

            {/* Employee picker */}
            {form.type === 'targeted' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    Select Employees
                    {form.targetEmpIds.length > 0 && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
                        background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
                      }}>
                        {form.targetEmpIds.length} selected
                      </span>
                    )}
                  </label>
                  <button type="button" onClick={toggleAll}
                    style={{ fontSize: 12, fontWeight: 500, color: '#1AABDB', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {allFilteredSelected ? 'Deselect all' : 'Select all'}
                  </button>
                </div>

                <input type="text" value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search employees..."
                  style={{ ...inputStyle, marginBottom: 8 }} />

                <div style={{
                  borderRadius: 16, overflow: 'hidden', maxHeight: 208, overflowY: 'auto',
                  border: '1px solid var(--card-border)',
                }}>
                  {filteredEmps.length === 0 ? (
                    <p style={{ fontSize: 12, textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
                      No employees found
                    </p>
                  ) : filteredEmps.map((emp, i) => {
                    const checked = form.targetEmpIds.includes(emp.empId)
                    return (
                      <label key={emp.empId}
                        onClick={() => toggleEmployee(emp.empId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px', cursor: 'pointer',
                          borderBottom: i < filteredEmps.length - 1 ? '1px solid var(--card-border)' : 'none',
                          background: checked ? 'rgba(26,171,219,0.05)' : 'transparent',
                          transition: 'background 0.15s',
                        }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                          background: checked ? '#1AABDB' : 'transparent',
                          border: `2px solid ${checked ? '#1AABDB' : 'var(--card-border)'}`,
                        }}>
                          {checked && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{emp.name}</p>
                          <p style={{
                            fontSize: 12, color: 'var(--text-muted)', margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{emp.empId} · {emp.position || emp.department}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>

                {/* Selected tags */}
                {form.targetEmpIds.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {form.targetEmpIds.map(id => (
                      <span key={id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                        background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)',
                      }}>
                        {employeeMap[id] || id}
                        <button type="button" onClick={() => toggleEmployee(id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 4 }}>
              <button type="submit" disabled={submitting}
                style={{
                  background: '#1AABDB', color: '#fff', fontSize: 14, fontWeight: 600,
                  padding: '10px 24px', borderRadius: 16, border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#1595c0' }}
                onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}>
                {submitting ? 'Publishing...' : 'Publish Announcement'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                style={{
                  fontSize: 14, padding: '10px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', background: 'var(--surface2)', transition: 'background 0.15s',
                }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcement list */}
      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Loading...</p>
      ) : announcements.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0', borderRadius: 24,
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 16, margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(26,171,219,0.08)', color: '#1AABDB',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No announcements yet</p>
          <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>Create one to broadcast to your team</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
          {announcements.map(ann => {
            console.log("ANNOUNCEMENT OBJECT:", ann)

            let targets = []
            if (Array.isArray(ann.targetEmpIds)) {
              targets = ann.targetEmpIds
            } else if (typeof ann.targetEmpId === "string") {
              try {
                targets = JSON.parse(ann.targetEmpId)
              } catch {
                targets = ann.targetEmpId.split(",").map(s => s.trim()).filter(Boolean)
              }
            }

            const targetNames = targets.map(id => ({ id, name: employeeMap[id] || id }))

            return (
              <div key={ann.id} style={{
                borderRadius: 16, padding: 20, transition: 'all 0.15s',
                background: 'var(--card-bg)',
                border: `1px solid ${ann.priority === 'urgent' ? 'rgba(239,68,68,0.3)' : 'var(--card-border)'}`,
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {ann.priority === 'urgent' && (
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 9999, fontWeight: 700,
                          background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                        }}>🚨 Urgent</span>
                      )}
                      <span style={{
                        fontSize: 12, padding: '2px 8px', borderRadius: 9999, fontWeight: 600,
                        ...(ann.type === 'global'
                          ? { background: 'rgba(26,171,219,0.1)', color: '#1AABDB' }
                          : { background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }),
                      }}>
                        {ann.type === 'global'
                          ? '🌐 All Employees'
                          : `🎯 ${targetNames.length} employee${targetNames.length !== 1 ? 's' : ''}`}
                      </span>
                      {ann.expiresAt && (
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 9999,
                          background: 'var(--surface2)', color: 'var(--text-muted)',
                        }}>
                          Expires {new Date(ann.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {/* Title + body */}
                    <p style={{
                      fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--text-primary)',
                      overflowWrap: 'break-word', wordBreak: 'break-word',
                    }}>{ann.title}</p>
                    <p style={{
                      fontSize: 14, color: 'var(--text-secondary)',
                      overflowWrap: 'break-word', wordBreak: 'break-word',
                    }}>{ann.body}</p>

                    {/* Targeted names */}
                    {ann.type === 'targeted' && targetNames.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>Sent to:</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {targetNames.map(({ id, name }) => (
                            <span key={id} style={{
                              fontSize: 12, padding: '4px 10px', borderRadius: 9999, fontWeight: 500,
                              background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.15)',
                            }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-muted)' }}>
                      {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Delete button */}
                  <button onClick={() => handleDelete(ann.id)}
                    style={{
                      flexShrink: 0, width: 32, height: 32, borderRadius: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#EF4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}