import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import BASE_URL from '../config'

const API = `${BASE_URL}/api`

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Completed']
const TASK_STATUSES    = ['Not Started', 'In Progress', 'On Hold', 'Completed']
const PRIORITIES       = ['low', 'medium', 'high']

const STATUS_CFG = {
  'Not Started': { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)', dot: '#94A3B8' },
  'In Progress': { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  dot: '#F59E0B' },
  'On Hold':     { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)',   dot: '#EF4444' },
  'Completed':   { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  dot: '#10B981' },
}

const PRIORITY_CFG = {
  low:    { color: '#64748B', bg: 'rgba(100,116,139,0.1)',  label: 'Low'    },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   label: 'Medium' },
  high:   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    label: 'High'   },
}

const TL_POSITIONS = ['tech lead', 'innovation manager', 'computer research analyst', 'product designer', 'ui/ux designer']
const isTLOrManager = pos => TL_POSITIONS.includes((pos || '').toLowerCase().trim())

// ─── Small reusable pieces ───────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const s = status || 'Not Started'
  const c = STATUS_CFG[s] || STATUS_CFG['Not Started']
  const pad = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad}`}
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
      {s}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const p = priority || 'medium'
  const c = PRIORITY_CFG[p] || PRIORITY_CFG.medium
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: c.bg, color: c.color }}>
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
    console.log('[StatusSelect] toggle clicked, disabled:', disabled)
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
            onClick={() => {
              console.log('[StatusSelect] option clicked:', s, '| onChange type:', typeof onChange)
              onChange(s)
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-left"
            style={{ color: sc.color, background: s === value ? 'var(--surface2)' : 'transparent' }}
            onMouseEnter={e => { if (s !== value) e.currentTarget.style.background = 'var(--surface2)' }}
            onMouseLeave={e => { if (s !== value) e.currentTarget.style.background = 'transparent' }}>
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sc.dot }} />
            {s}
            {s === value && (
              <svg className="ml-auto" width="10" height="10" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            )}
          </button>
        )
      })}
    </div>,
    document.body
  )

  return (
    <div className="relative" ref={btnRef}>
      <button type="button" disabled={disabled}
        onClick={handleToggle}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
        style={{ background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
          cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
        {value || 'Not Started'}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
          style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform 0.15s' }}>
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
    <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl text-white text-sm font-semibold"
      style={{ background: isErr ? '#EF4444' : '#10B981', minWidth: 220,
        animation: 'slideIn 0.2s ease', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)', animation: 'modalIn 0.2s ease' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</p>
          <button onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-muted)', background: 'transparent' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, canEdit, empName, onStatusChange, onEdit, onDelete }) {
  const [saving, setSaving] = useState(false)

  const handleStatus = async (newStatus) => {
    setSaving(true)
    await onStatusChange(task.id, newStatus)
    setSaving(false)
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl transition-colors group"
      style={{ background: 'var(--surface2)', border: '1px solid var(--card-border)' }}>
      <div className="w-1 self-stretch rounded-full flex-shrink-0 mt-0.5"
        style={{ background: PRIORITY_CFG[task.priority]?.color || '#64748B', minHeight: 20 }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug"
            style={{ color: 'var(--text-primary)', textDecoration: task.status === 'Completed' ? 'line-through' : 'none',
              opacity: task.status === 'Completed' ? 0.6 : 1 }}>
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        {task.description && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <StatusSelect value={task.status} options={TASK_STATUSES} onChange={handleStatus} disabled={saving} />
          {task.dueDate && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-lg"
              style={{ background: 'rgba(26,171,219,0.08)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}>
              Due {new Date(task.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>by {task.assignedBy}</span>
        </div>

        {/* ── Task documents ── */}
        {task.documents?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {task.documents.map(doc => (
              <a key={doc.id} href={`${BASE_URL}/uploads/${doc.filename}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
                style={{ background: 'rgba(26,171,219,0.08)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}
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
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(task)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#1AABDB' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button onClick={() => onDelete(task.id)}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#EF4444' }}
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
    console.log('[ProjectCard] handleStatusChange fired:', newStatus, '| projectId:', project.id, '| assignerName:', assignerName)
    console.log('[ProjectCard] onProjectUpdate fn:', typeof onProjectUpdate)
    await onProjectUpdate(project.id, { status: newStatus, assignedBy: assignerName })
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

      {/* Project header */}
      <div className="px-4 py-3.5 flex items-center gap-3"
        style={{ borderBottom: expanded ? '1px solid var(--card-border)' : 'none',
          background: 'var(--surface2)' }}>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)}
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Project name */}
        <div className="flex-1 min-w-0">
          {editingName && canEdit ? (
            <div className="flex items-center gap-2">
              <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') setEditingName(false) }}
                className="flex-1 px-2.5 py-1 rounded-lg text-sm font-semibold outline-none"
                style={{ background: 'var(--card-bg)', border: '1.5px solid #1AABDB', color: 'var(--text-primary)' }} />
              <button onClick={handleNameSave} disabled={savingName}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-white"
                style={{ background: '#1AABDB' }}>
                {savingName ? '…' : '✓'}
              </button>
              <button onClick={() => setEditingName(false)}
                className="px-2.5 py-1 rounded-lg text-xs"
                style={{ background: 'var(--card-bg)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {project.name}
              </p>
              {canEdit && (
                <button onClick={() => { setNameVal(project.name); setEditingName(true) }}
                  className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--text-muted)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Assigned by {project.assignedBy} · {total} task{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Progress + status */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {total > 0 && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{pct}%</p>
              <div className="w-20 h-1.5 rounded-full mt-1" style={{ background: 'var(--card-border)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : '#1AABDB' }} />
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
            <div className="flex gap-1">
              <button onClick={() => onAddTask(project)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors font-bold text-base"
                style={{ background: 'rgba(26,171,219,0.12)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.25)' }}
                title="Add task"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.12)'}>
                +
              </button>
              <button onClick={() => onProjectDelete(project.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                title="Delete project"
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
        <div className="px-4 py-2 flex flex-wrap gap-1.5"
          style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(26,171,219,0.02)' }}>
          <span className="text-[10px] font-semibold self-center mr-1" style={{ color: 'var(--text-muted)' }}>
            Project files:
          </span>
          {project.documents.map(doc => (
            <a key={doc.id} href={`${BASE_URL}/uploads/${doc.filename}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(26,171,219,0.08)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}
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

      {/* Project documents */}
      {expanded && project.documents?.length > 0 && (
        <div className="px-4 py-2 flex flex-wrap gap-1.5"
          style={{ borderBottom: '1px solid var(--card-border)', background: 'rgba(26,171,219,0.02)' }}>
          <span className="text-[10px] font-semibold self-center mr-1" style={{ color: 'var(--text-muted)' }}>
            Project files:
          </span>
          {project.documents.map(doc => (
            <a key={doc.id} href={`${BASE_URL}/uploads/${doc.filename}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(26,171,219,0.08)', color: '#1AABDB', border: '1px solid rgba(26,171,219,0.2)' }}
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
        <div className="p-3 space-y-2">
          {project.tasks.length === 0 ? (
            <div className="py-6 text-center rounded-xl" style={{ border: '1.5px dashed var(--card-border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No tasks yet</p>
              {canEdit && (
                <button onClick={() => onAddTask(project)}
                  className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: '#1AABDB', background: 'rgba(26,171,219,0.08)' }}>
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
    background: 'var(--surface2)', border: '1px solid var(--card-border)',
    color: 'var(--text-primary)', outline: 'none'
  }
  const inputClass = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all'

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
          Task Title *
        </label>
        <input value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
          placeholder="e.g. Design login page UI"
          className={inputClass} style={inputStyle}
          onFocus={e => e.target.style.border = '1px solid #1AABDB'}
          onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
      </div>
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
          Description
        </label>
        <textarea value={taskForm.description} onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
          placeholder="Optional details…" rows={2} style={{ ...inputStyle, resize: 'none' }}
          className={inputClass}
          onFocus={e => e.target.style.border = '1px solid #1AABDB'}
          onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Priority</label>
          <select value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
            className={inputClass} style={inputStyle}>
            {['low','medium','high'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Due Date</label>
          <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(p => ({ ...p, dueDate: e.target.value }))}
            className={inputClass} style={inputStyle} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
        <select value={taskForm.status} onChange={e => setTaskForm(p => ({ ...p, status: e.target.value }))}
          className={inputClass} style={inputStyle}>
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
    console.log('[handleUpdateMyProjectStatus] called with:', projectId, data)
    try {
      const res = await axios.patch(`${API}/tasks/projects/${projectId}`, { ...data, assignedBy: empName })
      console.log('[handleUpdateMyProjectStatus] success:', res.data)
      // Optimistically update local state instead of full re-fetch
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
  const inputClass = 'w-full px-3 py-2.5 rounded-xl text-sm transition-all'

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#1AABDB] border-t-transparent" />
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      <Toast toast={toast} />

      {/* ── Add Project Modal ──────────────────────────────────────────────── */}
      <Modal open={projectModal.open} onClose={() => setProjectModal({ open: false, memberId: null, memberName: '' })}
        title={`Add Project — ${projectModal.memberName}`}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Project Name *
            </label>
            <input value={projectForm.name} onChange={e => setProjectForm(p => ({ ...p, name: e.target.value }))}
              placeholder="e.g. HPS Website Redesign"
              className={inputClass} style={inputStyle}
              onFocus={e => e.target.style.border = '1px solid #1AABDB'}
              onBlur={e => e.target.style.border = '1px solid var(--card-border)'}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()} />
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Initial Status
            </label>
            <select value={projectForm.status} onChange={e => setProjectForm(p => ({ ...p, status: e.target.value }))}
              className={inputClass} style={inputStyle}>
              {PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Attach Documents <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="file" multiple
              onChange={e => setProjectForm(p => ({ ...p, files: Array.from(e.target.files) }))}
              className="w-full text-xs rounded-xl px-3 py-2"
              style={{ background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }} />
            {projectForm.files.length > 0 && (
              <p className="text-[10px] mt-1" style={{ color: '#1AABDB' }}>
                {projectForm.files.length} file{projectForm.files.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreateProject} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: saving ? 'rgba(26,171,219,0.5)' : '#1AABDB' }}>
              {saving ? 'Assigning…' : 'Assign Project'}
            </button>
            <button onClick={() => setProjectModal({ open: false, memberId: null, memberName: '' })}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Add Task Modal ─────────────────────────────────────────────────── */}
      <Modal open={taskModal.open} onClose={() => setTaskModal({ open: false, project: null })}
        title={`Add Task — ${taskModal.project?.name || ''}`}>
        <div className="space-y-3">
           <TaskFormFields taskForm={taskForm} setTaskForm={setTaskForm} />
          <div>
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>
              Attach Documents <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="file" multiple
              onChange={e => setTaskForm(p => ({ ...p, files: Array.from(e.target.files) }))}
              className="w-full text-xs rounded-xl px-3 py-2"
              style={{ background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-muted)' }} />
            {taskForm.files?.length > 0 && (
              <p className="text-[10px] mt-1" style={{ color: '#1AABDB' }}>
                {taskForm.files.length} file{taskForm.files.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleCreateTask}disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: saving ? 'rgba(26,171,219,0.5)' : '#1AABDB' }}>
              {saving ? 'Adding…' : 'Add Task'}
            </button>
            <button onClick={() => setTaskModal({ open: false, project: null })}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Task Modal ────────────────────────────────────────────────── */}
      <Modal open={editTaskModal.open} onClose={() => setEditTaskModal({ open: false, task: null })}
        title="Edit Task">
        <div className="space-y-3">
          <TaskFormFields taskForm={taskForm} setTaskForm={setTaskForm} />
          <div className="flex gap-2 pt-1">
            <button onClick={handleEditTask} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: saving ? 'rgba(26,171,219,0.5)' : '#1AABDB' }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => setEditTaskModal({ open: false, task: null })}
              className="px-4 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'var(--surface2)', color: 'var(--text-secondary)', border: '1px solid var(--card-border)' }}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Page ──────────────────────────────────────────────────────────── */}
      <div className="space-y-6 max-w-5xl" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: 4, height: 24, borderRadius: 4, background: '#1AABDB' }} />
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Tasks</h1>
            {isLeader && (
              <span className="ml-2 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>
                {isManager ? 'Manager' : 'Team Lead'}
              </span>
            )}
          </div>
          <p className="text-sm ml-3" style={{ color: 'var(--text-secondary)' }}>
            Track your projects, tasks, and submit daily work updates
          </p>
        </div>

        {/* ── My Projects ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
            <div>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>My Projects</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {myData?.projects?.length || 0} project{(myData?.projects?.length || 0) !== 1 ? 's' : ''} assigned to you
              </p>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {!myData?.projects?.length ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--surface2)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No projects assigned yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Your team lead will assign projects soon</p>
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
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>EOD Work Update</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Submit what you worked on today — visible to your admin and team lead
            </p>
          </div>
          <div className="p-5 space-y-4">
            {myData?.dailyWorkStatus && (
              <div className="rounded-xl p-3.5"
                style={{ background: 'rgba(26,171,219,0.05)', border: '1px solid rgba(26,171,219,0.15)' }}>
                <p className="text-xs font-semibold mb-1" style={{ color: '#1AABDB' }}>Last submitted</p>
                <p className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>"{myData.dailyWorkStatus}"</p>
              </div>
            )}
            <textarea value={eodText} onChange={e => setEodText(e.target.value)}
              placeholder="What did you work on today? Any blockers? What's planned for tomorrow?…"
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition-all"
              style={{ background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.border = '1px solid #1AABDB'}
              onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
            <div className="flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{eodText.length} characters</p>
              <button onClick={handleEodSubmit} disabled={eodSaving || !eodText.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: eodSaving || !eodText.trim() ? 'rgba(26,171,219,0.4)' : '#1AABDB',
                  cursor: eodSaving || !eodText.trim() ? 'not-allowed' : 'pointer' }}>
                {eodSaving ? 'Submitting…' : 'Submit EOD'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Team View (TL / Manager only) ────────────────────────────────── */}
        {isLeader && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--surface2)' }}>
              <div>
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>My Team</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} · Assign projects and tasks
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="px-5 py-3 flex flex-wrap gap-3"
              style={{ borderBottom: '1px solid var(--card-border)' }}>
              <div className="relative flex-1 min-w-[160px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" value={teamSearch} onChange={e => setTeamSearch(e.target.value)}
                  placeholder="Search member or project…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.border = '1px solid #1AABDB'}
                  onBlur={e => e.target.style.border = '1px solid var(--card-border)'} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['All', ...PROJECT_STATUSES].map(s => (
                  <button key={s} onClick={() => setTeamFilter(s)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                    style={teamFilter === s
                      ? { background: '#1AABDB', color: '#fff' }
                      : { background: 'var(--surface2)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Team members list */}
            {teamMembers.length === 0 ? (
              <div className="py-12 text-center">
                <p style={{ color: 'var(--text-secondary)' }}>No team members found.</p>
                <p className="text-xs mt-1 font-semibold" style={{ color: '#1AABDB' }}>
                  Your name in system: {empName}
                </p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
                {filteredTeam.length === 0 ? (
                  <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                    No members match your search
                  </p>
                ) : filteredTeam.map(member => {
                  const isOpen = expandedMember === member.empId
                  const totalTasks = member.projects?.reduce((a, p) => a + p.tasks.length, 0) || 0
                  const doneTasks  = member.projects?.reduce((a, p) =>
                    a + p.tasks.filter(t => t.status === 'Completed').length, 0) || 0

                  return (
                    <div key={member.empId}>
                      <div className="px-5 py-3.5 flex items-center gap-4 cursor-pointer transition-colors"
                        style={{ background: isOpen ? 'var(--surface2)' : 'transparent' }}
                        onClick={() => setExpandedMember(isOpen ? null : member.empId)}
                        onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'rgba(26,171,219,0.03)' }}
                        onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}>

                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: '#1AABDB' }}>
                          {getInitials(member.name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{member.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {member.position || '—'} · {member.projects?.length || 0} project{(member.projects?.length || 0) !== 1 ? 's' : ''}
                            {totalTasks > 0 && ` · ${doneTasks}/${totalTasks} tasks done`}
                          </p>
                        </div>

                        {member.dailyWorkStatus && (
                          <div className="hidden lg:block max-w-[200px]">
                            <p className="text-xs truncate italic" style={{ color: 'var(--text-muted)' }}
                              title={member.dailyWorkStatus}>
                              "{member.dailyWorkStatus}"
                            </p>
                          </div>
                        )}

                        <div className="hidden sm:flex gap-1.5 flex-shrink-0">
                          {member.projects?.slice(0, 3).map(p => (
                            <StatusBadge key={p.id} status={p.status} size="xs" />
                          ))}
                          {(member.projects?.length || 0) > 3 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--card-border)' }}>
                              +{member.projects.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0"
                          onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => openAddProject(member.empId, member.name)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={{ background: 'rgba(26,171,219,0.1)', color: '#1AABDB',
                              border: '1px solid rgba(26,171,219,0.25)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(26,171,219,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(26,171,219,0.1)'}>
                            + Project
                          </button>
                        </div>

                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--text-muted)', flexShrink: 0,
                            transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>

                      {isOpen && (
                        <div className="px-5 pb-4 pt-2 space-y-3"
                          style={{ background: 'rgba(26,171,219,0.02)', borderTop: '1px solid var(--card-border)' }}>
                          {!member.projects?.length ? (
                            <div className="py-6 text-center rounded-xl"
                              style={{ border: '1.5px dashed var(--card-border)' }}>
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                No projects assigned yet
                              </p>
                              <button onClick={() => openAddProject(member.empId, member.name)}
                                className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                                style={{ color: '#1AABDB', background: 'rgba(26,171,219,0.08)' }}>
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