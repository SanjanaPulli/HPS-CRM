import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import BASE_URL from "../config";
import ProjectAnalytics from "../components/ProjectAnalytics";

const API = `${BASE_URL}/api`;

// ── Constants ─────────────────────────────────────────────────────────────────
const PROJECT_STATUSES = ["Planning", "In Progress", "Under Review", "On Hold", "Completed", "Cancelled"];
const PRIORITIES       = ["low", "medium", "high", "critical"];
const CATEGORIES       = ["Web Development", "Mobile App", "Design", "Research", "Marketing", "Infrastructure", "Data / Analytics", "Other"];

const STATUS_CFG = {
  "Planning":   { color: "#8B5CF6", bg: "rgba(139,92,246,0.1)",  border: "rgba(139,92,246,0.25)",  dot: "#8B5CF6" },
  "In Progress":{ color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.25)",  dot: "#F59E0B" },
  "Under Review": { color: "#1AABDB", bg: "rgba(26,171,219,0.1)",  border: "rgba(26,171,219,0.25)",  dot: "#1AABDB" },
  "On Hold":    { color: "#EF4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   dot: "#EF4444" },
  "Completed":  { color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.25)",  dot: "#10B981" },
  "Cancelled":  { color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)", dot: "#94A3B8" },
};

const PRIORITY_CFG = {
  low:      { color: "#64748B", label: "Low",      bar: "#64748B" },
  medium:   { color: "#F59E0B", label: "Medium",   bar: "#F59E0B" },
  high:     { color: "#EF4444", label: "High",     bar: "#EF4444" },
  critical: { color: "#DC2626", label: "Critical", bar: "#DC2626" },
};

const EMPTY_FORM = {
  name: "", description: "", status: "Planning", priority: "medium",
  startDate: "", endDate: "", budget: "", category: "",
  teamLeadId: "", memberIds: [],
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG["Planning"];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const c = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      padding: "2px 8px", borderRadius: 9999,
      background: `${c.color}18`, color: c.color,
    }}>
      {c.label}
    </span>
  );
}

function ProgressBar({ value, showLabel = true }) {
  const pct = Math.min(100, Math.max(0, Number(value) || 0));
  const color = pct === 100 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#1AABDB";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 9999, background: "var(--card-border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 9999, background: color, transition: "width 0.4s" }} />
      </div>
      {showLabel && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", minWidth: 28 }}>{pct}%</span>}
    </div>
  );
}

function Avatar({ name, photo, size = 28 }) {
  const initials = name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  if (photo) return <img src={`${BASE_URL}/uploads/${photo}`} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.36, fontWeight: 700, color: "#fff", background: "#1AABDB",
    }}>
      {initials}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 18px", borderRadius: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      color: "#fff", fontSize: 14, fontWeight: 600, minWidth: 220,
      background: toast.type === "error" ? "#EF4444" : "#10B981",
    }}>
      {toast.type === "error"
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      }
      {toast.msg}
    </div>
  );
}

// ── MultiSelect for members ───────────────────────────────────────────────────
function MemberSelect({ employees, selected, onChange, exclude }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const opts = employees.filter(e => e.empId !== exclude && (
    e.name.toLowerCase().includes(q.toLowerCase()) || e.empId.toLowerCase().includes(q.toLowerCase())
  ));
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          minHeight: 40, padding: "8px 12px", borderRadius: 12, cursor: "pointer",
          background: "var(--surface2)", border: `1px solid ${open ? "#1AABDB" : "var(--card-border)"}`,
          display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
        }}>
        {selected.length === 0
          ? <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Select members…</span>
          : selected.map(id => {
              const emp = employees.find(e => e.empId === id);
              return emp ? (
                <span key={id} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                  background: "rgba(26,171,219,0.12)", color: "#1AABDB", border: "1px solid rgba(26,171,219,0.25)",
                }}>
                  {emp.name}
                  <span onClick={e => { e.stopPropagation(); toggle(id); }} style={{ cursor: "pointer", opacity: 0.7 }}>×</span>
                </span>
              ) : null;
            })
        }
      </div>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, marginTop: 4,
          borderRadius: 12, overflow: "hidden",
          background: "var(--card-bg)", border: "1px solid var(--card-border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}>
          <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--card-border)" }}>
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
              style={{
                width: "100%", padding: "6px 10px", borderRadius: 8, fontSize: 13,
                background: "var(--surface2)", border: "1px solid var(--card-border)",
                color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
              }} />
          </div>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {opts.length === 0
              ? <div style={{ padding: 12, fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>No employees found</div>
              : opts.map(e => (
                  <div key={e.empId} onClick={() => toggle(e.empId)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: "pointer",
                      background: selected.includes(e.empId) ? "rgba(26,171,219,0.08)" : "transparent",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={ev => { if (!selected.includes(e.empId)) ev.currentTarget.style.background = "var(--surface2)"; }}
                    onMouseLeave={ev => { if (!selected.includes(e.empId)) ev.currentTarget.style.background = "transparent"; }}>
                    <Avatar name={e.name} photo={e.photo} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>{e.name}</p>
                      <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>{e.department || e.position || e.empId}</p>
                    </div>
                    {selected.includes(e.empId) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1AABDB" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                ))
            }
          </div>
          <div style={{ padding: "8px 12px", borderTop: "1px solid var(--card-border)", textAlign: "right" }}>
            <button onClick={() => setOpen(false)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: "#1AABDB", color: "#fff", border: "none", cursor: "pointer",
              }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Project Form (create / edit) ──────────────────────────────────────────────
function ProjectForm({ form, setForm, employees, saving, onSubmit, onCancel, isEdit }) {
  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 12, fontSize: 14,
    background: "var(--surface2)", border: "1px solid var(--card-border)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
  };
  const lbl = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 5, color: "var(--text-muted)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Name */}
      <div>
        <label style={lbl}>Project Name *</label>
        <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          placeholder="e.g. HPS CRM v2"
          style={inp}
          onFocus={e => e.target.style.border = "1px solid #1AABDB"}
          onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
      </div>

      {/* Description */}
      <div>
        <label style={lbl}>Description</label>
        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Brief overview of the project…" rows={3}
          style={{ ...inp, resize: "vertical" }}
          onFocus={e => e.target.style.border = "1px solid #1AABDB"}
          onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
      </div>

      {/* Status + Priority */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Status</label>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            style={{ ...inp, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Priority</label>
          <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
            style={{ ...inp, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Start Date</label>
          <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
            style={inp}
            onFocus={e => e.target.style.border = "1px solid #1AABDB"}
            onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
        </div>
        <div>
          <label style={lbl}>End Date (Deadline)</label>
          <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
            style={inp}
            onFocus={e => e.target.style.border = "1px solid #1AABDB"}
            onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
        </div>
      </div>

      {/* Category + Budget */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={lbl}>Category</label>
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            style={{ ...inp, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
            <option value="">— Select —</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Budget (optional)</label>
          <input value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
            placeholder="e.g. ₹1,20,000"
            style={inp}
            onFocus={e => e.target.style.border = "1px solid #1AABDB"}
            onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
        </div>
      </div>

      {/* Team Lead */}
      <div>
        <label style={lbl}>Team Lead</label>
        <select value={form.teamLeadId} onChange={e => setForm(p => ({ ...p, teamLeadId: e.target.value }))}
          style={{ ...inp, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
          <option value="">— Select Team Lead —</option>
          {employees.map(e => <option key={e.empId} value={e.empId}>{e.name} ({e.empId})</option>)}
        </select>
      </div>

      {/* Members */}
      <div>
        <label style={lbl}>Team Members</label>
        <MemberSelect
          employees={employees}
          selected={form.memberIds}
          onChange={ids => setForm(p => ({ ...p, memberIds: ids }))}
          exclude={form.teamLeadId}
        />
        {form.memberIds.length > 0 && (
          <p style={{ fontSize: 11, marginTop: 4, color: "var(--text-muted)" }}>
            {form.memberIds.length} member{form.memberIds.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Progress (edit only) */}
      {isEdit && (
        <div>
          <label style={{ ...lbl, display: "flex", justifyContent: "space-between" }}>
            <span>Progress</span>
            <span style={{ color: "#1AABDB" }}>{form.progress ?? 0}%</span>
          </label>
          <input type="range" min={0} max={100} value={form.progress ?? 0}
            onChange={e => setForm(p => ({ ...p, progress: Number(e.target.value) }))}
            style={{ width: "100%", accentColor: "#1AABDB" }} />
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button onClick={onSubmit} disabled={saving}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
            color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer",
            background: saving ? "rgba(26,171,219,0.5)" : "#1AABDB",
          }}>
          {saving ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Create Project")}
        </button>
        <button onClick={onCancel}
          style={{
            padding: "11px 18px", borderRadius: 12, fontSize: 14, cursor: "pointer",
            background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--card-border)",
          }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Side Panel ────────────────────────────────────────────────────────────────
function SidePanel({ project, employees, onClose, onEdit, onDelete, onStatusChange, onProgressChange }) {
  const [editingProgress, setEditingProgress] = useState(false);
  const [progressVal, setProgressVal] = useState(project?.progress ?? 0);

  useEffect(() => { setProgressVal(project?.progress ?? 0); }, [project?.id, project?.progress]);

  if (!project) return null;

  const doneTasks  = project.tasks?.filter(t => t.status === "Completed").length || 0;
  const totalTasks = project.tasks?.length || 0;
  const daysLeft   = project.endDate
    ? Math.ceil((new Date(project.endDate) - new Date()) / 86400000)
    : null;

  const fmt = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  return (
    <div style={{
      width: 380, flexShrink: 0, borderLeft: "1px solid var(--card-border)",
      background: "var(--card-bg)", display: "flex", flexDirection: "column",
      height: "calc(100vh - 120px)", overflowY: "auto", position: "sticky", top: 0,
    }}>
      {/* Panel header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid var(--card-border)",
        background: "var(--surface2)", display: "flex", alignItems: "center", gap: 10,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </p>
          <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>ID #{project.id}</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onEdit(project)}
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#1AABDB", background: "rgba(26,171,219,0.1)",
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(project.id)}
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#EF4444", background: "rgba(239,68,68,0.08)",
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
          <button onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", background: "transparent",
            }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={project.status} />
          <PriorityBadge priority={project.priority} />
          {project.category && (
            <span style={{
              fontSize: 11, padding: "3px 10px", borderRadius: 9999,
              background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)",
            }}>
              {project.category}
            </span>
          )}
        </div>

        {/* Status selector */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>CHANGE STATUS</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PROJECT_STATUSES.map(s => {
              const c = STATUS_CFG[s];
              const active = project.status === s;
              return (
                <button key={s} onClick={() => onStatusChange(project.id, s)}
                  style={{
                    padding: "5px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 700,
                    cursor: "pointer", border: `1px solid ${active ? c.color : "var(--card-border)"}`,
                    background: active ? c.bg : "transparent",
                    color: active ? c.color : "var(--text-muted)",
                  }}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: 0 }}>PROGRESS</p>
            <button onClick={() => setEditingProgress(e => !e)}
              style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: "rgba(26,171,219,0.1)", color: "#1AABDB", border: "none", cursor: "pointer",
              }}>
              {editingProgress ? "Cancel" : "Edit"}
            </button>
          </div>
          {editingProgress ? (
            <div>
              <input type="range" min={0} max={100} value={progressVal}
                onChange={e => setProgressVal(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#1AABDB" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1AABDB" }}>{progressVal}%</span>
                <button onClick={() => { onProgressChange(project.id, progressVal); setEditingProgress(false); }}
                  style={{
                    padding: "5px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: "#1AABDB", color: "#fff", border: "none", cursor: "pointer",
                  }}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <ProgressBar value={project.progress} />
          )}
          {totalTasks > 0 && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
              {doneTasks} of {totalTasks} tasks completed
            </p>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>DESCRIPTION</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{project.description}</p>
          </div>
        )}

        {/* Timeline */}
        <div style={{
          borderRadius: 12, padding: 14, background: "var(--surface2)", border: "1px solid var(--card-border)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 4px" }}>START DATE</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{fmt(project.startDate)}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 4px" }}>DEADLINE</p>
            <p style={{
              fontSize: 13, fontWeight: 600, margin: 0,
              color: daysLeft !== null && daysLeft < 7 && project.status !== "Completed" ? "#EF4444" : "var(--text-primary)",
            }}>
              {fmt(project.endDate)}
              {daysLeft !== null && project.status !== "Completed" && project.status !== "Cancelled" && (
                <span style={{ fontSize: 10, marginLeft: 6, color: daysLeft < 0 ? "#EF4444" : daysLeft < 7 ? "#F59E0B" : "#10B981" }}>
                  {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}
                </span>
              )}
            </p>
          </div>
          {project.budget && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 4px" }}>BUDGET</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{project.budget}</p>
            </div>
          )}
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", margin: "0 0 4px" }}>CREATED BY</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>{project.assignedBy}</p>
          </div>
        </div>

        {/* Team Lead */}
        {project.teamLead && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>TEAM LEAD</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--card-border)" }}>
              <Avatar name={project.teamLead.name} photo={project.teamLead.photo} size={34} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{project.teamLead.name}</p>
                <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>{project.teamLead.position || project.teamLead.empId}</p>
              </div>
              <span style={{
                marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                background: "rgba(168,85,247,0.1)", color: "#a855f7",
              }}>LEAD</span>
            </div>
          </div>
        )}

        {/* Members */}
        {project.members?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>
              TEAM MEMBERS ({project.members.length})
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {project.members.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--card-border)" }}>
                  <Avatar name={m.employee.name} photo={m.employee.photo} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.employee.name}</p>
                    <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>{m.employee.department || m.employee.empId}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks summary */}
        {project.tasks?.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>TASKS ({totalTasks})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {project.tasks.slice(0, 6).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10, background: "var(--surface2)", border: "1px solid var(--card-border)" }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: t.status === "Completed" ? "#10B981" : t.status === "In Progress" ? "#F59E0B" : "#94A3B8",
                  }} />
                  <p style={{
                    fontSize: 12, margin: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: "var(--text-primary)", textDecoration: t.status === "Completed" ? "line-through" : "none",
                    opacity: t.status === "Completed" ? 0.6 : 1,
                  }}>
                    {t.title}
                  </p>
                </div>
              ))}
              {totalTasks > 6 && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>+{totalTasks - 6} more tasks</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminProject() {
  const [projects,     setProjects]     = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);

  const [activeTab,    setActiveTab]    = useState("projects"); // "projects" | "analytics"
  const [selected,     setSelected]     = useState(null);   // project shown in panel
  const [showForm,     setShowForm]     = useState(false);
  const [editProject,  setEditProject]  = useState(null);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);

  // Filters
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPrio,   setFilterPrio]   = useState("All");
  const [sortBy,       setSortBy]       = useState("newest");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, eRes, sRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/employees`),
        axios.get(`${API}/projects/stats`),
      ]);
      setProjects(Array.isArray(pRes.data) ? pRes.data : []);
      setEmployees(Array.isArray(eRes.data) ? eRes.data : []);
      setStats(sRes.data);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim()) return showToast("Project name is required", "error");
    if (!form.teamLeadId && form.memberIds.length === 0) return showToast("Assign at least a team lead or member", "error");
    setSaving(true);
    try {
      const res = await axios.post(`${API}/projects`, { ...form, assignedBy: "Admin" });
      setProjects(prev => [res.data, ...prev]);
      setStats(s => s ? { ...s, total: s.total + 1 } : s);
      setShowForm(false);
      setForm(EMPTY_FORM);
      showToast("Project created!");
      setSelected(res.data);
    } catch { showToast("Failed to create project", "error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!form.name.trim()) return showToast("Project name is required", "error");
    setSaving(true);
    try {
      const res = await axios.patch(`${API}/projects/${editProject.id}`, { ...form, assignedBy: "Admin" });
      setProjects(prev => prev.map(p => p.id === editProject.id ? res.data : p));
      if (selected?.id === editProject.id) setSelected(res.data);
      setEditProject(null);
      setShowForm(false);
      setForm(EMPTY_FORM);
      showToast("Project updated!");
    } catch { showToast("Failed to update project", "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    try {
      await axios.delete(`${API}/projects/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
      showToast("Project deleted");
    } catch { showToast("Failed to delete project", "error"); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await axios.patch(`${API}/projects/${id}`, { status });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      if (selected?.id === id) setSelected(prev => ({ ...prev, status }));
    } catch { showToast("Failed to update status", "error"); }
  };

  const handleProgressChange = async (id, progress) => {
    try {
      await axios.patch(`${API}/projects/${id}`, { progress });
      setProjects(prev => prev.map(p => p.id === id ? { ...p, progress } : p));
      if (selected?.id === id) setSelected(prev => ({ ...prev, progress }));
      showToast("Progress updated!");
    } catch { showToast("Failed to update progress", "error"); }
  };

  const openEdit = (project) => {
    setForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
      priority: project.priority,
      startDate: project.startDate ? project.startDate.split("T")[0] : "",
      endDate: project.endDate ? project.endDate.split("T")[0] : "",
      budget: project.budget || "",
      category: project.category || "",
      teamLeadId: project.teamLeadId || "",
      memberIds: (project.members || []).filter(m => m.empId !== project.teamLeadId).map(m => m.empId),
      progress: project.progress ?? 0,
    });
    setEditProject(project);
    setShowForm(true);
  };

  // ── Filtering + Sorting ────────────────────────────────────────────────────
  const filtered = projects
    .filter(p => {
      if (filterStatus !== "All" && p.status !== filterStatus) return false;
      if (filterPrio !== "All" && p.priority !== filterPrio) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) ||
               p.description?.toLowerCase().includes(q) ||
               p.teamLead?.name.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest")   return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest")   return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "deadline") return (a.endDate ? new Date(a.endDate) : Infinity) - (b.endDate ? new Date(b.endDate) : Infinity);
      if (sortBy === "progress") return b.progress - a.progress;
      if (sortBy === "priority") {
        const ord = { critical: 0, high: 1, medium: 2, low: 3 };
        return (ord[a.priority] ?? 2) - (ord[b.priority] ?? 2);
      }
      return 0;
    });

  
  const inp = {
    background: "var(--surface2)", border: "1px solid var(--card-border)",
    color: "var(--text-primary)", outline: "none", borderRadius: 10,
    padding: "8px 12px", fontSize: 13, boxSizing: "border-box",
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: "3px solid rgba(26,171,219,0.2)", borderTopColor: "#1AABDB",
        animation: "spin 0.75s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Toast toast={toast} />

      {/* Form drawer (create / edit) */}
      {showForm && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
        }}
          onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); setEditProject(null); setForm(EMPTY_FORM); } }}>
          <div style={{
            width: "100%", maxWidth: 560, maxHeight: "90vh", overflow: "hidden",
            borderRadius: 20, background: "var(--card-bg)", border: "1px solid var(--card-border)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.35)", display: "flex", flexDirection: "column",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid var(--card-border)", background: "var(--surface2)",
            }}>
              <p style={{ fontWeight: 700, fontSize: 15, margin: 0, color: "var(--text-primary)" }}>
                {editProject ? "Edit Project" : "Create New Project"}
              </p>
              <button onClick={() => { setShowForm(false); setEditProject(null); setForm(EMPTY_FORM); }}
                style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: 20, flex: 1 }}>
              <ProjectForm
                form={form} setForm={setForm} employees={employees}
                saving={saving} isEdit={!!editProject}
                onSubmit={editProject ? handleUpdate : handleCreate}
                onCancel={() => { setShowForm(false); setEditProject(null); setForm(EMPTY_FORM); }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 4, background: "#1AABDB" }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Projects</h1>
          </div>
          <p style={{ fontSize: 14, marginLeft: 12, color: "var(--text-secondary)", margin: 0 }}>
            Manage and track all company projects
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchAll}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 12,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
              background: "rgba(26,171,219,0.08)", color: "#1AABDB", border: "1px solid rgba(26,171,219,0.2)",
            }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
          <button onClick={() => { setForm(EMPTY_FORM); setEditProject(null); setShowForm(true); }}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: "pointer",
              background: "#1AABDB", color: "#fff", border: "none",
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "Total",       value: stats.total,                                         color: "#1AABDB" },
            { label: "In Progress", value: stats.byStatus?.["In Progress"] || 0,                color: "#F59E0B" },
            { label: "Completed",   value: stats.byStatus?.["Completed"] || 0,                  color: "#10B981" },
            {label:   "Under Review", value: stats.byStatus?.["Under Review"] || 0,                color: "#5cf67b" },
            { label: "On Hold",     value: (stats.byStatus?.["On Hold"] || 0) + (stats.byStatus?.["Cancelled"] || 0), color: "#EF4444" },
            { label: "Total Tasks", value: stats.totalTasks || 0,                               color: "#8B5CF6" },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 16, padding: "16px 18px", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <div style={{ width: 28, height: 4, borderRadius: 9999, marginBottom: 10, background: s.color }} />
              <p style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "var(--text-secondary)" }}>{s.label}</p>
              <p style={{ fontSize: 28, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: "inline-flex", gap: 4, marginBottom: 24, padding: 4, borderRadius: 12,
        background: "var(--surface2)", border: "1px solid var(--card-border)",
      }}>
        {[
          { key: "projects",  label: "Projects",  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/></svg> },
          { key: "analytics", label: "Analytics", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              ...(activeTab === tab.key
                ? { background: "#1AABDB", color: "#fff" }
                : { background: "transparent", color: "var(--text-secondary)" }),
            }}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Analytics tab */}
      {activeTab === "analytics" && <ProjectAnalytics projects={projects} />}

      {/* Projects tab */}
      {activeTab === "projects" && <>

      <div style={{ borderRadius: 16, padding: 16, marginBottom: 18, background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          {/* Search */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inp, paddingLeft: 32, width: "100%" }}
                onFocus={e => e.target.style.border = "1px solid #1AABDB"}
                onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
            </div>
          </div>

          {[
            { label: "Status",   value: filterStatus, set: setFilterStatus, opts: ["All", ...PROJECT_STATUSES] },
            { label: "Priority", value: filterPrio,   set: setFilterPrio,   opts: ["All", ...PRIORITIES.map(p => p.charAt(0).toUpperCase() + p.slice(1))], raw: ["All", ...PRIORITIES] },
            { label: "Sort by",  value: sortBy,       set: setSortBy,
              opts: ["newest", "oldest", "deadline", "progress", "priority"],
              labels: ["Newest First", "Oldest First", "By Deadline", "By Progress", "By Priority"] },
          ].map(f => (
            <div key={f.label}>
              <select value={f.value} onChange={e => f.set(e.target.value)} style={{ ...inp }}>
                {(f.raw || f.opts).map((o, i) => <option key={o} value={o}>{f.labels ? f.labels[i] : f.opts[i]}</option>)}
              </select>
            </div>
          ))}

          {(search || filterStatus !== "All" || filterPrio !== "All" ) && (
            <button onClick={() => { setSearch(""); setFilterStatus("All"); setFilterPrio("All"); }}
              style={{ padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table + Panel layout */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>

        {/* Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </p>

          {filtered.length === 0 ? (
            <div style={{ borderRadius: 16, padding: "64px 0", textAlign: "center", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>📋</p>
              <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "0 0 16px" }}>
                {projects.length === 0 ? "No projects yet" : "No projects match your filters"}
              </p>
              {projects.length === 0 && (
                <button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
                  style={{ padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: 700, background: "#1AABDB", color: "#fff", border: "none", cursor: "pointer" }}>
                  + Create First Project
                </button>
              )}
            </div>
          ) : (
            <div style={{ borderRadius: 16, overflow: "hidden", background: "var(--card-bg)", border: "1px solid var(--card-border)" }}>
              {/* Table head */}
              <div style={{
                display: "grid",
                gridTemplateColumns: selected ? "2fr 100px 80px 100px 100px" : "2fr 120px 90px 120px 120px 100px",
                padding: "10px 16px", borderBottom: "1px solid var(--card-border)",
                background: "var(--surface2)",
              }}>
                {["Project", "Status", "Priority", "Progress", "Deadline", ...(selected ? [] : ["Team"])].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {filtered.map(project => {
                const isActive = selected?.id === project.id;
                const daysLeft = project.endDate
                  ? Math.ceil((new Date(project.endDate) - new Date()) / 86400000)
                  : null;
                return (
                  <div key={project.id}
                    onClick={() => setSelected(isActive ? null : project)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: selected ? "2fr 100px 80px 100px 100px" : "2fr 120px 90px 120px 120px 100px",
                      padding: "14px 16px", cursor: "pointer", alignItems: "center",
                      borderBottom: "1px solid var(--card-border)",
                      background: isActive ? "rgba(26,171,219,0.06)" : "transparent",
                      borderLeft: isActive ? "3px solid #1AABDB" : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface2)"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>

                    {/* Name col */}
                    <div style={{ minWidth: 0, paddingRight: 12 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {project.name}
                      </p>
                      <p style={{ fontSize: 11, margin: 0, color: "var(--text-muted)" }}>
                        {project.category || "—"} · {project.members?.length || 0} member{(project.members?.length || 0) !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <StatusBadge status={project.status} />
                    <PriorityBadge priority={project.priority} />

                    {/* Progress */}
                    <div style={{ paddingRight: 8 }}>
                      <ProgressBar value={project.progress} />
                    </div>

                    {/* Deadline */}
                    <div>
                      {project.endDate ? (
                        <>
                          <p style={{ fontSize: 12, margin: 0, fontWeight: 500, color: "var(--text-primary)" }}>
                            {new Date(project.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                          {project.status !== "Completed" && project.status !== "Cancelled" && daysLeft !== null && (
                            <p style={{ fontSize: 10, margin: 0, color: daysLeft < 0 ? "#EF4444" : daysLeft < 7 ? "#F59E0B" : "#10B981" }}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                            </p>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>—</span>
                      )}
                    </div>

                    {/* Team (hidden when panel open) */}
                    {!selected && (
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {(project.members || []).slice(0, 4).map((m, i) => (
                          <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i }}>
                            <Avatar name={m.employee.name} photo={m.employee.photo} size={26} />
                          </div>
                        ))}
                        {(project.members || []).length > 4 && (
                          <div style={{
                            width: 26, height: 26, borderRadius: "50%", marginLeft: -8,
                            background: "var(--surface2)", border: "1px solid var(--card-border)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700, color: "var(--text-muted)",
                          }}>
                            +{project.members.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side panel */}
        {selected && (
          <SidePanel
            project={selected}
            employees={employees}
            onClose={() => setSelected(null)}
            onEdit={openEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onProgressChange={handleProgressChange}
          />
        )}
      </div>
      </>}
    </div>
  );
}