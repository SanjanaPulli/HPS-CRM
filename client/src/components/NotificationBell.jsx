import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

const typeConfig = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.1)', icon: '✓' },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: '⚠' },
  error:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  icon: '✕' },
  info:    { color: '#1AABDB', bg: 'rgba(26,171,219,0.1)', icon: 'i' },
}

export default function NotificationBell({ empId }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [empId])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = async () => {
    try {
      const url = empId
        ? `${BASE_URL}/api/notifications/employee/${empId}`
        : `${BASE_URL}/api/notifications/admin`

      const res = await axios.get(url)

      if (empId) {
        setNotifications(res.data.notifications || [])
      } else {
        setNotifications(res.data || [])
      }
    } catch {
      setNotifications([])
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        onClick={async () => {
          const next = !open
          setOpen(next)

          if (next) {
            const unread = notifications.filter(n => !n.isRead)

            await Promise.all(
              unread.map(n =>
                axios.patch(
                  `${BASE_URL}/api/notifications/${n.id}/read`
                )
              )
            )

            fetchNotifications()
          }
        }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: open ? 'rgba(26,171,219,0.15)' : 'var(--surface2)',
          border: '1px solid var(--card-border)',
          color: 'var(--text-secondary)'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.15)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'var(--surface2)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-white flex items-center justify-center font-bold"
            style={{ background: '#EF4444', fontSize: '9px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 rounded-2xl shadow-xl z-50 overflow-hidden"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
          }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--card-border)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</p>
            {unreadCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: '450px'
            }}
          >
            {loading ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--surface2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No new notifications</p>
              </div>
            ) : (
              notifications.map((notif, i) => {
                const cfg = typeConfig[notif.type] || typeConfig.info
                return (
                  <div key={i}
                    className="flex items-start gap-3 px-4 py-3 border-b transition-colors"
                    style={{ borderColor: 'var(--card-border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.icon}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold leading-snug"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {notif.message}
                      </p>

                      <p
                        className="text-[11px] mt-1"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <button
              onClick={() => { fetchNotifications() }}
              className="w-full text-xs font-medium py-1.5 rounded-xl transition-colors"
              style={{ color: '#1AABDB' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
