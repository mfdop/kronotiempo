import { useState } from 'react'
import type { Animal } from '../../types'
import { AZULEJO_COLORS, COAT_PATTERNS } from '../../lib/constants'
import { BottomSheet } from '../ui'
import { HorseFigure } from './HorseFigure'
import { coatFromAnimal } from './horseCoat'

// ─── AZULEJO TILE ─────────────────────────────────────────────────────────────
interface AzulejoProps {
  animal: Pick<Animal,
    'azulejo_ink' | 'azulejo_bg' | 'azulejo_spot_ink' |
    'coat_pattern' | 'coat_careto' | 'coat_cuatroalbo'
  >
  size?: number
  borderRadius?: number
  onClick?: () => void
  custody?: boolean
}

export function Azulejo({
  animal, size = 52, borderRadius = 14, onClick, custody = false,
}: AzulejoProps) {
  const bg          = animal.azulejo_bg       ?? '#F0E4D4'
  const borderStyle = custody ? 'dashed' : 'solid'

  return (
    <div
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius,
        background: bg, position: 'relative', overflow: 'hidden',
        border: `2.5px ${borderStyle} #7B1F3A`,
        boxShadow: `inset 0 0 0 3px rgba(255,255,255,0.75),
                    inset 0 0 0 4.5px rgba(123,31,58,0.30)`,
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
    >
      <HorseFigure
        coat={coatFromAnimal(animal)}
        ground="none"
        viewBox="18 8 194 182"
        style={{ position: 'absolute', inset: '5%', width: '90%', height: '90%' }}
      />
    </div>
  )
}

// ─── AZULEJO CUSTOMIZER ──────────────────────────────────────────────────────
interface AzulejoCustomizerProps {
  open: boolean
  onClose: () => void
  values: {
    azulejo_ink: string
    azulejo_bg: string
    azulejo_spot_ink: string
    coat_pattern: string
    coat_careto: boolean
    coat_cuatroalbo: boolean
  }
  onChange: (values: AzulejoCustomizerProps['values']) => void
  animalName?: string
}

export function AzulejoCustomizer({
  open, onClose, values, onChange, animalName,
}: AzulejoCustomizerProps) {
  const [local, setLocal] = useState(values)

  // Keep local in sync when values prop changes (e.g. sheet re-opens)
  const update = (patch: Partial<typeof local>) => {
    setLocal(prev => ({ ...prev, ...patch }))
  }

  const handleSave = () => {
    onChange(local)
    onClose()
  }

  const spotColors = [
    { label: 'Negro',   hex: '#1A100C' },
    { label: 'Blanco',  hex: '#F0ECE8' },
    { label: 'Castaño', hex: '#8B5C2A' },
    { label: 'Alazán',  hex: '#B86030' },
    { label: 'Gris',    hex: '#9098A8' },
  ]

  const needsSpot = local.coat_pattern !== 'lisa'

  return (
    <BottomSheet open={open} onClose={onClose} title={`Icono · ${animalName ?? 'Animal'}`}>
      {/* Preview */}
      <div className="flex items-center gap-4 rounded-2xl p-3.5 mb-4"
           style={{ background: '#F7F3EE' }}>
        <Azulejo animal={local as Animal} size={72} borderRadius={18} />
        <div>
          <p className="text-[14px] font-bold" style={{ color: '#1C1010' }}>
            {animalName ?? 'Animal'}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B5555' }}>
            {COAT_PATTERNS.find(p => p.value === local.coat_pattern)?.label ?? 'Lisa'}
            {local.coat_careto ? ' · Careto' : ''}
            {local.coat_cuatroalbo ? ' · Cuatroalbo' : ''}
          </p>
        </div>
      </div>

      {/* Ink color */}
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
         style={{ color: '#A08888' }}>Color de tinta</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {AZULEJO_COLORS.map(c => (
          <button
            key={c.ink}
            onClick={() => update({ azulejo_ink: c.ink, azulejo_bg: c.bg })}
            className="w-8 h-8 rounded-full transition-transform"
            style={{
              background: c.ink,
              border: local.azulejo_ink === c.ink
                ? '2.5px solid #7B1F3A'
                : '2.5px solid transparent',
              transform: local.azulejo_ink === c.ink ? 'scale(1.18)' : 'scale(1)',
              ...(c.ink.startsWith('#F') || c.ink.startsWith('#C')
                ? { outline: '1px solid #ccc' } : {}),
            }}
          />
        ))}
      </div>

      {/* Pattern */}
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
         style={{ color: '#A08888' }}>Capa base</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {COAT_PATTERNS.map(p => (
          <button
            key={p.value}
            onClick={() => update({ coat_pattern: p.value })}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
            style={{
              background: local.coat_pattern === p.value ? '#7B1F3A' : '#fff',
              color: local.coat_pattern === p.value ? '#fff' : '#6B5555',
              border: `1.5px solid ${local.coat_pattern === p.value ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Spot color — only when pattern has spots/patches */}
      {needsSpot && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
             style={{ color: '#A08888' }}>Color de manchas</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {spotColors.map(c => (
              <button
                key={c.hex}
                onClick={() => update({ azulejo_spot_ink: c.hex })}
                className="w-8 h-8 rounded-full transition-transform"
                style={{
                  background: c.hex,
                  border: local.azulejo_spot_ink === c.hex
                    ? '2.5px solid #7B1F3A'
                    : '2.5px solid transparent',
                  transform: local.azulejo_spot_ink === c.hex ? 'scale(1.18)' : 'scale(1)',
                  ...(c.hex.startsWith('#F') ? { outline: '1px solid #ccc' } : {}),
                }}
              />
            ))}
          </div>
        </>
      )}

      {/* Marks — independent toggles */}
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
         style={{ color: '#A08888' }}>Marcas adicionales</p>
      <div className="flex gap-2 mb-6">
        {[
          { key: 'coat_careto',    label: 'Careto'     },
          { key: 'coat_cuatroalbo', label: 'Cuatroalbo' },
        ].map(({ key, label }) => {
          const on = local[key as keyof typeof local] as boolean
          return (
            <button
              key={key}
              onClick={() => update({ [key]: !on } as Partial<typeof local>)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{
                border: `1.5px solid ${on ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                color: on ? '#7B1F3A' : '#6B5555',
                background: '#fff',
              }}
            >
              <span
                className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[10px]"
                style={{
                  background: on ? '#7B1F3A' : '#fff',
                  border: `1.5px solid ${on ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                  color: '#fff',
                }}
              >
                {on ? '✓' : ''}
              </span>
              {label}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-xl text-white text-[15px] font-bold"
        style={{ background: '#7B1F3A' }}
      >
        Guardar icono
      </button>
    </BottomSheet>
  )
}
