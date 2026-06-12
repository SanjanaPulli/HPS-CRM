import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import axios from 'axios'
import { useSearchParams, useNavigate } from 'react-router-dom'
import BASE_URL from '../config'

const STATUS_IDLE     = 'idle'
const STATUS_SCANNING = 'scanning'
const STATUS_SUCCESS  = 'success'
const STATUS_ERROR    = 'error'
const STATUS_LATE     = 'late'

export default function ScannerTerminal() {
  const html5QrRef = useRef(null)
  const [scanning, setScanning] = useState(false)
  const [status, setStatus]     = useState(STATUS_IDLE)
  const [message, setMessage]   = useState('')
  const [empName, setEmpName]   = useState('')
  const [time, setTime]         = useState(new Date())
  const [lastScan, setLastScan] = useState(null)
  const cooldownRef = useRef(false)
  const [searchParams] = useSearchParams()
  const from = searchParams.get('from') // 'admin' | 'employee' | null
  const navigate = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    return () => { stopScanner() }
  }, [])

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop() } catch {}
      try { html5QrRef.current.clear() } catch {}
      html5QrRef.current = null
    }
    setScanning(false)
  }

  const startScanner = async () => {
    setStatus(STATUS_SCANNING)
    setMessage('')
    setEmpName('')
    setScanning(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      stream.getTracks().forEach(t => t.stop())
    } catch (permErr) {
      setStatus(STATUS_ERROR)
      setMessage('Camera permission denied. Please allow camera access in your browser settings and try again.')
      setScanning(false)
      return
    }

    await new Promise(r => setTimeout(r, 150))

    const qr = new Html5Qrcode('qr-reader')
    html5QrRef.current = qr

    const onScan = async (decodedText) => {
      if (cooldownRef.current) return
      cooldownRef.current = true
      await stopScanner()
      await handleScan(decodedText.trim())
      setTimeout(() => { cooldownRef.current = false }, 4000)
    }

    const config = {
      fps: 10,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const width = Math.min(viewfinderWidth * 0.85, 350)
        const height = Math.round(width * 0.35)
        return { width, height }
      },
    }

    try {
      await qr.start({ facingMode: 'environment' }, config, onScan, () => {})
    } catch {
      try {
        await qr.start({ facingMode: 'user' }, config, onScan, () => {})
      } catch (err) {
        setStatus(STATUS_ERROR)
        setMessage('Camera unavailable. Make sure you are using HTTPS and have granted camera permission.')
        setScanning(false)
      }
    }
  }

  const handleScan = async (barcodeId) => {
    try {
      const res = await axios.post(`${BASE_URL}/api/attendance/scan`, { barcodeId })
      const { employee, attendance } = res.data
      const name = employee?.name || barcodeId
      const attendanceStatus = attendance?.status

      setEmpName(name)
      setLastScan({ empId: employee?.empId, name, status: attendanceStatus })

      if (attendanceStatus === 'Late') {
        setStatus(STATUS_LATE)
        setMessage('Marked as Late — after 10:15 AM')
      } else {
        setStatus(STATUS_SUCCESS)
        setMessage('Attendance marked successfully')
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to mark attendance. Try again.'

      if (err.response?.status === 400 && err.response?.data?.employee) {
        const name = err.response.data.employee.name
        setEmpName(name)
        setStatus(STATUS_ERROR)
        setMessage('Attendance already marked today!')
        setLastScan({ empId: err.response.data.employee.empId, name })
      } else {
        setStatus(STATUS_ERROR)
        setMessage(errMsg)
      }
    }
  }

  const reset = () => {
    setStatus(STATUS_IDLE)
    setMessage('')
    setEmpName('')
    setLastScan(null)
  }

  const formatTime = (d) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

  const formatDate = (d) =>
    d.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const isAfterCutoff = time.getHours() > 10 || (time.getHours() === 10 && time.getMinutes() >= 15)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      background: '#0D1117',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(26,171,219,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(26,171,219,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '448px' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <img src="/hps_new_logo_white.png" alt="HPS" style={{ height: '48px', objectFit: 'contain', marginBottom: '16px' }} />
          <div style={{
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            background: 'rgba(26,171,219,0.12)',
            color: '#1AABDB',
            border: '1px solid rgba(26,171,219,0.2)'
          }}>
            Attendance Terminal
          </div>
          <p style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums', margin: 0 }}>
            {formatTime(time)}
          </p>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '4px', margin: '4px 0 0' }}>
            {formatDate(time)}
          </p>
          {isAfterCutoff && (
            <div style={{
              marginTop: '12px',
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(234,179,8,0.12)',
              color: '#EAB308',
              border: '1px solid rgba(234,179,8,0.2)'
            }}>
              ⚠ After 10:15 AM — will be marked Late
            </div>
          )}
        </div>

        {/* Main card */}
        <div style={{
          borderRadius: '24px',
          padding: '24px',
          background: '#161B27',
          border: '1px solid rgba(255,255,255,0.07)'
        }}>

          {/* Scanner viewport */}
          <div
            id="qr-reader"
            style={{
              width: '100%',
              borderRadius: '16px',
              overflow: 'hidden',
              marginBottom: '24px',
              background: '#0D1117',
              display: scanning ? 'block' : 'none',
            }}
          />

          {/* States */}
          {!scanning && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0' }}>

              {status === STATUS_IDLE && (
                <>
                  <div style={{
                    width: '96px', height: '96px', borderRadius: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                    background: 'rgba(26,171,219,0.08)', border: '2px dashed rgba(26,171,219,0.3)'
                  }}>
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="1.5" height="12"/><rect x="5" y="6" width="1" height="12"/>
                      <rect x="8" y="6" width="2" height="12"/><rect x="12" y="6" width="1" height="12"/>
                      <rect x="15" y="6" width="2.5" height="12"/><rect x="19.5" y="6" width="1" height="12"/>
                      <rect x="21.5" y="6" width="0.5" height="12"/>
                    </svg>
                  </div>
                  <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
                    Press <span style={{ color: '#1AABDB' }}>Start Scanner</span> and hold your<br />employee barcode up to the camera
                  </p>
                </>
              )}

              {status === STATUS_SUCCESS && (
                <>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                    background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)'
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p style={{ color: '#4ADE80', fontWeight: 700, fontSize: '1.25rem', marginBottom: '4px', margin: '0 0 4px' }}>{empName}</p>
                  <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginBottom: '4px', margin: '0 0 4px' }}>{message}</p>
                  {lastScan?.empId && <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '4px', margin: '4px 0 0' }}>{lastScan.empId}</p>}
                </>
              )}

              {status === STATUS_LATE && (
                <>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                    background: 'rgba(234,179,8,0.1)', border: '2px solid rgba(234,179,8,0.3)'
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <p style={{ color: '#FACC15', fontWeight: 700, fontSize: '1.25rem', marginBottom: '4px', margin: '0 0 4px' }}>{empName}</p>
                  <p style={{ color: '#EAB308', fontSize: '0.875rem', marginBottom: '4px', margin: '0 0 4px' }}>{message}</p>
                  {lastScan?.empId && <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '4px', margin: '4px 0 0' }}>{lastScan.empId}</p>}
                </>
              )}

              {status === STATUS_ERROR && (
                <>
                  <div style={{
                    width: '80px', height: '80px', borderRadius: '9999px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                    background: 'rgba(239,68,68,0.1)', border: '2px solid rgba(239,68,68,0.3)'
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <p style={{ color: '#F87171', fontWeight: 700, fontSize: '1.125rem', marginBottom: '8px', margin: '0 0 8px' }}>Scan Failed</p>
                  <p style={{ color: '#94A3B8', fontSize: '0.875rem', textAlign: 'center', padding: '0 16px', margin: 0 }}>{message}</p>
                </>
              )}

            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {!scanning && status === STATUS_IDLE && (
              <button
                onClick={startScanner}
                style={{
                  width: '100%', padding: '14px', borderRadius: '16px',
                  fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                  background: '#1AABDB', border: 'none', cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#158fc0'}
                onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}
              >
                Start Scanner
              </button>
            )}

            {scanning && (
              <button
                onClick={stopScanner}
                style={{
                  width: '100%', padding: '14px', borderRadius: '16px',
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  background: 'rgba(255,255,255,0.06)', color: '#94A3B8',
                  border: '1px solid rgba(255,255,255,0.08)', transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
            )}

            {(status === STATUS_SUCCESS || status === STATUS_LATE || status === STATUS_ERROR) && (
              <>
                <button
                  onClick={startScanner}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '16px',
                    fontSize: '0.875rem', fontWeight: 600, color: '#fff',
                    background: '#1AABDB', border: 'none', cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#158fc0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1AABDB'}
                >
                  Scan Next Employee
                </button>
                <button
                  onClick={reset}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '16px',
                    fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.04)', color: '#64748B',
                    border: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.2s'
                  }}
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
          {/* Back button */}
          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(from === 'admin' ? '/admin/dashboard' : '/employee/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94A3B8', fontSize: '0.875rem', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s'
             }}
             onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,171,219,0.1)'; e.currentTarget.style.color = '#1AABDB'; e.currentTarget.style.borderColor = 'rgba(26,171,219,0.3)' }}
             onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
           >
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M19 12H5M12 19l-7-7 7-7"/>
             </svg>
             Back to {from === 'admin' ? 'Admin Dashboard' : 'My Dashboard'}
            </button>
          </div>
          
          
        </div>
        <p style={{ textAlign: 'center', color: '#334155', fontSize: '0.75rem', marginTop: '12px' }}>
          HPS Pvt Ltd · Attendance Terminal · No login required
        </p>

      </div>
    </div>
  )
}