import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import NotificationBell from '../components/NotificationBell'

function ThemeToggle({ collapsed }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <button onClick={toggleTheme}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
      style={{ color: 'rgba(255,255,255,0.45)', justifyContent: collapsed ? 'center' : 'flex-start' }}
      title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,171,219,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
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
  const [collapsed, setCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [isMobile, setIsMobile]   = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setCollapsed(mobile)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const sidebarW = collapsed ? '72px' : '256px'
  const employee = JSON.parse(localStorage.getItem('employeeAuth') || 'null')

  useEffect(() => { if (!employee) navigate('/employee/login') }, [])

  const handleLogout = () => {
    localStorage.removeItem('employeeAuth')
    navigate('/')
  }

  const canScan = employee?.isAttendanceLeader === true

  // Items shown in bottom nav bar
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

  // Desktop-only items that go in the More sheet on mobile
  const moreItems = [
    {
      name: 'Tasks', path: '/employee/tasks',
      icon: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
        </svg>
      )
    },
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

  // All items for desktop sidebar
  const allNavItems = [
    ...navItems,
    ...moreItems,
  ]

  if (!employee) return null

  return (
    <div className="flex min-h-screen transition-colors duration-300"
      style={{ background: 'var(--bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Desktop Sidebar ── */}
      <div className={`${isMobile ? 'hidden' : 'flex'} bg-[#1C2333] flex-col shrink-0 fixed top-0 left-0 h-full z-30 transition-all duration-300 overflow-hidden`}
        style={{ width: sidebarW }}>

        <div className="px-4 py-5 border-b border-white/10 flex items-center justify-between">
          {!collapsed && (
            <button onClick={() => navigate('/employee/dashboard')} className="min-w-0 text-left">
              <img src="/hps_new_logo_white.png" alt="HPS" className="h-16 object-contain cursor-pointer" />
              <p className="text-xs text-white/40 mt-1">Employee Portal</p>
            </button>
          )}
          {collapsed && (
            <button onClick={() => navigate('/employee/dashboard')}
              className="w-9 h-9 rounded-lg bg-[#1AABDB] flex items-center justify-center text-white font-bold text-sm mx-auto mb-2">
              H
            </button>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
            style={{ color: 'rgba(255,255,255,0.45)', marginLeft: collapsed ? 'auto' : '0', marginRight: collapsed ? 'auto' : '0' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,171,219,0.15)'; e.currentTarget.style.color = '#1AABDB' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}>
            {collapsed
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            }
          </button>
        </div>

        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allNavItems.map(item => {
            const active = location.pathname === item.path
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                title={collapsed ? item.name : ''}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-[#1AABDB] text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}>
                {item.icon(active)}
                {!collapsed && item.name}
              </button>
            )
          })}
        </div>

        <div className="px-3 pb-2 border-t border-white/10 pt-2">
          <ThemeToggle collapsed={collapsed} />
        </div>

        <div className="p-3 border-t border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-3 mb-2">
              <div className="w-9 h-9 rounded-xl bg-[#1AABDB] flex items-center justify-center text-white font-bold text-sm shrink-0">
                {employee.name?.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-xs font-semibold truncate">{employee.name}</p>
                <p className="text-slate-400 text-xs truncate">{employee.empId}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            className="w-full bg-white/10 hover:bg-white/20 text-slate-300 py-2.5 rounded-xl text-xs font-medium transition">
            {collapsed ? '→' : 'Logout'}
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col min-h-screen transition-colors duration-300"
        style={{ marginLeft: isMobile ? '0' : sidebarW, flex: 1 }}>

        {/* Topbar */}
        <div className={`sticky top-0 z-20 flex items-center justify-between shrink-0 ${isMobile ? 'h-14 px-4' : 'h-16 px-8'}`}
          style={{ background: 'var(--topbar-bg)', borderBottom: '1px solid var(--topbar-border)' }}>

          {isMobile ? (
            <>
              <button onClick={() => navigate('/employee/dashboard')} className="flex items-center gap-2">
                <img src="/hps_new_logo.png" alt="HPS" className="h-8 object-contain"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                <div className="w-8 h-8 rounded-lg bg-[#1AABDB] items-center justify-center text-white font-bold text-sm hidden">H</div>
              </button>
              <div className="flex items-center gap-3">
                <NotificationBell empId={employee.empId} />
                <button onClick={() => setShowProfileMenu(true)}
                  className="w-9 h-9 rounded-full bg-[#1AABDB] text-white font-bold flex items-center justify-center text-sm">
                  {employee.name?.charAt(0)}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>HPS Employee Portal</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Welcome back, {employee.name?.split(' ')[0]}</p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell empId={employee.empId} />
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{employee.name}</p>
                  <p className="text-xs text-[#1AABDB]">{employee.position || 'HPS Team'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#1AABDB] flex items-center justify-center text-white font-bold text-sm">
                  {employee.name?.charAt(0)}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Page content */}
        <main className={`flex-1 p-4 md:p-8 transition-colors duration-300 ${isMobile ? 'pb-24' : 'pb-8'}`}
          style={{ background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
          style={{ background: 'var(--topbar-bg)', borderTop: '1px solid var(--topbar-border)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {navItems.map(item => {
            const active = location.pathname === item.path
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative transition-all"
                style={{ color: active ? '#1AABDB' : 'var(--text-muted)' }}>
                {item.icon(active)}
                <span className="text-[10px] font-semibold leading-none">{item.mobileLabel}</span>
                {active && <span className="absolute bottom-0 w-8 h-0.5 rounded-full bg-[#1AABDB]" style={{ marginBottom: 'env(safe-area-inset-bottom)' }} />}
              </button>
            )
          })}

          {/* More button */}
          <button onClick={() => setShowMore(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
            style={{ color: 'var(--text-muted)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
            </svg>
            <span className="text-[10px] font-semibold leading-none">More</span>
          </button>
        </nav>
      )}

      {/* ── More sheet ── */}
      {showMore && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6"
            style={{ background: 'var(--card-bg)' }}
            onClick={e => e.stopPropagation()}>

            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-5" />

            {moreItems.map(item => {
              const active = location.pathname === item.path
              return (
                <button key={item.path}
                  onClick={() => { navigate(item.path); setShowMore(false) }}
                  className="w-full flex items-center gap-3 py-3.5 border-b text-sm font-medium"
                  style={{ color: active ? '#1AABDB' : 'var(--text-primary)', borderColor: 'var(--card-border)' }}>
                  <span style={{ color: active ? '#1AABDB' : 'var(--text-muted)' }}>{item.icon(active)}</span>
                  {item.name}
                  {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#1AABDB]" />}
                </button>
              )
            })}

            <button onClick={() => { navigate('/employee/profile'); setShowMore(false) }}
              className="w-full flex items-center gap-3 py-3.5 border-b text-sm font-medium"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--card-border)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              My Profile
            </button>

            <button onClick={() => { toggleTheme(); setShowMore(false) }}
              className="w-full flex items-center gap-3 py-3.5 border-b text-sm font-medium"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--card-border)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                {theme === 'dark'
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                }
              </span>
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 py-3.5 text-sm font-medium text-red-500 mt-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Mobile profile sheet */}
      {showProfileMenu && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setShowProfileMenu(false)}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6"
            style={{ background: 'var(--card-bg)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#1AABDB] flex items-center justify-center text-white font-bold text-xl">
                {employee.name?.charAt(0)}
              </div>
              <h3 className="mt-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{employee.name}</h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{employee.empId}</p>
            </div>
            <button onClick={() => { setShowProfileMenu(false); navigate('/employee/profile') }}
              className="w-full text-left py-4 border-b text-sm"
              style={{ color: 'var(--text-primary)', borderColor: 'var(--card-border)' }}>
              👤 My Profile
            </button>
            <button onClick={handleLogout} className="w-full text-left py-4 text-sm text-red-500">
              🚪 Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmployeeLayout