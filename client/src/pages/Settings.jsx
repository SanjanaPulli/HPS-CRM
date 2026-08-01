import { useState, useEffect } from 'react'
import BASE_URL from '../config'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOLIDAY_TYPES = ['National', 'Optional', 'Company']
const HOLIDAY_COLORS = {
  National: { bg: 'rgba(239,68,68,0.1)',   color: '#DC2626', border: 'rgba(239,68,68,0.2)'   },
  Optional: { bg: 'rgba(245,158,11,0.1)',  color: '#D97706', border: 'rgba(245,158,11,0.2)'  },
  Company:  { bg: 'rgba(139,92,246,0.1)',  color: '#7C3AED', border: 'rgba(139,92,246,0.2)'  },
}

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
  const defaultOffice = { checkInTime: '09:30', checkOutTime: '17:30', lateAfter: '10:15', halfDayBefore: '13:00', workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat', officeName: 'HPS Pvt Ltd', officeAddress: '', officePhone: '', officeEmail: '' }
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

  if (fetching) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading settings...</div>

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        title="Attendance Timings"
        subtitle="Set check-in, check-out and cutoff times — attendance logic updates automatically"
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <Field label="Check-in Time" hint="Official start of shift">
            <TimeInput name="checkInTime" value={form.checkInTime} onChange={handleChange} />
          </Field>
          <Field label="Check-out Time" hint="Official end of shift — used for OT calculation">
            <TimeInput name="checkOutTime" value={form.checkOutTime} onChange={handleChange} />
          </Field>
          <Field label="Late Arrival After" hint="Marked Late if scanned after this time">
            <TimeInput name="lateAfter" value={form.lateAfter} onChange={handleChange} />
          </Field>
          <Field label="Half-day Before" hint="Early checkout before this = half day">
            <TimeInput name="halfDayBefore" value={form.halfDayBefore} onChange={handleChange} />
          </Field>
        </div>
        {form.checkInTime && form.checkOutTime && (
          <div style={{
            marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: '8px',
            background: 'rgba(26,171,219,0.06)', border: '1px solid rgba(26,171,219,0.15)',
            fontSize: '0.8rem', color: 'var(--text-secondary)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1AABDB' }}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
              <span>Standard shift: <strong style={{ color: '#1AABDB' }}>{form.checkInTime} – {form.checkOutTime}</strong></span>
              {' '}·{' '}
              {(() => {
                const [ih, im] = form.checkInTime.split(':').map(Number)
                const [oh, om] = form.checkOutTime.split(':').map(Number)
                const hrs = ((oh * 60 + om) - (ih * 60 + im)) / 60
                return <strong style={{ color: '#1AABDB' }}>{hrs}h standard</strong>
              })()}
              {' '}· Late after <strong style={{ color: '#EAB308' }}>{form.lateAfter}</strong>
            </div>
          </div>
        )}
      </CardSection>

      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        title="Working Days"
        subtitle="Toggle which days are working days"
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {DAYS.map(day => {
            const active = activeDays.includes(day)
            return (
              <button key={day} type="button" onClick={() => toggleDay(day)} style={{
                padding: '0.45rem 0.9rem', borderRadius: '8px',
                border: `1px solid ${active ? '#1AABDB' : 'var(--border)'}`,
                background: active ? 'rgba(26,171,219,0.12)' : 'var(--input-bg)',
                color: active ? '#1AABDB' : 'var(--text-secondary)',
                fontSize: '0.85rem', fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{day}</button>
            )
          })}
        </div>
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {activeDays.length} working day{activeDays.length !== 1 ? 's' : ''} selected
        </p>
      </CardSection>

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
      <div><SaveButton loading={loading} /></div>
    </form>
  )
}

// ─── TAB: Holidays ────────────────────────────────────────────────────────────
function HolidaysTab() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus]     = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', name: '', type: 'National' })
  const [filterType, setFilterType] = useState('ALL')

  const currentYear = new Date().getFullYear()

  useEffect(() => { fetchHolidays() }, [])

  const fetchHolidays = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${BASE_URL}/api/holidays`)
      const data = await res.json()
      setHolidays(data)
    } catch { setStatus({ type: 'error', msg: 'Failed to load holidays' }) }
    finally { setLoading(false) }
  }

  const resetForm = () => { setForm({ date: '', name: '', type: 'National' }); setEditingId(null); setShowForm(false) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.date || !form.name.trim()) return setStatus({ type: 'error', msg: 'Date and name are required' })
    setSaving(true)
    setStatus(null)
    try {
      const url    = editingId ? `${BASE_URL}/api/holidays/${editingId}` : `${BASE_URL}/api/holidays`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStatus({ type: 'success', msg: editingId ? 'Holiday updated!' : 'Holiday added!' })
      resetForm()
      fetchHolidays()
    } catch { setStatus({ type: 'error', msg: 'Failed to save holiday' }) }
    finally { setSaving(false) }
  }

  const handleEdit = (h) => {
    setForm({
      date: new Date(h.date).toISOString().split('T')[0],
      name: h.name,
      type: h.type,
    })
    setEditingId(h.id)
    setShowForm(true)
    setStatus(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this holiday?')) return
    try {
      await fetch(`${BASE_URL}/api/holidays/${id}`, { method: 'DELETE' })
      setStatus({ type: 'success', msg: 'Holiday deleted' })
      fetchHolidays()
    } catch { setStatus({ type: 'error', msg: 'Failed to delete holiday' }) }
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' })

  const filtered = holidays.filter(h => filterType === 'ALL' || h.type === filterType)

  // Group by month
  const grouped = filtered.reduce((acc, h) => {
    const month = new Date(h.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(h)
    return acc
  }, {})

  const upcomingCount = holidays.filter(h => new Date(h.date) >= new Date()).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header card */}
      <div style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: '12px', padding: '1.25rem 1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Holiday Calendar</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {holidays.length} holiday{holidays.length !== 1 ? 's' : ''} · {upcomingCount} upcoming
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(p => !p); setEditingId(null); setForm({ date: '', name: '', type: 'National' }) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0.55rem 1.1rem', borderRadius: '8px',
            background: showForm && !editingId ? 'rgba(239,68,68,0.1)' : '#1AABDB',
            color: showForm && !editingId ? '#DC2626' : '#fff',
            border: showForm && !editingId ? '1px solid rgba(239,68,68,0.2)' : 'none',
            fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
          {showForm && !editingId ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancel</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add Holiday</>
          )}
        </button>
      </div>

      {/* Type filters / legend */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          style={{
            padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            background: filterType === 'ALL' ? '#1AABDB' : 'var(--surface2)',
            color: filterType === 'ALL' ? '#fff' : 'var(--text-secondary)',
            border: filterType === 'ALL' ? '1px solid transparent' : '1px solid var(--card-border)'
          }}
        >
          All
        </button>
        {HOLIDAY_TYPES.map(t => {
          const c = HOLIDAY_COLORS[t]
          const isSelected = filterType === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              style={{
                padding: '4px 12px', borderRadius: 9999, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                background: isSelected ? c.color : 'var(--surface2)',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                border: isSelected ? `1px solid ${c.color}` : '1px solid var(--card-border)',
                boxShadow: isSelected ? `0 4px 12px ${c.bg}` : 'none'
              }}
            >
              {t}
            </button>
          )
        })}
      </div>

      <StatusBanner status={status} />

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid rgba(26,171,219,0.3)', borderRadius: '12px', padding: '1.5rem' }}>
          <p style={{ margin: '0 0 1rem', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {editingId ? 'Edit Holiday' : 'Add New Holiday'}
          </p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Date">
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  style={{
                    width: '100%', padding: '0.6rem 0.85rem', boxSizing: 'border-box',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1AABDB'}
                  onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                />
              </Field>
              <Field label="Type">
                <div style={{ display: 'flex', gap: 8 }}>
                  {HOLIDAY_TYPES.map(t => {
                    const c = HOLIDAY_COLORS[t]
                    const isSelected = form.type === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, type: t }))}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                          background: isSelected ? c.color : 'var(--input-bg)',
                          color: isSelected ? '#fff' : 'var(--text-secondary)',
                          border: isSelected ? `1px solid ${c.color}` : '1px solid var(--input-border)',
                          boxShadow: isSelected ? `0 4px 12px ${c.bg}` : 'none'
                        }}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </Field>
            </div>
            <Field label="Holiday Name">
              <input type="text" value={form.name} placeholder="e.g. Diwali, Republic Day"
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                style={{
                  width: '100%', padding: '0.6rem 0.85rem', boxSizing: 'border-box',
                  background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#1AABDB'}
                onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8 }}>
              <SaveButton loading={saving} label={editingId ? 'Update Holiday' : 'Add Holiday'} />
              {editingId && (
                <button type="button" onClick={resetForm}
                  style={{
                    padding: '0.65rem 1.2rem', borderRadius: '8px', fontSize: '0.875rem',
                    background: 'var(--surface2)', color: 'var(--text-secondary)',
                    border: '1px solid var(--card-border)', cursor: 'pointer',
                  }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Holiday list */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading holidays...</p>
      ) : holidays.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '3rem', borderRadius: '12px',
          background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            No holidays added yet. Click "Add Holiday" to get started.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([month, items]) => (
          <div key={month} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{
              padding: '0.75rem 1.25rem', background: 'var(--surface2)',
              borderBottom: '1px solid var(--card-border)',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em'
            }}>
              {month.toUpperCase()}
            </div>
            {items.map((h, i) => {
              const c       = HOLIDAY_COLORS[h.type] || HOLIDAY_COLORS.National
              const isPast  = new Date(h.date) < new Date()
              return (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '1rem 1.25rem', gap: 12,
                  borderBottom: i < items.length - 1 ? '1px solid var(--card-border)' : 'none',
                  opacity: isPast ? 0.6 : 1,
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: c.bg, border: `1px solid ${c.border}`,
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: c.color, lineHeight: 1 }}>
                        {new Date(h.date).getDate()}
                      </span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: c.color, lineHeight: 1.2 }}>
                        {new Date(h.date).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{h.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 9999,
                          background: c.bg, color: c.color, border: `1px solid ${c.border}`
                        }}>{h.type}</span>
                        {isPast && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Past</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(h)}
                      style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
                        border: '1px solid rgba(26,171,219,0.2)', cursor: 'pointer',
                      }}>Edit</button>
                    <button onClick={() => handleDelete(h.id)}
                      style={{
                        padding: '5px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600,
                        background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                        border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer',
                      }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
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
  const strengthLabel  = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
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
          <PasswordField label="Confirm New Password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} placeholder="Re-enter new password"
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

// ─── TAB: Admins Management ───────────────────────────────────────────────────
function AdminsTab() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [status, setStatus] = useState(null)
  
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'admin' })
  const [showPass, setShowPass] = useState(false)

  const currentUsername = (() => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) return null
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.username
    } catch { return null }
  })()

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    setFetching(true)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${BASE_URL}/api/admin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (res.ok) setAdmins(data)
    } catch (err) {
      console.error(err)
    } finally {
      setFetching(false)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setStatus(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.username.trim() || !form.password) {
      return setStatus({ type: 'error', msg: 'All fields are required.' })
    }
    setLoading(true)
    setStatus(null)
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${BASE_URL}/api/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || data.message || 'Failed to create admin.' })
      } else {
        setStatus({ type: 'success', msg: 'Admin account created successfully!' })
        setForm({ name: '', username: '', password: '', role: 'admin' })
        fetchAdmins()
      }
    } catch {
      setStatus({ type: 'error', msg: 'Failed to connect to server.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name, username) => {
    if (username === currentUsername) return
    if (username === 'satheesh') return
    if (!window.confirm(`Are you sure you want to delete ${name}'s admin account?`)) return
    
    try {
      const token = localStorage.getItem('adminToken')
      const res = await fetch(`${BASE_URL}/api/admin/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (res.ok) {
        setStatus({ type: 'success', msg: 'Admin account deleted successfully.' })
        fetchAdmins()
      } else {
        setStatus({ type: 'error', msg: data.error || 'Failed to delete account.' })
      }
    } catch {
      setStatus({ type: 'error', msg: 'Failed to delete account.' })
    }
  }

  if (fetching) return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading accounts...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Create New Admin Form */}
      <form onSubmit={handleSubmit}>
        <CardSection
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>}
          title="Create Admin Account"
          subtitle="Register a new administrator or manager to access the admin portal"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Field label="Full Name">
              <TextInput name="name" value={form.name} onChange={handleChange} placeholder="" />
            </Field>
            
            <Field label="Username">
              <TextInput name="username" value={form.username} onChange={handleChange} placeholder="" />
            </Field>
            <PasswordField 
              label="Password" 
              name="password" 
              value={form.password} 
              onChange={handleChange} 
              show={showPass} 
              onToggle={() => setShowPass(!showPass)} 
              placeholder="" 
            />

            <Field label="Role" hint="Managers have limited actions compared to primary administrators">
              <div style={{ position: 'relative' }}>
                <select 
                  name="role" 
                  value={form.role} 
                  onChange={handleChange} 
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem',
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)',
                    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.9rem',
                    outline: 'none', appearance: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)', display: 'flex' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              </div>
            </Field>
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            <SaveButton loading={loading} label="Create Account" />
          </div>
        </CardSection>
      </form>

      {/* Existing Admins List */}
      <CardSection
        icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        title="Admin Accounts"
        subtitle="Manage active administrator and manager credentials"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {admins.map(admin => {
            const isSelf = admin.username === currentUsername
            const isSuper = admin.username === 'satheesh'
            return (
              <div key={admin.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: '10px', background: 'var(--surface2)',
                border: '1px solid var(--border)'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {admin.name} {isSelf && <span style={{ fontSize: '0.75rem', color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>You</span>}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Username: <span style={{ fontFamily: 'monospace' }}>{admin.username}</span> · Role: <span style={{ textTransform: 'capitalize', color: admin.role === 'admin' ? '#1AABDB' : '#eab308', fontWeight: 600 }}>{admin.role}</span>
                  </p>
                </div>
                {!isSelf && !isSuper && (
                  <button 
                    onClick={() => handleDelete(admin.id, admin.name, admin.username)}
                    style={{
                      padding: '6px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#EF4444', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                  >
                    Delete
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </CardSection>

      <StatusBanner status={status} />
    </div>
  )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
const TABS = [
  {
    id: 'office', label: 'Office',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    id: 'holidays', label: 'Holidays',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    id: 'security', label: 'Security',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('office')
  const userRole = localStorage.getItem('role')

  const tabs = [...TABS]
  if (userRole === 'admin') {
    tabs.push({
      id: 'admins', label: 'Admins',
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    })
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>Manage office configuration, holidays and account security</p>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.75rem', background: 'var(--surface2)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {tabs.map(tab => {
          const active = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0.45rem 1rem', borderRadius: '7px', border: 'none',
              background: active ? 'var(--card-bg)' : 'transparent',
              color: active ? '#1AABDB' : 'var(--text-secondary)',
              fontWeight: active ? 600 : 400, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all 0.15s',
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              {tab.icon}{tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'office'    && <OfficeTab />}
      {activeTab === 'holidays'  && <HolidaysTab />}
      {activeTab === 'security'  && <SecurityTab />}
      {activeTab === 'admins'    && <AdminsTab />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}