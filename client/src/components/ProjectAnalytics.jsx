import { useMemo } from "react";
import {
  BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  blue:     "#1AABDB",
  green:    "#10B981",
  amber:    "#F59E0B",
  red:      "#EF4444",
  purple:   "#8B5CF6",
  slate:    "#94A3B8",
  darkRed:  "#DC2626",
};

const STATUS_COLOR = {
  "Planning":     C.purple,
  "In Progress":  C.amber,
  "On Hold":      C.red,
  "Under Review": C.blue,
  "Completed":    C.green,
  "Cancelled":    C.slate,
};

const PRIORITY_COLOR = {
  low:      C.slate,
  medium:   C.amber,
  high:     C.red,
  critical: C.darkRed,
};

// ── Shared tooltip style ──────────────────────────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    background: "var(--card-bg)",
    border: "1px solid var(--card-border)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--text-primary)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  labelStyle: { color: "var(--text-muted)", fontWeight: 600, marginBottom: 4 },
  cursor: { fill: "rgba(26,171,219,0.06)" },
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, children, cols = 1 }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "3px 0 0" }}>{subtitle}</p>}
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 16,
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Chart card ────────────────────────────────────────────────────────────────
function Card({ title, children, span = 1, minH = 260 }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      borderRadius: 16, padding: "18px 20px",
      background: "var(--card-bg)", border: "1px solid var(--card-border)",
      minHeight: minH,
    }}>
      {title && (
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 16 }}>{title}</p>
      )}
      {children}
    </div>
  );
}

// ── KPI tile ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, color = C.blue, icon }) {
  return (
    <div style={{
      borderRadius: 16, padding: "18px 20px",
      background: "var(--card-bg)", border: "1px solid var(--card-border)",
      // FIX: prevent KPI tiles from overflowing/being cut off
      minWidth: 0,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
            margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.05em",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{label}</p>
          <p style={{ fontSize: 32, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "6px 0 0" }}>{sub}</p>}
        </div>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${color}18`, display: "flex",
            alignItems: "center", justifyContent: "center",
            color, flexShrink: 0, marginLeft: 8,
          }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ width: "100%", height: 3, borderRadius: 9999, background: "var(--card-border)", marginTop: 16 }}>
        <div style={{ width: color === C.green ? "100%" : "60%", height: "100%", borderRadius: 9999, background: color }} />
      </div>
    </div>
  );
}

// ── Custom pie label ──────────────────────────────────────────────────────────
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Main Analytics component ──────────────────────────────────────────────────
export default function ProjectAnalytics({ projects }) {
  const now = new Date();

  const derived = useMemo(() => {
    const total        = projects.length;
    const active       = projects.filter(p => p.status === "In Progress").length;
    const completed    = projects.filter(p => p.status === "Completed").length;
    const onHold       = projects.filter(p => p.status === "On Hold").length;
    const planning     = projects.filter(p => p.status === "Planning").length;
    const overdue      = projects.filter(p =>
      p.endDate && new Date(p.endDate) < now &&
      p.status !== "Completed" && p.status !== "Cancelled"
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

   

    const avgProgress = total > 0
      ? Math.round(projects.reduce((a, p) => a + (p.progress || 0), 0) / total)
      : 0;

    // ── Projects created per month (last 12 months) ────────────────────────
    const monthlyMap = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      monthlyMap[key] = { month: key, created: 0, completed: 0 };
    }
    projects.forEach(p => {
      const d   = new Date(p.createdAt);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      if (monthlyMap[key]) monthlyMap[key].created++;
      if (p.status === "Completed" && p.updatedAt) {
        const uk = new Date(p.updatedAt).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
        if (monthlyMap[uk]) monthlyMap[uk].completed++;
      }
    });
    const monthlyData = Object.values(monthlyMap);

    // ── Status breakdown ───────────────────────────────────────────────────
    const statusData = Object.entries(STATUS_COLOR)
      .map(([name, color]) => ({ name, value: projects.filter(p => p.status === name).length, color }))
      .filter(d => d.value > 0);

    // ── Priority breakdown ─────────────────────────────────────────────────
    const priorityData = Object.entries(PRIORITY_COLOR)
      .map(([name, color]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: projects.filter(p => p.priority === name).length,
        color,
      }))
      .filter(d => d.value > 0);

    // ── Team workload ──────────────────────────────────────────────────────
    const workloadMap = {};
    projects.forEach(p => {
      if (p.status === "Completed" || p.status === "Cancelled") return;
      (p.members || []).forEach(m => {
        const name = m.employee?.name || m.empId;
        if (!workloadMap[name]) workloadMap[name] = { name, projects: 0, tasks: 0 };
        workloadMap[name].projects++;
      });
      (p.tasks || []).filter(t => t.status !== "Completed").forEach(t => {
        const emp = projects.find(pr => pr.id === t.projectId)?.members?.find(m => m.empId === t.empId);
        const name = emp?.employee?.name || t.empId;
        if (!workloadMap[name]) workloadMap[name] = { name, projects: 0, tasks: 0 };
        workloadMap[name].tasks++;
      });
    });
    const workloadData = Object.values(workloadMap)
      .sort((a, b) => (b.projects + b.tasks) - (a.projects + a.tasks))
      .slice(0, 10);

    // ── Upcoming deadlines ─────────────────────────────────────────────────
    const upcoming = projects
      .filter(p => p.endDate && p.status !== "Completed" && p.status !== "Cancelled")
      .map(p => ({ ...p, daysLeft: Math.ceil((new Date(p.endDate) - now) / 86400000) }))
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .slice(0, 8);

    // ── Category distribution ──────────────────────────────────────────────
    const catMap = {};
    projects.forEach(p => {
      const cat = p.category || "Uncategorised";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // ── Progress distribution buckets ──────────────────────────────────────
    const progressBuckets = [
      { range: "0%",     min: 0,   max: 0,   count: 0 },
      { range: "1–25%",  min: 1,   max: 25,  count: 0 },
      { range: "26–50%", min: 26,  max: 50,  count: 0 },
      { range: "51–75%", min: 51,  max: 75,  count: 0 },
      { range: "76–99%", min: 76,  max: 99,  count: 0 },
      { range: "100%",   min: 100, max: 100, count: 0 },
    ];
    projects.forEach(p => {
      const prog = p.progress || 0;
      const bucket = progressBuckets.find(b => prog >= b.min && prog <= b.max);
      if (bucket) bucket.count++;
    });

    return {
      total, active, completed, onHold, planning, overdue,
      completionRate, totalTasks, doneTasks, taskRate, avgProgress,
      monthlyData, statusData, priorityData,
      workloadData, upcoming, categoryData, progressBuckets,
    };
  }, [projects]);

  const axisStyle = { fontSize: 11, fill: "var(--text-muted)" };

  return (
    <div style={{ paddingBottom: 40 }}>

      {/* ── KPI Row ──
          FIX: use auto-fill so cards never get cut off on any screen width,
          and each card has a sensible minimum width.                        */}
      <Section
        title="Overview"
        subtitle="High-level project health at a glance"
        cols={1}   // cols prop unused below; grid override handles it
      >
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 16,
          gridColumn: "1 / -1",   // stretch across the parent grid
        }}>
          <KPI label="Total Projects"  value={derived.total}             color={C.blue}   sub={`${derived.planning} planning`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/></svg>} />
          <KPI label="Active"          value={derived.active}            color={C.amber}  sub={`${derived.onHold} on hold`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
          <KPI label="Completed"       value={derived.completed}         color={C.green}  sub={`${derived.completionRate}% rate`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} />
          <KPI label="Overdue"         value={derived.overdue}           color={derived.overdue > 0 ? C.red : C.green} sub="past deadline"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
          <KPI label="Total Tasks"     value={derived.totalTasks}        color={C.purple} sub={`${derived.doneTasks} completed`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>} />
          <KPI label="Task Completion" value={`${derived.taskRate}%`}    color={C.green}  sub={`${derived.doneTasks} of ${derived.totalTasks} done`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>} />
          <KPI label="Avg Progress"    value={`${derived.avgProgress}%`} color={C.blue}   sub="across all projects"
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>} />
          <KPI label="On Hold"         value={derived.onHold}            color={C.red}    sub={`${derived.planning} still planning`}
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>} />
        </div>
      </Section>

      {/* ── Monthly trends ── */}
      <Section title="Monthly Trends" subtitle="Projects created vs completed over the last 12 months" cols={1}>
        <Card title="Projects Created vs Completed (Monthly)" minH={300}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={derived.monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="created"   name="Created"   fill={C.blue}  radius={[6,6,0,0]} />
              <Bar dataKey="completed" name="Completed" fill={C.green} radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      {/* ── Task Activity section REMOVED as requested ── */}

      {/* ── Breakdowns row ── */}
      <Section title="Breakdowns" subtitle="Status, priority and category distribution" cols={3}>
        {/* Status donut */}
        <Card title="Status Distribution" minH={280}>
          {derived.statusData.length === 0
            ? <Empty />
            : <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={derived.statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" labelLine={false} label={renderPieLabel}>
                      {derived.statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 8 }}>
                  {derived.statusData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </Card>

        {/* Priority donut */}
        <Card title="Priority Distribution" minH={280}>
          {derived.priorityData.length === 0
            ? <Empty />
            : <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={derived.priorityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                      dataKey="value" labelLine={false} label={renderPieLabel}>
                      {derived.priorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: 8 }}>
                  {derived.priorityData.map(d => (
                    <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </Card>

        {/* Category bar */}
        <Card title="By Category" minH={280}>
          {derived.categoryData.length === 0
            ? <Empty />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={derived.categoryData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fontSize: 10 }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" name="Projects" fill={C.blue} radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>
      </Section>

      {/* ── Progress distribution ── */}
      <Section title="Progress Distribution" subtitle="How far along are your active projects?" cols={1}>
        <Card title="Projects by Completion %" minH={240}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={derived.progressBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
              <XAxis dataKey="range" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" name="Projects" radius={[6,6,0,0]}>
                {derived.progressBuckets.map((entry, i) => (
                  <Cell key={i} fill={
                    entry.range === "100%"   ? C.green  :
                    entry.range === "76–99%" ? C.blue   :
                    entry.range === "51–75%" ? C.amber  :
                    entry.range === "0%"     ? C.slate  : C.purple
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      {/* ── Team workload ── */}
      <Section title="Team Workload" subtitle="Active project and task load per team member" cols={1}>
        <Card title="Active Projects & Tasks per Employee" minH={300}>
          {derived.workloadData.length === 0
            ? <Empty msg="No active project members found" />
            : <ResponsiveContainer width="100%" height={Math.max(240, derived.workloadData.length * 40)}>
                <BarChart data={derived.workloadData} layout="vertical" barSize={12} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" horizontal={false} />
                  <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...axisStyle, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="projects" name="Projects" fill={C.blue}   radius={[0,6,6,0]} />
                  <Bar dataKey="tasks"    name="Tasks"    fill={C.purple} radius={[0,6,6,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </Card>
      </Section>

      {/* ── Upcoming deadlines ── */}
      <Section title="Deadline Tracker" subtitle="Projects due soonest — sorted by urgency" cols={1}>
        <Card minH={0}>
          {derived.upcoming.length === 0 ? (
            <Empty msg="No upcoming deadlines" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 100px 160px 80px", padding: "8px 12px", borderBottom: "1px solid var(--card-border)" }}>
                {["Project", "Status", "Priority", "Deadline", "Days Left"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>
              {derived.upcoming.map((p, i) => {
                const overdue = p.daysLeft < 0;
                const urgent  = p.daysLeft >= 0 && p.daysLeft <= 7;
                const dColor  = overdue ? C.red : urgent ? C.amber : C.green;
                return (
                  <div key={p.id} style={{
                    display: "grid", gridTemplateColumns: "2fr 120px 100px 160px 80px",
                    padding: "12px 12px", alignItems: "center",
                    borderBottom: i < derived.upcoming.length - 1 ? "1px solid var(--card-border)" : "none",
                    background: overdue ? "rgba(239,68,68,0.03)" : "transparent",
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>{p.name}</p>
                      <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>{p.category || "—"}</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 9999, display: "inline-block",
                      background: `${STATUS_COLOR[p.status] || C.slate}18`,
                      color: STATUS_COLOR[p.status] || C.slate,
                    }}>{p.status}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                      padding: "2px 8px", borderRadius: 9999, display: "inline-block",
                      background: `${PRIORITY_COLOR[p.priority] || C.slate}18`,
                      color: PRIORITY_COLOR[p.priority] || C.slate,
                    }}>{p.priority}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {new Date(p.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: dColor }}>
                      {overdue ? `${Math.abs(p.daysLeft)}d overdue` : p.daysLeft === 0 ? "Today" : `${p.daysLeft}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </Section>

    </div>
  );
}

function Empty({ msg = "No data yet" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
      <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{msg}</p>
    </div>
  );
}