import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useMeadows,
  useLogWater,
  useLogFood,
  computeWaterFoodStatus,
  statusTextColor,
  type MeadowWithLogs,
} from '../hooks/useMeadows'
import { useAuth } from '../hooks/useAuth'
import { createAutoTask } from '../hooks/useReproduction'
import { ConfirmToast, LoadingScreen, EmptyState } from '../components/ui'

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
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const { data: meadows, isLoading } = useMeadows()
  const logWater   = useLogWater()
  const logFood    = useLogFood()
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false, meadowId: '', type: 'water', label: '' })
  const autoFired  = useRef<Set<string>>(new Set())

  // Auto-create tasks when parcela reaches ámbar/rojo
  useEffect(() => {
    if (!meadows || !user) return
    meadows.forEach(m => {
      const ws = computeWaterFoodStatus(m.meadow_water_logs)
      const fs = computeWaterFoodStatus(m.meadow_food_logs)

      const wKey = `${m.id}-water-${ws.status}`
      if ((ws.status === 'warn' || ws.status === 'due') && !autoFired.current.has(wKey)) {
        autoFired.current.add(wKey)
        createAutoTask({ owner_id: user.id, title: `Agua: ${m.name}`, origin: 'auto_agua' })
      }
      const fKey = `${m.id}-food-${fs.status}`
      if ((fs.status === 'warn' || fs.status === 'due') && !autoFired.current.has(fKey)) {
        autoFired.current.add(fKey)
        createAutoTask({ owner_id: user.id, title: `Comida: ${m.name}`, origin: 'auto_comida' })
      }
    })
  }, [meadows, user])

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
        <div className="px-4 py-2.5 pb-3.5">
          <h1 className="text-[20px] font-bold text-white tracking-tight">Parcelas</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {meadows ? `${meadows.length} parcelas` : ''}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-3 pb-4" style={{ background: '#F7F3EE' }}>
        {!meadows || meadows.length === 0 ? (
          <EmptyState icon="🌿" title="Sin parcelas registradas"
                      subtitle="Las parcelas se añaden desde Supabase" />
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
    </div>
  )
}
