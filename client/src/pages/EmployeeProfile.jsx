import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import JsBarcode from 'jsbarcode'
import BASE_URL from '../config'

function EmployeeProfile() {
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const barcodeRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('employeeAuth')
    if (!stored) { navigate('/employee/login'); return }
    const emp = JSON.parse(stored)
    fetchEmployee(emp.empId)
  }, [])

  const fetchEmployee = async (empId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/employees/${empId}`)
      setEmployee(res.data)
    } catch {
      console.error('Failed to fetch employee')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (employee?.barcodeId && barcodeRef.current) {
      JsBarcode(barcodeRef.current, employee.barcodeId, {
        format: 'CODE128', width: 1.5, height: 50,
        displayValue: true, fontSize: 11,
        background: 'transparent', lineColor: '#1AABDB',
      })
    }
  }, [employee])

  const downloadBarcode = () => {
    if (!barcodeRef.current) return
    const serializer = new XMLSerializer()
    const svgData = serializer.serializeToString(barcodeRef.current)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${employee.name}-barcode.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyEmpId = () => {
    navigator.clipboard.writeText(employee.empId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match')
      return
    }
    if (pwForm.newPassword.length < 6) {
      setPwError('New password must be at least 6 characters')
      return
    }

    setPwLoading(true)
    try {
      const stored = localStorage.getItem('employeeAuth')
      if (!stored) {
        setPwError('Not authenticated')
        return
      }
      const emp = JSON.parse(stored)
      const res = await axios.patch(`${BASE_URL}/api/employees/${emp.empId}/password`, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })

      setPwSuccess(res.data.message || 'Password changed successfully')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPwSuccess(''), 3000)
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password')
    } finally {
      setPwLoading(false)
    }
  }

  const projectStatusStyle = (status) => {
    if (!status) return null
    const s = status.toLowerCase()
    if (s === 'in progress') return { background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }
    if (s === 'completed') return { background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
    if (s === 'on hold') return { background: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }
    return { background: 'rgba(148,163,184,0.1)', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.2)' }
  }

  if (loading) return <div className="text-sm p-8" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
  if (!employee) return <div className="text-sm p-8" style={{ color: 'var(--text-secondary)' }}>Employee not found.</div>

  const InfoField = ({ label, value }) => (
    <div className="p-3 rounded-xl transition-all duration-150"
      style={{ border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(26,171,219,0.04)'; e.currentTarget.style.border = '1px solid rgba(26,171,219,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent'; }}>
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value || '—'}</p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div style={{ width: '4px', height: '24px', borderRadius: '4px', background: '#1AABDB' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Profile</h1>
        </div>
        <p className="text-sm ml-3" style={{ color: 'var(--text-secondary)' }}>Your employee information and barcode</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col */}
        <div className="flex flex-col gap-5">

          {/* ID Card */}
          <div className="rounded-2xl p-6 text-center relative overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            {/* subtle bg glow */}
            <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,171,219,0.1), transparent 70%)', pointerEvents: 'none' }} />
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1AABDB, #0e8ab5)', boxShadow: '0 8px 24px rgba(26,171,219,0.3)' }}>
                {employee.name?.charAt(0)}
              </div>
              <h2 className="font-bold text-lg mb-1" style={{ color: 'var(--text-primary)' }}>{employee.name}</h2>
              <button onClick={copyEmpId}
                className="text-sm font-medium mb-1 transition-all flex items-center gap-1 mx-auto"
                style={{ color: '#1AABDB' }}>
                {employee.empId}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {copied
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
                  }
                </svg>
              </button>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{employee.position}</p>
              {employee.department && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}>
                  {employee.department}
                </span>
              )}
            </div>
          </div>

          {/* Barcode card */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="font-bold text-sm mb-4 text-center" style={{ color: 'var(--text-primary)' }}>My Barcode</h3>
            <div className="rounded-xl p-4 flex justify-center mb-4"
              style={{ background: 'rgba(26,171,219,0.04)', border: '1px solid rgba(26,171,219,0.1)' }}>
              <svg ref={barcodeRef}></svg>
            </div>
            <button onClick={downloadBarcode}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: '#1AABDB', boxShadow: '0 4px 16px rgba(26,171,219,0.25)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0e8ab5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1AABDB'}>
              Download Barcode
            </button>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-secondary)' }}>
              Present this barcode at the scanner terminal
            </p>
          </div>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Personal info */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              <InfoField label="Full Name" value={employee.name} />
              <InfoField label="Employee ID" value={employee.empId} />
              <InfoField label="Email" value={employee.email} />
              <InfoField label="Contact" value={employee.contact} />
              <InfoField label="Joining Date" value={employee.joiningDate
                ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                : null} />
              <InfoField label="Salary" value={employee.salary} />
            </div>
          </div>

          {/* Work info */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Work Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
              <InfoField label="Department" value={employee.department} />
              <InfoField label="Position" value={employee.position} />
              <InfoField label="Team Lead" value={employee.teamLead} />
              <InfoField label="Project" value={employee.project} />
            </div>
            {employee.projectStatus && (
              <div className="mt-3 px-3">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Project Status</p>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={projectStatusStyle(employee.projectStatus)}>
                  {employee.projectStatus}
                </span>
              </div>
            )}
          </div>

          {/* Work status */}
          {employee.dailyWorkStatus && (
            <div className="rounded-2xl p-6" style={{ background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: '#1AABDB' }} />
                <p className="text-xs font-semibold" style={{ color: '#1AABDB' }}>Today's Work Status</p>
              </div>
              <p className="text-sm italic" style={{ color: 'var(--text-primary)' }}>"{employee.dailyWorkStatus}"</p>
            </div>
          )}

          <div className="rounded-2xl p-6" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 className="font-bold text-base mb-5" style={{ color: 'var(--text-primary)' }}>Change Password</h3>
            <form onSubmit={handlePasswordChange} className="grid gap-4">
              {[
                { key: 'currentPassword', label: 'Current Password', show: showPw.current, toggleKey: 'current' },
                { key: 'newPassword', label: 'New Password', show: showPw.new, toggleKey: 'new' },
                { key: 'confirmPassword', label: 'Confirm New Password', show: showPw.confirm, toggleKey: 'confirm' },
              ].map(field => (
                <div key={field.key}>
                  <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--text-secondary)' }}>{field.label}</label>
                  <div className="relative">
                    <input
                      type={field.show ? 'text' : 'password'}
                      value={pwForm[field.key]}
                      onChange={(e) => setPwForm({ ...pwForm, [field.key]: e.target.value })}
                      required
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none pr-11 transition-all"
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                      onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                      onBlur={e => e.target.style.border = '1px solid var(--input-border)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => ({ ...p, [field.toggleKey]: !p[field.toggleKey] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: 'var(--text-muted)' }}>
                      {field.show ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}

              {pwError && (
                <p className="text-sm text-red-500">{pwError}</p>
              )}
              {pwSuccess && (
                <p className="text-sm text-emerald-600">{pwSuccess}</p>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#1AABDB', boxShadow: '0 4px 16px rgba(26,171,219,0.25)' }}>
                {pwLoading ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeProfile
