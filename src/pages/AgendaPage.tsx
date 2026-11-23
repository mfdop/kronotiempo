import { useState, useEffect, useRef } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import ical from 'ical-generator'
import {
  useTasks, useCreateTask, useCompleteTask,
  useDailyNote, useUpsertDailyNote, useAutoTasks,
} from '../hooks/useTasks'
import type { Task } from '../types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const TODAY = format(new Date(), 'yyyy-MM-dd')
const WEEK  = format(addDays(new Date(), 6),  'yyyy-MM-dd')
const SOON  = format(addDays(new Date(), 13), 'yyyy-MM-dd')

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "d MMM", { locale: es }) }
  catch { return iso.slice(5, 10) }
}

// Legacy water/food auto-tasks (no longer generated) are hidden if still in the DB
function isLegacyWaterFood(t: Task) {
  const o = t.origin as string
  return o === 'auto_agua' || o === 'auto_comida'
}

function classifyTasks(tasks: Task[]) {
  const pending:   Task[] = []
  const today:     Task[] = []
  const week:      Task[] = []
  const soon:      Task[] = []
  const doneToday: Task[] = []

  for (const t of tasks) {
    if (isLegacyWaterFood(t)) continue
    if (t.status === 'completada') {
      if (t.completed_at && t.completed_at.startsWith(TODAY)) doneToday.push(t)
      continue
    }

    const d = t.due_date
    if (!d || d < TODAY) { pending.push(t); continue }
    if (d === TODAY)      { today.push(t);   continue }
    if (d <= WEEK)        { week.push(t);    continue }
    if (d <= SOON) { soon.push(t); continue }
    // beyond 14 days → not shown
  }

  return { pending, today, week, soon, doneToday }
}

// ─── ICS EXPORT ──────────────────────────────────────────────────────────────

function exportWeekICS(tasks: Task[]) {
  const cal = ical({ name: 'Kronotiempo — Agenda' })

  for (const t of tasks) {
    if (!t.due_date || isLegacyWaterFood(t)) continue
    const d = parseISO(t.due_date)
    const start = new Date(d)
    start.setHours(9, 0, 0, 0)
    const end = new Date(d)
    end.setHours(10, 0, 0, 0)
    cal.createEvent({
      start,
      end,
      summary: t.title,
      description: t.description ?? '',
    })
  }

  const str  = cal.toString()
  const blob = new Blob([str], { type: 'text/calendar;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'kronotiempo_semana.ics'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── BADGES ──────────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  alta:  { bg: '#FFE8EC', color: '#C62B4F', label: 'Alta' },
  media: { bg: '#FDF3DC', color: '#9C6A00', label: 'Media' },
  baja:  { bg: '#EAF3EC', color: '#2E6B3E', label: 'Baja' },
}

const ORIGIN_LABEL: Record<string, string> = {
  auto_parto:   'Parto',
  auto_herrado: 'Herrado',
  auto_vacuna:  'Vacuna',
}

// ─── TASK ITEM ────────────────────────────────────────────────────────────────

function TaskItem({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  const isAuto   = task.origin !== 'manual'
  const isExport = !isAuto && !!task.due_date
  const isDone   = task.status === 'completada'
  const pri      = task.priority ? PRIORITY_STYLE[task.priority] : null

  return (
    <div
      className="flex items-start gap-3 py-3"
      style={{
        borderTop: '1px solid rgba(123,31,58,0.07)',
        paddingLeft:  isAuto && !isDone ? 14 : 16,
        paddingRight: 16,
        borderLeft:   isAuto && !isDone ? '3px solid rgba(156,106,0,0.45)' : 'none',
      }}
    >
      {/* Circular checkbox */}
      <button
        onClick={() => !isDone && onComplete(task.id)}
        className="w-6 h-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
        style={{
          border:     isDone ? 'none' : '2px solid rgba(123,31,58,0.35)',
          background: isDone ? '#7B1F3A' : 'transparent',
        }}
      >
        {isDone && (
          <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[14px] font-semibold leading-snug"
          style={{
            color:          isDone ? '#A08888' : '#1C1010',
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: '#6B5555' }}>
            {task.description}
          </p>
        )}
        <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
          {task.due_date && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{ background: '#F7F3EE', color: '#6B5555' }}
            >
              {fmtDate(task.due_date)}
            </span>
          )}
          {pri && !isDone && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: pri.bg, color: pri.color }}
            >
              {pri.label}
            </span>
          )}
          {isAuto && (
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: '#EFEFEF', color: '#7B7B7B' }}
            >
              Auto · {ORIGIN_LABEL[task.origin] ?? task.origin}
            </span>
          )}
          {isExport && !isDone && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ background: '#E8F0F8', color: '#1A4F7A' }}
            >
              📅
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SECTION ─────────────────────────────────────────────────────────────────

function Section({
  label, tasks, onComplete, accent,
}: {
  label: string
  tasks: Task[]
  onComplete: (id: string) => void
  accent?: string
}) {
  if (tasks.length === 0) return null
  return (
    <div className="mb-3">
      <p
        className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest"
        style={{ color: accent ?? '#A08888' }}
      >
        {label}
      </p>
      <div
        className="mx-3 rounded-2xl overflow-hidden"
        style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}
      >
        {tasks.map(t => (
          <TaskItem key={t.id} task={t} onComplete={onComplete} />
        ))}
      </div>
    </div>
  )
}

// ─── NEW TASK SHEET ───────────────────────────────────────────────────────────

const PRIORITIES = [
  { key: 'baja'  as const, label: 'Baja',  bg: '#EAF3EC', color: '#2E6B3E', activeBg: '#2E6B3E' },
  { key: 'media' as const, label: 'Media', bg: '#FDF3DC', color: '#9C6A00', activeBg: '#9C6A00' },
  { key: 'alta'  as const, label: 'Alta',  bg: '#FFE8EC', color: '#C62B4F', activeBg: '#C62B4F' },
]

interface NewTaskForm {
  title:       string
  description: string
  due_date:    string
  priority:    'alta' | 'media' | 'baja'
}

function NewTaskSheet({
  open, onClose, onSave, saving,
}: {
  open:    boolean
  onClose: () => void
  onSave:  (form: NewTaskForm) => void
  saving:  boolean
}) {
  const [form, setForm] = useState<NewTaskForm>({
    title: '', description: '', due_date: TODAY, priority: 'media',
  })

  useEffect(() => {
    if (open) setForm({ title: '', description: '', due_date: TODAY, priority: 'media' })
  }, [open])

  if (!open) return null

  const canSave = form.title.trim().length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-t-3xl"
        style={{ background: '#fff', maxHeight: '88vh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(0,0,0,0.15)' }} />
        </div>

        <div className="px-4 pt-1 pb-2 flex items-center justify-between">
          <p className="text-[17px] font-bold" style={{ color: '#1C1010' }}>Nueva tarea</p>
          <button
            onClick={onClose}
            style={{ color: '#7B1F3A', fontSize: 24, lineHeight: 1 }}
          >×</button>
        </div>

        <div className="px-4 space-y-3 pb-10">
          {/* Title */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: '#A08888' }}
            >
              Título *
            </label>
            <input
              autoFocus
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ej: Llamar al veterinario"
              className="w-full px-3.5 py-2.5 rounded-xl text-[15px] outline-none"
              style={{ background: '#F7F3EE', color: '#1C1010', border: '1px solid rgba(123,31,58,0.15)' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: '#A08888' }}
            >
              Notas (opcional)
            </label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Detalles adicionales…"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl text-[14px] outline-none resize-none"
              style={{ background: '#F7F3EE', color: '#1C1010', border: '1px solid rgba(123,31,58,0.15)' }}
            />
          </div>

          {/* Date */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: '#A08888' }}
            >
              Fecha
            </label>
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl text-[15px] outline-none"
              style={{ background: '#F7F3EE', color: '#1C1010', border: '1px solid rgba(123,31,58,0.15)' }}
            />
          </div>

          {/* Priority */}
          <div>
            <label
              className="text-[11px] font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: '#A08888' }}
            >
              Prioridad
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.key}
                  onClick={() => setForm(f => ({ ...f, priority: p.key }))}
                  className="flex-1 py-2 rounded-xl text-[13px] font-bold"
                  style={
                    form.priority === p.key
                      ? { background: p.activeBg, color: '#fff' }
                      : { background: p.bg, color: p.color }
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={() => canSave && !saving && onSave(form)}
            disabled={!canSave || saving}
            className="w-full py-3.5 rounded-2xl text-[15px] font-bold"
            style={{
              background: canSave ? '#7B1F3A' : 'rgba(123,31,58,0.25)',
              color: '#fff',
            }}
          >
            {saving ? 'Guardando…' : 'Guardar tarea'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DAILY NOTE ───────────────────────────────────────────────────────────────

function DailyNoteCard() {
  const { data: note } = useDailyNote(TODAY)
  const upsert          = useUpsertDailyNote()
  const [text, setText] = useState('')
  const initRef         = useRef(false)
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note !== undefined && !initRef.current) {
      initRef.current = true
      setText(note?.content ?? '')
    }
  }, [note])

  const handleChange = (val: string) => {
    setText(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      upsert.mutate({ date: TODAY, content: val })
    }, 1000)
  }

  const todayLabel = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <div
      className="mx-3 mb-1 rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}
      >
        <p className="text-[13px] font-bold" style={{ color: '#1C1010' }}>📝 Nota del día</p>
        <p className="text-[11px] capitalize" style={{ color: '#A08888' }}>{todayLabel}</p>
      </div>
      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder="Escribe aquí tus notas del día…"
        rows={3}
        className="w-full px-4 py-3 text-[14px] outline-none resize-none bg-transparent"
        style={{ color: '#1C1010' }}
      />
      {upsert.isPending && (
        <p className="px-4 pb-1.5 text-[10px]" style={{ color: '#A08888' }}>Guardando…</p>
      )}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  useAutoTasks()

  const { data: allTasks = [] } = useTasks()
  const createTask   = useCreateTask()
  const completeTask = useCompleteTask()
  const [sheetOpen, setSheetOpen] = useState(false)

  const { pending, today, week, soon, doneToday } = classifyTasks(allTasks)

  const handleComplete = (id: string) => completeTask.mutate(id)

  const handleSave = async (form: NewTaskForm) => {
    await createTask.mutateAsync({
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      due_date:    form.due_date || undefined,
      priority:    form.priority,
      origin:      'manual',
    })
    setSheetOpen(false)
  }

  const totalPending = pending.length + today.length + week.length
  const icsPool      = [...today, ...week, ...soon]

  return (
    <div className="flex flex-col h-full">
      {/* ── HEADER ── */}
      <div className="shrink-0" style={{ background: '#7B1F3A' }}>
        <div className="safe-top" />
        <div className="px-4 pt-2.5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight">Agenda</h1>
            {totalPending > 0 && (
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {totalPending} tarea{totalPending !== 1 ? 's' : ''} pendiente{totalPending !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => exportWeekICS(icsPool)}
            disabled={icsPool.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold"
            style={{
              background: icsPool.length > 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
              color:      icsPool.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
              border:     '1px solid rgba(255,255,255,0.22)',
            }}
          >
            📅 Exportar
          </button>
        </div>
      </div>

      {/* ── SCROLL CONTENT ── */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide pb-28"
        style={{ background: '#F7F3EE' }}
      >
        {/* Daily note */}
        <div className="pt-3">
          <DailyNoteCard />
        </div>

        {/* Empty state */}
        {allTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-12 px-8 text-center">
            <div style={{ fontSize: 48 }}>✅</div>
            <p className="mt-3 text-[16px] font-bold" style={{ color: '#1C1010' }}>
              Todo al día
            </p>
            <p className="mt-1 text-[13px]" style={{ color: '#A08888' }}>
              No hay tareas pendientes. Usa el botón + para añadir una.
            </p>
          </div>
        )}

        {/* 1 — PENDIENTES (overdue) */}
        <Section
          label="Pendientes"
          tasks={pending}
          onComplete={handleComplete}
          accent="#C62B4F"
        />

        {/* 2 — HOY */}
        <Section
          label="Hoy"
          tasks={today}
          onComplete={handleComplete}
          accent="#7B1F3A"
        />

        {/* 3 — ESTA SEMANA */}
        <Section
          label="Esta semana"
          tasks={week}
          onComplete={handleComplete}
          accent="#9C6A00"
        />

        {/* 4 — PRÓXIMAMENTE */}
        <Section
          label="Próximamente"
          tasks={soon}
          onComplete={handleComplete}
          accent="#6B5555"
        />

        {/* 5 — COMPLETADAS HOY */}
        {doneToday.length > 0 && (
          <div className="mb-3">
            <p
              className="px-4 pt-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest"
              style={{ color: '#A08888' }}
            >
              Completadas hoy
            </p>
            <div
              className="mx-3 rounded-2xl overflow-hidden"
              style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}
            >
              {doneToday.map(t => (
                <TaskItem key={t.id} task={t} onComplete={() => {}} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center z-40"
        style={{
          background: '#7B1F3A',
          boxShadow: '0 4px 20px rgba(123,31,58,0.45)',
        }}
      >
        <span
          className="text-white font-light"
          style={{ fontSize: 30, lineHeight: 1, marginTop: -2 }}
        >+</span>
      </button>

      {/* ── NEW TASK SHEET ── */}
      <NewTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        saving={createTask.isPending}
      />
    </div>
  )
}
