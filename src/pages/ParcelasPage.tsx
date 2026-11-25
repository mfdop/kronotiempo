import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useMeadows,
  useCreateMeadow,
  useLogWater,
  useLogFood,
  computeWaterFoodStatus,
  computeFoodStatus,
  statusTextColor,
  type MeadowWithLogs,
} from '../hooks/useMeadows'
import { BottomSheet, ConfirmToast, LoadingScreen, EmptyState } from '../components/ui'
import { MeadowIcon, MeadowIconPicker, WaterDropIcon, FoodIcon, HorseHeadIcon } from '../components/meadow/MeadowIcon'
import { MEADOW_COLORS } from '../lib/constants'
import type { ParcelaStatus } from '../types'
import HeaderLogo from '../components/ui/HeaderLogo'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

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
  const [emoji,    setEmoji]   = useState('pradera')
  const [color,    setColor]   = useState<string>(MEADOW_COLORS[0].rgba)
  const [hasWater, setHasWater] = useState(true)

  // Reset on open
  useEffect(() => {
    if (open) {
      setName(''); setSurface(''); setRef(''); setStatus('libre')
      setNotes(''); setEmoji('pradera'); setColor(MEADOW_COLORS[0].rgba); setHasWater(true)
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
      has_water:     hasWater,
    }, { onSuccess: onClose })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva parcela">
      <div className="space-y-3.5">
        {/* Icono */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A08888' }}>Icono</p>
          <MeadowIconPicker value={emoji} onChange={setEmoji} />
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

        {/* Water toggle */}
        <button type="button" onClick={() => setHasWater(!hasWater)}
          className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left"
          style={{ background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)' }}>
          <span>
            <span className="block text-[13px] font-semibold" style={{ color: '#1C1010' }}>Tiene punto de agua</span>
            <span className="block text-[11px]" style={{ color: '#6B5555' }}>Si no, se oculta el control de agua</span>
          </span>
          <span className="w-11 h-6 rounded-full relative shrink-0 transition-colors"
                style={{ background: hasWater ? '#2E6B3E' : 'rgba(123,31,58,0.25)' }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
                  style={{ left: hasWater ? 22 : 2 }} />
          </span>
        </button>

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
  const foodSt  = computeFoodStatus(meadow.meadow_food_logs)
  const hasWater = meadow.has_water !== false
  const count   = meadow.animals?.length ?? 0
  const color   = meadow.color_rgba ?? 'rgba(123,31,58,0.14)'

  return (
    <div className="mx-3 mb-2.5 rounded-[18px] overflow-hidden"
         style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      {/* Color band */}
      <div style={{ height: 6, background: color }} />

      {/* Top — name + icon */}
      <div className="flex items-center gap-3 px-3.5 pt-3 pb-2.5 cursor-pointer" onClick={onClick}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: color }}>
          <MeadowIcon name={meadow.icon_emoji} size={30} />
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
      <div className={hasWater ? 'grid grid-cols-3' : 'grid grid-cols-2'} style={{ borderTop: '1px solid rgba(123,31,58,0.09)' }}>
        {/* Animals counter */}
        <div className="flex flex-col items-center py-2.5 cursor-pointer" onClick={onClick}
             style={{ borderRight: '1px solid rgba(123,31,58,0.09)' }}>
          <span style={{ marginBottom: 3 }}><HorseHeadIcon size={20} /></span>
          <span className="text-[14px] font-bold" style={{ color: '#A08888' }}>{count}</span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: '#6B5555' }}>Animales</span>
        </div>

        {/* Water counter */}
        {hasWater && (
        <button className="flex flex-col items-center py-2.5"
                style={{ borderRight: '1px solid rgba(123,31,58,0.09)' }}
                onClick={e => { e.stopPropagation(); onWater() }}>
          <span style={{ marginBottom: 3 }}><WaterDropIcon size={20} /></span>
          <span className="text-[14px] font-bold" style={{ color: statusTextColor(waterSt.status) }}>
            {waterSt.daysSince !== null ? `${waterSt.daysSince}d` : '—'}
          </span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: '#6B5555' }}>Agua</span>
        </button>
        )}

        {/* Food counter */}
        <button className="flex flex-col items-center py-2.5"
                onClick={e => { e.stopPropagation(); onFood() }}>
          <span style={{ marginBottom: 3 }}><FoodIcon size={20} /></span>
          <span className="text-[14px] font-bold" style={{ color: statusTextColor(foodSt.status) }}>
            {foodSt.daysSince !== null ? `${foodSt.daysSince}d` : '—'}
          </span>
          <span className="text-[9px] font-medium mt-0.5" style={{ color: '#6B5555' }}>
            {foodSt.learning ? `Aprendiendo (${foodSt.learning.count}/${foodSt.learning.needed})` : 'Comida'}
          </span>
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
      <div className="shrink-0 relative" style={{ background: '#7B1F3A' }}>
        <div className="safe-top" />
        <HeaderLogo />
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
          <EmptyState icon={<MeadowIcon name="pradera" size={56} />} title="Sin parcelas registradas"
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
