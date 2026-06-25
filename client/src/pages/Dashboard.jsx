import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BASE_URL from "../config";
import { useTheme } from "../context/ThemeContext";

const StatCard = ({ icon, value, label, iconBg, iconColor }) => (
  <div style={{
    display: "flex", flexDirection: "column", padding: "24px", borderRadius: 16,
    background: "var(--card-bg)", border: "1px solid var(--card-border)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.3s", minWidth: 0,
  }}>
    <div style={{ marginBottom: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg }}>
        <span style={{ color: iconColor, display: "flex" }}>{icon}</span>
      </div>
    </div>
    <p style={{ fontSize: 30, fontWeight: 700, margin: "0 0 4px", color: "var(--text-primary)", lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: 14, margin: 0, color: "var(--text-secondary)" }}>{label}</p>
  </div>
);

const QuickActionCard = ({ icon, title, subtitle, onClick, theme }) => (
  <button
    onClick={onClick}
    style={{
      display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12,
      textAlign: "left", width: "100%", background: "var(--surface2)",
      border: "1px solid var(--card-border)", cursor: "pointer", transition: "all 0.2s", minWidth: 0,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "#1AABDB";
      e.currentTarget.style.background = theme === "dark" ? "rgba(26,171,219,0.1)" : "#E8F7FD";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "var(--card-border)";
      e.currentTarget.style.background = "var(--surface2)";
    }}
  >
    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,171,219,0.15)" }}>
      <span style={{ color: "#1AABDB", display: "flex" }}>{icon}</span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 2px", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
      <p style={{ fontSize: 12, margin: 0, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</p>
    </div>
    <div style={{ color: "var(--text-muted)", flexShrink: 0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </div>
  </button>
);

const RoleIcon = ({ role }) => {
  if (role === "manager") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <path d="M12 12h.01"/>
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [stats, setStats] = useState({ total: 0, present: 0, pending: 0, wfh: 0 });
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const role = localStorage.getItem("role") || "admin";
  const displayName = localStorage.getItem("adminName") || (role === "manager" ? "Manager" : "Admin");
  const roleLabel = role === "manager" ? "Manager" : "Admin";

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [empRes, attRes, leaveRes] = await Promise.all([
          fetch(`${BASE_URL}/api/employees`),
          fetch(`${BASE_URL}/api/attendance/today`),
          fetch(`${BASE_URL}/api/leave`),
        ]);
        const employees  = await empRes.json();
        const attendance = await attRes.json();
        const leaves     = await leaveRes.json();

        const today = new Date();
        const todayTime = today.setHours(0, 0, 0, 0);

        const wfhCount = Array.isArray(leaves) ? leaves.filter(l => {
          if (l.status !== 'Approved' || l.type !== 'WFH') return false;
          const start = new Date(l.fromDate || l.date);
          start.setHours(0, 0, 0, 0);
          const end = new Date(l.toDate || l.fromDate || l.date);
          end.setHours(0, 0, 0, 0);
          return todayTime >= start.getTime() && todayTime <= end.getTime();
        }).length : 0;

        setStats({
          total:   Array.isArray(employees)  ? employees.length : 0,
          present: Array.isArray(attendance) ? attendance.filter(a => a.status === "Present" || a.status === "Late").length : 0,
          pending: Array.isArray(leaves)     ? leaves.filter(l => l.status === "Pending").length : 0,
          wfh:     wfhCount,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      }
    };
    fetchStats();
  }, []);

  const UsersIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
  const CheckIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
  const FileIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/>
    </svg>
  );
  const LaptopIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
      <line x1="12" y1="17" x2="12" y2="20"/>
    </svg>
  );

  const statCards = [
    { icon: UsersIcon, value: stats.total,   label: "Total Employees",       iconBg: "#E8F7FD", iconColor: "#1AABDB" },
    { icon: CheckIcon, value: stats.present, label: "Present Today",          iconBg: "#E6F7F0", iconColor: "#10B981" },
    { icon: LaptopIcon, value: stats.wfh,    label: "WFH Today",             iconBg: "#EBF5FF", iconColor: "#3B82F6" },
    { icon: FileIcon,  value: stats.pending, label: "Pending Leave Requests", iconBg: "#FFF7E6", iconColor: "#F59E0B" },
  ];

  const quickActions = [
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
      title: "Manage Employees", subtitle: "Add, edit or remove employees",
      onClick: () => navigate("/admin/employees"),
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>,
      title: "View Attendance", subtitle: "Check today's attendance logs",
      onClick: () => navigate("/admin/attendance"),
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>,
      title: "Leave Requests", subtitle: `${stats.pending} pending approvals`,
      onClick: () => navigate("/admin/leave"),
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="12" y1="18" x2="12" y2="18"/></svg>,
      title: "Staff Calendar", subtitle: "View attendance & leave by month",
      onClick: () => navigate("/admin/calendar"),
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M20 14v2"/></svg>,
      title: "Scan Terminal", subtitle: "Go to attendance scanner",
      onClick: () => navigate("/scan?from=admin"),
    },
    {
      icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      title: "Activity Log", subtitle: "View system activity history",
      onClick: () => navigate("/admin/activity"),
    },
  ];

  const roleBadgeBg    = role === "manager" ? "rgba(245,158,11,0.12)" : "rgba(26,171,219,0.12)";
  const roleBadgeColor = role === "manager" ? "#F59E0B" : "#1AABDB";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 4, height: 24, borderRadius: 999, background: "#1AABDB", flexShrink: 0 }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Dashboard</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12, marginTop: 2, flexWrap: "wrap" }}>
          <p style={{ fontSize: 14, margin: 0, color: "var(--text-secondary)" }}>
            Welcome back, <strong style={{ color: "var(--text-primary)" }}>{displayName}</strong>
          </p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, background: roleBadgeBg, color: roleBadgeColor, fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
            <RoleIcon role={role} />
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Scanner CTA */}
      <div
        onClick={() => navigate('/scan?from=admin')}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderRadius: 16, marginBottom: 24, cursor: 'pointer',
          background: 'linear-gradient(135deg, #1AABDB, #0e8ab5)',
          boxShadow: '0 4px 20px rgba(26,171,219,0.3)', transition: 'transform 0.2s, box-shadow 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,171,219,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,171,219,0.3)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18v3M20 14v2"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Attendance Scanner</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: '2px 0 0' }}>Tap to open the barcode scanner terminal</p>
          </div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
        {statCards.map((card, i) => <StatCard key={i} {...card} />)}
      </div>

      {/* Quick Actions */}
      <div style={{ borderRadius: 16, padding: 24, background: "var(--card-bg)", border: "1px solid var(--card-border)", transition: "background 0.3s" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 20px", color: "var(--text-primary)" }}>Quick Actions</h2>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12 }}>
          {quickActions.map((action, i) => <QuickActionCard key={i} theme={theme} {...action} />)}
        </div>
      </div>
    </div>
  );
}