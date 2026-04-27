import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  useMeadow,
  useMeadowWaterLogs,
  useMeadowFoodLogs,
  useLogWater,
  useLogFood,
  useUpdateMeadow,
  useDeleteMeadow,
  computeWaterFoodStatus,
  statusTextColor,
} from '../hooks/useMeadows'
import { useAnimalsByMeadow, useAnimals, useUpdateAnimal } from '../hooks/useAnimals'
import { useMeadows } from '../hooks/useMeadows'
import { MEADOW_COLORS } from '../lib/constants'
import {
  InnerTabs, ConfirmToast, BottomSheet, LoadingScreen, EmptyState, DeleteZone,
} from '../components/ui'
import { Azulejo } from '../components/horse/Azulejo'
import type { Animal, ParcelaStatus } from '../types'

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const MEADOW_EMOJIS = ['🌿', '🌾', '🏡', '🌳', '🌱', '🍀', '🏔️', '🌄', '🌊', '⛰️', '🌻', '🌺', '🐄', '🐑', '🌵']

const STATUS_OPTIONS: { value: ParcelaStatus; label: string }[] = [
  { value: 'ocupada',     label: 'Ocupada' },
  { value: 'libre',       label: 'Libre' },
  { value: 'descanso',    label: 'Descanso' },
  { value: 'tratamiento', label: 'Tratamiento' },
]

// ─── EDIT MEADOW SHEET ────────────────────────────────────────────────────────

function EditMeadowSheet({
  open, onClose, meadow,
}: {
  open: boolean
  onClose: () => void
  meadow: { id: string; name: string; surface_ha?: number; cadastral_ref?: string; status: ParcelaStatus; notes?: string; icon_emoji?: string; color_rgba?: string }
}) {
  const update = useUpdateMeadow()
  const [name, setName]         = useState(meadow.name)
  const [surface, setSurface]   = useState(String(meadow.surface_ha ?? ''))
  const [ref, setRef]           = useState(meadow.cadastral_ref ?? '')
  const [status, setStatus]     = useState<ParcelaStatus>(meadow.status)
  const [notes, setNotes]       = useState(meadow.notes ?? '')
  const [emoji, setEmoji]       = useState(meadow.icon_emoji ?? '🌿')
  const [colorRgba, setColor]   = useState(meadow.color_rgba ?? MEADOW_COLORS[0].rgba)

  const inputSt: React.CSSProperties = {
    background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)',
    color: '#1C1010', borderRadius: 12, padding: '10px 14px', fontSize: 14,
    width: '100%', outline: 'none',
  }

  const handleSave = () => {
    update.mutate({
      id: meadow.id,
      name: name.trim() || meadow.name,
      surface_ha: surface ? parseFloat(surface) : undefined,
      cadastral_ref: ref || undefined,
      status,
      notes: notes || undefined,
      icon_emoji: emoji,
      color_rgba: colorRgba,
    }, { onSuccess: onClose })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar parcela">
      <div className="space-y-3.5">
        {/* Emoji */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A08888' }}>Icono</p>
          <div className="flex flex-wrap gap-2">
            {MEADOW_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
                style={{ background: emoji === e ? '#F5E8EC' : '#F7F3EE', border: emoji === e ? '2px solid #7B1F3A' : '1px solid rgba(123,31,58,0.18)' }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A08888' }}>Color</p>
          <div className="flex flex-wrap gap-2">
            {MEADOW_COLORS.map(c => (
              <button key={c.rgba} onClick={() => setColor(c.rgba)}
                className="w-9 h-9 rounded-xl"
                style={{
                  background: c.rgba,
                  border: colorRgba === c.rgba ? '2.5px solid #7B1F3A' : '1px solid rgba(123,31,58,0.22)',
                  transform: colorRgba === c.rgba ? 'scale(1.15)' : 'scale(1)',
                }} />
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Nombre</p>
          <input value={name} onChange={e => setName(e.target.value)} style={inputSt} />
        </div>

        {/* Surface + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Superficie (ha)</p>
            <input type="number" value={surface} onChange={e => setSurface(e.target.value)} placeholder="0.0" style={inputSt} />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Estado</p>
            <select value={status} onChange={e => setStatus(e.target.value as ParcelaStatus)}
              style={{ ...inputSt, appearance: 'none' as const }}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Ref catastral */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Ref. catastral</p>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="XXXXXXXXXX" style={inputSt} />
        </div>

        {/* Notes */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Notas</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            style={{ ...inputSt, resize: 'none' }} />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: '#F7F3EE', color: '#6B5555' }}>Cancelar</button>
          <button onClick={handleSave} disabled={update.isPending}
            className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-white"
            style={{ background: '#7B1F3A' }}>
            {update.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── ADD ANIMAL SHEET ─────────────────────────────────────────────────────────

function AddAnimalSheet({
  open, onClose, meadowId,
}: {
  open: boolean; onClose: () => void; meadowId: string
}) {
  const { data: allAnimals } = useAnimals()
  const updateAnimal = useUpdateAnimal()
  const [search, setSearch] = useState('')

  const available = (allAnimals ?? []).filter(a =>
    a.meadow_id !== meadowId &&
    a.status === 'activo' &&
    (a.name.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAdd = (animalId: string) => {
    updateAnimal.mutate({ id: animalId, meadow_id: meadowId }, { onSuccess: onClose })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Añadir animal">
      <div className="space-y-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar animal…"
          className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
          style={{ background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)', color: '#1C1010' }} />

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {available.length === 0 && (
            <p className="text-[13px] text-center py-6" style={{ color: '#A08888' }}>
              Sin animales disponibles
            </p>
          )}
          {available.map(a => (
            <button key={a.id} onClick={() => handleAdd(a.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
              style={{ background: '#F7F3EE' }}>
              <Azulejo animal={a as Animal} size={36} borderRadius={10} />
              <div>
                <p className="text-[14px] font-semibold" style={{ color: '#1C1010' }}>{a.name}</p>
                <p className="text-[11px]" style={{ color: '#6B5555' }}>{[a.breed, a.sex].filter(Boolean).join(' · ')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── MOVE ANIMAL SHEET ────────────────────────────────────────────────────────

function MoveAnimalSheet({
  open, onClose, animalId, currentMeadowId,
}: {
  open: boolean; onClose: () => void; animalId: string | null; currentMeadowId: string
}) {
  const { data: meadows } = useMeadows()
  const updateAnimal = useUpdateAnimal()

  const others = (meadows ?? []).filter(m => m.id !== currentMeadowId)

  const handleMove = (targetId: string | null) => {
    if (!animalId) return
    updateAnimal.mutate({ id: animalId, meadow_id: targetId ?? undefined }, { onSuccess: onClose })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Mover a parcela">
      <div className="space-y-2">
        <button onClick={() => handleMove(null)}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
          style={{ background: '#FCEAEA', border: '1px solid #8C1F1F33' }}>
          <span className="text-lg">🚪</span>
          <span className="text-[14px] font-semibold" style={{ color: '#8C1F1F' }}>Quitar de la parcela</span>
        </button>

        {others.map(m => (
          <button key={m.id} onClick={() => handleMove(m.id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
            style={{ background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.14)' }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: m.color_rgba ?? 'rgba(123,31,58,0.14)' }}>
              {m.icon_emoji ?? '🌿'}
            </span>
            <span className="text-[14px] font-semibold" style={{ color: '#1C1010' }}>{m.name}</span>
          </button>
        ))}
        {others.length === 0 && (
          <p className="text-[13px] text-center py-4" style={{ color: '#A08888' }}>Sin otras parcelas</p>
        )}
      </div>
    </BottomSheet>
  )
}

// ─── LOG HISTORY ROW ──────────────────────────────────────────────────────────

function LogRow({ loggedAt }: { loggedAt: string }) {
  const dt = parseISO(loggedAt)
  return (
    <div className="flex items-center gap-3 py-2.5 px-1"
         style={{ borderTop: '1px solid rgba(123,31,58,0.07)' }}>
      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#7B1F3A' }} />
      <span className="text-[13px] font-semibold flex-1" style={{ color: '#1C1010' }}>
        {format(dt, "d MMM yyyy · HH:mm", { locale: es })}
      </span>
      <span className="text-[11px]" style={{ color: '#A08888' }}>
        {formatDistanceToNow(dt, { addSuffix: true, locale: es })}
      </span>
    </div>
  )
}

// ─── BIG COUNTER BUTTON ───────────────────────────────────────────────────────

function BigCounter({
  icon, label, daysSince, status, onClick,
}: {
  icon: string; label: string
  daysSince: number | null; status: 'ok' | 'warn' | 'due'
  onClick: () => void
}) {
  const col = statusTextColor(status)
  return (
    <button onClick={onClick}
      className="flex-1 rounded-2xl p-4 flex flex-col items-center"
      style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      <span style={{ fontSize: 26, marginBottom: 6 }}>{icon}</span>
      <span className="text-[26px] font-bold" style={{ color: col }}>
        {daysSince !== null ? `${daysSince}d` : '—'}
      </span>
      <span className="text-[11px] font-semibold mt-1" style={{ color: '#6B5555' }}>{label}</span>
      <span className="text-[10px] font-semibold mt-1" style={{ color: '#7B1F3A' }}>Tap para registrar</span>
    </button>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ParcelasDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: meadow, isLoading } = useMeadow(id)
  const { data: waterLogs } = useMeadowWaterLogs(id)
  const { data: foodLogs }  = useMeadowFoodLogs(id)
  const { data: animals }   = useAnimalsByMeadow(id)
  const logWater    = useLogWater()
  const logFood     = useLogFood()
  const deleteMeadow = useDeleteMeadow()

  const [activeTab, setActiveTab] = useState(0)
  const [confirmW, setConfirmW]   = useState(false)
  const [confirmF, setConfirmF]   = useState(false)
  const [editOpen, setEditOpen]   = useState(false)
  const [addOpen, setAddOpen]     = useState(false)
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [moveOpen, setMoveOpen]   = useState(false)

  if (isLoading) return <LoadingScreen />
  if (!meadow)   return <EmptyState title="Parcela no encontrada"
                                    action={{ label: '‹ Volver', onClick: () => navigate(-1) }} />

  const wSt = computeWaterFoodStatus(waterLogs ?? [])
  const fSt = computeWaterFoodStatus(foodLogs  ?? [])
  const color = meadow.color_rgba ?? 'rgba(123,31,58,0.14)'

  return (
    <div className="flex flex-col h-full">
      {/* HERO */}
      <div className="shrink-0" style={{ background: 'linear-gradient(165deg, #5C1629 0%, #7B1F3A 100%)' }}>
        <div className="safe-top" />
        <button onClick={() => navigate(-1)}
          className="px-4 pt-2 text-[13px] font-medium block"
          style={{ color: 'rgba(255,255,255,0.8)' }}>
          ‹ Parcelas
        </button>
        <div className="flex items-end gap-3.5 px-4 pb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
               style={{ background: color, border: '2px solid rgba(255,255,255,0.3)' }}>
            {meadow.icon_emoji ?? '🌿'}
          </div>
          <div className="flex-1">
            <h1 className="text-[22px] font-bold text-white tracking-tight">{meadow.name}</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {[meadow.surface_ha ? `${meadow.surface_ha} ha` : null, meadow.status].filter(Boolean).join(' · ')}
            </p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditOpen(true)}
                className="text-[11px] font-semibold px-3 py-1 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                Editar ›
              </button>
            </div>
          </div>
        </div>
      </div>

      <InnerTabs tabs={['Info y registros', 'Animales']} active={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ background: '#F7F3EE' }}>

        {/* ─── TAB INFO ─── */}
        {activeTab === 0 && (
          <div className="p-4 space-y-4 pb-8">
            {/* Big counters */}
            <div className="flex gap-3">
              <BigCounter icon="💧" label="Agua" daysSince={wSt.daysSince} status={wSt.status} onClick={() => setConfirmW(true)} />
              <BigCounter icon="🌿" label="Comida" daysSince={fSt.daysSince} status={fSt.status} onClick={() => setConfirmF(true)} />
            </div>

            {/* Info card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Información</p>
              </div>
              {[
                { label: 'Superficie', value: meadow.surface_ha ? `${meadow.surface_ha} ha` : undefined },
                { label: 'Ref. catastral', value: meadow.cadastral_ref },
                { label: 'Estado', value: STATUS_OPTIONS.find(s => s.value === meadow.status)?.label },
                { label: 'Notas', value: meadow.notes },
              ].map((row, i) => (
                <div key={row.label} className="flex items-start justify-between px-4 py-2.5"
                     style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(123,31,58,0.07)' }}>
                  <span className="text-[13px]" style={{ color: '#6B5555' }}>{row.label}</span>
                  <span className="text-[13px] font-semibold text-right max-w-[55%]"
                        style={{ color: row.value ? '#1C1010' : '#A08888', fontStyle: row.value ? 'normal' : 'italic', fontWeight: row.value ? 600 : 400 }}>
                    {row.value ?? '—'}
                  </span>
                </div>
              ))}
            </div>

            {/* Water history */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
                <span>💧</span>
                <p className="text-[11px] font-bold uppercase tracking-wider flex-1" style={{ color: '#A08888' }}>Historial agua</p>
                <span className="text-[11px]" style={{ color: '#A08888' }}>Media: {wSt.average}d</span>
              </div>
              <div className="px-3">
                {!waterLogs || waterLogs.length === 0
                  ? <p className="text-[13px] text-center py-4" style={{ color: '#A08888' }}>Sin registros</p>
                  : waterLogs.slice(0, 10).map(l => <LogRow key={l.id} loggedAt={l.logged_at} />)
                }
              </div>
            </div>

            {/* Food history */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
                <span>🌿</span>
                <p className="text-[11px] font-bold uppercase tracking-wider flex-1" style={{ color: '#A08888' }}>Historial comida</p>
                <span className="text-[11px]" style={{ color: '#A08888' }}>Media: {fSt.average}d</span>
              </div>
              <div className="px-3">
                {!foodLogs || foodLogs.length === 0
                  ? <p className="text-[13px] text-center py-4" style={{ color: '#A08888' }}>Sin registros</p>
                  : foodLogs.slice(0, 10).map(l => <LogRow key={l.id} loggedAt={l.logged_at} />)
                }
              </div>
            </div>

            {/* ELIMINAR PARCELA */}
            <DeleteZone
              label={meadow.name}
              onDelete={() => deleteMeadow.mutate(meadow.id, { onSuccess: () => navigate('/parcelas') })}
              isPending={deleteMeadow.isPending}
            />
          </div>
        )}

        {/* ─── TAB ANIMALS ─── */}
        {activeTab === 1 && (
          <div className="pb-8">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
                {animals?.length ?? 0} animales
              </p>
              <button onClick={() => setAddOpen(true)}
                className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
                + Añadir
              </button>
            </div>

            {!animals || animals.length === 0 ? (
              <EmptyState icon="🐴" title="Sin animales asignados"
                          subtitle="Usa + Añadir para mover un animal a esta parcela" />
            ) : (
              <div className="mx-3 rounded-2xl overflow-hidden"
                   style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                {animals.map((a, i) => (
                  <div key={a.id} className="flex items-center gap-3 px-3.5 py-3"
                       style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(123,31,58,0.07)' }}>
                    <Azulejo animal={a as Animal} size={36} borderRadius={10}
                             custody={a.status === 'custodia'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: '#1C1010' }}>{a.name}</p>
                      <p className="text-[11px]" style={{ color: '#6B5555' }}>
                        {[a.breed, a.sex].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button onClick={() => { setMoveTarget(a.id ?? null); setMoveOpen(true) }}
                      className="text-[12px] font-semibold shrink-0"
                      style={{ color: '#7B1F3A' }}>
                      Mover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm toasts */}
      <ConfirmToast open={confirmW} message="Registrar agua hoy"
        onConfirm={() => { logWater.mutate(meadow.id); setConfirmW(false) }}
        onCancel={() => setConfirmW(false)} />
      <ConfirmToast open={confirmF} message="Registrar comida hoy"
        onConfirm={() => { logFood.mutate(meadow.id); setConfirmF(false) }}
        onCancel={() => setConfirmF(false)} />

      {/* Edit sheet */}
      <EditMeadowSheet open={editOpen} onClose={() => setEditOpen(false)} meadow={meadow} />

      {/* Add animal sheet */}
      <AddAnimalSheet open={addOpen} onClose={() => setAddOpen(false)} meadowId={meadow.id} />

      {/* Move animal sheet */}
      <MoveAnimalSheet open={moveOpen} onClose={() => setMoveOpen(false)}
        animalId={moveTarget} currentMeadowId={meadow.id} />
    </div>
  )
}
