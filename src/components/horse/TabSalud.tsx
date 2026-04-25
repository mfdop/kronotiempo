import { useState } from 'react'
import {
  useHealthEpisodes, useCreateHealthEpisode, useUpdateHealthEpisode,
  useVaccines, useCreateVaccine,
  createAutoTask,
} from '../../hooks/useReproduction'
import { useAuth } from '../../hooks/useAuth'
import { BottomSheet, EmptyState, LoadingScreen, Field, GranateButton, GhostButton } from '../ui'
import type { Animal, HealthEpisode, EpisodeStatus, VacunaType, Vaccine } from '../../types'
import { format, parseISO, differenceInDays, addMonths } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── CONSTANTS ────────────────────────────────────────────────
const VACCINE_LABELS: Record<VacunaType, string> = {
  gripe:           'Gripe equina',
  tetanos:         'Tétanos',
  desparasitacion: 'Desparasitación',
  rinoneumonitis:  'Rinoneumonitis',
  otro:            'Otro',
}

const VACCINE_INTERVALS: Partial<Record<VacunaType, number>> = {
  gripe:           6,   // months
  tetanos:         24,
  desparasitacion: 3,
  rinoneumonitis:  6,
}

const EPISODE_STATUS_CONFIG: Record<EpisodeStatus, { label: string; color: string; bg: string }> = {
  activo:   { label: 'Activo',   color: '#8C1F1F', bg: '#FCEAEA' },
  resuelto: { label: 'Resuelto', color: '#2E6B3E', bg: '#EAF3EC' },
  cronico:  { label: 'Crónico',  color: '#9C6A00', bg: '#FDF3DC' },
}

function vaccineStatus(v: Vaccine): 'ok' | 'warn' | 'due' {
  if (!v.next_date) return 'ok'
  const days = differenceInDays(parseISO(v.next_date), new Date())
  if (days < 0)   return 'due'
  if (days <= 30) return 'warn'
  return 'ok'
}

function overallStatus(episodes: HealthEpisode[]) {
  if (episodes.some(e => e.status === 'activo'))
    return { label: 'En tratamiento', color: '#8C1F1F', bg: '#FCEAEA', dot: '#8C1F1F' }
  if (episodes.some(e => e.status === 'cronico'))
    return { label: 'Crónico activo',  color: '#9C6A00', bg: '#FDF3DC', dot: '#9C6A00' }
  return { label: 'Sano · Sin tratamiento activo', color: '#2E6B3E', bg: '#EAF3EC', dot: '#2E6B3E' }
}

// ─── ADD EPISODE SHEET ────────────────────────────────────────
function AddEpisodeSheet({ open, onClose, animalId }: {
  open: boolean; onClose: () => void; animalId: string
}) {
  const create = useCreateHealthEpisode()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [form, setForm] = useState({
    title:      '',
    start_date: '',
    vet_name:   '',
    treatment:  '',
    notes:      '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.title)      { setError('El título es obligatorio'); return }
    if (!form.start_date) { setError('La fecha de inicio es obligatoria'); return }
    setSaving(true); setError(null)
    try {
      await create.mutateAsync({
        animal_id:  animalId,
        title:      form.title,
        start_date: form.start_date,
        status:     'activo',
        vet_name:   form.vet_name   || undefined,
        treatment:  form.treatment  || undefined,
        notes:      form.notes      || undefined,
      })
      onClose()
      setForm({ title: '', start_date: '', vet_name: '', treatment: '', notes: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nuevo episodio de salud">
      <div className="space-y-3">
        <Field label="Título *">
          <input value={form.title} onChange={e => set('title', e.target.value)}
                 placeholder="Diagnóstico o descripción..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>
        <Field label="Fecha de inicio *">
          <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)}
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>
        <Field label="Veterinario">
          <input value={form.vet_name} onChange={e => set('vet_name', e.target.value)}
                 placeholder="Dr. ..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>
        <Field label="Tratamiento">
          <textarea value={form.treatment} onChange={e => set('treatment', e.target.value)}
                    rows={2} placeholder="Medicación, reposo..."
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>
        <Field label="Notas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    rows={2} placeholder="Observaciones..."
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>
        {error && (
          <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
            {error}
          </p>
        )}
        <GranateButton onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Registrar episodio'}
        </GranateButton>
        <GhostButton onClick={onClose} fullWidth>Cancelar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── ADD VACCINE SHEET ────────────────────────────────────────
function AddVaccineSheet({ open, onClose, animalId, animalName, ownerId }: {
  open: boolean; onClose: () => void; animalId: string; animalName: string; ownerId: string
}) {
  const create = useCreateVaccine()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [form, setForm] = useState({
    type:         'gripe' as VacunaType,
    custom_name:  '',
    date_applied: '',
    next_date:    '',
    vet_name:     '',
    notes:        '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Auto-suggest next_date based on type interval
  const suggestNext = (type: VacunaType, applied: string) => {
    const months = VACCINE_INTERVALS[type]
    if (months && applied) {
      const next = format(addMonths(parseISO(applied), months), 'yyyy-MM-dd')
      setForm(p => ({ ...p, type, next_date: next }))
    } else {
      setForm(p => ({ ...p, type }))
    }
  }

  const handleSave = async () => {
    if (!form.date_applied) { setError('La fecha de aplicación es obligatoria'); return }
    if (form.type === 'otro' && !form.custom_name) { setError('Introduce el nombre del producto'); return }
    setSaving(true); setError(null)
    try {
      await create.mutateAsync({
        animal_id:    animalId,
        type:         form.type,
        custom_name:  form.custom_name  || undefined,
        date_applied: form.date_applied,
        next_date:    form.next_date    || undefined,
        vet_name:     form.vet_name     || undefined,
        notes:        form.notes        || undefined,
      })
      if (form.next_date && ownerId) {
        const days = differenceInDays(parseISO(form.next_date), new Date())
        if (days > 0) {
          await createAutoTask({
            owner_id:  ownerId,
            title:     `Vacuna ${VACCINE_LABELS[form.type]} · ${animalName}`,
            due_date:  form.next_date,
            animal_id: animalId,
            origin:    'auto_vacuna',
          })
        }
      }
      onClose()
      setForm({ type: 'gripe', custom_name: '', date_applied: '', next_date: '', vet_name: '', notes: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Registrar vacuna / desparasitación">
      <div className="space-y-3">

        <Field label="Tipo">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(VACCINE_LABELS) as [VacunaType, string][]).map(([v, label]) => (
              <button key={v} onClick={() => suggestNext(v, form.date_applied)}
                      className="py-2.5 rounded-xl text-[12px] font-semibold text-center"
                      style={{
                        background: form.type === v ? '#7B1F3A' : '#F7F3EE',
                        color:      form.type === v ? '#fff'    : '#6B5555',
                        border:     `1.5px solid ${form.type === v ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                      }}>
                {label}
              </button>
            ))}
          </div>
        </Field>

        {form.type === 'otro' && (
          <Field label="Nombre del producto *">
            <input value={form.custom_name} onChange={e => set('custom_name', e.target.value)}
                   placeholder="Nombre comercial..."
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        )}

        <div className="flex gap-2">
          <Field label="Fecha aplicación *">
            <input type="date" value={form.date_applied}
                   onChange={e => { set('date_applied', e.target.value); suggestNext(form.type, e.target.value) }}
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Próxima aplicación">
            <input type="date" value={form.next_date} onChange={e => set('next_date', e.target.value)}
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        </div>

        <Field label="Veterinario">
          <input value={form.vet_name} onChange={e => set('vet_name', e.target.value)}
                 placeholder="Dr. ..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <Field label="Notas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    rows={2} placeholder="Lote, observaciones..."
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        {error && (
          <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
            {error}
          </p>
        )}
        <GranateButton onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar vacuna'}
        </GranateButton>
        <GhostButton onClick={onClose} fullWidth>Cancelar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── EPISODE STATUS SHEET ─────────────────────────────────────
function EpisodeStatusSheet({ open, onClose, episode }: {
  open: boolean; onClose: () => void; episode: HealthEpisode
}) {
  const update = useUpdateHealthEpisode()
  const setStatus = (status: EpisodeStatus) => {
    update.mutate({
      id: episode.id,
      status,
      end_date: status === 'resuelto' ? format(new Date(), 'yyyy-MM-dd') : undefined,
    })
    onClose()
  }
  return (
    <BottomSheet open={open} onClose={onClose} title={episode.title}>
      <div className="space-y-3">
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(123,31,58,0.11)' }}>
          {episode.vet_name && (
            <div className="flex justify-between px-4 py-2.5 bg-white">
              <span className="text-[13px]" style={{ color: '#6B5555' }}>Veterinario</span>
              <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{episode.vet_name}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-2.5 bg-white"
               style={{ borderTop: episode.vet_name ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
            <span className="text-[13px]" style={{ color: '#6B5555' }}>Inicio</span>
            <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
              {format(parseISO(episode.start_date), 'd MMM yyyy', { locale: es })}
            </span>
          </div>
          {episode.treatment && (
            <div className="px-4 py-2.5 bg-white" style={{ borderTop: '1px solid rgba(123,31,58,0.11)' }}>
              <p className="text-[11px] mb-0.5" style={{ color: '#A08888' }}>Tratamiento</p>
              <p className="text-[13px]" style={{ color: '#1C1010' }}>{episode.treatment}</p>
            </div>
          )}
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wider px-1"
           style={{ color: '#A08888' }}>Cambiar estado</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(EPISODE_STATUS_CONFIG) as [EpisodeStatus, typeof EPISODE_STATUS_CONFIG[EpisodeStatus]][]).map(([s, cfg]) => (
            <button key={s} onClick={() => setStatus(s)}
                    className="py-2.5 rounded-xl text-[12px] font-semibold"
                    style={{
                      background: episode.status === s ? cfg.color : '#F7F3EE',
                      color:      episode.status === s ? '#fff'    : '#6B5555',
                      border:     `1.5px solid ${episode.status === s ? cfg.color : 'rgba(123,31,58,0.22)'}`,
                    }}>
              {cfg.label}
            </button>
          ))}
        </div>
        <GhostButton onClick={onClose} fullWidth>Cerrar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── MAIN TAB ─────────────────────────────────────────────────
export default function TabSalud({ animal }: { animal: Animal }) {
  const { user }                                   = useAuth()
  const { data: episodes = [], isLoading: epLoad } = useHealthEpisodes(animal.id)
  const { data: vaccines = [], isLoading: vacLoad } = useVaccines(animal.id)
  const [addEpOpen,   setAddEpOpen]   = useState(false)
  const [addVacOpen,  setAddVacOpen]  = useState(false)
  const [selectedEp,  setSelectedEp]  = useState<HealthEpisode | null>(null)

  if (epLoad || vacLoad) return <LoadingScreen />

  const status = overallStatus(episodes)

  // Latest vaccine per type (most recent date_applied)
  const latestByType = vaccines.reduce<Record<string, Vaccine>>((acc, v) => {
    const key = v.type === 'otro' ? `otro_${v.custom_name}` : v.type
    if (!acc[key] || v.date_applied > acc[key].date_applied) acc[key] = v
    return acc
  }, {})
  const latestVaccines = Object.values(latestByType)
    .sort((a, b) => a.date_applied < b.date_applied ? 1 : -1)

  const statusDot = (s: ReturnType<typeof vaccineStatus>) => {
    if (s === 'due')  return { bg: '#8C1F1F', label: 'Vencida' }
    if (s === 'warn') return { bg: '#9C6A00', label: 'Próxima' }
    return                  { bg: '#2E6B3E', label: 'Al día'  }
  }

  return (
    <div className="p-3 pb-8 space-y-2.5">

      {/* ESTADO GENERAL */}
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3"
           style={{ background: status.bg, border: `1px solid rgba(0,0,0,0.06)` }}>
        <div className="w-3 h-3 rounded-full shrink-0"
             style={{ background: status.dot }} />
        <span className="flex-1 text-[14px] font-semibold" style={{ color: status.color }}>
          {status.label}
        </span>
      </div>

      {/* VACUNAS */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Vacunas y desparasitaciones
          </p>
          <button onClick={() => setAddVacOpen(true)}
                  className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
            + Añadir
          </button>
        </div>

        {latestVaccines.length === 0 ? (
          <EmptyState icon="💉" title="Sin vacunas registradas"
                      subtitle="Registra la primera vacuna o desparasitación" />
        ) : (
          latestVaccines.map((v, i) => {
            const s   = vaccineStatus(v)
            const dot = statusDot(s)
            const name = v.type === 'otro' ? (v.custom_name ?? 'Otro') : VACCINE_LABELS[v.type]
            return (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3"
                   style={{ borderBottom: i < latestVaccines.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: dot.bg }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{name}</p>
                  <p className="text-[11px]" style={{ color: '#6B5555' }}>
                    Última: {format(parseISO(v.date_applied), 'd MMM yyyy', { locale: es })}
                    {v.vet_name ? ` · ${v.vet_name}` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {v.next_date ? (
                    <>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full block mb-0.5"
                            style={{ background: s === 'due' ? '#FCEAEA' : s === 'warn' ? '#FDF3DC' : '#EAF3EC',
                                     color: dot.bg }}>
                        {dot.label}
                      </span>
                      <span className="text-[10px]" style={{ color: '#A08888' }}>
                        {format(parseISO(v.next_date), 'd MMM yyyy', { locale: es })}
                      </span>
                    </>
                  ) : (
                    <span className="text-[10px]" style={{ color: '#A08888' }}>Sin fecha próxima</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* EPISODIOS */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Episodios de salud
          </p>
          <button onClick={() => setAddEpOpen(true)}
                  className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
            + Añadir
          </button>
        </div>

        {episodes.length === 0 ? (
          <EmptyState icon="🏥" title="Sin episodios registrados"
                      subtitle="Sin incidencias de salud registradas" />
        ) : (
          episodes.map((ep, i) => {
            const cfg = EPISODE_STATUS_CONFIG[ep.status]
            const epIcon = ep.status === 'resuelto' ? '✓' : ep.status === 'cronico' ? '⟳' : '!'
            return (
              <button key={ep.id}
                      onClick={() => setSelectedEp(ep)}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-[#F5E8EC]"
                      style={{ borderBottom: i < episodes.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[15px] font-bold"
                     style={{ background: cfg.bg, color: cfg.color }}>
                  {epIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{ep.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#6B5555' }}>
                    {ep.vet_name ? `${ep.vet_name} · ` : ''}
                    {format(parseISO(ep.start_date), 'd MMM yyyy', { locale: es })}
                    {ep.end_date ? ` — ${format(parseISO(ep.end_date), 'd MMM yyyy', { locale: es })}` : ''}
                  </p>
                  {ep.treatment && (
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: '#A08888' }}>{ep.treatment}</p>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                      style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
              </button>
            )
          })
        )}
      </div>

      <AddEpisodeSheet
        open={addEpOpen}
        onClose={() => setAddEpOpen(false)}
        animalId={animal.id}
      />
      <AddVaccineSheet
        open={addVacOpen}
        onClose={() => setAddVacOpen(false)}
        animalId={animal.id}
        animalName={animal.name}
        ownerId={user?.id ?? ''}
      />
      {selectedEp && (
        <EpisodeStatusSheet
          open={!!selectedEp}
          onClose={() => setSelectedEp(null)}
          episode={selectedEp}
        />
      )}
    </div>
  )
}
