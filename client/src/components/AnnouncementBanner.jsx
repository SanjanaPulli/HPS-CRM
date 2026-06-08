import { useState, useEffect } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

export default function AnnouncementBanner({ empId }) {
  const [announcements, setAnnouncements] = useState([])
  const [dismissed, setDismissed] = useState(() => {
    try {
      const saved = localStorage.getItem('dismissed_announcements')
      if (!saved) return {}
      const parsed = JSON.parse(saved)
      // Clear old dismissals — only keep today's
      const today = new Date().toDateString()
      if (parsed.date !== today) return {}
      return parsed
    } catch { return {} }
  })
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    fetchAnnouncements()
  }, [empId])

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/announcements/employee/${empId}`)
      setAnnouncements(Array.isArray(res.data) ? res.data : [])
    } catch {
      setAnnouncements([])
    }
  }

  const dismiss = (id) => {
    const today = new Date().toDateString()
    const updated = {
      date: today,
      ids: [...(dismissed.ids || []), id]
    }
    setDismissed(updated)
    localStorage.setItem('dismissed_announcements', JSON.stringify(updated))
    setCurrent(0)
  }

  const visible = announcements.filter(a => !(dismissed.ids || []).includes(a.id))

  if (visible.length === 0) return null

  const ann = visible[Math.min(current, visible.length - 1)]
  const isUrgent = ann.priority === 'urgent'
  const isTargeted = ann.type === 'targeted'

  return (
    <div className="mb-6 rounded-2xl overflow-hidden"
      style={{
        background: isUrgent
          ? 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))'
          : 'linear-gradient(135deg, rgba(26,171,219,0.1), rgba(26,171,219,0.05))',
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.25)' : 'rgba(26,171,219,0.25)'}`,
      }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(26,171,219,0.15)' }}>
        <div className="flex items-center gap-2">
          {isUrgent && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          )}
          <span className="text-xs font-bold uppercase tracking-widest"
            style={{ color: isUrgent ? '#EF4444' : '#1AABDB' }}>
            {isUrgent ? '🚨 Urgent' : '📢 Announcement'}
          </span>
          {isTargeted && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}>
              For you
            </span>
          )}
          {visible.length > 1 && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {current + 1} of {visible.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {visible.length > 1 && (
            <div className="flex gap-1">
              <button onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'var(--surface2)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </button>
              <button onClick={() => setCurrent(c => Math.min(visible.length - 1, c + 1))}
                disabled={current === visible.length - 1}
                className="w-6 h-6 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: 'var(--surface2)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>
          )}
          <button onClick={() => dismiss(ann.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{ann.title}</p>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ann.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
          {ann.expiresAt && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Expires {new Date(ann.expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
