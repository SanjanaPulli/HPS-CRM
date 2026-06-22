import { useEffect, useMemo, useState, useCallback } from "react";
import BASE_URL from "../config";

const CATEGORIES = ["ALL", "AUTH", "ADMIN", "EMPLOYEE", "ATTENDANCE", "LEAVE", "WORK"];

const CATEGORY_CONFIG = {
  AUTH:       { label: "Auth",       color: "#3B82F6", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.18)"  },
  ADMIN:      { label: "Admin",      color: "#EF4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.18)"   },
  EMPLOYEE:   { label: "Employee",   color: "#8B5CF6", bg: "rgba(139,92,246,0.08)",  border: "rgba(139,92,246,0.18)"  },
  ATTENDANCE: { label: "Attendance", color: "#14B8A6", bg: "rgba(20,184,166,0.08)",  border: "rgba(20,184,166,0.18)"  },
  LEAVE:      { label: "Leave",      color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.18)"  },
  WORK:       { label: "Work",       color: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.18)"  },
  DEFAULT:    { label: "Other",      color: "#64748B", bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.18)" },
};

const CAT_ICONS = {
  AUTH:       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  ADMIN:      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  EMPLOYEE:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  ATTENDANCE: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 16l2 2 4-4"/></svg>,
  LEAVE:      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  WORK:       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  DEFAULT:    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
};

const getCfg  = (cat) => CATEGORY_CONFIG[(cat || "").toUpperCase()] || CATEGORY_CONFIG.DEFAULT;
const getIcon = (cat) => CAT_ICONS[(cat || "").toUpperCase()]        || CAT_ICONS.DEFAULT;

function formatRelative(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 10)     return "Just now";
  if (diff < 60)     return `${diff}s ago`;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatFullTime(dateStr) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDateGroup(dateStr) {
  const d         = new Date(dateStr);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function groupByDate(activities) {
  const groups = {};
  activities.forEach(a => {
    const key = new Date(a.createdAt).toDateString();
    if (!groups[key]) groups[key] = { label: formatDateGroup(a.createdAt), items: [] };
    groups[key].items.push(a);
  });
  return Object.values(groups);
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, isAdmin, size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 9, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#fff",
      background: isAdmin ? "#EF4444" : "#1AABDB",
    }}>
      {isAdmin ? "A" : (name?.charAt(0)?.toUpperCase() || "?")}
    </div>
  );
}

// ── Category pill ─────────────────────────────────────────────────────────────
function CatPill({ category, size = "md" }) {
  const cfg = getCfg(category);
  const pad = size === "sm" ? "2px 7px" : "3px 9px";
  const fs  = size === "sm" ? 10 : 11;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
      padding: pad, borderRadius: 999, fontSize: fs, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {getIcon(category)}
      {cfg.label}
    </span>
  );
}

// ── Mobile card row ───────────────────────────────────────────────────────────
function ActivityCard({ activity, isLast }) {
  const isAdmin = !activity.empId || activity.employeeName === "Admin";
  return (
    <div style={{
      padding: "12px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--card-border)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <Avatar name={activity.employeeName} isAdmin={isAdmin} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Row 1: name + time */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activity.employeeName || "Admin"}
            </p>
            <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
              {formatRelative(activity.createdAt)}
            </span>
          </div>
          {/* Row 2: empId */}
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "var(--text-muted)" }}>
            {activity.empId || "admin"}
          </p>
          {/* Row 3: action + category pill */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1, minWidth: 0, lineHeight: 1.4 }}>
              {activity.action}
            </p>
            <CatPill category={activity.category} size="sm" />
          </div>
          {/* Row 4: details */}
          {activity.details && (
            <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {activity.details}
            </p>
          )}
          {/* Row 5: full timestamp */}
          <p style={{ margin: "5px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
            {formatFullTime(activity.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────
function ActivityRow({ activity, isLast }) {
  const isAdmin = !activity.empId || activity.employeeName === "Admin";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16,
      padding: "13px 20px",
      borderBottom: isLast ? "none" : "1px solid var(--card-border)",
      transition: "background 0.12s",
    }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      {/* Dot */}
      <div style={{ width: 7, height: 7, borderRadius: "50%", background: getCfg(activity.category).color, flexShrink: 0 }} />

      {/* Time */}
      <div style={{ width: 100, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{formatRelative(activity.createdAt)}</p>
        <p style={{ margin: "1px 0 0", fontSize: 10, color: "var(--text-muted)" }}>
          {new Date(activity.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      {/* Person */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, width: 150, flexShrink: 0 }}>
        <Avatar name={activity.employeeName} isAdmin={isAdmin} size={28} />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activity.employeeName || "Admin"}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: "var(--text-muted)" }}>{activity.empId || "admin"}</p>
        </div>
      </div>

      {/* Category */}
      <div style={{ width: 110, flexShrink: 0 }}>
        <CatPill category={activity.category} />
      </div>

      {/* Action */}
      <div style={{ width: 170, flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{activity.action}</p>
      </div>

      {/* Details */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title={activity.details || ""}>
          {activity.details || "—"}
        </p>
      </div>

      {/* Full time */}
      <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
        {formatFullTime(activity.createdAt)}
      </p>
    </div>
  );
}

// ── Pagination button ─────────────────────────────────────────────────────────
function PageBtn({ children, active, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      minWidth: 32, height: 32, padding: "0 8px", borderRadius: 8, fontSize: 12, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
      border: "1px solid transparent",
      background: active ? "#1AABDB" : "var(--card-bg)",
      color: active ? "#fff" : "var(--text-secondary)",
      borderColor: active ? "transparent" : "var(--card-border)",
      opacity: disabled ? 0.35 : 1,
    }}>
      {children}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [category,   setCategory]   = useState("ALL");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [tick,       setTick]       = useState(0);
  const PER_PAGE = 20;

  const fetchActivities = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE_URL}/api/activity`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Activity fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities();
    const poll = setInterval(fetchActivities, 30000);
    const tick = setInterval(() => setTick(n => n + 1), 15000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [fetchActivities]);

  useEffect(() => { setPage(1); }, [category, search, dateFrom, dateTo]);

  const catCounts = useMemo(() => {
    const c = {};
    activities.forEach(a => { c[a.category] = (c[a.category] || 0) + 1; });
    return c;
  }, [activities]);

  const filtered = useMemo(() => activities.filter(item => {
    const catMatch    = category === "ALL" || (item.category || "").toUpperCase() === category.toUpperCase();
    const searchMatch = !search  || [item.employeeName, item.action, item.details, item.empId].some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const itemDate    = new Date(item.createdAt);
    const fromMatch   = !dateFrom || itemDate >= new Date(dateFrom);
    const toMatch     = !dateTo   || itemDate <= new Date(dateTo + "T23:59:59");
    return catMatch && searchMatch && fromMatch && toMatch;
  }), [activities, category, search, dateFrom, dateTo, tick]);

  const totalPages  = Math.ceil(filtered.length / PER_PAGE);
  const paginated   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const grouped     = groupByDate(paginated);
  const todayCount  = activities.filter(a => new Date(a.createdAt).toDateString() === new Date().toDateString()).length;
  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const hasFilters  = category !== "ALL" || search || dateFrom || dateTo;

  const inputStyle = {
    background: "var(--surface2)",
    border: "1px solid var(--card-border)",
    color: "var(--text-primary)",
    borderRadius: 10,
    fontSize: 13,
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>Activity Log</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
            System audit trail · refreshes every 30s
          </p>
        </div>
        <button
          onClick={fetchActivities}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            color: "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1AABDB"; e.currentTarget.style.color = "#1AABDB"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stats — 3-col always, stack on very small ── */}
      <div className="activity-stats-grid">
        {[
          { label: "Total Events",   value: activities.length,             color: "#1AABDB", bg: "rgba(26,171,219,0.08)",  border: "rgba(26,171,219,0.18)"  },
          { label: "Today",          value: todayCount,                    color: "#10B981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.18)"  },
          { label: "Top Category",   value: getCfg(topCategory).label,    color: getCfg(topCategory).color, bg: getCfg(topCategory).bg, border: getCfg(topCategory).border },
        ].map(s => (
          <div key={s.label} style={{ borderRadius: 14, padding: "14px 16px", background: s.bg, border: `1px solid ${s.border}` }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</p>
            <p style={{ margin: "3px 0 0", fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Search + date range */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 200px", minWidth: 0 }}>
            <div style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, action, details…"
              style={{ ...inputStyle, width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "#1AABDB"}
              onBlur={e => e.target.style.borderColor = "var(--card-border)"}
            />
          </div>

          {/* Date range */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputStyle, padding: "7px 10px" }}
              onFocus={e => e.target.style.borderColor = "#1AABDB"}
              onBlur={e => e.target.style.borderColor = "var(--card-border)"} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom}
              style={{ ...inputStyle, padding: "7px 10px" }}
              onFocus={e => e.target.style.borderColor = "#1AABDB"}
              onBlur={e => e.target.style.borderColor = "var(--card-border)"} />
          </div>

          {hasFilters && (
            <button
              onClick={() => { setCategory("ALL"); setSearch(""); setDateFrom(""); setDateTo(""); }}
              style={{ padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Category tabs — scrollable */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          <div style={{ display: "flex", gap: 6, width: "max-content" }}>
            {CATEGORIES.map(cat => {
              const cfg      = getCfg(cat);
              const isActive = category.toUpperCase() === cat.toUpperCase();
              const count    = cat === "ALL" ? activities.length : (catCounts[cat] || 0);
              return (
                <button key={cat} onClick={() => setCategory(cat)} style={{
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "6px 12px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                  background: isActive ? (cat === "ALL" ? "#1AABDB" : cfg.color) : "var(--surface2)",
                  color: isActive ? "#fff" : "var(--text-secondary)",
                  border: isActive ? "1px solid transparent" : "1px solid var(--card-border)",
                }}>
                  {cat !== "ALL" && getIcon(cat)}
                  {getCfg(cat).label || cat}
                  <span style={{ opacity: 0.65, fontSize: 11 }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Result count when filtered */}
      {hasFilters && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* ── Activity list ── */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 14, overflow: "hidden" }}>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite", display: "block", margin: "0 auto 10px" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Loading activities…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(26,171,219,0.08)", color: "#1AABDB" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "var(--text-primary)" }}>No activity found</p>
            <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)" }}>Try adjusting your filters</p>
          </div>
        ) : (
          grouped.map((group, gi) => (
            <div key={gi}>
              {/* Date group header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 16px", position: "sticky", top: 0, zIndex: 10,
                background: "var(--surface2)",
                borderBottom: "1px solid var(--card-border)",
                borderTop: gi > 0 ? "1px solid var(--card-border)" : "none",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>{group.label}</span>
                <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 999, fontWeight: 600, background: "var(--card-border)", color: "var(--text-muted)" }}>
                  {group.items.length}
                </span>
              </div>

              {/* Mobile cards */}
              <div className="activity-mobile">
                {group.items.map((a, i) => (
                  <ActivityCard key={a.id} activity={a} isLast={i === group.items.length - 1} />
                ))}
              </div>

              {/* Desktop rows */}
              <div className="activity-desktop">
                {group.items.map((a, i) => (
                  <ActivityRow key={a.id} activity={a} isLast={i === group.items.length - 1} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</PageBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return <PageBtn key={p} active={page === p} onClick={() => setPage(p)}>{p}</PageBtn>;
            })}
            <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</PageBtn>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        .activity-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .activity-mobile  { display: block; }
        .activity-desktop { display: none;  }

        @media (min-width: 700px) {
          .activity-mobile  { display: none;  }
          .activity-desktop { display: block; }
        }

        @media (max-width: 380px) {
          .activity-stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}