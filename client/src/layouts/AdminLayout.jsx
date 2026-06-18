import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { useTheme } from "../context/ThemeContext"
import NotificationBell from "../components/NotificationBell"

const navItems = [
  {
    to: "/admin/dashboard", label: "Dashboard", mobileLabel: "Home",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    to: "/admin/employees", label: "Employees", mobileLabel: "Staff",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    to: "/admin/attendance", label: "Attendance", mobileLabel: "Attend",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
  },
  {
    to: "/admin/leave", label: "Leave Requests", mobileLabel: "Leave",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>
  },
  {
    to: "/admin/announcements", label: "Announcements", mobileLabel: "Announce",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
  },
  {
    to: "/admin/activity", label: "Activity Log", mobileLabel: null,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  },
  {
    to: "/admin/reports", label: "Reports", mobileLabel: null,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  },
  {
    to: "/admin/settings", label: "Settings", mobileLabel: null,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  },
]

const mobileNavItems = navItems.filter(i => i.mobileLabel !== null)
const moreSheetItems = navItems.filter(i => i.mobileLabel === null)

/* ── Sidebar nav item — pure CSS approach, no JS hover fighting active state ── */
function SideNavItem({ item, collapsed }) {
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : ""}
      className={({ isActive }) =>
        `nav-item${isActive ? " nav-item--active" : ""}${collapsed ? " nav-item--collapsed" : ""}`
      }
    >
      <span className="nav-item__icon">{item.icon}</span>
      {!collapsed && <span className="nav-item__label">{item.label}</span>}
    </NavLink>
  )
}

function SideButton({ icon, label, collapsed, onClick, title, style: extraStyle = {}, className: extraClass = "" }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? title || label : ""}
      className={`nav-item nav-item--btn${collapsed ? " nav-item--collapsed" : ""} ${extraClass}`}
      style={extraStyle}
    >
      <span className="nav-item__icon">{icon}</span>
      {!collapsed && <span className="nav-item__label">{label}</span>}
    </button>
  )
}

function ThemeToggle({ collapsed }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const sunIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
  const moonIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
  return (
    <SideButton
      icon={isDark ? sunIcon : moonIcon}
      label={isDark ? "Light Mode" : "Dark Mode"}
      collapsed={collapsed}
      onClick={toggleTheme}
    />
  )
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  )
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("adminName")
    navigate("/")
  }

  const sidebarW = collapsed ? "72px" : "240px"

  return (
    <>
      {/* ── Scoped sidebar styles — the ONLY reliable way to avoid className/style conflicts ── */}
      <style>{`
        /* Every nav item is a flex row — no exceptions */
        .nav-item {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          border: none;
          background: transparent;
          cursor: pointer;
          color: rgba(255,255,255,0.45);
          transition: background 0.18s, color 0.18s;
          white-space: nowrap;
          overflow: hidden;
          text-align: left;
          box-sizing: border-box;
        }
        .nav-item--collapsed {
          justify-content: center !important;
          padding: 10px 0;
        }
        .nav-item:hover {
          background: rgba(26,171,219,0.12);
          color: rgba(255,255,255,0.85);
        }
        .nav-item--active,
        .nav-item--active:hover {
          background: #1AABDB !important;
          color: #fff !important;
        }
        .nav-item__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 18px;
          height: 18px;
        }
        .nav-item__label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Scan terminal button */
        .nav-item--scan {
          background: rgba(26,171,219,0.1) !important;
          color: #1AABDB !important;
          border: 1px solid rgba(26,171,219,0.2);
        }
        .nav-item--scan:hover {
          background: rgba(26,171,219,0.2) !important;
          color: #1AABDB !important;
        }

        /* Logout */
        .nav-item--logout {
          color: rgba(255,255,255,0.3) !important;
        }
        .nav-item--logout:hover {
          background: rgba(255,80,80,0.1) !important;
          color: #FF6B6B !important;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          minHeight: "100svh",
          background: "var(--bg)",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          transition: "background 0.3s",
        }}
      >
        {/* ── Desktop Sidebar ── */}
        {!isMobile && (
          <aside
            style={{
              width: sidebarW,
              background: "#1C2333",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              position: "fixed",
              top: 0,
              left: 0,
              height: "100%",
              zIndex: 30,
              overflow: "hidden",
              transition: "width 0.3s",
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                padding: "0 16px",
                minHeight: "72px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                gap: 8,
              }}
            >
              {!collapsed && (
                <button
                  onClick={() => navigate("/admin/dashboard")}
                  style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", background: "none", border: "none", cursor: "pointer", overflow: "hidden" }}
                >
                  <img src="/hps_new_logo_white.png" alt="HPS" style={{ height: 32, objectFit: "contain", marginBottom: 4 }} />
                  <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", whiteSpace: "nowrap" }}>
                    Admin Portal
                  </span>
                </button>
              )}
              {collapsed && (
                <button
                  onClick={() => navigate("/admin/dashboard")}
                  style={{ width: 32, height: 32, borderRadius: 8, background: "#1AABDB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer" }}
                >
                  H
                </button>
              )}
              <button
                onClick={() => setCollapsed(c => !c)}
                style={{
                  width: 32, height: 32, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
                  background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)",
                  flexShrink: 0, transition: "background 0.18s, color 0.18s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(26,171,219,0.15)"; e.currentTarget.style.color = "#1AABDB" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "rgba(255,255,255,0.45)" }}
              >
                {collapsed
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                }
              </button>
            </div>

            {/* Nav links */}
            <nav style={{ flex: 1, padding: "16px 8px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
              {navItems.map(item => (
                <SideNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </nav>

            {/* Bottom actions */}
            <div style={{ padding: "0 8px 8px" }}>
              <SideButton
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M20 14v2"/>
                  </svg>
                }
                label="Scan Terminal"
                collapsed={collapsed}
                onClick={() => navigate("/scan?from=admin")}
                className="nav-item--scan"
              />
            </div>
            <div style={{ padding: "0 8px 4px" }}>
              <ThemeToggle collapsed={collapsed} />
            </div>
            <div style={{ padding: "0 8px 20px" }}>
              <SideButton
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                }
                label="Logout"
                collapsed={collapsed}
                onClick={handleLogout}
                className="nav-item--logout"
              />
            </div>
          </aside>
        )}

        {/* ── Main content ── */}
        <div
          style={{
            marginLeft: isMobile ? 0 : sidebarW,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: "100svh",
            transition: "margin-left 0.3s",
          }}
        >
          {/* Topbar */}
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              background: "var(--topbar-bg)",
              borderBottom: "1px solid var(--topbar-border)",
              transition: "background 0.3s",
            }}
          >
            {isMobile ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56 }}>
                <button onClick={() => navigate("/admin/dashboard")} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <img src="/hps_new_logo.png" alt="HPS" style={{ height: 32, objectFit: "contain" }}
                    onError={e => { e.target.style.display = "none" }} />
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <NotificationBell />
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1AABDB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
  {(localStorage.getItem("adminName") || "A")[0].toUpperCase()}
</div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px" }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", margin: 0 }}>Admin Workspace</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>HPS Internal Management System</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <NotificationBell />
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                              {localStorage.getItem("adminName") || "Admin"}
                  </span>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1AABDB", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                      {(localStorage.getItem("adminName") || "A")[0].toUpperCase()}
                </div>
                </div>
              </div>
            )}
          </header>

          {/* Page content */}
          <main
            style={{
              flex: 1,
              background: "var(--bg)",
              padding: isMobile ? "16px 16px 96px" : "32px",
              transition: "background 0.3s",
            }}
          >
            <Outlet />
          </main>
        </div>

        {/* ── Mobile Bottom Nav ── */}
        {isMobile && (
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 30,
              display: "flex",
              alignItems: "stretch",
              background: "var(--topbar-bg)",
              borderTop: "1px solid var(--topbar-border)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {mobileNavItems.map(item => {
              const active = location.pathname === item.to
              return (
                <button
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    padding: "8px 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: active ? "#1AABDB" : "var(--text-muted)",
                    position: "relative",
                    transition: "color 0.18s",
                  }}
                >
                  {item.icon}
                  <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>{item.mobileLabel}</span>
                  {active && (
                    <span style={{ position: "absolute", bottom: 0, width: 32, height: 2, borderRadius: 999, background: "#1AABDB" }} />
                  )}
                </button>
              )
            })}

            <button
              onClick={() => setShowMore(true)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "8px 0",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1 }}>More</span>
            </button>
          </nav>
        )}

        {/* ── More sheet ── */}
        {showMore && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowMore(false)}
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                borderRadius: "24px 24px 0 0",
                padding: "24px",
                background: "var(--card-bg)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, borderRadius: 999, background: "var(--card-border)", margin: "0 auto 20px" }} />

              {moreSheetItems.map(item => {
                const active = location.pathname === item.to
                return (
                  <button
                    key={item.to}
                    onClick={() => { navigate(item.to); setShowMore(false) }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 0",
                      borderBottom: "1px solid var(--card-border)",
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid var(--card-border)",
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 500,
                      color: active ? "#1AABDB" : "var(--text-primary)",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ color: active ? "#1AABDB" : "var(--text-muted)", display: "flex" }}>{item.icon}</span>
                    {item.label}
                    {active && <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#1AABDB" }} />}
                  </button>
                )
              })}

              <button
                onClick={() => { navigate("/scan?from=admin"); setShowMore(false) }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--card-border)", background: "none", border: "none", borderBottom: "1px solid var(--card-border)", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", textAlign: "left" }}
              >
                <span style={{ color: "var(--text-muted)", display: "flex" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M20 14v2"/>
                  </svg>
                </span>
                Scan Terminal
              </button>

              <button
                onClick={() => { toggleTheme(); setShowMore(false) }}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--card-border)", background: "none", border: "none", borderBottom: "1px solid var(--card-border)", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", textAlign: "left" }}
              >
                <span style={{ color: "var(--text-muted)", display: "flex" }}>
                  {theme === "dark"
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  }
                </span>
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

              <button
                onClick={handleLogout}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 0", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#EF4444", textAlign: "left", marginTop: 4 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}