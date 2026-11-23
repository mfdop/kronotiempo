import { useState } from 'react'
import type { Animal } from '../../types'
import { AZULEJO_COLORS, COAT_PATTERNS } from '../../lib/constants'
import { BottomSheet } from '../ui'
import { HorseFigure } from './HorseFigure'
import { coatFromAnimal } from './horseCoat'

// ─── AZULEJO TILE ─────────────────────────────────────────────────────────────
interface AzulejoProps {
  animal: Pick<Animal,
    'azulejo_ink' | 'azulejo_bg' | 'azulejo_spot_ink' | 'azulejo_mane_ink' |
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
        icon={size < 64}
        viewBox="-6 14 236 286"
        style={{ position: 'absolute', inset: '6%', width: '88%', height: '88%' }}
      />
    </div>
  )
}

// ─── COLOR ROW (suggested swatches + free picker) ───────────────────────────
const isLight = (h: string) => {
  const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.8
}

function ColorRow({ label, swatches, value, onPick, allowAuto, autoLabel = 'Auto' }: {
  label: string
  swatches: string[]
  value: string | null
  onPick: (hex: string | null) => void
  allowAuto?: boolean
  autoLabel?: string
}) {
  const norm = (value ?? '').toLowerCase()
  const isPreset = swatches.some(h => h.toLowerCase() === norm)
  const isCustom = !!value && !isPreset
  const ring = (on: boolean, hex?: string) => ({
    border: on ? '2.5px solid #7B1F3A' : '2.5px solid transparent',
    transform: on ? 'scale(1.18)' : 'scale(1)',
    ...(hex && isLight(hex) ? { outline: '1px solid #ccc' } : {}),
  })
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
         style={{ color: '#A08888' }}>{label}</p>
      <div className="flex gap-2 flex-wrap mb-4 items-center">
        {allowAuto && (
          <button
            type="button"
            onClick={() => onPick(null)}
            className="h-8 px-2.5 rounded-full text-[11px] font-bold transition-transform"
            style={{
              background: '#fff', color: '#6B5555',
              border: value === null ? '2.5px solid #7B1F3A' : '1.5px solid rgba(123,31,58,0.22)',
            }}
          >{autoLabel}</button>
        )}
        {swatches.map(hex => (
          <button
            type="button"
            key={hex}
            onClick={() => onPick(hex)}
            className="w-8 h-8 rounded-full transition-transform"
            style={{ background: hex, ...ring(norm === hex.toLowerCase(), hex) }}
          />
        ))}
        {/* Free picker: native colour input stretched over the swatch */}
        <label
          className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[16px] font-bold transition-transform cursor-pointer"
          title="Personalizado"
          style={{
            background: isCustom ? value! : 'conic-gradient(#e33, #ee3, #3e3, #3ee, #33e, #e3e, #e33)',
            color: '#fff',
            textShadow: '0 0 3px rgba(0,0,0,0.6)',
            ...ring(isCustom, isCustom ? value! : undefined),
          }}
        >
          {isCustom ? '' : '+'}
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value ?? '') ? value! : '#888888'}
            onChange={e => onPick(e.target.value)}
            aria-label={`${label} personalizado`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
      </div>
    </>
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
    azulejo_mane_ink: string | null
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

      {/* Coat colour */}
      <ColorRow
        label="Color de capa"
        swatches={AZULEJO_COLORS.map(c => c.ink)}
        value={local.azulejo_ink}
        onPick={hex => {
          const preset = AZULEJO_COLORS.find(c => c.ink.toLowerCase() === (hex ?? '').toLowerCase())
          update(preset ? { azulejo_ink: preset.ink, azulejo_bg: preset.bg } : { azulejo_ink: hex ?? local.azulejo_ink })
        }}
      />

      {/* Mane & tail */}
      <ColorRow
        label="Crines y cola"
        swatches={['#1A100C', '#422F25', '#72594A', '#B8A07C', '#F0ECE8']}
        value={local.azulejo_mane_ink}
        onPick={hex => update({ azulejo_mane_ink: hex })}
        allowAuto
      />

      {/* Accent / background */}
      <ColorRow
        label="Color de fondo"
        swatches={Array.from(new Set(AZULEJO_COLORS.map(c => c.bg)))}
        value={local.azulejo_bg}
        onPick={hex => update({ azulejo_bg: hex ?? local.azulejo_bg })}
      />

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
          <ColorRow
            label="Color de manchas"
            swatches={spotColors.map(c => c.hex)}
            value={local.azulejo_spot_ink}
            onPick={hex => update({ azulejo_spot_ink: hex ?? local.azulejo_spot_ink })}
          />
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
