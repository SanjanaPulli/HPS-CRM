import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import BASE_URL from '../config'

const typeConfig = {
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
  )},
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
  )},
  error: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
  )},
  info: { color: '#1AABDB', bg: 'rgba(26,171,219,0.12)', border: 'rgba(26,171,219,0.25)', icon: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  )},
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

export default function NotificationBell({ empId }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const btnRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [empId])

  useEffect(() => {
    const handler = (e) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false)
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
      const raw = empId ? (res.data.notifications || []) : (res.data || [])
      // Sort newest first
      setNotifications([...raw].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    } catch {
      setNotifications([])
    }
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead)
    await Promise.all(unread.map(n => axios.patch(`${BASE_URL}/api/notifications/${n.id}/read`)))
    fetchNotifications()
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  // Position dropdown relative to bell button
  const getDropdownStyle = () => {
    if (!btnRef.current) return {}
    const rect = btnRef.current.getBoundingClientRect()
    const isMobile = window.innerWidth < 768
    if (isMobile) {
      return {
        position: 'fixed',
        top: rect.bottom + 8,
        left: 8,
        right: 8,
        width: 'auto',
      }
    }
    return {
      position: 'fixed',
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      width: 380,
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={async () => {
          const next = !open
          setOpen(next)
          if (next) await markAllRead()
        }}
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: open ? 'rgba(26,171,219,0.15)' : 'var(--surface2)',
          border: '1px solid var(--card-border)',
          color: open ? '#1AABDB' : 'var(--text-secondary)',
          cursor: 'pointer',
          transition: 'all 0.18s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,171,219,0.15)'; e.currentTarget.style.color = '#1AABDB' }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            minWidth: 16, height: 16, borderRadius: 999,
            background: '#EF4444', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px',
            border: '2px solid var(--bg)',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropRef}
          style={{
            ...getDropdownStyle(),
            zIndex: 9999,
            borderRadius: 16,
            overflow: 'hidden',
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--card-border)',
            background: 'var(--surface2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {unreadCount > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.2)'
                }}>
                  {unreadCount} new
                </span>
              )}
              <button
                onClick={fetchNotifications}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 6 }}
                title="Refresh"
                onMouseEnter={e => e.currentTarget.style.color = '#1AABDB'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', margin: '0 auto 12px',
                  background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', margin: '0 0 4px' }}>All caught up!</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif, i) => {
                const cfg = typeConfig[notif.type] || typeConfig.info
                const isUnread = !notif.isRead
                return (
                  <div key={notif.id || i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 16px',
                    borderBottom: i < notifications.length - 1 ? '1px solid var(--card-border)' : 'none',
                    background: isUnread ? `${cfg.bg}` : 'transparent',
                    transition: 'background 0.15s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = isUnread ? cfg.bg : 'transparent'}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: cfg.bg, color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                      marginTop: 1,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: 12, fontWeight: isUnread ? 600 : 500,
                        color: 'var(--text-primary)', margin: '0 0 3px',
                        lineHeight: 1.4,
                      }}>
                        {notif.message}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: cfg.color, flexShrink: 0, marginTop: 6
                      }} />
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--card-border)',
              background: 'var(--surface2)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''} · newest first
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}