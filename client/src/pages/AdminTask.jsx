import { useState, useEffect, useRef } from "react";
import axios from "axios";
import BASE_URL from "../config";

const API = `${BASE_URL}/api`;

const PROJECT_STATUSES = ["Not Started", "In Progress", "Under Review", "On Hold", "Completed"];
const TASK_STATUSES    = ["Not Started", "In Progress", "Under Review", "On Hold", "Completed"];
const PRIORITIES       = ["low", "medium", "high"];

const STATUS_CFG = {
  "Not Started": { color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", dot: "#94A3B8" },
  "In Progress": { color: "#F59E0B", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.2)",  dot: "#F59E0B" },
  "On Hold":     { color: "#EF4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.2)",   dot: "#EF4444" },
  "Under Review": { color: "#1AABDB", bg: "rgba(26,171,219,0.1)",  border: "rgba(26,171,219,0.2)",  dot: "#1AABDB" },
  "Completed":   { color: "#10B981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.2)",  dot: "#10B981" },
};

const PRIORITY_CFG = {
  low:    { color: "#64748B", label: "Low"    },
  medium: { color: "#F59E0B", label: "Medium" },
  high:   { color: "#EF4444", label: "High"   },
};

const TL_POSITIONS = ["tech lead", "innovation manager", "computer research analyst", "product designer", "ui/ux designer"];
const isTL = pos => TL_POSITIONS.includes((pos || "").toLowerCase().trim());

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ status, size = "sm" }) {
  const s = status || "Not Started";
  const c = STATUS_CFG[s] || STATUS_CFG["Not Started"];
  const pad = size === "xs"
    ? { padding: "2px 8px", fontSize: 10 }
    : { padding: "4px 10px", fontSize: 12 };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      borderRadius: 9999, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      ...pad,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: c.dot }} />
      {s}
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

function Toast({ toast }) {
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      display: "flex", alignItems: "center", gap: 8,
      padding: "12px 16px", borderRadius: 16,
      boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      color: "#fff", fontSize: 14, fontWeight: 600, minWidth: 220,
      background: isErr ? "#EF4444" : "#10B981",
    }}>
      {isErr
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      }
      {toast.msg}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: "100%", maxWidth: 448, borderRadius: 16, overflow: "hidden",
        background: "var(--card-bg)", border: "1px solid var(--card-border)",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid var(--card-border)",
          background: "var(--surface2)",
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0 }}>{title}</p>
          <button onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-muted)", background: "transparent", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

// ── TaskFormFields ────────────────────────────────────────────────────────────
function TaskFormFields({ taskForm, setTaskForm }) {
  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 12, fontSize: 14,
    background: "var(--surface2)", border: "1px solid var(--card-border)",
    color: "var(--text-primary)", outline: "none", boxSizing: "border-box",
    transition: "border 0.15s",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--text-muted)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Task Title *</label>
        <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Build login page" style={inputStyle}
          onFocus={e => e.target.style.border = "1px solid #1AABDB"}
          onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Optional details…" rows={2}
          style={{ ...inputStyle, resize: "none" }}
          onFocus={e => e.target.style.border = "1px solid #1AABDB"}
          onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelStyle}>Priority</label>
          <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
            style={{ ...inputStyle, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Due Date</label>
          <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
            style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}
          style={{ ...inputStyle, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}>
          {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── ProjectCard ───────────────────────────────────────────────────────────────
function ProjectCard({ project, onStatusChange, onDelete, onAddTask, onEditTask, onDeleteTask, onTaskStatus }) {
  const [expanded, setExpanded] = useState(true);
  const done  = project.tasks.filter(t => t.status === "Completed").length;
  const total = project.tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{
      borderRadius: 12, overflow: "hidden", marginBottom: 12,
      background: "var(--card-bg)", border: "1px solid var(--card-border)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        background: "var(--surface2)",
        borderBottom: expanded ? "1px solid var(--card-border)" : "none",
      }}>
        <button onClick={() => setExpanded(e => !e)}
          style={{
            width: 20, height: 20, borderRadius: 4, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            color: "var(--text-muted)", background: "transparent",
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: expanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {project.name}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
            by {project.assignedBy} · {total} task{total !== 1 ? "s" : ""}
            {" "}· {new Date(project.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {total > 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{pct}%</p>
              <div style={{ width: 64, height: 6, borderRadius: 9999, marginTop: 2, background: "var(--card-border)" }}>
                <div style={{ width: `${pct}%`, background: pct === 100 ? "#10B981" : "#1AABDB", height: "100%", borderRadius: 9999 }} />
              </div>
            </div>
          )}

          <select value={project.status} onChange={e => onStatusChange(project.id, e.target.value)}
            style={{
              padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer",
              background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)',
            }}>
            {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          <button onClick={() => onAddTask(project)}
            title="Add task"
            style={{
              width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(26,171,219,0.25)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 16,
              background: "rgba(26,171,219,0.12)", color: "#1AABDB", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(26,171,219,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(26,171,219,0.12)"}>
            +
          </button>

          <button onClick={() => onDelete(project.id)}
            title="Delete project"
            style={{
              width: 28, height: 28, borderRadius: 8, border: "1px solid rgba(239,68,68,0.2)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(239,68,68,0.08)", color: "#EF4444", transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.18)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(239,68,68,0.08)"}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Tasks */}
      {expanded && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {project.tasks.length === 0 ? (
            <div style={{
              padding: "20px 0", textAlign: "center", borderRadius: 12,
              border: "1.5px dashed var(--card-border)",
            }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>No tasks yet</p>
              <button onClick={() => onAddTask(project)}
                style={{
                  marginTop: 6, fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 8,
                  color: "#1AABDB", background: "rgba(26,171,219,0.08)", border: "none", cursor: "pointer",
                }}>
                + Add first task
              </button>
            </div>
          ) : project.tasks.map(task => {
            return (
              <div key={task.id}
                className="task-row"
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px",
                  borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--card-border)",
                  position: "relative",
                }}
                onMouseEnter={e => { const btns = e.currentTarget.querySelector(".task-actions"); if (btns) btns.style.opacity = 1; }}
                onMouseLeave={e => { const btns = e.currentTarget.querySelector(".task-actions"); if (btns) btns.style.opacity = 0; }}>
                <div style={{
                  width: 4, alignSelf: "stretch", borderRadius: 9999, flexShrink: 0, minHeight: 16,
                  background: PRIORITY_CFG[task.priority]?.color || "#64748B",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{
                      fontSize: 14, fontWeight: 500, margin: 0,
                      color: "var(--text-primary)",
                      textDecoration: task.status === "Completed" ? "line-through" : "none",
                      opacity: task.status === "Completed" ? 0.6 : 1,
                    }}>
                      {task.title}
                    </p>
                    <PriorityBadge priority={task.priority} />
                  </div>
                  {task.description && (
                    <p style={{ fontSize: 12, marginTop: 2, color: "var(--text-muted)" }}>{task.description}</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <select value={task.status} onChange={e => onTaskStatus(task.id, e.target.value)}
                      style={{
                        padding: "2px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer",
                        background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)',
                      }}>
                      {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    {task.dueDate && (
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 8,
                        background: "rgba(26,171,219,0.08)", color: "#1AABDB", border: "1px solid rgba(26,171,219,0.2)",
                      }}>
                        Due {new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>by {task.assignedBy}</span>
                  </div>
                </div>
                <div className="task-actions" style={{
                  display: "flex", gap: 4, opacity: 0, transition: "opacity 0.15s", flexShrink: 0,
                }}>
                  <button onClick={() => onEditTask(task)}
                    style={{
                      width: 24, height: 24, borderRadius: 8, border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#1AABDB", background: "transparent", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(26,171,219,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button onClick={() => onDeleteTask(task.id)}
                    style={{
                      width: 24, height: 24, borderRadius: 8, border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#EF4444", background: "transparent", transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const spinnerStyle = document.createElement("style");
spinnerStyle.textContent = `@keyframes atm-spin { to { transform: rotate(360deg); } }`;
if (!document.head.querySelector("[data-atm-spin]")) {
  spinnerStyle.setAttribute("data-atm-spin", "1");
  document.head.appendChild(spinnerStyle);
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminTaskManagement() {
  const [employees,      setEmployees]      = useState([]);
  const [activeProjects, setActiveProjects] = useState([]); // from AdminProject system
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState("active");
  const [filterDept,     setFilterDept]     = useState("All");
  const [filterTL,       setFilterTL]       = useState("All");
  const [filterStatus,   setFilterStatus]   = useState("All");
  const [search,         setSearch]         = useState("");
  const [expandedEmp,    setExpandedEmp]    = useState(null);
  const [toast,          setToast]          = useState(null);

  const [projectModal,   setProjectModal]   = useState({ open: false, empId: null, empName: "" });
  const [taskModal,      setTaskModal]      = useState({ open: false, project: null });
  const [editTaskModal,  setEditTaskModal]  = useState({ open: false, task: null });

  // projectForm now uses selectedProjectId instead of a name text field
  const [projectForm, setProjectForm] = useState({ selectedProjectId: "", files: [] });
  const [taskForm,    setTaskForm]    = useState({ title: "", description: "", status: "Not Started", priority: "medium", dueDate: "", files: [] });
  const [saving,      setSaving]      = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // fetch task management employees AND the admin projects list in parallel
      const [taskRes, projectRes] = await Promise.all([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/projects`),
      ]);
      setEmployees(Array.isArray(taskRes.data) ? taskRes.data : []);
      // only show projects that are "In Progress" (need to be worked on now)
      const inProgress = (Array.isArray(projectRes.data) ? projectRes.data : [])
        .filter(p => p.status === "In Progress");
      setActiveProjects(inProgress);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const departments = ["All", ...new Set(employees.map(e => e.department).filter(Boolean))];
  const teamLeads   = ["All", ...new Set(employees.map(e => e.teamLead).filter(Boolean))];

  const filtered = employees.filter(emp => {
    const matchDept   = filterDept === "All" || emp.department === filterDept;
    const matchTL     = filterTL === "All"   || emp.teamLead === filterTL;
    const matchSearch = emp.name?.toLowerCase().includes(search.toLowerCase()) ||
                        emp.empId?.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "active") {
      const matchStatus = filterStatus === "All" || emp.projects?.some(p => p.status === filterStatus);
      return matchDept && matchTL && matchSearch && matchStatus;
    } else {
      return matchDept && matchTL && matchSearch && emp.projects?.some(p => p.status === "Completed");
    }
  });

  const allProjects = employees.flatMap(e => e.projects || []);
  const stats = {
    employees:  employees.length,
    active:     allProjects.filter(p => p.status === "In Progress").length,
    completed:  allProjects.filter(p => p.status === "Completed").length,
    tasks:      allProjects.reduce((a, p) => a + p.tasks.length, 0),
  };

  // ── Project actions ────────────────────────────────────────────────────────
  const handleAssignProject = async () => {
    if (!projectForm.selectedProjectId) return showToast("Please select a project", "error");
    const chosen = activeProjects.find(p => String(p.id) === String(projectForm.selectedProjectId));
    if (!chosen) return showToast("Project not found", "error");

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("empId",      projectModal.empId);
      fd.append("name",       chosen.name);
      fd.append("status",     "In Progress");
      fd.append("assignedBy", "Admin");
      fd.append("projectRef", chosen.id); // optional: link back to source project
      (projectForm.files || []).forEach(f => fd.append("files", f));
      await axios.post(`${API}/tasks/projects`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setProjectModal({ open: false, empId: null, empName: "" });
      showToast(`"${chosen.name}" assigned!`);
      await fetchData();
    } catch { showToast("Failed to assign project", "error"); }
    finally { setSaving(false); }
  };

  const handleProjectStatus = async (projectId, status) => {
    try {
      await axios.patch(`${API}/tasks/projects/${projectId}`, { status, assignedBy: "Admin" });
      setEmployees(prev => prev.map(emp => ({
        ...emp,
        projects: emp.projects?.map(p => p.id === projectId ? { ...p, status } : p)
      })));
    } catch { showToast("Failed to update project", "error"); }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    try {
      await axios.delete(`${API}/tasks/projects/${projectId}`);
      showToast("Project deleted");
      await fetchData();
    } catch { showToast("Failed to delete project", "error"); }
  };

  // ── Task actions ───────────────────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return showToast("Task title required", "error");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title",       taskForm.title.trim());
      fd.append("description", taskForm.description);
      fd.append("status",      taskForm.status);
      fd.append("priority",    taskForm.priority);
      fd.append("dueDate",     taskForm.dueDate);
      fd.append("assignedBy",  "Admin");
      (taskForm.files || []).forEach(f => fd.append("files", f));
      await axios.post(`${API}/tasks/projects/${taskModal.project.id}/tasks`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setTaskModal({ open: false, project: null });
      showToast("Task added!");
      await fetchData();
    } catch (err) {
      console.error("handleCreateTask error:", err);
      showToast("Failed to add task", "error");
    } finally { setSaving(false); }
  };

  const handleEditTask = async () => {
    if (!taskForm.title.trim()) return showToast("Task title required", "error");
    setSaving(true);
    try {
      await axios.patch(`${API}/tasks/tasks/${editTaskModal.task.id}`, { ...taskForm, assignedBy: "Admin" });
      setEditTaskModal({ open: false, task: null });
      showToast("Task updated!");
      await fetchData();
    } catch { showToast("Failed to update task", "error"); }
    finally { setSaving(false); }
  };

  const handleTaskStatus = async (taskId, status) => {
    try {
      await axios.patch(`${API}/tasks/tasks/${taskId}/status`, { status, updatedByName: "Admin" });
      setEmployees(prev => prev.map(emp => ({
        ...emp,
        projects: emp.projects?.map(p => ({
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, status } : t)
        }))
      })));
    } catch { showToast("Failed to update task", "error"); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      await axios.delete(`${API}/tasks/tasks/${taskId}`);
      showToast("Task deleted");
      await fetchData();
    } catch { showToast("Failed to delete task", "error"); }
  };

  const openAddTask = (project) => {
    setTaskForm({ title: "", description: "", status: "Not Started", priority: "medium", dueDate: "", files: [] });
    setTaskModal({ open: true, project });
  };

  const openEditTask = (task) => {
    setTaskForm({
      title: task.title, description: task.description || "",
      status: task.status, priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setEditTaskModal({ open: true, task });
  };

  const getInitials = name => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const hasFilters = filterDept !== "All" || filterTL !== "All" || filterStatus !== "All" || search;

  const inputStyle = {
    background: "var(--surface2)", border: "1px solid var(--card-border)",
    color: "var(--text-primary)", outline: "none", borderRadius: 12,
    padding: "8px 12px", fontSize: 14, boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6, color: "var(--text-muted)" };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 256 }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        border: "2px solid #1AABDB", borderTopColor: "transparent",
        animation: "atm-spin 0.75s linear infinite",
      }} />
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <Toast toast={toast} />

      {/* ── Assign Project Modal — now uses a dropdown ── */}
      <Modal open={projectModal.open}
        onClose={() => setProjectModal({ open: false, empId: null, empName: "" })}
        title={`Assign Project — ${projectModal.empName}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Project dropdown */}
          <div>
            <label style={labelStyle}>Select Project *</label>
            {activeProjects.length === 0 ? (
              <div style={{
                padding: "12px 14px", borderRadius: 12, fontSize: 13,
                background: "rgba(245,158,11,0.08)", color: "#F59E0B",
                border: "1px solid rgba(245,158,11,0.2)",
              }}>
                No "In Progress" projects available. Create and set a project to In Progress in the Projects section first.
              </div>
            ) : (
              <select
                value={projectForm.selectedProjectId}
                onChange={e => setProjectForm(p => ({ ...p, selectedProjectId: e.target.value }))}
                style={{
                  ...inputStyle, width: "100%",
                  background: "var(--card-bg)", color: "var(--text-primary)",
                  border: "1px solid var(--card-border)",
                }}
                onFocus={e => e.target.style.border = "1px solid #1AABDB"}
                onBlur={e => e.target.style.border = "1px solid var(--card-border)"}>
                <option value="">— Select a project —</option>
                {activeProjects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.category ? ` · ${p.category}` : ""}
                  </option>
                ))}
              </select>
            )}
            {/* show selected project details */}
            {projectForm.selectedProjectId && (() => {
              const proj = activeProjects.find(p => String(p.id) === String(projectForm.selectedProjectId));
              return proj ? (
                <div style={{
                  marginTop: 8, padding: "10px 12px", borderRadius: 10,
                  background: "rgba(26,171,219,0.06)", border: "1px solid rgba(26,171,219,0.15)",
                  display: "flex", flexDirection: "column", gap: 4,
                }}>
                  {proj.description && (
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                      {proj.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {proj.endDate && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        📅 Deadline: {new Date(proj.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {proj.priority && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                        🔺 Priority: {proj.priority}
                      </span>
                    )}
                    {proj.members?.length > 0 && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        👥 {proj.members.length} member{proj.members.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              ) : null;
            })()}
          </div>

          {/* File attachment */}
          <div>
            <label style={labelStyle}>
              Attach Documents <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="file" multiple
              onChange={e => setProjectForm(p => ({ ...p, files: Array.from(e.target.files) }))}
              style={{ ...inputStyle, width: "100%", fontSize: 12 }} />
            {projectForm.files.length > 0 && (
              <p style={{ fontSize: 10, marginTop: 4, color: "#1AABDB" }}>
                {projectForm.files.length} file{projectForm.files.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button onClick={handleAssignProject} disabled={saving || activeProjects.length === 0}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: "#fff", border: "none",
                cursor: saving || activeProjects.length === 0 ? "not-allowed" : "pointer",
                background: saving || activeProjects.length === 0 ? "rgba(26,171,219,0.4)" : "#1AABDB",
              }}>
              {saving ? "Assigning…" : "Assign Project"}
            </button>
            <button onClick={() => setProjectModal({ open: false, empId: null, empName: "" })}
              style={{
                padding: "10px 16px", borderRadius: 12, fontSize: 14, cursor: "pointer",
                background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--card-border)",
              }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Task Modal */}
      <Modal open={taskModal.open} onClose={() => setTaskModal({ open: false, project: null })}
        title={`Add Task — ${taskModal.project?.name || ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TaskFormFields taskForm={taskForm} setTaskForm={setTaskForm} />
          <div>
            <label style={labelStyle}>
              Attach Documents <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="file" multiple
              onChange={e => setTaskForm(p => ({ ...p, files: Array.from(e.target.files) }))}
              style={{ ...inputStyle, width: "100%", fontSize: 12 }} />
            {taskForm.files?.length > 0 && (
              <p style={{ fontSize: 10, marginTop: 4, color: "#1AABDB" }}>
                {taskForm.files.length} file{taskForm.files.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button onClick={handleCreateTask} disabled={saving}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer",
                background: saving ? "rgba(26,171,219,0.5)" : "#1AABDB",
              }}>
              {saving ? "Adding…" : "Add Task"}
            </button>
            <button onClick={() => setTaskModal({ open: false, project: null })}
              style={{
                padding: "10px 16px", borderRadius: 12, fontSize: 14, cursor: "pointer",
                background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--card-border)",
              }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={editTaskModal.open} onClose={() => setEditTaskModal({ open: false, task: null })}
        title="Edit Task">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TaskFormFields taskForm={taskForm} setTaskForm={setTaskForm} />
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button onClick={handleEditTask} disabled={saving}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer",
                background: saving ? "rgba(26,171,219,0.5)" : "#1AABDB",
              }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button onClick={() => setEditTaskModal({ open: false, task: null })}
              style={{
                padding: "10px 16px", borderRadius: 12, fontSize: 14, cursor: "pointer",
                background: "var(--surface2)", color: "var(--text-secondary)", border: "1px solid var(--card-border)",
              }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 4, background: "#1AABDB" }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Task Management</h1>
          </div>
          <p style={{ fontSize: 14, marginLeft: 12, color: "var(--text-secondary)", margin: 0 }}>
            Assign and track projects across the organisation
          </p>
        </div>
        <button onClick={fetchData}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 12,
            fontSize: 14, fontWeight: 500, flexShrink: 0, cursor: "pointer",
            background: "rgba(26,171,219,0.08)", color: "#1AABDB", border: "1px solid rgba(26,171,219,0.2)",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(26,171,219,0.15)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(26,171,219,0.08)"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 16, marginBottom: 24,
      }}>
        {[
          { label: "Employees",       value: stats.employees, color: "#1AABDB" },
          { label: "Active Projects", value: stats.active,    color: "#F59E0B" },
          { label: "Completed",       value: stats.completed, color: "#10B981" },
          { label: "Total Tasks",     value: stats.tasks,     color: "#8B5CF6" },
          { label: "In Progress (System)", value: activeProjects.length, color: "#1AABDB" },
        ].map(s => (
          <div key={s.label} style={{
            borderRadius: 16, padding: 20,
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
          }}>
            <div style={{ width: 32, height: 4, borderRadius: 9999, marginBottom: 12, background: s.color }} />
            <p style={{ fontSize: 12, fontWeight: 500, marginBottom: 4, color: "var(--text-secondary)" }}>{s.label}</p>
            <p style={{ fontSize: 30, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: "inline-flex", gap: 4, marginBottom: 20, padding: 4, borderRadius: 12,
        background: "var(--surface2)", border: "1px solid var(--card-border)",
      }}>
        {[
          { key: "active",  label: "Active Projects" },
          { key: "history", label: "Completed History" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
              border: "none", cursor: "pointer", transition: "all 0.15s",
              ...(activeTab === tab.key
                ? { background: "#1AABDB", color: "#fff" }
                : { background: "transparent", color: "var(--text-secondary)" }),
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        borderRadius: 16, padding: 16, marginBottom: 20,
        background: "var(--card-bg)", border: "1px solid var(--card-border)",
      }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>Search</label>
            <div style={{ position: "relative" }}>
              <div style={{
                position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-muted)", pointerEvents: "none",
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <input type="text" placeholder="Name or ID…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, width: "100%", paddingLeft: 36 }}
                onFocus={e => e.target.style.border = "1px solid #1AABDB"}
                onBlur={e => e.target.style.border = "1px solid var(--card-border)"} />
            </div>
          </div>

          {[
            { label: "Department", value: filterDept,   set: setFilterDept,   opts: departments },
            { label: "Team Lead",  value: filterTL,     set: setFilterTL,     opts: teamLeads },
            ...(activeTab === "active" ? [{ label: "Status", value: filterStatus, set: setFilterStatus, opts: ["All", ...PROJECT_STATUSES] }] : []),
          ].map(f => (
            <div key={f.label}>
              <label style={labelStyle}>{f.label}</label>
              <select value={f.value} onChange={e => f.set(e.target.value)}
                style={{ ...inputStyle, background: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--card-border)' }}
                onFocus={e => e.target.style.border = "1px solid #1AABDB"}
                onBlur={e => e.target.style.border = "1px solid var(--card-border)"}>
                {f.opts.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}

          {hasFilters && (
            <button onClick={() => { setFilterDept("All"); setFilterTL("All"); setFilterStatus("All"); setSearch(""); }}
              style={{
                padding: "8px 12px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
                color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Result count */}
      <p style={{ fontSize: 12, marginBottom: 12, color: "var(--text-muted)" }}>
        {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
        {activeTab === "history" ? " with completed projects" : ""}
      </p>

      {/* Employee list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{
            borderRadius: 16, padding: "64px 0", textAlign: "center",
            background: "var(--card-bg)", border: "1px solid var(--card-border)",
          }}>
            <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
              {activeTab === "history" ? "No completed projects yet" : "No employees match your filters"}
            </p>
          </div>
        ) : filtered.map(emp => {
          const isOpen = expandedEmp === emp.empId;
          const shownProjects = activeTab === "history"
            ? (emp.projects || []).filter(p => p.status === "Completed")
            : (emp.projects || []).filter(p => p.status !== "Completed");
          const totalTasks = shownProjects.reduce((a, p) => a + p.tasks.length, 0);
          const doneTasks  = shownProjects.reduce((a, p) => a + p.tasks.filter(t => t.status === "Completed").length, 0);

          return (
            <div key={emp.empId} style={{
              borderRadius: 16, overflow: "hidden",
              background: "var(--card-bg)", border: "1px solid var(--card-border)",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                cursor: "pointer", transition: "background 0.15s",
                background: isOpen ? "var(--surface2)" : "transparent",
              }}
                onClick={() => setExpandedEmp(isOpen ? null : emp.empId)}
                onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "var(--surface2)"; }}
                onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}>

                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#fff", background: "#1AABDB",
                }}>
                  {getInitials(emp.name)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", margin: 0 }}>{emp.name}</p>
                    {isTL(emp.position) && (
                      <span style={{
                        fontSize: 12, padding: "2px 6px", borderRadius: 9999, fontWeight: 600,
                        background: "rgba(168,85,247,0.1)", color: "#a855f7",
                      }}>TL</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                    {emp.empId} · {emp.department || "—"}
                    {" "}· {shownProjects.length} project{shownProjects.length !== 1 ? "s" : ""}
                    {totalTasks > 0 && ` · ${doneTasks}/${totalTasks} tasks done`}
                  </p>
                </div>

                {emp.dailyWorkStatus && (
                  <p style={{
                    fontSize: 12, fontStyle: "italic", flexShrink: 0,
                    maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: "var(--text-muted)", margin: 0,
                  }} title={emp.dailyWorkStatus}>
                    "{emp.dailyWorkStatus}"
                  </p>
                )}

                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {shownProjects.slice(0, 3).map(p => (
                    <StatusBadge key={p.id} status={p.status} size="xs" />
                  ))}
                  {shownProjects.length > 3 && (
                    <span style={{
                      fontSize: 12, padding: "2px 6px", borderRadius: 9999,
                      background: "var(--surface2)", color: "var(--text-muted)", border: "1px solid var(--card-border)",
                    }}>
                      +{shownProjects.length - 3}
                    </span>
                  )}
                </div>

                {activeTab === "active" && (
                  <div onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setProjectForm({ selectedProjectId: "", files: [] });
                        setProjectModal({ open: true, empId: emp.empId, empName: emp.name });
                      }}
                      style={{
                        padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                        flexShrink: 0, cursor: "pointer", transition: "background 0.15s",
                        background: "rgba(26,171,219,0.1)", color: "#1AABDB", border: "1px solid rgba(26,171,219,0.25)",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(26,171,219,0.2)"}
                      onMouseLeave={e => e.currentTarget.style.background = "rgba(26,171,219,0.1)"}>
                      + Project
                    </button>
                  </div>
                )}

                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{
                    color: "var(--text-muted)", flexShrink: 0,
                    transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s",
                  }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {isOpen && (
                <div style={{
                  padding: "8px 20px 16px",
                  background: "rgba(26,171,219,0.01)", borderTop: "1px solid var(--card-border)",
                }}>
                  {shownProjects.length === 0 ? (
                    <div style={{
                      padding: "32px 0", textAlign: "center", borderRadius: 12, margin: "8px 0",
                      border: "1.5px dashed var(--card-border)",
                    }}>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {activeTab === "history" ? "No completed projects" : "No active projects assigned"}
                      </p>
                      {activeTab === "active" && (
                        <button
                          onClick={() => {
                            setProjectForm({ selectedProjectId: "", files: [] });
                            setProjectModal({ open: true, empId: emp.empId, empName: emp.name });
                          }}
                          style={{
                            marginTop: 8, fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 8,
                            color: "#1AABDB", background: "rgba(26,171,219,0.08)", border: "none", cursor: "pointer",
                          }}>
                          + Assign first project
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ marginTop: 8 }}>
                      {shownProjects.map(project => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onStatusChange={handleProjectStatus}
                          onDelete={handleDeleteProject}
                          onAddTask={openAddTask}
                          onEditTask={openEditTask}
                          onDeleteTask={handleDeleteTask}
                          onTaskStatus={handleTaskStatus}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}