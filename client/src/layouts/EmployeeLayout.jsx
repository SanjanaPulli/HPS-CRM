import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from '../components/NotificationBell'

function ThemeToggle({ collapsed }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 16px', borderRadius: '12px', fontSize: '0.875rem',
        fontWeight: 500, transition: 'all 0.2s', border: 'none', cursor: 'pointer',
        color: 'rgba(255,255,255,0.45)', background: 'transparent',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,171,219,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
    >
      {theme === 'dark' ? (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          {!collapsed && 'Light Mode'}
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          {!collapsed && 'Dark Mode'}
        </>
      )}
    </button>
  )
}

function EmployeeLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
  const [isMobile, setIsMobile]   = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    let prevWidth = window.innerWidth
    const handleResize = () => {
      const currentWidth = window.innerWidth
      const mobile = currentWidth < 768
      setIsMobile(mobile)
      
      if (currentWidth < 1024 && prevWidth >= 1024) {
        setCollapsed(true)
      } else if (currentWidth >= 1024 && prevWidth < 1024) {
        setCollapsed(false)
      }
      prevWidth = currentWidth
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarW = collapsed ? '72px' : '256px'
  const employee = JSON.parse(localStorage.getItem('employeeAuth') || 'null')

  useEffect(() => { if (!employee) navigate('/employee/login') }, [])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const canScan = employee?.isAttendanceLeader === true

  const navItems = [
    {
      name: 'Home', path: '/employee/dashboard', mobileLabel: 'Home',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      )
    },
    {
      name: 'Leave', path: '/employee/leave', mobileLabel: 'Leave',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          {active && <line x1="8" y1="13" x2="16" y2="13"/>}
          {active && <line x1="8" y1="17" x2="16" y2="17"/>}
        </svg>
      )
    },
    {
      name: 'Attendance', path: '/employee/attendance', mobileLabel: 'Attend',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          {active && <polyline points="9 16 11 18 15 14"/>}
        </svg>
      )
    },
    {
      name: 'Profile', path: '/employee/profile', mobileLabel: 'Profile',
      icon: (active) => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4" fill={active ? 'currentColor' : 'none'} stroke="currentColor"/>
        </svg>
      )
    },
  ]

  const moreItems = [
    ...(canScan ? [{
      name: 'Scan', path: '/employee/scan',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M20 14v2"/>
        </svg>
      )
    }] : []),
  ]

  const allNavItems = [...navItems, ...moreItems]

  if (!employee) return null

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', transition: 'background 0.3s',
      background: 'var(--bg)'
    }}>

      {/* ── Desktop Sidebar ── */}
      {!isMobile && (
        <>
          <div style={{
            width: sidebarW, background: '#1C2333', display: 'flex', flexDirection: 'column',
            flexShrink: 0, position: 'fixed', top: 0, left: 0, height: '100%',
            zIndex: 30, transition: 'width 0.3s', overflow: 'hidden'
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '72px', position: 'relative'
            }}>
              {!collapsed ? (
                <button onClick={() => navigate('/employee/dashboard')}
                  style={{ minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginRight: 'auto' }}>
                  <img src="/hps_new_logo_white.png" alt="HPS" style={{ height: '48px', objectFit: 'contain', cursor: 'pointer' }} />
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '4px', margin: '4px 0 0' }}>Employee Portal</p>
                </button>
              ) : (
                <button onClick={() => navigate('/employee/dashboard')}
                  style={{
                    width: '36px', height: '36px', borderRadius: '10px', background: '#1AABDB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                    margin: '0 auto', border: 'none', cursor: 'pointer'
                  }}>
                  H
                </button>
              )}
            </div>

            {/* Nav items */}
            <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
              {allNavItems.map(item => {
                const active = location.pathname === item.path
                return (
                  <button key={item.path} onClick={() => navigate(item.path)}
                    title={collapsed ? item.name : ''}
                    style={{
                      width: collapsed ? '44px' : '100%',
                      height: collapsed ? '44px' : 'auto',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: collapsed ? '0' : '10px 12px',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      border: 'none',
                      cursor: 'pointer',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: active ? '#1AABDB' : 'transparent',
                      color: active ? '#fff' : 'rgba(148,163,184,1)',
                      margin: collapsed ? '0 auto' : '0',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,1)' } }}
                  >
                    {item.icon(active)}
                    {!collapsed && item.name}
                  </button>
                )
              })}
            </div>

            {/* Theme toggle */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center' }}>
              <ThemeToggle collapsed={collapsed} />
            </div>

            {/* Profile + Logout */}
            <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {!collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '12px', background: '#1AABDB',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0
                  }}>
                    {employee.name?.charAt(0)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <p style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.name}</p>
                    <p style={{ color: 'rgba(148,163,184,1)', fontSize: '0.75rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.empId}</p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                title={collapsed ? 'Logout' : ''}
                style={{
                  width: collapsed ? '44px' : '100%',
                  height: collapsed ? '44px' : 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: collapsed ? '0 auto' : '0',
                  background: 'rgba(255,255,255,0.1)', color: 'rgba(203,213,225,1)',
                  padding: collapsed ? '0' : '10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                {collapsed ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                ) : 'Logout'}
              </button>
            </div>
          </div>

          {/* Collapse toggle button outside the sidebar to prevent clipping */}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              position: 'fixed',
              left: collapsed ? '60px' : '244px', // 72px - 12px = 60px, 256px - 12px = 244px
              top: '24px',
              zIndex: 40,
              width: '24px', height: '24px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              flexShrink: 0, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)', background: '#1C2333',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1AABDB'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1C2333'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.transform = 'scale(1)' }}
          >
            {collapsed
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            }
          </button>
        </>
      )}

      {/* ── Main content ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
        transition: 'all 0.3s', marginLeft: isMobile ? '0' : sidebarW, flex: 1
      }}>

        {/* Topbar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          height: isMobile ? '56px' : '64px',
          padding: isMobile ? '0 16px' : '0 32px',
          background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)'
        }}>
          {isMobile ? (
            <>
              <button onClick={() => navigate('/employee/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <img src="/hps_new_logo.png" alt="HPS" style={{ height: '32px', objectFit: 'contain' }}
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px', background: '#1AABDB',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.875rem', display: 'none'
                }}>H</div>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <NotificationBell empId={employee.empId} />
                <button
                  onClick={() => setShowProfileMenu(true)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: '#1AABDB',
                    color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '0.875rem', border: 'none', cursor: 'pointer'
                  }}>
                  {employee.name?.charAt(0)}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>HPS Employee Portal</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Welcome back, {employee.name?.split(' ')[0]}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <NotificationBell empId={employee.empId} />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{employee.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#1AABDB', margin: 0 }}>{employee.position || 'HPS Team'}</p>
                </div>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', background: '#1AABDB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.875rem'
                }}>
                  {employee.name?.charAt(0)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Page content */}
        <main style={{
          flex: 1, padding: isMobile ? '16px' : '32px',
          paddingBottom: isMobile ? '96px' : '32px',
          transition: 'background 0.3s', background: 'var(--bg)'
        }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      {isMobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          display: 'flex', alignItems: 'stretch',
          background: 'var(--topbar-bg)', borderTop: '1px solid var(--topbar-border)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '4px', padding: '8px 0',
                  position: 'relative', transition: 'all 0.2s', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: active ? '#1AABDB' : 'var(--text-muted)'
                }}>
                {item.icon(active)}
                <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>{item.mobileLabel}</span>
                {active && (
                  <span style={{
                    position: 'absolute', bottom: 'env(safe-area-inset-bottom)',
                    width: '32px', height: '2px', borderRadius: '9999px', background: '#1AABDB'
                  }} />
                )}
              </button>
            )
          })}

          {/* More button */}
          <button
            onClick={() => setShowMore(true)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '4px', padding: '8px 0',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)'
            }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>More</span>
          </button>
        </nav>
      )}

      {/* ── More sheet ── */}
      {showMore && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowMore(false)}>
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              borderRadius: '24px 24px 0 0', padding: '24px',
              background: 'var(--card-bg)'
            }}
            onClick={e => e.stopPropagation()}>

            <div style={{ width: '40px', height: '4px', borderRadius: '9999px', background: '#CBD5E1', margin: '0 auto 20px' }} />

            {moreItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button key={item.path}
                  onClick={() => { navigate(item.path); setShowMore(false) }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 0', borderBottom: '1px solid var(--card-border)',
                    fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none',
                    borderBottom: '1px solid var(--card-border)',
                    cursor: 'pointer', color: active ? '#1AABDB' : 'var(--text-primary)'
                  }}>
                  <span style={{ color: active ? '#1AABDB' : 'var(--text-muted)' }}>{item.icon(active)}</span>
                  {item.name}
                  {active && <span style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#1AABDB' }} />}
                </button>
              )
            })}



            <button
              onClick={() => { toggleTheme(); setShowMore(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 0', borderBottom: '1px solid var(--card-border)',
                fontSize: '0.875rem', fontWeight: 500, background: 'none', border: 'none',
                borderBottom: '1px solid var(--card-border)',
                cursor: 'pointer', color: 'var(--text-primary)'
              }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {theme === 'dark'
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </span>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button
              onClick={handleLogout}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                padding: '14px 0', fontSize: '0.875rem', fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#EF4444', marginTop: '4px'
              }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile profile sheet ── */}
      {showProfileMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowProfileMenu(false)}>
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              borderRadius: '24px 24px 0 0', padding: '24px',
              background: 'var(--card-bg)'
            }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%', background: '#1AABDB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '1.25rem'
              }}>
                {employee.name?.charAt(0)}
              </div>
              <h3 style={{ marginTop: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: '12px 0 0' }}>{employee.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{employee.empId}</p>
            </div>
            <button
              onClick={() => { setShowProfileMenu(false); navigate('/employee/profile') }}
              style={{
                width: '100%', textAlign: 'left', padding: '16px 0',
                borderBottom: '1px solid var(--card-border)', fontSize: '0.875rem',
                background: 'none', border: 'none', borderBottom: '1px solid var(--card-border)',
                cursor: 'pointer', color: 'var(--text-primary)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              My Profile
            </button>
            <button
              onClick={handleLogout}
              style={{
                width: '100%', textAlign: 'left', padding: '16px 0',
                fontSize: '0.875rem', background: 'none', border: 'none',
                cursor: 'pointer', color: '#EF4444',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeLayout
