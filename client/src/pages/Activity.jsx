import { useEffect, useMemo, useState, useCallback } from "react";
import BASE_URL from "../config";

const CATEGORIES = ["ALL", "AUTH", "ADMIN", "EMPLOYEE", "ATTENDANCE", "LEAVE", "WORK"];

const CATEGORY_CONFIG = {
  AUTH:       { label: "AUTH",       color: "#3B82F6", bg: "rgba(59,130,246,0.1)"  },
  ADMIN:      { label: "ADMIN",      color: "#EF4444", bg: "rgba(239,68,68,0.1)"   },
  EMPLOYEE:   { label: "EMPLOYEE",   color: "#8B5CF6", bg: "rgba(139,92,246,0.1)"  },
  ATTENDANCE: { label: "ATTENDANCE", color: "#14B8A6", bg: "rgba(20,184,166,0.1)"  },
  LEAVE:      { label: "LEAVE",      color: "#F59E0B", bg: "rgba(245,158,11,0.1)"  },
  WORK:       { label: "WORK",       color: "#10B981", bg: "rgba(16,185,129,0.1)"  },
  DEFAULT:    { label: "OTHER",      color: "#64748B", bg: "rgba(100,116,139,0.1)" },
};

const CAT_ICONS = {
  AUTH: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  ADMIN: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  EMPLOYEE: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  ATTENDANCE: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M9 16l2 2 4-4"/></svg>,
  LEAVE: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  WORK: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  DEFAULT: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
};

const getCfg  = (cat) => CATEGORY_CONFIG[(cat || "").toUpperCase()] || CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.DEFAULT;
const getIcon = (cat) => CAT_ICONS[(cat || "").toUpperCase()]        || CAT_ICONS[cat]        || CAT_ICONS.DEFAULT;

function formatRelative(dateStr) {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 10)     return "Just now";
  if (diff < 60)     return `${diff}s ago`;
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

function toDateKey(dateStr) { return new Date(dateStr).toDateString(); }

function groupByDate(activities) {
  const groups = {};
  activities.forEach((a) => {
    const key = toDateKey(a.createdAt);
    if (!groups[key]) groups[key] = { label: formatDateGroup(a.createdAt), items: [] };
    groups[key].items.push(a);
  });
  return Object.values(groups);
}

export default function ActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [category, setCategory]     = useState("ALL");
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [dateFrom, setDateFrom]     = useState("");
  const [dateTo, setDateTo]         = useState("");
  const [tick, setTick]             = useState(0);
  const [isMobile, setIsMobile]     = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const PER_PAGE = 20;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((item) => {
      const catMatch = category === "ALL" ||
        (item.category || "").toUpperCase() === category.toUpperCase() ||
        item.category === category;
      const searchMatch = !search ||
        item.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
        item.action?.toLowerCase().includes(search.toLowerCase()) ||
        item.details?.toLowerCase().includes(search.toLowerCase()) ||
        item.empId?.toLowerCase().includes(search.toLowerCase());
      const itemDate  = new Date(item.createdAt);
      const fromMatch = !dateFrom || itemDate >= new Date(dateFrom);
      const toMatch   = !dateTo   || itemDate <= new Date(dateTo + "T23:59:59");
      return catMatch && searchMatch && fromMatch && toMatch;
    });
  }, [activities, category, search, dateFrom, dateTo, tick]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const grouped    = groupByDate(paginated);

  useEffect(() => { setPage(1); }, [category, search, dateFrom, dateTo]);

  const todayCount = activities.filter(
    (a) => new Date(a.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const catCounts = useMemo(() => {
    const c = {};
    activities.forEach((a) => { c[a.category] = (c[a.category] || 0) + 1; });
    return c;
  }, [activities]);

  const topCategory = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const hasFilters  = category !== "ALL" || search || dateFrom || dateTo;

  const clearFilters = () => {
    setCategory("ALL"); setSearch(""); setDateFrom(""); setDateTo("");
  };

  const inputStyle = {
    background: "var(--surface2, rgba(0,0,0,0.03))",
    border: "1px solid var(--card-border)",
    color: "var(--text-primary)",
    borderRadius: 12,
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 999, background: "#1AABDB", flexShrink: 0 }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>Activity Log</h1>
          </div>
          <p style={{ fontSize: 14, margin: "0 0 0 12px", color: "var(--text-secondary)" }}>
            Full system audit trail · auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={fetchActivities}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 16px", borderRadius: 12, fontSize: 14, fontWeight: 500,
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.2s",
            fontFamily: "inherit",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1AABDB"; e.currentTarget.style.color = "#1AABDB"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--card-border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
        gap: 16,
        marginBottom: 24,
      }}>
        {[
          { label: "Total Activities",  value: activities.length, color: "#1AABDB", bg: "rgba(26,171,219,0.08)" },
          { label: "Today's Activities", value: todayCount,        color: "#10B981", bg: "rgba(16,185,129,0.08)" },
          { label: "Top Category",       value: getCfg(topCategory).label || topCategory, color: getCfg(topCategory).color, bg: getCfg(topCategory).bg },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
            borderRadius: 16, padding: 20, transition: "all 0.2s",
          }}>
            <p style={{ fontSize: 12, fontWeight: 500, margin: "0 0 8px", color: "var(--text-secondary)" }}>{s.label}</p>
            <p style={{ fontSize: 30, fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: "var(--card-bg)", border: "1px solid var(--card-border)",
        borderRadius: 16, padding: 16, marginBottom: 20,
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {/* Row 1: search + date range */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", display: "flex" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search employee, action, details…"
              style={{ ...inputStyle, width: "100%", paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, boxSizing: "border-box" }}
              onFocus={e => e.target.style.border = "1px solid #1AABDB"}
              onBlur={e => e.target.style.border = "1px solid var(--card-border)"}
            />
          </div>

          {/* Date from */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ ...inputStyle, padding: "8px 12px" }}
              onFocus={e => e.target.style.border = "1px solid #1AABDB"}
              onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
          </div>

          {/* Date to */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} min={dateFrom}
              style={{ ...inputStyle, padding: "8px 12px" }}
              onFocus={e => e.target.style.border = "1px solid #1AABDB"}
              onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
          </div>

          {hasFilters && (
            <button onClick={clearFilters}
              style={{
                padding: "8px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
              }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Row 2: category pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CATEGORIES.map(cat => {
            const cfg      = getCfg(cat);
            const isActive = category.toUpperCase() === cat.toUpperCase() || category === cat;
            const count    = cat === "ALL" ? activities.length : (catCounts[cat] || catCounts[cat?.toLowerCase()] || 0);
            return (
              <button key={cat} onClick={() => setCategory(cat)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                  cursor: "pointer", transition: "all 0.18s", fontFamily: "inherit",
                  ...(isActive
                    ? { background: cat === "ALL" ? "#1AABDB" : cfg.color, color: "#fff", border: "1px solid transparent" }
                    : { background: "var(--surface2, rgba(0,0,0,0.03))", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }
                  ),
                }}>
                {cat !== "ALL" && getIcon(cat)}
                {cfg.label || cat}
                <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count */}
      {hasFilters && (
        <p style={{ fontSize: 12, marginBottom: 12, color: "var(--text-muted)" }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} found
        </p>
      )}

      {/* ── Activity feed ── */}
      <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 16, overflow: "hidden" }}>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2px solid #1AABDB", borderTopColor: "transparent",
              animation: "spin 0.7s linear infinite", margin: "0 auto 12px",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>Loading activities…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 16, margin: "0 auto 12px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(26,171,219,0.08)", color: "#1AABDB",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 4px", color: "var(--text-primary)" }}>No activity found</p>
            <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)" }}>Try adjusting your filters</p>
          </div>
        ) : grouped.map((group, gi) => (
          <div key={gi}>
            {/* Date group header */}
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 20px", position: "sticky", top: 0, zIndex: 10,
              background: "var(--surface2)",
              borderBottom: "1px solid var(--card-border)",
              borderTop: gi > 0 ? "1px solid var(--card-border)" : "none",
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>{group.label}</span>
              <span style={{
                fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
                background: "var(--card-border)", color: "var(--text-muted)",
              }}>
                {group.items.length} event{group.items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Rows */}
            {group.items.map((activity, i) => {
              const cfg     = getCfg(activity.category);
              const isAdmin = !activity.empId || activity.employeeName === "Admin";
              return (
                <div key={activity.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "14px 20px", fontSize: 14, transition: "background 0.15s",
                    borderBottom: i < group.items.length - 1 ? "1px solid var(--card-border)" : "none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(26,171,219,0.02)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {/* Timeline dot */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} />
                  </div>

                  {/* Time */}
                  <div style={{ width: 112, flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 2px", color: "var(--text-primary)" }}>
                      {formatRelative(activity.createdAt)}
                    </p>
                    <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>
                      {new Date(activity.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </p>
                  </div>

                  {/* Avatar + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, width: 160, flexShrink: 0, minWidth: 0 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: "#fff",
                      background: isAdmin ? "#EF4444" : "#1AABDB",
                    }}>
                      {isAdmin ? "A" : (activity.employeeName?.charAt(0) || "?")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, margin: "0 0 1px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {activity.employeeName || "Admin"}
                      </p>
                      <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {activity.empId || "admin"}
                      </p>
                    </div>
                  </div>

                  {/* Category badge */}
                  <div style={{ width: 112, flexShrink: 0 }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: cfg.bg, color: cfg.color,
                    }}>
                      {getIcon(activity.category)}
                      {cfg.label || activity.category}
                    </span>
                  </div>

                  {/* Action */}
                  <div style={{ width: 176, flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, margin: 0, color: "var(--text-primary)" }}>
                      {activity.action}
                    </p>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, margin: 0, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={activity.details || ""}>
                      {activity.details || "—"}
                    </p>
                  </div>

                  {/* Full timestamp — hidden on smaller screens */}
                  {!isMobile && (
                    <div style={{ flexShrink: 0 }}>
                      <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>
                        {formatFullTime(activity.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
          <p style={{ fontSize: 12, margin: 0, color: "var(--text-muted)" }}>
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{
                padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 500,
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                color: "var(--text-secondary)", cursor: "pointer", opacity: page === 1 ? 0.3 : 1,
                fontFamily: "inherit",
              }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page - 2 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 12, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    ...(page === p
                      ? { background: "#1AABDB", color: "#fff", border: "1px solid transparent" }
                      : { background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }
                    ),
                  }}>
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{
                padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 500,
                background: "var(--card-bg)", border: "1px solid var(--card-border)",
                color: "var(--text-secondary)", cursor: "pointer", opacity: page === totalPages ? 0.3 : 1,
                fontFamily: "inherit",
              }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}