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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isLg, setIsLg] = useState(window.innerWidth >= 1024)
  const barcodeRef = useRef(null)

  const [documents, setDocuments] = useState([])
  const [assets, setAssets] = useState([])
  const [uploadType, setUploadType] = useState('Aadhaar')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')

  const fetchDocuments = async (empId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/documents/${empId}`)
      setDocuments(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchAssets = async (empId) => {
    try {
      const res = await axios.get(`${BASE_URL}/api/assets?empId=${empId}`)
      setAssets(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!uploadFile) return setUploadErr('Select a file first')
    setUploading(true)
    setUploadErr('')
    const formData = new FormData()
    formData.append('file', uploadFile)
    formData.append('empId', employee.empId)
    formData.append('docType', uploadType)
    try {
      await axios.post(`${BASE_URL}/api/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUploadFile(null)
      // reset file input
      const fileInput = document.getElementById('doc-file-input')
      if (fileInput) fileInput.value = ''
      fetchDocuments(employee.empId)
    } catch (err) {
      setUploadErr(err.response?.data?.error || 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDocDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return
    try {
      const token = localStorage.getItem('adminToken')
      await axios.delete(`${BASE_URL}/api/documents/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      fetchDocuments(employee.empId)
    } catch {
      alert('Delete failed. Only Admins can delete documents.')
    }
  }

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
      fetchEmployee(targetEmp.empId)
      fetchDocuments(targetEmp.empId)
      fetchAssets(targetEmp.empId)
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

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      setIsLg(window.innerWidth >= 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
        background: '#FFFFFF',
        lineColor: '#000000',
      })
      const svg = barcodeRef.current
      const width = svg.getAttribute('width')
      const height = svg.getAttribute('height')
      if (width && height) {
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
        svg.removeAttribute('width')
        svg.removeAttribute('height')
      }
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
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwError('New passwords do not match'); return }
    if (pwForm.newPassword.length < 6) { setPwError('New password must be at least 6 characters'); return }
    setPwLoading(true)
    try {
      const stored = localStorage.getItem('employeeAuth')
      if (!stored) { setPwError('Not authenticated'); return }
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

  

  if (loading) return <div style={{ fontSize: '0.875rem', padding: '32px', color: 'var(--text-secondary)' }}>Loading...</div>
  if (!employee) return <div style={{ fontSize: '0.875rem', padding: '32px', color: 'var(--text-secondary)' }}>Employee not found.</div>

  const InfoField = ({ label, value }) => (
    <div
      style={{ padding: '12px', borderRadius: '12px', transition: 'all 0.15s', border: '1px solid transparent' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,171,219,0.04)'; e.currentTarget.style.border = '1px solid rgba(26,171,219,0.1)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.border = '1px solid transparent' }}
    >
      <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '4px', color: 'var(--text-secondary)', margin: '0 0 4px' }}>{label}</p>
      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{value || '—'}</p>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", width: '100%', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box', overflowX: 'hidden' }}>
      <style>{`
        .profile-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 1024px) {
          .profile-grid {
            grid-template-columns: 1fr 2fr;
          }
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 4px;
          width: 100%;
          box-sizing: border-box;
        }
        @media (min-width: 768px) {
          .info-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '32px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '24px', borderRadius: '4px', background: '#1AABDB', flexShrink: 0 }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My Profile</h1>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 0 12px' }}>
          Your employee information and barcode
        </p>
      </div>

      {/* Layout grid */}
      <div className="profile-grid">

        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>

          {/* ID Card */}
          <div style={{
            borderRadius: '16px', padding: '24px', textAlign: 'center',
            position: 'relative', overflow: 'hidden', width: '100%', maxWidth: '100%', boxSizing: 'border-box',
            background: 'var(--card-bg)', border: '1px solid var(--card-border)'
          }}>
            {/* subtle bg glow */}
            <div style={{
              position: 'absolute', top: '-30px', right: '-30px',
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(26,171,219,0.1), transparent 70%)',
              pointerEvents: 'none'
            }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '16px',
                margin: '0 0 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.875rem', fontWeight: 700, color: '#fff',
                background: 'linear-gradient(135deg, #1AABDB, #0e8ab5)',
                boxShadow: '0 8px 24px rgba(26,171,219,0.3)'
              }}>
                {employee.name?.charAt(0)}
              </div>
              <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '4px', color: 'var(--text-primary)', margin: '0 0 4px', textAlign: 'center' }}>
                {employee.name}
              </h2>
              <button
                onClick={copyEmpId}
                style={{
                  fontSize: '0.875rem', fontWeight: 500, color: '#1AABDB',
                  background: 'none', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center',
                  gap: '4px', margin: '4px 0'
                }}>
                {employee.empId}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {copied
                    ? <polyline points="20 6 9 17 4 12"/>
                    : <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>
                  }
                </svg>
              </button>
              <p style={{ fontSize: '0.875rem', marginBottom: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', textAlign: 'center' }}>
                {employee.position}
              </p>
              {employee.department && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '9999px',
                  background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)'
                }}>
                  {employee.department}
                </span>
              )}
            </div>
          </div>

          {/* Barcode card */}
          <div style={{ borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '16px', textAlign: 'center', color: 'var(--text-primary)', margin: '0 0 16px' }}>
              My Barcode
            </h3>
            <div style={{
              borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'center', marginBottom: '16px',
              background: 'rgba(26,171,219,0.04)', border: '1px solid rgba(26,171,219,0.1)',
              overflow: 'hidden', width: '100%'
            }}>
              <svg ref={barcodeRef} style={{ width: '100%', height: 'auto', maxWidth: '260px', display: 'block' }}></svg>
            </div>
            <button
              onClick={downloadBarcode}
              style={{
                width: '100%', padding: '10px', borderRadius: '12px', fontSize: '0.875rem',
                fontWeight: 600, color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: '#1AABDB', boxShadow: '0 4px 16px rgba(26,171,219,0.25)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#0e8ab5'}
              onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}>
              Download Barcode
            </button>
            <p style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '8px', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
              Present this barcode at the scanner terminal
            </p>
          </div>
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>

          {/* Personal info */}
          <div style={{ borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
              Personal Information
            </h3>
            <div className="info-grid">
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
          <div style={{ borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
              Work Information
            </h3>
            <div className="info-grid">
              <InfoField label="Department" value={employee.department} />
              <InfoField label="Position" value={employee.position} />
              <InfoField label="Team Lead" value={employee.teamLead} />
              
            </div>
          </div>

          {/* My Assets */}
          <div style={{ borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
              Assigned Company Assets
            </h3>
            {assets.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>No company assets currently assigned to you.</p>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {assets.map(asset => (
                  <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--card-border)' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{asset.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>SN: {asset.serialNumber}</p>
                    </div>
                    <span style={{
                      alignSelf: 'center', fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px', borderRadius: '9999px',
                      background: asset.status === 'Assigned' ? 'rgba(26,171,219,0.1)' : 'rgba(16,185,129,0.1)',
                      color: asset.status === 'Assigned' ? '#1AABDB' : '#10B981'
                    }}>
                      {asset.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Documents (Vault) */}
          <div style={{ borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
              Document Vault
            </h3>
            
            {/* Upload form */}
            <form onSubmit={handleFileUpload} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', fontSize: '0.875rem', outline: 'none',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)'
                  }}
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Degree">Degree Certificate</option>
                  <option value="Contract">Employment Contract</option>
                  <option value="Resume">Resume / CV</option>
                </select>
                <input
                  id="doc-file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={e => setUploadFile(e.target.files[0])}
                  style={{
                    flex: 1, padding: '6px', borderRadius: '10px', fontSize: '0.875rem',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)'
                  }}
                />
              </div>
              {uploadErr && <p style={{ fontSize: '0.75rem', color: '#EF4444', margin: 0 }}>{uploadErr}</p>}
              <button
                type="submit"
                disabled={uploading}
                style={{
                  padding: '10px', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                  border: 'none', cursor: uploading ? 'not-allowed' : 'pointer', background: uploading ? 'rgba(26,171,219,0.5)' : '#1AABDB'
                }}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>

            {/* Documents List */}
            {documents.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>No documents uploaded yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '8px' }}>
                {documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--card-border)' }}>
                    <div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{doc.docType}</p>
                      <a href={`${BASE_URL}${doc.fileUrl}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#1AABDB', textDecoration: 'none' }}>
                        View: {doc.fileName.length > 20 ? doc.fileName.substring(0, 17) + '...' : doc.fileName}
                      </a>
                    </div>
                    <button
                      onClick={() => handleDocDelete(doc.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px' }}
                      title="Delete document"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Daily work status */}
          {employee.dailyWorkStatus && (
            <div style={{
              borderRadius: '16px', padding: '24px',
              background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1AABDB', flexShrink: 0 }} />
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1AABDB', margin: 0 }}>Today's Work Status</p>
              </div>
              <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-primary)', margin: 0 }}>
                "{employee.dailyWorkStatus}"
              </p>
            </div>
          )}

          {/* Change Password */}
          <div style={{ borderRadius: '16px', padding: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '20px', color: 'var(--text-primary)', margin: '0 0 20px' }}>
              Change Password
            </h3>
            <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '16px' }}>
              {[
                { key: 'currentPassword', label: 'Current Password', show: showPw.current, toggleKey: 'current' },
                { key: 'newPassword', label: 'New Password', show: showPw.new, toggleKey: 'new' },
                { key: 'confirmPassword', label: 'Confirm New Password', show: showPw.confirm, toggleKey: 'confirm' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    {field.label}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={field.show ? 'text' : 'password'}
                      value={pwForm[field.key]}
                      onChange={e => setPwForm({ ...pwForm, [field.key]: e.target.value })}
                      required
                      placeholder="••••••••"
                      style={{
                        width: '100%', padding: '12px 44px 12px 16px', borderRadius: '12px',
                        fontSize: '0.875rem', outline: 'none', transition: 'border 0.2s',
                        boxSizing: 'border-box',
                        background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                      onBlur={e => e.target.style.border = '1px solid var(--input-border)'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => ({ ...p, [field.toggleKey]: !p[field.toggleKey] }))}
                      style={{
                        position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem',
                        color: 'var(--text-muted)'
                      }}>
                      {field.show ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}

              {pwError && (
                <p style={{ fontSize: '0.875rem', color: '#EF4444', margin: 0 }}>{pwError}</p>
              )}
              {pwSuccess && (
                <p style={{ fontSize: '0.875rem', color: '#10B981', margin: 0 }}>{pwSuccess}</p>
              )}

              <button
                type="submit"
                disabled={pwLoading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '12px', fontSize: '0.875rem',
                  fontWeight: 600, color: '#fff', border: 'none', cursor: pwLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s', background: pwLoading ? 'rgba(26,171,219,0.5)' : '#1AABDB',
                  boxShadow: '0 4px 16px rgba(26,171,219,0.25)'
                }}>
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