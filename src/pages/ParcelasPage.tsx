import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useMeadows,
  useCreateMeadow,
  useLogWater,
  useLogFood,
  computeWaterFoodStatus,
  statusTextColor,
  type MeadowWithLogs,
} from '../hooks/useMeadows'
import { BottomSheet, ConfirmToast, LoadingScreen, EmptyState } from '../components/ui'
import { MEADOW_COLORS } from '../lib/constants'
import type { ParcelaStatus } from '../types'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const MEADOW_EMOJIS = ['🌿', '🌾', '🏡', '🌳', '🌱', '🍀', '🏔️', '🌄', '🌊', '⛰️', '🌻', '🌺', '🐄', '🐑', '🌵']

const STATUS_OPTIONS: { value: ParcelaStatus; label: string }[] = [
  { value: 'ocupada',     label: 'Ocupada' },
  { value: 'libre',       label: 'Libre' },
  { value: 'descanso',    label: 'Descanso' },
  { value: 'tratamiento', label: 'Tratamiento' },
]

// ─── NEW MEADOW SHEET ─────────────────────────────────────────────────────────

function NewMeadowSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateMeadow()

  const [name,     setName]    = useState('')
  const [surface,  setSurface] = useState('')
  const [ref,      setRef]     = useState('')
  const [status,   setStatus]  = useState<ParcelaStatus>('libre')
  const [notes,    setNotes]   = useState('')
  const [emoji,    setEmoji]   = useState('🌿')
  const [color,    setColor]   = useState<string>(MEADOW_COLORS[0].rgba)

  // Reset on open
  useEffect(() => {
    if (open) {
      setName(''); setSurface(''); setRef(''); setStatus('libre')
      setNotes(''); setEmoji('🌿'); setColor(MEADOW_COLORS[0].rgba)
    }
  }, [open])

  const inputSt: React.CSSProperties = {
    background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)',
    color: '#1C1010', borderRadius: 12, padding: '10px 14px', fontSize: 14,
    width: '100%', outline: 'none',
  }

  const handleSave = () => {
    if (!name.trim()) return
    create.mutate({
      name:          name.trim(),
      surface_ha:    surface ? parseFloat(surface) : undefined,
      cadastral_ref: ref || undefined,
      status,
      notes:         notes || undefined,
      icon_emoji:    emoji,
      color_rgba:    color,
    }, { onSuccess: onClose })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva parcela">
      <div className="space-y-3.5">
        {/* Emoji */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A08888' }}>Icono</p>
          <div className="flex flex-wrap gap-2">
            {MEADOW_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className="w-10 h-10 rounded-xl text-xl flex items-center justify-center"
                style={{
                  background: emoji === e ? '#F5E8EC' : '#F7F3EE',
                  border: emoji === e ? '2px solid #7B1F3A' : '1px solid rgba(123,31,58,0.18)',
                }}>
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
                className="w-9 h-9 rounded-xl transition-transform"
                style={{
                  background: c.rgba,
                  border: color === c.rgba ? '2.5px solid #7B1F3A' : '1px solid rgba(123,31,58,0.22)',
                  transform: color === c.rgba ? 'scale(1.15)' : 'scale(1)',
                }} />
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Nombre *</p>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Prado Norte"
            style={inputSt}
          />
        </div>

        {/* Surface + Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Superficie (ha)</p>
            <input type="number" value={surface} onChange={e => setSurface(e.target.value)}
              placeholder="0.0" style={inputSt} />
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
          <input value={ref} onChange={e => setRef(e.target.value)}
            placeholder="XXXXXXXXXX" style={inputSt} />
        </div>

        {/* Notes */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Notas</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            style={{ ...inputSt, resize: 'none' }} />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
            style={{ background: '#F7F3EE', color: '#6B5555' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={!name.trim() || create.isPending}
            className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-white"
            style={{ background: name.trim() ? '#7B1F3A' : 'rgba(123,31,58,0.3)' }}>
            {create.isPending ? 'Guardando…' : 'Crear parcela'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── MEADOW CARD ─────────────────────────────────────────────────────────────

function MeadowCard({
  meadow,
  onWater,
  onFood,
  onClick,
}: {
  meadow: MeadowWithLogs
  onWater: () => void
  onFood: () => void
  onClick: () => void
}) {
  const waterSt = computeWaterFoodStatus(meadow.meadow_water_logs)
  const foodSt  = computeWaterFoodStatus(meadow.meadow_food_logs)
  const count   = meadow.animals?.length ?? 0
  const color   = meadow.color_rgba ?? 'rgba(123,31,58,0.14)'

  return (
    <div className="mx-3 mb-2.5 rounded-[18px] overflow-hidden"
         style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      {/* Color band */}
      <div style={{ height: 6, background: color }} />

      {/* Top — name + emoji */}
      <div className="flex items-center gap-3 px-3.5 pt-3 pb-2.5 cursor-pointer" onClick={onClick}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
             style={{ background: color }}>
          {meadow.icon_emoji ?? '🌿'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold truncate" style={{ color: '#1C1010' }}>{meadow.name}</p>
          <p className="text-[11px]" style={{ color: '#6B5555' }}>
            {[meadow.surface_ha ? `${meadow.surface_ha} ha` : null, meadow.status].filter(Boolean).join(' · ')}
          </p>
        </div>
        <span style={{ color: '#A08888', fontSize: 16 }}>›</span>
      </div>

      {/* Counters row */}
      <div className="grid grid-cols-3" style={{ borderTop: '1px solid rgba(123,31,58,0.09)' }}>
        {/* Animals counter */}
        <div className="flex flex-col items-center py-2.5 cursor-pointer" onClick={onClick}
             style={{ borderRight: '1px solid rgba(123,31,58,0.09)' }}>
          <span style={{ fontSize: 17, marginBottom: 3 }}>🐴</span>
          <span className="text-[14px] font-bold" style={{ color: '#A08888' }}>{count}</span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: '#6B5555' }}>Animales</span>
        </div>

        {/* Water counter */}
        <button className="flex flex-col items-center py-2.5"
                style={{ borderRight: '1px solid rgba(123,31,58,0.09)' }}
                onClick={e => { e.stopPropagation(); onWater() }}>
          <span style={{ fontSize: 17, marginBottom: 3 }}>💧</span>
          <span className="text-[14px] font-bold" style={{ color: statusTextColor(waterSt.status) }}>
            {waterSt.daysSince !== null ? `${waterSt.daysSince}d` : '—'}
          </span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: '#6B5555' }}>Agua</span>
        </button>

        {/* Food counter */}
        <button className="flex flex-col items-center py-2.5"
                onClick={e => { e.stopPropagation(); onFood() }}>
          <span style={{ fontSize: 17, marginBottom: 3 }}>🌿</span>
          <span className="text-[14px] font-bold" style={{ color: statusTextColor(foodSt.status) }}>
            {foodSt.daysSince !== null ? `${foodSt.daysSince}d` : '—'}
          </span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: '#6B5555' }}>Comida</span>
        </button>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

type ConfirmState = { open: boolean; meadowId: string; type: 'water' | 'food'; label: string }

export default function ParcelasPage() {
  const navigate   = useNavigate()
  const { data: meadows, isLoading } = useMeadows()
  const logWater   = useLogWater()
  const logFood    = useLogFood()
  const [confirm, setConfirm]     = useState<ConfirmState>({ open: false, meadowId: '', type: 'water', label: '' })
  const [sheetOpen, setSheetOpen] = useState(false)
  const handleConfirm = () => {
    if (!confirm.meadowId) return
    if (confirm.type === 'water') logWater.mutate(confirm.meadowId)
    else logFood.mutate(confirm.meadowId)
    setConfirm(p => ({ ...p, open: false }))
  }

  if (isLoading) return <LoadingScreen />

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0" style={{ background: '#7B1F3A' }}>
        <div className="safe-top" />
        <div className="px-4 py-2.5 pb-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight">Parcelas</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {meadows ? `${meadows.length} parcela${meadows.length !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold"
            style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}
          >
            + Nueva
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-3 pb-4" style={{ background: '#F7F3EE' }}>
        {!meadows || meadows.length === 0 ? (
          <EmptyState icon="🌿" title="Sin parcelas registradas"
                      subtitle="Pulsa «+ Nueva» para añadir tu primera parcela"
                      action={{ label: '+ Nueva parcela', onClick: () => setSheetOpen(true) }} />
        ) : (
          meadows.map(m => (
            <MeadowCard
              key={m.id}
              meadow={m}
              onClick={() => navigate(`/parcelas/${m.id}`)}
              onWater={() => setConfirm({ open: true, meadowId: m.id, type: 'water', label: `Registrar agua en ${m.name}` })}
              onFood={() => setConfirm({ open: true, meadowId: m.id, type: 'food', label: `Registrar comida en ${m.name}` })}
            />
          ))
        )}
      </div>

      <ConfirmToast
        open={confirm.open}
        message={confirm.label}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(p => ({ ...p, open: false }))}
      />

      <NewMeadowSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
