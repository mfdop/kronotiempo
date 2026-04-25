import { useState } from 'react'
import { useShoeingRecords, useCreateShoeingRecord, createAutoTask } from '../../hooks/useReproduction'
import { useAuth } from '../../hooks/useAuth'
import { BottomSheet, EmptyState, LoadingScreen, Field, GranateButton, GhostButton } from '../ui'
import type { Animal, HerradoType } from '../../types'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── CONSTANTS ────────────────────────────────────────────────
const TYPE_CONFIG: Record<HerradoType, { label: string; color: string; bg: string }> = {
  completo:   { label: 'Completo',   color: '#2E6B3E', bg: '#EAF3EC' },
  reherrado:  { label: 'Reherrado',  color: '#9C6A00', bg: '#FDF3DC' },
  correctivo: { label: 'Correctivo', color: '#1A4F7A', bg: '#E8F0F8' },
  descalzo:   { label: 'Descalzo',   color: '#6B5555', bg: '#F7F3EE' },
}

// ─── ADD SHOEING SHEET ────────────────────────────────────────
function AddShoeingSheet({ open, onClose, animalId, animalName, ownerId }: {
  open: boolean
  onClose: () => void
  animalId: string
  animalName: string
  ownerId: string
}) {
  const create = useCreateShoeingRecord()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [form, setForm] = useState({
    date:                '',
    type:                'completo' as HerradoType,
    farrier_name:        '',
    cost:                '',
    next_estimated_date: '',
    notes:               '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!form.date) { setError('La fecha es obligatoria'); return }
    setSaving(true); setError(null)
    try {
      await create.mutateAsync({
        animal_id:           animalId,
        date:                form.date,
        type:                form.type,
        farrier_name:        form.farrier_name   || undefined,
        cost:                form.cost           ? +form.cost : undefined,
        next_estimated_date: form.next_estimated_date || undefined,
        notes:               form.notes          || undefined,
      })
      if (form.next_estimated_date && ownerId) {
        await createAutoTask({
          owner_id:   ownerId,
          title:      `Herrado · ${animalName}`,
          description: form.farrier_name ? `Herrador: ${form.farrier_name}` : undefined,
          due_date:   form.next_estimated_date,
          animal_id:  animalId,
          origin:     'auto_herrado',
        })
      }
      onClose()
      setForm({ date: '', type: 'completo', farrier_name: '', cost: '', next_estimated_date: '', notes: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva sesión de herrado">
      <div className="space-y-3">

        <Field label="Fecha *">
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <Field label="Tipo de herrado">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(TYPE_CONFIG) as [HerradoType, typeof TYPE_CONFIG[HerradoType]][]).map(([v, cfg]) => (
              <button key={v} onClick={() => set('type', v)}
                      className="py-2.5 rounded-xl text-[13px] font-semibold"
                      style={{
                        background: form.type === v ? cfg.color : '#F7F3EE',
                        color:      form.type === v ? '#fff'    : '#6B5555',
                        border:     `1.5px solid ${form.type === v ? cfg.color : 'rgba(123,31,58,0.22)'}`,
                      }}>
                {cfg.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Herrador">
          <input value={form.farrier_name} onChange={e => set('farrier_name', e.target.value)}
                 placeholder="Nombre del herrador..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <div className="flex gap-2">
          <Field label="Coste (€)">
            <input type="number" inputMode="numeric" value={form.cost}
                   onChange={e => set('cost', e.target.value)} placeholder="0"
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Próximo herrado">
            <input type="date" value={form.next_estimated_date}
                   onChange={e => set('next_estimated_date', e.target.value)}
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        </div>

        <Field label="Notas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    rows={2} placeholder="Observaciones..."
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        {error && (
          <p className="text-[13px] rounded-xl px-4 py-2.5"
             style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
            {error}
          </p>
        )}
        <GranateButton onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar herrado'}
        </GranateButton>
        <GhostButton onClick={onClose} fullWidth>Cancelar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── MAIN TAB ─────────────────────────────────────────────────
export default function TabHerrado({ animal }: { animal: Animal }) {
  const { user }                                  = useAuth()
  const { data: records = [], isLoading }         = useShoeingRecords(animal.id)
  const [addOpen, setAddOpen]                     = useState(false)

  if (isLoading) return <LoadingScreen />

  const nextRecord  = records.find(r => r.next_estimated_date)
  const daysToNext  = nextRecord?.next_estimated_date
    ? differenceInDays(parseISO(nextRecord.next_estimated_date), new Date())
    : null
  const isOverdue   = daysToNext !== null && daysToNext < 0
  const totalCost   = records.reduce((sum, r) => sum + (r.cost ?? 0), 0)
  const lastFarrier = records.find(r => r.farrier_name)?.farrier_name

  return (
    <div className="p-3 pb-8 space-y-2.5">

      {/* PRÓXIMO HERRADO BANNER */}
      {nextRecord && (
        <div className="rounded-2xl px-4 py-3"
             style={{
               background: isOverdue ? '#FCEAEA' : '#FDF3DC',
               border: `1px solid ${isOverdue ? 'rgba(140,31,31,0.2)' : 'rgba(156,106,0,0.2)'}`,
             }}>
          <p className="text-[11px] font-bold uppercase tracking-wider"
             style={{ color: isOverdue ? '#8C1F1F' : '#9C6A00' }}>
            {isOverdue ? '⚠ Herrado vencido' : 'Próximo herrado estimado'}
          </p>
          <p className="text-[18px] font-bold mt-1" style={{ color: '#1C1010' }}>
            {format(parseISO(nextRecord.next_estimated_date!), 'd MMM yyyy', { locale: es })}
            <span className="text-[13px] font-normal ml-2" style={{ color: '#6B5555' }}>
              {daysToNext === 0
                ? '· Hoy'
                : daysToNext! < 0
                ? `· ${Math.abs(daysToNext!)} días de retraso`
                : `· en ${daysToNext} días`}
            </span>
          </p>
          {nextRecord.farrier_name && (
            <p className="text-[12px] mt-0.5" style={{ color: '#6B5555' }}>
              {nextRecord.farrier_name}
            </p>
          )}
        </div>
      )}

      {/* STATS */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[
            [String(records.length),                     'Sesiones',    '#1C1010'],
            [totalCost > 0 ? `${totalCost} €`    : '—', 'Coste total', '#9C6A00'],
            [lastFarrier                         ?? '—', 'Herrador',    '#1C1010'],
          ].map(([v, l, c]) => (
            <div key={l} className="rounded-2xl p-3 text-center"
                 style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
              <p className="text-[14px] font-bold leading-tight truncate" style={{ color: c }}>{v}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#A08888' }}>{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* HISTORY */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Historial
          </p>
          <button onClick={() => setAddOpen(true)}
                  className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
            + Añadir
          </button>
        </div>

        {records.length === 0 ? (
          <EmptyState icon="🔨" title="Sin herrados registrados"
                      subtitle="Registra la primera sesión de herrado" />
        ) : (
          records.map((r, i) => {
            const cfg = TYPE_CONFIG[r.type as HerradoType] ?? TYPE_CONFIG.completo
            return (
              <div key={r.id} className="flex items-start gap-3 px-4 py-3"
                   style={{ borderBottom: i < records.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[18px]"
                     style={{ background: cfg.bg }}>
                  🔨
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
                      {format(parseISO(r.date), 'd MMM yyyy', { locale: es })}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  {r.farrier_name && (
                    <p className="text-[12px] mt-0.5" style={{ color: '#6B5555' }}>{r.farrier_name}</p>
                  )}
                  {r.notes && (
                    <p className="text-[12px] mt-0.5 italic" style={{ color: '#A08888' }}>{r.notes}</p>
                  )}
                  {r.next_estimated_date && (
                    <p className="text-[11px] mt-1" style={{ color: '#1A4F7A' }}>
                      Próximo: {format(parseISO(r.next_estimated_date), 'd MMM yyyy', { locale: es })}
                    </p>
                  )}
                </div>
                {r.cost != null && (
                  <span className="text-[13px] font-bold shrink-0" style={{ color: '#9C6A00' }}>
                    {r.cost} €
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      <AddShoeingSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        animalId={animal.id}
        animalName={animal.name}
        ownerId={user?.id ?? ''}
      />
    </div>
  )
}
