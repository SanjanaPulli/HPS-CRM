import { useState, useEffect } from 'react'
import BASE_URL from '../config'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── tiny helpers ────────────────────────────────────────────────────────────
function StatusBanner({ status }) {
  if (!status) return null
  const ok = status.type === 'success'
  return (
    <div style={{
      padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500,
      background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
      color: ok ? '#16a34a' : '#dc2626',
      border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
      display: 'flex', alignItems: 'center', gap: '0.5rem',
    }}>
      {ok
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {status.msg}
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

function TextInput({ name, value, onChange, placeholder, type = 'text' }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', padding: '0.6rem 0.85rem',
        background: 'var(--input-bg)',
        border: `1px solid ${focused ? '#1AABDB' : 'var(--input-border)'}`,
        borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem',
        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
      }}
    />
  )
}

function TimeInput({ name, value, onChange }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type="time" name={name} value={value} onChange={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        padding: '0.6rem 0.85rem',
        background: 'var(--input-bg)',
        border: `1px solid ${focused ? '#1AABDB' : 'var(--input-border)'}`,
        borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem',
        outline: 'none', transition: 'border-color 0.2s', width: '140px',
        colorScheme: 'auto',
      }}
    />
  )
}

function SaveButton({ loading, label = 'Save Changes' }) {
  return (
    <button type="submit" disabled={loading} style={{
      background: loading ? 'rgba(26,171,219,0.6)' : '#1AABDB',
      color: '#fff', border: 'none', borderRadius: '8px',
      padding: '0.65rem 1.5rem', fontSize: '0.9rem', fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s',
    }}>
      {loading ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Saving...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          {label}
        </>
      )}
    </button>
  )
}

function CardSection({ icon, title, subtitle, children }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--card-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(26,171,219,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{title}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: '1.5rem' }}>{children}</div>
    </div>
  )
}

// ─── Password Field ───────────────────────────────────────────────────────────
function PasswordField({ label, name, value, onChange, show, onToggle, placeholder, error }) {
  const [focused, setFocused] = useState(false)
  return (
    <Field label={label}>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'} name={name} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '0.6rem 2.75rem 0.6rem 0.85rem',
            background: 'var(--input-bg)',
            border: `1px solid ${error ? '#ef4444' : focused ? '#1AABDB' : 'var(--input-border)'}`,
            borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem',
            outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
          }}
        />
        <button type="button" onClick={onToggle} tabIndex={-1} style={{
          position: 'absolute', right: '0.65rem', top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
        }}>
          {show
            ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
      {error && <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#ef4444' }}>{error}</p>}
    </Field>
  )
}

// ─── TAB: Office Settings ─────────────────────────────────────────────────────
function OfficeTab() {
  const defaultOffice = { checkInTime: '09:00', checkOutTime: '18:00', lateAfter: '09:15', halfDayBefore: '13:00', workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat', officeName: 'HPS Pvt Ltd', officeAddress: '', officePhone: '', officeEmail: '' }
  const [form, setForm] = useState(defaultOffice)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch(`${BASE_URL}/api/settings`)
      .then(r => r.json())
      .then(data => { setForm({ ...defaultOffice, ...data }); setFetching(false) })
      .catch(() => setFetching(false))
  }, [])

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setStatus(null) }

  const toggleDay = (day) => {
    const days = form.workingDays ? form.workingDays.split(',').filter(Boolean) : []
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day]
    // keep original DAYS order
    const ordered = DAYS.filter(d => next.includes(d))
    setForm({ ...form, workingDays: ordered.join(',') })
    setStatus(null)
  }

  const activeDays = form.workingDays ? form.workingDays.split(',').filter(Boolean) : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) setStatus({ type: 'error', msg: data.error || 'Failed to save.' })
      else setStatus({ type: 'success', msg: 'Office settings saved successfully!' })
    } catch { setStatus({ type: 'error', msg: 'Network error. Please try again.' }) }
    finally { setLoading(false) }
  }

  if (fetching) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      Loading settings...
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Attendance Timings ── */}
      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        title="Attendance Timings"
        subtitle="Set check-in, check-out and cutoff times"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <Field label="Check-in Time" hint="Official start of work">
            <TimeInput name="checkInTime" value={form.checkInTime} onChange={handleChange} />
          </Field>
          <Field label="Check-out Time" hint="Official end of work">
            <TimeInput name="checkOutTime" value={form.checkOutTime} onChange={handleChange} />
          </Field>
          <Field label="Late Arrival After" hint="Marked late if scanned after this">
            <TimeInput name="lateAfter" value={form.lateAfter} onChange={handleChange} />
          </Field>
          <Field label="Half-day Before" hint="Scans before this = half day">
            <TimeInput name="halfDayBefore" value={form.halfDayBefore} onChange={handleChange} />
          </Field>
        </div>
      </CardSection>

      {/* ── Working Days ── */}
      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        title="Working Days"
        subtitle="Toggle which days are working days"
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {DAYS.map(day => {
            const active = activeDays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: `1px solid ${active ? '#1AABDB' : 'var(--border)'}`,
                  background: active ? 'rgba(26,171,219,0.12)' : 'var(--input-bg)',
                  color: active ? '#1AABDB' : 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {day}
              </button>
            )
          })}
        </div>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {activeDays.length} working day{activeDays.length !== 1 ? 's' : ''} selected
        </p>
      </CardSection>

      {/* ── Company Info ── */}
      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
        title="Company Information"
        subtitle="Office details shown on reports and documents"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Field label="Company Name">
            <TextInput name="officeName" value={form.officeName} onChange={handleChange} placeholder="HPS Pvt Ltd" />
          </Field>
          <Field label="Office Address">
            <TextInput name="officeAddress" value={form.officeAddress} onChange={handleChange} placeholder="123 Main Street, City" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Field label="Phone">
              <TextInput name="officePhone" value={form.officePhone} onChange={handleChange} placeholder="+91 XXXXX XXXXX" />
            </Field>
            <Field label="Email">
              <TextInput name="officeEmail" value={form.officeEmail} onChange={handleChange} placeholder="hr@company.com" type="email" />
            </Field>
          </div>
        </div>
      </CardSection>

      <StatusBanner status={status} />

      <div>
        <SaveButton loading={loading} />
      </div>
    </form>
  )
}

// ─── TAB: Security ────────────────────────────────────────────────────────────
function SecurityTab() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setStatus(null) }

  const strengthScore = () => {
    const p = form.newPassword; if (!p) return 0
    let s = 0
    if (p.length >= 6) s++; if (p.length >= 10) s++
    if (/[A-Z]/.test(p)) s++; if (/[0-9]/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++
    return s
  }
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const strengthColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#1AABDB']
  const score = strengthScore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) { setStatus({ type: 'error', msg: 'All fields are required.' }); return }
    if (form.newPassword.length < 6) { setStatus({ type: 'error', msg: 'New password must be at least 6 characters.' }); return }
    if (form.newPassword !== form.confirmPassword) { setStatus({ type: 'error', msg: 'Passwords do not match.' }); return }
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/admin/password`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) setStatus({ type: 'error', msg: data.error || 'Something went wrong.' })
      else { setStatus({ type: 'success', msg: 'Password updated successfully!' }); setForm({ currentPassword: '', newPassword: '', confirmPassword: '' }) }
    } catch { setStatus({ type: 'error', msg: 'Network error. Please try again.' }) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
        title="Change Password"
        subtitle="Update your admin login password"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <PasswordField label="Current Password" name="currentPassword" value={form.currentPassword} onChange={handleChange} show={showCurrent} onToggle={() => setShowCurrent(!showCurrent)} placeholder="Enter current password" />
          <div>
            <PasswordField label="New Password" name="newPassword" value={form.newPassword} onChange={handleChange} show={showNew} onToggle={() => setShowNew(!showNew)} placeholder="Min. 6 characters" />
            {form.newPassword && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{ height: '3px', flex: 1, borderRadius: '2px', background: i <= score ? strengthColors[score] : 'var(--border)', transition: 'background 0.3s' }} />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: strengthColors[score] || 'var(--text-muted)' }}>{strengthLabel[score]}</p>
              </div>
            )}
          </div>
          <PasswordField
            label="Confirm New Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange}
            show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="Re-enter new password"
            error={form.confirmPassword && form.newPassword !== form.confirmPassword ? 'Passwords do not match' : null}
          />
        </div>
      </CardSection>

      <StatusBanner status={status} />

      <div style={{ marginBottom: '0.5rem' }}>
        <SaveButton loading={loading} label="Update Password" />
      </div>

      <div style={{ padding: '1rem 1.25rem', background: 'rgba(26,171,219,0.06)', border: '1px solid rgba(26,171,219,0.2)', borderRadius: '10px' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: '#1AABDB' }}>Note: </span>
          Password changes only persist until the server restarts. For permanent changes, set{' '}
          <code style={{ fontSize: '0.78rem', background: 'var(--surface2)', padding: '1px 5px', borderRadius: '4px' }}>ADMIN_PASSWORD</code>{' '}
          in your <code style={{ fontSize: '0.78rem', background: 'var(--surface2)', padding: '1px 5px', borderRadius: '4px' }}>.env</code> file.
        </p>
      </div>
    </form>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const TABS = [
  {
    id: 'office', label: 'Office',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'security', label: 'Security',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('office')

  return (
    <div style={{ padding: '2rem', maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>Manage office configuration and account security</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.75rem', background: 'var(--surface2)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {TABS.map(tab => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '0.45rem 1rem', borderRadius: '7px', border: 'none',
                background: active ? 'var(--card-bg)' : 'transparent',
                color: active ? '#1AABDB' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400, fontSize: '0.875rem',
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'office' && <OfficeTab />}
      {activeTab === 'security' && <SecurityTab />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
