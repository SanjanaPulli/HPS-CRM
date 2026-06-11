import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import BASE_URL from '../config'

const API = `${BASE_URL}/api`

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'Under Review', 'On Hold', 'Completed']
const TASK_STATUSES    = ['Not Started', 'In Progress', 'Under Review', 'On Hold', 'Completed']
const PRIORITIES       = ['low', 'medium', 'high']

const STATUS_CFG = {
  'Not Started': { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', dot: '#94A3B8' },
  'In Progress': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  dot: '#F59E0B' },
  'On Hold':     { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   dot: '#EF4444' },
  'Under Review': { color: '#1AABDB', bg: 'rgba(26,171,219,0.12)',  border: 'rgba(26,171,219,0.25)',  dot: '#1AABDB' },
  'Completed':   { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  dot: '#10B981' },
}

const PRIORITY_CFG = {
  low:    { color: '#64748B', bg: 'rgba(100,116,139,0.1)',  label: 'Low'    },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   label: 'Medium' },
  high:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    label: 'High'   },
}

const TL_POSITIONS = ['tech lead', 'innovation manager', 'computer research analyst', 'product designer']
const isTLOrManager = pos => TL_POSITIONS.includes((pos || '').toLowerCase().trim())

// ─── Small reusable pieces ───────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const s = status || 'Not Started'
  const c = STATUS_CFG[s] || STATUS_CFG['Not Started']
  const padStyle = size === 'xs'
    ? { padding: '2px 8px', fontSize: 10 }
    : { padding: '4px 10px', fontSize: 12 }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      borderRadius: 9999, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      ...padStyle
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: c.dot }} />
      {s}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const p = priority || 'medium'
  const c = PRIORITY_CFG[p] || PRIORITY_CFG.medium
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 9999,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      background: c.bg, color: c.color
    }}>
      {c.label}
    </span>
  )
}

function StatusSelect({ value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const btnRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = e => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [open])

  useEffect(() => {
    if (!open) return
    const h = () => setOpen(false)
    window.addEventListener('scroll', h, true)
    return () => window.removeEventListener('scroll', h, true)
  }, [open])

  const handleToggle = () => {
    if (disabled) return
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const menuH = options.length * 42
      const openUp = spaceBelow < menuH + 8
      setDropdownStyle({
        position: 'fixed',
        left: rect.left,
        width: Math.max(rect.width, 160),
        zIndex: 99999,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      })
    }
    setOpen(o => !o)
  }

  const c = STATUS_CFG[value] || STATUS_CFG['Not Started']

  const menu = open && createPortal(
    <div style={{
      ...dropdownStyle,
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
    }}>
      {options.map(s => {
        const sc = STATUS_CFG[s] || STATUS_CFG['Not Started']
        return (
          <button key={s} type="button"
            onClick={() => { onChange(s); setOpen(false) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', fontSize: 12, fontWeight: 600, textAlign: 'left',
              border: 'none', cursor: 'pointer',
              color: sc.color, background: s === value ? 'var(--surface2)' : 'transparent'
            }}
            onMouseEnter={e => { if (s !== value) e.currentTarget.style.background = 'var(--surface2)' }}
            onMouseLeave={e => { if (s !== value) e.currentTarget.style.background = 'transparent' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: sc.dot }} />
            {s}
            {s === value && (
              <svg style={{ marginLeft: 'auto' }} width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )

  return (
    <div style={{ position: 'relative' }} ref={btnRef}>
      <button type="button" disabled={disabled}
        onClick={handleToggle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
          transition: 'all 0.15s',
          background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1
        }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot }} />
        {value || 'Not Started'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {menu}
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  const isErr = toast.type === 'error'
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      color: '#fff', fontSize: 14, fontWeight: 600,
      minWidth: 220,
      background: isErr ? '#EF4444' : '#10B981',
      animation: 'slideIn 0.2s ease',
    }}>
      {isErr
        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      }
      {toast.msg}
    </div>
  )
}

function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)'
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 448, borderRadius: 16, overflow: 'hidden',
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.35)', animation: 'modalIn 0.2s ease'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)'
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>{title}</p>
          <button onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', background: 'transparent', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, canEdit, empName, onStatusChange, onEdit, onDelete }) {
  const [saving, setSaving] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleStatus = async (newStatus) => {
    setSaving(true)
    await onStatusChange(task.id, newStatus)
    setSaving(false)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '12px 16px', borderRadius: 12, transition: 'background 0.15s',
        background: 'var(--surface2)', border: '1px solid var(--card-border)'
      }}>
      <div style={{
        width: 4, alignSelf: 'stretch', borderRadius: 9999, flexShrink: 0, marginTop: 2,
        background: PRIORITY_CFG[task.priority]?.color || '#64748B', minHeight: 20
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <p style={{
            fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)',
            textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
            opacity: task.status === 'Completed' ? 0.6 : 1, margin: 0
          }}>
            {task.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {task.description && (
          <p style={{ fontSize: 12, marginTop: 4, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 0 }}>
            {task.description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          <StatusSelect value={task.status} options={TASK_STATUSES} onChange={handleStatus} disabled={saving} />
          {task.dueDate && (
            <span style={{
              fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 8,
              background: 'rgba(26,171,219,0.08)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)'
            }}>
              Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>by {task.assignedBy}</span>
        </div>

        {/* ── Task documents ── */}
        {task.documents?.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {task.documents.map(doc => (
              <a key={doc.id} href={`${BASE_URL}/uploads/${doc.filename}`} target="_blank" rel="noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 500,
                  background: 'rgba(26,171,219,0.08)', color: '#1AABDB',
                  border: '1px solid rgba(26,171,219,0.2)', textDecoration: 'none', transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.16)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.08)'}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                {doc.originalName}
              </a>
            ))}
          </div>
        )}
      </div>

      {canEdit && (
        <div style={{
          display: 'flex', gap: 4, flexShrink: 0,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.15s'
        }}>
          <button onClick={() => onEdit(task)}
            style={{
              width: 24, height: 24, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', color: '#1AABDB', background: 'transparent', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(task.id)}
            style={{
              width: 24, height: 24, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', color: '#EF4444', background: 'transparent', transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, canEdit, canUpdateStatus, empName, assignerName, onProjectUpdate, onProjectDelete,
  onAddTask, onTaskStatusChange, onEditTask, onDeleteTask }) {

  const [expanded, setExpanded] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(project.name)
  const [savingName, setSavingName] = useState(false)

  const done  = project.tasks.filter(t => t.status === 'Completed').length
  const total = project.tasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  const handleNameSave = async () => {
    if (!nameVal.trim() || nameVal.trim() === project.name) { setEditingName(false); return }
    setSavingName(true)
    await onProjectUpdate(project.id, { name: nameVal.trim(), assignedBy: assignerName })
    setSavingName(false)
    setEditingName(false)
  }

  const handleStatusChange = async (newStatus) => {
    await onProjectUpdate(project.id, { status: newStatus, assignedBy: assignerName })
  }

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

      {/* Project header */}
      <div style={{
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: expanded ? '1px solid var(--card-border)' : 'none',
        background: 'var(--surface2)'
      }}>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)}
          style={{
            width: 24, height: 24, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)',
            cursor: 'pointer', transition: 'background 0.15s'
          }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Project name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingName && canEdit ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                style={{
                  flex: 1, padding: '4px 10px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                  outline: 'none', background: 'var(--card-bg)', border: '1.5px solid #1AABDB', color: 'var(--text-primary)'
                }} />
              <button onClick={handleNameSave} disabled={savingName}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  color: '#fff', background: '#1AABDB', border: 'none', cursor: 'pointer'
                }}>
                {savingName ? '…' : '✓'}
              </button>
              <button onClick={() => setEditingName(false)}
                style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 12,
                  background: 'var(--card-bg)', color: 'var(--text-muted)',
                  border: '1px solid var(--card-border)', cursor: 'pointer'
                }}>
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {project.name}
              </p>
              {canEdit && (
                <button onClick={() => { setNameVal(project.name); setEditingName(true) }}
                  style={{
                    width: 20, height: 20, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer'
                  }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          <p style={{ fontSize: 10, marginTop: 2, color: 'var(--text-muted)', marginBottom: 0 }}>
            Assigned by {project.assignedBy} · {total} task{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Progress + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {total > 0 && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{pct}%</p>
              <div style={{ width: 80, height: 6, borderRadius: 9999, marginTop: 4, background: 'var(--card-border)' }}>
                <div style={{
                  height: '100%', borderRadius: 9999, transition: 'width 0.3s',
                  width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1AABDB'
                }} />
              </div>
            </div>
          )}
          <StatusSelect
            value={project.status}
            options={PROJECT_STATUSES}
            onChange={handleStatusChange}
            disabled={!canEdit && !canUpdateStatus}
          />
          {canEdit && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => onAddTask(project)}
                title="Add task"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, cursor: 'pointer',
                  background: 'rgba(26,171,219,0.12)', color: '#1AABDB',
                  border: '1px solid rgba(26,171,219,0.25)', transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.12)'}>
                +
              </button>
              <button onClick={() => onProjectDelete(project.id)}
                title="Delete project"
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: 'rgba(239,68,68,0.08)', color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.2)', transition: 'background 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project documents */}
      {expanded && project.documents?.length > 0 && (
        <div style={{
          padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: 6,
          borderBottom: '1px solid var(--card-border)', background: 'rgba(26,171,219,0.02)'
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, alignSelf: 'center', marginRight: 4, color: 'var(--text-muted)' }}>
            Project files:
          </span>
          {project.documents.map(doc => (
            <a key={doc.id} href={`${BASE_URL}/uploads/${doc.filename}`} target="_blank" rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 8, fontSize: 10, fontWeight: 500,
                background: 'rgba(26,171,219,0.08)', color: '#1AABDB',
                border: '1px solid rgba(26,171,219,0.2)', textDecoration: 'none', transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.16)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.08)'}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              {doc.originalName}
            </a>
          ))}
        </div>
      )}

      {/* Tasks */}
      {expanded && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {project.tasks.length === 0 ? (
            <div style={{
              padding: '24px 0', textAlign: 'center', borderRadius: 12,
              border: '1.5px dashed var(--card-border)'
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>No tasks yet</p>
              {canEdit && (
                <button onClick={() => onAddTask(project)}
                  style={{
                    marginTop: 8, fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                    color: '#1AABDB', background: 'rgba(26,171,219,0.08)', border: 'none', cursor: 'pointer'
                  }}>
                  + Add first task
                </button>
              )}
            </div>
          ) : (
            project.tasks.map(task => (
              <TaskRow key={task.id} task={task} canEdit={canEdit} empName={assignerName}
                onStatusChange={onTaskStatusChange}
                onEdit={onEditTask}
                onDelete={onDeleteTask} />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Task Form Fields ─────────────────────────────────────────────────────────

function TaskFormFields({ taskForm, setTaskForm }) {
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 14,
    background: 'var(--surface2)', border: '1px solid var(--card-border)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', transition: 'border 0.15s'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
          Task Title *
        </label>
        <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Design login page UI"
          style={inputStyle}
          onFocus={e => e.target.style.border = '1px solid #1AABDB'}
          onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
          Description
        </label>
        <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Optional details…" rows={2}
          style={{ ...inputStyle, resize: 'none' }}
          onFocus={e => e.target.style.border = '1px solid #1AABDB'}
          onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>Priority</label>
          <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
            style={inputStyle}>
            {['low','medium','high'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>Due Date</label>
          <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
            style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>Status</label>
        <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}
          style={inputStyle}>
          {['Not Started','In Progress','On Hold','Completed'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function EmployeeTaskManagement() {
  const emp      = JSON.parse(localStorage.getItem('employeeAuth') || '{}')
  const empId    = emp.empId || ''
  const empName  = emp.name  || ''
  const isLeader = isTLOrManager(emp.position)
  const isManager = ['innovation manager', 'computer research analyst']
    .includes((emp.position || '').toLowerCase().trim())

  const [myData,      setMyData]      = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [eodText,     setEodText]     = useState('')
  const [eodSaving,   setEodSaving]   = useState(false)
  const [toast,       setToast]       = useState(null)
  const [teamSearch,  setTeamSearch]  = useState('')
  const [teamFilter,  setTeamFilter]  = useState('All')
  const [expandedMember, setExpandedMember] = useState(null)

  const [projectModal,  setProjectModal]  = useState({ open: false, memberId: null, memberName: '' })
  const [taskModal,     setTaskModal]     = useState({ open: false, project: null })
  const [editTaskModal, setEditTaskModal] = useState({ open: false, task: null })

  const [projectForm, setProjectForm] = useState({ name: '', status: 'Not Started', files: [] })
  const [taskForm,    setTaskForm]    = useState({ title: '', description: '', status: 'Not Started', priority: 'medium', dueDate: '', files: [] })
  const [saving,      setSaving]      = useState(false)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchMyData = async () => {
    try {
      const res = await axios.get(`${API}/tasks/${empId}`)
      setMyData(res.data)
      setEodText(res.data.dailyWorkStatus || '')
    } catch (err) { console.error(err) }
  }

  const fetchTeam = async () => {
    if (!isLeader) return
    try {
      const trimmedName = empName.trim()
      const res = await axios.get(`${API}/tasks/team/${encodeURIComponent(trimmedName)}`)
      setTeamMembers(res.data || [])
    } catch (err) {
      console.error('fetchTeam error:', err)
    }
  }

  useEffect(() => {
    const load = async () => {
      await Promise.all([fetchMyData(), fetchTeam()])
      setLoading(false)
    }
    load()
  }, [])

  // ── EOD ────────────────────────────────────────────────────────────────────

  const handleEodSubmit = async () => {
    if (!eodText.trim()) return showToast('Please write your EOD update first', 'error')
    setEodSaving(true)
    try {
      await axios.patch(`${API}/tasks/${empId}/workstatus`, { dailyWorkStatus: eodText })
      setMyData(p => ({ ...p, dailyWorkStatus: eodText }))
      showToast('EOD update submitted')
    } catch { showToast('Failed to submit EOD', 'error') }
    finally { setEodSaving(false) }
  }

  // ── Employee: self task-status update ──────────────────────────────────────

  const handleMyTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.patch(`${API}/tasks/tasks/${taskId}/status`, {
        status: newStatus, updatedByName: empName
      })
      setMyData(prev => ({
        ...prev,
        projects: prev.projects.map(p => ({
          ...p,
          tasks: p.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        }))
      }))
      showToast('Task updated')
    } catch { showToast('Failed to update task', 'error') }
  }

  // ── Employee: self project-status update ───────────────────────────────────

  const handleUpdateMyProjectStatus = async (projectId, data) => {
    try {
      await axios.patch(`${API}/tasks/projects/${projectId}`, { ...data, assignedBy: empName })
      setMyData(prev => ({
        ...prev,
        projects: prev.projects.map(p =>
          p.id === projectId ? { ...p, ...data } : p
        )
      }))
      showToast('Project status updated')
    } catch (err) {
      console.error('[handleUpdateMyProjectStatus] error:', err.response?.data || err.message)
      showToast('Failed to update status', 'error')
    }
  }

  // ── Team Lead: project actions ─────────────────────────────────────────────

  const openAddProject = (memberId, memberName) => {
    setProjectForm({ name: '', status: 'Not Started', files: [] })
    setProjectModal({ open: true, memberId, memberName })
  }

  const handleCreateProject = async () => {
    if (!projectForm.name.trim()) return showToast('Project name is required', 'error')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('empId',      projectModal.memberId)
      fd.append('name',       projectForm.name.trim())
      fd.append('status',     projectForm.status)
      fd.append('assignedBy', empName)
      projectForm.files.forEach(f => fd.append('files', f))

      await axios.post(`${API}/tasks/projects`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setProjectModal({ open: false, memberId: null, memberName: '' })
      showToast('Project assigned!')
      await fetchTeam()
    } catch { showToast('Failed to create project', 'error') }
    finally { setSaving(false) }
  }

  const handleUpdateProject = async (projectId, data) => {
    try {
      await axios.patch(`${API}/tasks/projects/${projectId}`, { ...data, assignedBy: empName })
      await fetchTeam()
    } catch { showToast('Failed to update project', 'error') }
  }

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete this project and all its tasks?')) return
    try {
      await axios.delete(`${API}/tasks/projects/${projectId}`)
      showToast('Project deleted')
      await fetchTeam()
    } catch { showToast('Failed to delete project', 'error') }
  }

  // ── Team Lead: task actions ────────────────────────────────────────────────

  const openAddTask = (project) => {
    setTaskForm({ title: '', description: '', status: 'Not Started', priority: 'medium', dueDate: '', files: [] })
    setTaskModal({ open: true, project })
  }

  const handleCreateTask = async () => {
    if (!taskForm.title.trim()) return showToast('Task title is required', 'error')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',       taskForm.title.trim())
      fd.append('description', taskForm.description)
      fd.append('status',      taskForm.status)
      fd.append('priority',    taskForm.priority)
      fd.append('dueDate',     taskForm.dueDate)
      fd.append('assignedBy',  empName)
      taskForm.files.forEach(f => fd.append('files', f))

      await axios.post(`${API}/tasks/projects/${taskModal.project.id}/tasks`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setTaskModal({ open: false, project: null })
      showToast('Task added!')
      await fetchTeam()
    } catch { showToast('Failed to add task', 'error') }
    finally { setSaving(false) }
  }

  const openEditTask = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
    })
    setEditTaskModal({ open: true, task })
  }

  const handleEditTask = async () => {
    if (!taskForm.title.trim()) return showToast('Task title is required', 'error')
    setSaving(true)
    try {
      await axios.patch(`${API}/tasks/tasks/${editTaskModal.task.id}`, {
        ...taskForm,
        assignedBy: empName
      })
      setEditTaskModal({ open: false, task: null })
      showToast('Task updated!')
      await fetchTeam()
    } catch { showToast('Failed to update task', 'error') }
    finally { setSaving(false) }
  }

  const handleTeamTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.patch(`${API}/tasks/tasks/${taskId}/status`, {
        status: newStatus, updatedByName: empName
      })
      await fetchTeam()
    } catch { showToast('Failed to update task', 'error') }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await axios.delete(`${API}/tasks/tasks/${taskId}`)
      showToast('Task deleted')
      await fetchTeam()
    } catch { showToast('Failed to delete task', 'error') }
  }

  // ── Filters ────────────────────────────────────────────────────────────────

  const filteredTeam = teamMembers.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
      m.projects?.some(p => p.name.toLowerCase().includes(teamSearch.toLowerCase()))
    const matchFilter = teamFilter === 'All' ||
      m.projects?.some(p => p.status === teamFilter)
    return matchSearch && matchFilter
  })

  const getInitials = name => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  const inputStyle = {
    background: 'var(--surface2)', border: '1px solid var(--card-border)',
    color: 'var(--text-primary)', outline: 'none'
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '2px solid #1AABDB', borderTopColor: 'transparent',
        animation: 'spin 0.7s linear infinite'
      }} />
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Toast toast={toast} />

      {/* ── Add Project Modal ──────────────────────────────────────────────── */}
      <Modal open={projectModal.open} onClose={() => setProjectModal({ open: false, memberId: null, memberName: '' })}
        title={`Add Project — ${projectModal.memberName}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
              Project Name *
            </label>
            <input value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. HPS Website Redesign"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 14,
                boxSizing: 'border-box', transition: 'border 0.15s', ...inputStyle
              }}
              onFocus={e => e.target.style.border = '1px solid #1AABDB'}
              onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
              Initial Status
            </label>
            <select value={projectForm.status} onChange={e => setProjectForm(p => ({ ...p, status: e.target.value }))}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 14,
                boxSizing: 'border-box', ...inputStyle
              }}>
              {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
              Attach Documents <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="file" multiple
              onChange={e => setProjectForm(p => ({ ...p, files: Array.from(e.target.files) }))}
              style={{
                width: '100%', fontSize: 12, borderRadius: 12, padding: '8px 12px',
                boxSizing: 'border-box', background: 'var(--surface2)',
                border: '1px solid var(--card-border)', color: 'var(--text-muted)'
              }} />
            {projectForm.files.length > 0 && (
              <p style={{ fontSize: 10, marginTop: 4, color: '#1AABDB', marginBottom: 0 }}>
                {projectForm.files.length} file{projectForm.files.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={handleCreateProject} disabled={saving}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'rgba(26,171,219,0.5)' : '#1AABDB', transition: 'background 0.15s'
              }}>
              {saving ? 'Assigning…' : 'Assign Project'}
            </button>
            <button onClick={() => setProjectModal({ open: false, memberId: null, memberName: '' })}
              style={{
                padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', background: 'var(--surface2)',
                color: 'var(--text-secondary)', border: '1px solid var(--card-border)'
              }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Task Modal ─────────────────────────────────────────────────── */}
      <Modal open={taskModal.open} onClose={() => setTaskModal({ open: false, project: null })}
        title={`Add Task — ${taskModal.project?.name || ''}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TaskFormFields taskForm={taskForm} setTaskForm={setTaskForm} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
              Attach Documents <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="file" multiple
              onChange={e => setTaskForm(p => ({ ...p, files: Array.from(e.target.files) }))}
              style={{
                width: '100%', fontSize: 12, borderRadius: 12, padding: '8px 12px',
                boxSizing: 'border-box', background: 'var(--surface2)',
                border: '1px solid var(--card-border)', color: 'var(--text-muted)'
              }} />
            {taskForm.files?.length > 0 && (
              <p style={{ fontSize: 10, marginTop: 4, color: '#1AABDB', marginBottom: 0 }}>
                {taskForm.files.length} file{taskForm.files.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={handleCreateTask} disabled={saving}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'rgba(26,171,219,0.5)' : '#1AABDB', transition: 'background 0.15s'
              }}>
              {saving ? 'Adding…' : 'Add Task'}
            </button>
            <button onClick={() => setTaskModal({ open: false, project: null })}
              style={{
                padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', background: 'var(--surface2)',
                color: 'var(--text-secondary)', border: '1px solid var(--card-border)'
              }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Task Modal ────────────────────────────────────────────────── */}
      <Modal open={editTaskModal.open} onClose={() => setEditTaskModal({ open: false, task: null })}
        title="Edit Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TaskFormFields taskForm={taskForm} setTaskForm={setTaskForm} />
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={handleEditTask} disabled={saving}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
                color: '#fff', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                background: saving ? 'rgba(26,171,219,0.5)' : '#1AABDB', transition: 'background 0.15s'
              }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => setEditTaskModal({ open: false, task: null })}
              style={{
                padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', background: 'var(--surface2)',
                color: 'var(--text-secondary)', border: '1px solid var(--card-border)'
              }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Page ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 4, height: 24, borderRadius: 4, background: '#1AABDB', flexShrink: 0 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>My Tasks</h1>
            {isLeader && (
              <span style={{
                marginLeft: 8, fontSize: 12, padding: '4px 10px', borderRadius: 9999, fontWeight: 600,
                background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)'
              }}>
                {isManager ? 'Manager' : 'Team Lead'}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, marginLeft: 12, color: 'var(--text-secondary)', margin: '0 0 0 12px' }}>
            Track your projects, tasks, and submit daily work updates
          </p>
        </div>

        {/* ── My Projects ─────────────────────────────────────────────────── */}
        <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div style={{
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)'
          }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>My Projects</h2>
              <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-muted)', marginBottom: 0 }}>
                {myData?.projects?.length || 0} project{(myData?.projects?.length || 0) !== 1 ? 's' : ''} assigned to you
              </p>
            </div>
          </div>

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!myData?.projects?.length ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 16, margin: '0 auto 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface2)'
                }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>No projects assigned yet</p>
                <p style={{ fontSize: 12, marginTop: 4, color: 'var(--text-muted)', marginBottom: 0 }}>Your team lead will assign projects soon</p>
              </div>
            ) : (
              myData.projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  canEdit={false}
                  canUpdateStatus={true}
                  empName={empName}
                  assignerName={empName}
                  onProjectUpdate={handleUpdateMyProjectStatus}
                  onProjectDelete={() => {}}
                  onAddTask={() => {}}
                  onTaskStatusChange={handleMyTaskStatus}
                  onEditTask={() => {}}
                  onDeleteTask={() => {}}
                />
              ))
            )}
          </div>
        </div>

        {/* ── EOD ──────────────────────────────────────────────────────────── */}
        <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
            <h2 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>EOD Work Update</h2>
            <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-muted)', marginBottom: 0 }}>
              Submit what you worked on today — visible to your admin and team lead
            </p>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {myData?.dailyWorkStatus && (
              <div style={{ borderRadius: 12, padding: 14, background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.15)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#1AABDB', marginTop: 0 }}>Last submitted</p>
                <p style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text-secondary)', margin: 0 }}>"{myData.dailyWorkStatus}"</p>
              </div>
            )}
            <textarea value={eodText} onChange={e => setEodText(e.target.value)}
              placeholder="What did you work on today? Any blockers? What's planned for tomorrow?…"
              rows={4}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 14,
                resize: 'none', outline: 'none', transition: 'border 0.15s', boxSizing: 'border-box',
                background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)'
              }}
              onFocus={e => e.target.style.border = '1px solid #1AABDB'}
              onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{eodText.length} characters</p>
              <button onClick={handleEodSubmit} disabled={eodSaving || !eodText.trim()}
                style={{
                  padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                  color: '#fff', border: 'none', transition: 'background 0.15s',
                  background: eodSaving || !eodText.trim() ? 'rgba(26,171,219,0.4)' : '#1AABDB',
                  cursor: eodSaving || !eodText.trim() ? 'not-allowed' : 'pointer'
                }}>
                {eodSaving ? 'Submitting…' : 'Submit EOD'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Team View (TL / Manager only) ────────────────────────────────── */}
        {isLeader && (
          <div style={{ borderRadius: 16, overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div style={{
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)'
            }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>My Team</h2>
                <p style={{ fontSize: 12, marginTop: 2, color: 'var(--text-muted)', marginBottom: 0 }}>
                  {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} · Assign projects and tasks
                </p>
              </div>
            </div>

            {/* Filters */}
            <div style={{
              padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 12,
              borderBottom: '1px solid var(--card-border)'
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                <svg style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none',
                  color: 'var(--text-muted)'
                }}
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
                  placeholder="Search member or project…"
                  style={{
                    width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                    borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box',
                    background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)'
                  }}
                  onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                  onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['All', ...PROJECT_STATUSES].map(s => (
                  <button key={s} onClick={() => setTeamFilter(s)}
                    style={{
                      padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      ...(teamFilter === s
                        ? { background: '#1AABDB', color: '#fff', border: '1px solid #1AABDB' }
                        : { background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' })
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Team members list */}
            {teamMembers.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>No team members found.</p>
                <p style={{ fontSize: 12, marginTop: 4, fontWeight: 600, color: '#1AABDB', marginBottom: 0 }}>
                  Your name in system: {empName}
                </p>
              </div>
            ) : (
              <div>
                {filteredTeam.length === 0 ? (
                  <p style={{ padding: '32px 0', textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                    No members match your search
                  </p>
                ) : filteredTeam.map((member, idx) => {
                  const isOpen = expandedMember === member.empId
                  const totalTasks = member.projects?.reduce((a, p) => a + p.tasks.length, 0) || 0
                  const doneTasks  = member.projects?.reduce((a, p) =>
                    a + p.tasks.filter(t => t.status === 'Completed').length, 0) || 0

                  return (
                    <div key={member.empId} style={{ borderTop: idx > 0 ? '1px solid var(--card-border)' : 'none' }}>
                      <div style={{
                        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16,
                        cursor: 'pointer', transition: 'background 0.15s',
                        background: isOpen ? 'var(--surface2)' : 'transparent'
                      }}
                        onClick={() => setExpandedMember(isOpen ? null : member.empId)}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(26,171,219,0.03)' }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>

                        <div style={{
                          width: 36, height: 36, borderRadius: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0, background: '#1AABDB'
                        }}>
                          {getInitials(member.name)}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{member.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                            {member.position || '—'} · {member.projects?.length || 0} project{(member.projects?.length || 0) !== 1 ? 's' : ''}
                            {totalTasks > 0 && ` · ${doneTasks}/${totalTasks} tasks done`}
                          </p>
                        </div>

                        {member.dailyWorkStatus && (
                          <div style={{ maxWidth: 200, overflow: 'hidden' }}>
                            <p style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic', color: 'var(--text-muted)', margin: 0 }}
                              title={member.dailyWorkStatus}>
                              "{member.dailyWorkStatus}"
                            </p>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                          {member.projects?.slice(0, 3).map(p => (
                            <StatusBadge key={p.id} status={p.status} size="xs" />
                          ))}
                          {(member.projects?.length || 0) > 3 && (
                            <span style={{
                              fontSize: 12, padding: '2px 6px', borderRadius: 9999,
                              background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--card-border)'
                            }}>
                              +{member.projects.length - 3}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
                          onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openAddProject(member.empId, member.name)}
                            style={{
                              padding: '6px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', transition: 'background 0.15s',
                              background: 'rgba(26,171,219,0.1)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.25)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.1)'}>
                            + Project
                          </button>
                        </div>

                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5"
                          style={{
                            color: 'var(--text-muted)', flexShrink: 0,
                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s'
                          }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>

                      {isOpen && (
                        <div style={{
                          padding: '8px 20px 16px', display: 'flex', flexDirection: 'column', gap: 12,
                          background: 'rgba(26,171,219,0.02)', borderTop: '1px solid var(--card-border)'
                        }}>
                          {!member.projects?.length ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', borderRadius: 12, border: '1.5px dashed var(--card-border)' }}>
                              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                                No projects assigned yet
                              </p>
                              <button onClick={() => openAddProject(member.empId, member.name)}
                                style={{
                                  marginTop: 8, fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                                  color: '#1AABDB', background: 'rgba(26,171,219,0.08)', border: 'none', cursor: 'pointer'
                                }}>
                                + Assign first project
                              </button>
                            </div>
                          ) : (
                            member.projects.map(project => (
                              <ProjectCard key={project.id} project={project} canEdit={true}
                                empName={member.name} assignerName={empName}
                                onProjectUpdate={handleUpdateProject}
                                onProjectDelete={handleDeleteProject}
                                onAddTask={openAddTask}
                                onTaskStatusChange={handleTeamTaskStatus}
                                onEditTask={openEditTask}
                                onDeleteTask={handleDeleteTask} />
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}