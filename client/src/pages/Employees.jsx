import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import JsBarcode from 'jsbarcode'
import BASE_URL from '../config'

const EMPTY_FORM = {
  empId: '', name: '', position: '', joiningDate: '', endDate: '', email: '',
  contact: '', salary: 'Not Disclosed', teamLead: '', department: '', photo: ''
}

const DEPARTMENTS = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'IT', 'Operations', 'Other']


function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// Inject spinner keyframe once
if (!document.head.querySelector('[data-emp-spin]')) {
  const s = document.createElement('style')
  s.setAttribute('data-emp-spin', '1')
  s.textContent = '@keyframes emp-spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(s)
}

function Employees() {
  const [employees, setEmployees]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [customDept, setCustomDept]     = useState('')
  const [error, setError]               = useState(null)
  const [resettingId, setResettingId]   = useState(null)
  const [resetSuccess, setResetSuccess] = useState('')
  const [search, setSearch]             = useState('')
  const [deptFilter, setDeptFilter]     = useState('All')
  const [sortBy, setSortBy]             = useState('id')
  const [expandedId, setExpandedId]     = useState(null)
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 768)
  const barcodeRefs = useRef({})
  const formRef     = useRef(null)

  const [expandedAssets, setExpandedAssets] = useState([])
  const [expandedDocs, setExpandedDocs] = useState([])
  const [shifts, setShifts]                 = useState([])
  
  const [newAssetName, setNewAssetName] = useState('')
  const [newAssetSerial, setNewAssetSerial] = useState('')
  const [assigningAsset, setAssigningAsset] = useState(false)
  const [assignErr, setAssignErr] = useState('')

  useEffect(() => {
    axios.get(`${BASE_URL}/api/shifts`)
      .then(res => setShifts(res.data))
      .catch(e => console.error('Failed to fetch shifts', e))
  }, [])

  useEffect(() => {
    if (!expandedId) {
      setExpandedAssets([])
      setExpandedDocs([])
      return
    }
    fetchExpandedDetails(expandedId)
  }, [expandedId])

  const fetchExpandedDetails = async (empId) => {
    try {
      const [assetsRes, docsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/assets?empId=${empId}`),
        axios.get(`${BASE_URL}/api/documents/${empId}`)
      ])
      setExpandedAssets(assetsRes.data)
      setExpandedDocs(docsRes.data)
    } catch (e) {
      console.error('Failed to load assets/docs', e)
    }
  }

  const handleAssignAsset = async (e, empId) => {
    e.preventDefault()
    if (!newAssetName.trim() || !newAssetSerial.trim()) return setAssignErr('All fields are required')
    setAssigningAsset(true)
    setAssignErr('')
    try {
      await axios.post(`${BASE_URL}/api/assets`, {
        empId,
        name: newAssetName,
        serialNumber: newAssetSerial
      })
      setNewAssetName('')
      setNewAssetSerial('')
      fetchExpandedDetails(empId)
    } catch (err) {
      setAssignErr(err.response?.data?.error || 'Failed to assign asset')
    } finally {
      setAssigningAsset(false)
    }
  }

  const handleReturnAsset = async (id, empId) => {
    if (!window.confirm('Mark this asset as returned?')) return
    try {
      await axios.put(`${BASE_URL}/api/assets/${id}/return`)
      fetchExpandedDetails(empId)
    } catch (err) {
      alert('Failed to return asset')
    }
  }

  const handleDeleteAsset = async (id, empId) => {
    if (!window.confirm('Delete this asset from inventory?')) return
    try {
      await axios.delete(`${BASE_URL}/api/assets/${id}`)
      fetchExpandedDetails(empId)
    } catch (err) {
      alert('Failed to delete asset')
    }
  }

  const handleAdminDocDelete = async (id, empId) => {
    if (!window.confirm('Delete this document?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${BASE_URL}/api/documents/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      fetchExpandedDetails(empId)
    } catch (err) {
      alert('Failed to delete document')
    }
  }

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => { fetchEmployees() }, [])

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/employees`)
      setEmployees(res.data)
    } catch {
      setError('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!expandedId) return
    const emp = employees.find(e => e.empId === expandedId)
    if (emp?.barcodeId && barcodeRefs.current[emp.empId]) {
      JsBarcode(barcodeRefs.current[emp.empId], emp.barcodeId, {
        format: 'CODE128', width: 1.5, height: 35,
        displayValue: true, fontSize: 10,
        background: '#FFFFFF',
        lineColor: '#000000',
      })
    }
  }, [expandedId, employees])

  useEffect(() => {
    if (showForm && formRef.current) {
      setTimeout(() => formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [showForm])

  const teamLeads = employees.filter(e => e.isAttendanceLeader === true)

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null)
    const finalDept = form.department === 'Other' ? (customDept.trim() || '') : form.department
    if (form.department === 'Other' && !customDept.trim()) { setError('Please specify the department name'); return }
    
    const isIntern = form.position?.toLowerCase().includes('intern')
    if (isIntern && !form.endDate) {
      setError('End Date is required for interns')
      return
    }
    
    const payload = { ...form, department: finalDept }
    try {
      if (editEmployee) {
        await axios.put(`${BASE_URL}/api/employees/${editEmployee.empId}`, payload)
      } else {
        await axios.post(`${BASE_URL}/api/employees`, payload)
      }
      setShowForm(false); setEditEmployee(null); setForm(EMPTY_FORM); setCustomDept('')
      fetchEmployees()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee')
    }
  }

  const handleEdit = (emp) => {
    setEditEmployee(emp)
    const isKnownDept = DEPARTMENTS.slice(0, -1).includes(emp.department)
    setForm({
      empId: emp.empId, name: emp.name || '', position: emp.position || '',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      endDate: emp.endDate ? emp.endDate.split('T')[0] : '',
      email: emp.email || '', salary: emp.salary || 'Not Disclosed',
      teamLead: emp.teamLead || '', contact: emp.contact || '',
      department: isKnownDept ? (emp.department || '') : (emp.department ? 'Other' : ''),
      photo: emp.photo || ''
    })
    setCustomDept(isKnownDept ? '' : (emp.department || ''))
    setShowForm(true)
  }

  const handleDelete = async (empId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return
    try { await axios.delete(`${BASE_URL}/api/employees/${empId}`); fetchEmployees() }
    catch { setError('Failed to delete employee') }
  }

  const handleResetPassword = async (empId, empName) => {
    if (!window.confirm(`Reset ${empName}'s password to hps@1234?`)) return
    setResettingId(empId)
    try {
      await axios.patch(`${BASE_URL}/api/employees/${empId}/reset-password`, { newPassword: 'hps@1234' })
      setResetSuccess(`Password reset for ${empName}`)
      setTimeout(() => setResetSuccess(''), 3000)
    } catch { setError('Failed to reset password') }
    finally { setResettingId(null) }
  }

  const downloadBarcode = (empId, empName) => {
    try {
      const svg = barcodeRefs.current[empId]
      if (!svg) return
      const svgData = new XMLSerializer().serializeToString(svg)
      const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url; a.download = `${empName || empId}-barcode.svg`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch { alert('Failed to download barcode') }
  }

  const allDepts = ['All', ...DEPARTMENTS.slice(0, -1),
    ...employees.map(e => e.department).filter(d => d && !DEPARTMENTS.includes(d))]
  const uniqueDepts = [...new Set(allDepts)]

  const filtered = employees
    .filter(emp =>
      (deptFilter === 'All' || emp.department === deptFilter) &&
      (
        emp.name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.empId?.toLowerCase().includes(search.toLowerCase()) ||
        emp.department?.toLowerCase().includes(search.toLowerCase()) ||
        emp.position?.toLowerCase().includes(search.toLowerCase())
      )
    )
    .sort((a, b) => {
      if (sortBy === 'id') {
        const valA = String(a.empId || '').slice(-2)
        const valB = String(b.empId || '').slice(-2)
        const numA = parseInt(valA, 10)
        const numB = parseInt(valB, 10)
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB
        }
        return valA.localeCompare(valB)
      }
      if (sortBy === 'dept')    return (a.department || '').localeCompare(b.department || '')
      if (sortBy === 'joining') return new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0)
      return 0
    })

  const inputStyle = {
    borderRadius: 16, padding: '10px 16px', fontSize: 14, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s',
    background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)',
  }

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const selectWrap = { position: 'relative', display: 'block' }
  const chevronOverlay = {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    pointerEvents: 'none', color: 'var(--text-muted)',
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 12,
        alignItems: 'center', justifyContent: 'space-between', marginBottom: 32,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Employees</h1>
          <p style={{ marginTop: 4, fontSize: 14, color: 'var(--text-secondary)' }}>
            {employees.length} registered · {filtered.length} shown
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditEmployee(null); setForm(EMPTY_FORM); setCustomDept('') }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#1AABDB', color: '#fff', fontSize: 14, fontWeight: 600,
            padding: '10px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1595c0'}
          onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Employee
        </button>
      </div>

      {/* Search + Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: 'var(--text-muted)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, ID, position…"
            style={{ ...inputStyle, width: '100%', paddingLeft: 36 }} />
        </div>

        <div style={selectWrap}>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            style={{ ...inputStyle, paddingRight: 32, appearance: 'none', cursor: 'pointer', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
            {uniqueDepts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
          </select>
          <span style={chevronOverlay}><ChevronDown /></span>
        </div>

        <div style={selectWrap}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ ...inputStyle, paddingRight: 32, appearance: 'none', cursor: 'pointer', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
            <option value="id">Sort: ID (Last 2 digits)</option>
            <option value="dept">Sort: Department</option>
            <option value="joining">Sort: Latest Joining</option>
          </select>
          <span style={chevronOverlay}><ChevronDown /></span>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div style={{
          marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#DC2626', padding: '12px 16px', borderRadius: 16, fontSize: 14,
        }}>{error}</div>
      )}
      {resetSuccess && (
        <div style={{
          marginBottom: 16, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
          color: '#059669', padding: '12px 16px', borderRadius: 16, fontSize: 14,
        }}>{resetSuccess}</div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div ref={formRef} style={{
          borderRadius: 24, padding: isMobile ? 20 : 32, marginBottom: 32,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', scrollMarginTop: 24,
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontWeight: 700, fontSize: isMobile ? 16 : 18, color: 'var(--text-primary)', margin: 0 }}>
              {editEmployee ? `Editing: ${editEmployee.name}` : 'Add New Employee'}
            </h2>
            <button onClick={() => { setShowForm(false); setEditEmployee(null); setCustomDept('') }}
              style={{
                width: 32, height: 32, borderRadius: 12, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', background: 'var(--surface2)', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface2)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}>
            {[
              { label: 'Employee ID *', key: 'empId',       placeholder: 'e.g. HPS260037', disabled: !!editEmployee, required: true },
              { label: 'Full Name *',   key: 'name',        placeholder: 'John Doe',        required: true },
              { label: 'Position',      key: 'position',    placeholder: 'e.g. SDE Intern' },
              { label: 'Email',         key: 'email',       placeholder: 'employee@hps.com', type: 'email' },
              { label: 'Joining Date',  key: 'joiningDate', type: 'date' },
              { label: 'End Date',      key: 'endDate',     type: 'date', placeholder: 'For internships' },
              { label: 'Salary',        key: 'salary',      placeholder: 'Not Disclosed' },
              { label: 'Contact',       key: 'contact',     placeholder: '9999999999' },
            ].filter(f => f.key !== 'endDate' || form.position.toLowerCase().includes('intern')).map(field => (
              <div key={field.key}>
                <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>
                  {field.label}
                </label>
                <input type={field.type || 'text'} value={form[field.key]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder} required={field.required} disabled={field.disabled}
                  style={{ ...inputStyle, width: '100%', opacity: field.disabled ? 0.5 : 1 }} />
              </div>
            ))}

            {/* Team Lead */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Team Lead</label>
              <div style={selectWrap}>
                <select value={form.teamLead} onChange={e => setForm({ ...form, teamLead: e.target.value })}
                  style={{ ...inputStyle, width: '100%', paddingRight: 32, appearance: 'none', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
                  <option value="">— Select team lead —</option>
                  {teamLeads.map(tl => (
                    <option key={tl.empId} value={tl.name}>{tl.name} · {tl.position}</option>
                  ))}
                  {form.teamLead && !teamLeads.some(tl => tl.name === form.teamLead) && (
                    <option value={form.teamLead}>{form.teamLead} (current)</option>
                  )}
                </select>
                <span style={chevronOverlay}><ChevronDown /></span>
              </div>
              {teamLeads.length === 0 && (
                <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)' }}>No team leads assigned yet</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4, color: 'var(--text-secondary)' }}>Department</label>
              <div style={selectWrap}>
                <select value={form.department}
                  onChange={e => { setForm({ ...form, department: e.target.value }); if (e.target.value !== 'Other') setCustomDept('') }}
                  style={{ ...inputStyle, width: '100%', paddingRight: 32, appearance: 'none', background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span style={chevronOverlay}><ChevronDown /></span>
              </div>
              {form.department === 'Other' && (
                <input type="text" value={customDept} onChange={e => setCustomDept(e.target.value)}
                  placeholder="Type department name…" required autoFocus
                  style={{ ...inputStyle, width: '100%', marginTop: 8, border: '1px solid #1AABDB' }} />
              )}
            </div>

            {/* Submit row */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 12, paddingTop: 8 }}>
              <button type="submit"
                style={{
                  background: '#1AABDB', color: '#fff', fontSize: 14, fontWeight: 600,
                  padding: '10px 24px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1595c0'}
                onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}>
                {editEmployee ? 'Update Employee' : 'Create Employee'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditEmployee(null); setCustomDept('') }}
                style={{
                  fontSize: 14, padding: '10px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  color: 'var(--text-secondary)', background: 'var(--surface2)',
                }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '2px solid #1AABDB', borderTopColor: 'transparent',
            animation: 'emp-spin 0.75s linear infinite',
          }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '64px 0', borderRadius: 24,
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {search || deptFilter !== 'All' ? 'No employees match your filters.' : 'No employees yet. Add one!'}
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: 24, overflowX: isMobile ? 'visible' : 'auto', overflowY: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div style={{ minWidth: isMobile ? '0' : '750px' }}>

          {!isMobile && (
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr auto',
              gap: 16, padding: '12px 20px', fontSize: 12, fontWeight: 600,
              background: 'var(--surface2)', borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)',
            }}>
              <span>Employee</span><span>Department</span><span>Position</span>
              <span>Joining</span><span />
            </div>
          )}

          {filtered.map((emp, idx) => {
            const isExpanded = expandedId === emp.empId
            const isLast = idx === filtered.length - 1

            return (
              <div key={emp.empId} style={{ borderBottom: isLast ? 'none' : '1px solid var(--card-border)' }}>

                {/* Desktop row */}
                {!isMobile && (
                  <div
                    style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 1fr auto',
                      gap: 16, alignItems: 'center', padding: '14px 20px', cursor: 'pointer',
                      background: isExpanded ? 'var(--surface2)' : 'transparent', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent' }}
                    onClick={() => setExpandedId(isExpanded ? null : emp.empId)}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: '#1AABDB', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                      }}>
                        {emp.name?.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{emp.name}</p>
                        <p style={{ fontSize: 12, color: '#1AABDB', margin: 0 }}>{emp.empId}</p>
                      </div>
                    </div>

                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.department || '—'}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.position || '—'}</span>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{formatDate(emp.joiningDate)}</span>
                    
                    <span style={{
                      color: 'var(--text-muted)', flexShrink: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex',
                    }}>
                      <ChevronDown />
                    </span>
                  </div>
                )}

                {/* Mobile row */}
                {isMobile && (
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', cursor: 'pointer',
                      background: isExpanded ? 'var(--surface2)' : 'transparent',
                    }}
                    onClick={() => setExpandedId(isExpanded ? null : emp.empId)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, background: '#1AABDB', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                      }}>
                        {emp.name?.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{emp.name}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{emp.empId} · {emp.department || '—'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      
                      <span style={{
                        color: 'var(--text-muted)',
                        transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'flex',
                      }}>
                        <ChevronDown />
                      </span>
                    </div>
                  </div>
                )}

                {/* Expanded panel */}
                {isExpanded && (
                  <div style={{
                    padding: isMobile ? '8px 16px 20px' : '8px 24px 20px',
                    background: 'var(--surface2)', borderTop: '1px solid var(--card-border)',
                  }}>
                    {/* Detail grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                      columnGap: 24, rowGap: 12, marginBottom: 20, marginTop: 12,
                    }}>
                      {[
                        { label: 'Email',        value: emp.email },
                        { label: 'Contact',      value: emp.contact },
                        { label: 'Team Lead',    value: emp.teamLead },
                        { label: 'Salary',       value: emp.salary },
                        { label: 'Joining Date', value: formatDate(emp.joiningDate) },
                        { label: 'End Date',     value: emp.endDate ? formatDate(emp.endDate) : null },
                        { label: 'Position',     value: emp.position },
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, color: 'var(--text-muted)' }}>{label}</p>
                          <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, wordBreak: 'break-all' }}>{value}</p>
                        </div>
                      ) : null)}
                    </div>



                    {/* EOD */}
                    {emp.dailyWorkStatus && (
                      <div style={{
                        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                        background: 'rgba(26,171,219,0.06)', border: '1px solid rgba(26,171,219,0.2)',
                      }}>
                        <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: '#1AABDB' }}>Today's Work</p>
                        <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0 }}>"{emp.dailyWorkStatus}"</p>
                      </div>
                    )}

                    {/* Shift & Leave Info */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr 1fr',
                      gap: 16, marginBottom: 16,
                    }}>
                      <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        padding: '12px 16px', borderRadius: 16
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Assigned Shift</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {shifts.find(s => s.id === emp.shiftId)?.name || 'Flexible (No Shift)'}
                          {emp.shiftId && (
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
                              ({shifts.find(s => s.id === emp.shiftId)?.startTime} - {shifts.find(s => s.id === emp.shiftId)?.endTime})
                            </span>
                          )}
                        </p>
                      </div>
                      <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        padding: '12px 16px', borderRadius: 16
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Casual Leaves (CL)</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#1AABDB', margin: 0 }}>{emp.leaveBalanceCL ?? '12.0'}</p>
                      </div>
                      <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        padding: '12px 16px', borderRadius: 16
                      }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Sick Leaves (SL)</p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: '#eab308', margin: 0 }}>{emp.leaveBalanceSL ?? '10.0'}</p>
                      </div>
                    </div>

                    {/* Assets & Documents Split Section */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                      gap: 20, marginBottom: 20
                    }}>
                      {/* Assets Vault */}
                      <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        padding: 16, borderRadius: 20
                      }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Assigned Company Assets</h4>
                        {expandedAssets.length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>No assets assigned to this employee</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                            {expandedAssets.map(asset => (
                              <div key={asset.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'var(--surface2)', padding: '8px 12px', borderRadius: 12,
                                border: '1px solid var(--card-border)'
                              }}>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{asset.name}</p>
                                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>S/N: {asset.serialNumber}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {asset.status === 'ASSIGNED' ? (
                                    <button onClick={() => handleReturnAsset(asset.id, emp.empId)}
                                      style={{
                                        fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 8,
                                        border: 'none', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer'
                                      }}>
                                      Return
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', color: 'var(--text-muted)' }}>Returned</span>
                                  )}
                                  <button onClick={() => handleDeleteAsset(asset.id, emp.empId)}
                                    style={{
                                      fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 8,
                                      border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer'
                                    }}>
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <form onSubmit={(e) => handleAssignAsset(e, emp.empId)} style={{
                          borderTop: '1px solid var(--card-border)', paddingTop: 12,
                          display: 'flex', flexDirection: 'column', gap: 8
                        }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>Assign New Asset</p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" placeholder="Asset Name" value={newAssetName} onChange={e => setNewAssetName(e.target.value)}
                              style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 10 }} />
                            <input type="text" placeholder="Serial Number" value={newAssetSerial} onChange={e => setNewAssetSerial(e.target.value)}
                              style={{ ...inputStyle, flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 10 }} />
                          </div>
                          {assignErr && <p style={{ fontSize: 11, color: '#dc2626', margin: 0 }}>{assignErr}</p>}
                          <button type="submit" disabled={assigningAsset}
                            style={{
                              alignSelf: 'flex-start', background: '#1AABDB', color: '#fff', fontSize: 12, fontWeight: 600,
                              padding: '6px 14px', borderRadius: 10, border: 'none', cursor: 'pointer'
                            }}>
                            {assigningAsset ? 'Assigning...' : 'Assign Asset'}
                          </button>
                        </form>
                      </div>

                      {/* Documents Vault */}
                      <div style={{
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                        padding: 16, borderRadius: 20
                      }}>
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Uploaded Document Vault</h4>
                        {expandedDocs.length === 0 ? (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No documents uploaded yet</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {expandedDocs.map(doc => (
                              <div key={doc.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: 'var(--surface2)', padding: '8px 12px', borderRadius: 12,
                                border: '1px solid var(--card-border)'
                              }}>
                                <div>
                                  <a href={`${BASE_URL}/${doc.filePath}`} target="_blank" rel="noreferrer"
                                    style={{ fontSize: 13, fontWeight: 600, color: '#1AABDB', textDecoration: 'none' }}>
                                    📄 {doc.documentType}
                                  </a>
                                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                                    {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </p>
                                </div>
                                <button onClick={() => handleAdminDocDelete(doc.id, emp.empId)}
                                  style={{
                                    fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 8,
                                    border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer'
                                  }}>
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barcode */}
                    {emp.barcodeId && (
                      <div style={{
                        borderRadius: 12, padding: 16, marginBottom: 16,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
                      }}>
                        <svg ref={el => barcodeRefs.current[emp.empId] = el} />
                        <button onClick={() => downloadBarcode(emp.empId, emp.name)}
                          style={{
                            fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12, cursor: 'pointer',
                            background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
                            border: '1px solid rgba(26,171,219,0.2)', transition: 'background 0.15s',
                          }}>
                          Download Barcode
                        </button>
                      </div>
                    )}

                    {/* Team Lead Toggle */}
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', borderRadius: 12, marginBottom: 12,
                        background: emp.isAttendanceLeader ? 'rgba(26,171,219,0.08)' : 'var(--card-bg)',
                        border: `1px solid ${emp.isAttendanceLeader ? 'rgba(26,171,219,0.25)' : 'var(--card-border)'}`,
                        cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onClick={async () => {
                        try {
                          await axios.patch(`${BASE_URL}/api/employees/${emp.empId}/leader`, {
                            isAttendanceLeader: !emp.isAttendanceLeader
                          })
                          fetchEmployees()
                        } catch {
                          setError('Failed to update team lead status')
                        }
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${emp.isAttendanceLeader ? '#1AABDB' : 'var(--text-muted)'}`,
                        background: emp.isAttendanceLeader ? '#1AABDB' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}>
                        {emp.isAttendanceLeader && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: emp.isAttendanceLeader ? '#1AABDB' : 'var(--text-primary)' }}>
                          Set as Team Lead / Attendance Leader
                        </p>
                        <p style={{ fontSize: 11, margin: 0, color: 'var(--text-muted)' }}>
                          {emp.isAttendanceLeader ? 'Currently a team lead — click to remove' : 'Click to assign as team lead'}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 4 }}>
                      <button onClick={() => handleEdit(emp)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12, cursor: 'pointer',
                          color: '#1AABDB', background: 'rgba(26,171,219,0.08)', border: '1px solid rgba(26,171,219,0.2)',
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button onClick={() => handleResetPassword(emp.empId, emp.name)}
                        disabled={resettingId === emp.empId}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12,
                          cursor: resettingId === emp.empId ? 'not-allowed' : 'pointer',
                          color: '#d97706', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                          opacity: resettingId === emp.empId ? 0.6 : 1,
                        }}>
                        {resettingId === emp.empId ? 'Resetting…' : '🔑 Reset PW'}
                      </button>
                      <button onClick={() => handleDelete(emp.empId)}
                        style={{
                          fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 12, cursor: 'pointer',
                          color: '#dc2626', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                        }}>
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Employees