import { useState } from 'react'
import type { Animal } from '../../types'
import { AZULEJO_COLORS, COAT_PATTERNS } from '../../lib/constants'
import { BottomSheet } from '../ui'

// ─── HORSE SVG PATH (professional silhouette) ────────────────────────────────
function HorsePath({ ink }: { ink: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%"
         style={{ position: 'absolute', inset: 6 }}>
      {/* Body */}
      <ellipse cx="45" cy="62" rx="28" ry="18" fill={ink} />
      {/* Rump */}
      <ellipse cx="22" cy="57" rx="14" ry="16" fill={ink} />
      {/* Neck */}
      <path d="M62 54 Q70 45 70 32 Q70 21 65 17 Q60 13 56 17 Q52 22 53 36 Q54 44 57 50Z" fill={ink} />
      {/* Head */}
      <ellipse cx="68" cy="17" rx="9" ry="10" transform="rotate(12 68 17)" fill={ink} />
      {/* Muzzle */}
      <ellipse cx="76" cy="23" rx="5.5" ry="4" transform="rotate(18 76 23)" fill={ink} />
      {/* Nostril */}
      <ellipse cx="79" cy="26" rx="1.2" ry="1" fill="rgba(0,0,0,0.3)" />
      {/* Ear */}
      <polygon points="62,9 64,3 68,9" fill={ink} />
      {/* Eye */}
      <circle cx="70" cy="13" r="1.5" fill="rgba(0,0,0,0.55)" />
      {/* Mane */}
      <path d="M67 11 Q63 16 62 24 Q61 32 62 40 Q60 32 58 24 Q57 17 59 11Z" fill={ink} opacity="0.85" />
      {/* Tail */}
      <path d="M16 54 Q4 48 3 58 Q3 68 14 67 Q11 63 12 58 Q13 54 16 54Z" fill={ink} opacity="0.85" />
      {/* Legs back */}
      <rect x="20" y="76" width="8" height="18" rx="4" fill={ink} />
      <rect x="31" y="76" width="8" height="18" rx="4" fill={ink} />
      {/* Legs front */}
      <rect x="48" y="75" width="8" height="17" rx="4" fill={ink} />
      <rect x="59" y="75" width="8" height="17" rx="4" fill={ink} />
      {/* Hooves */}
      <rect x="20" y="91" width="8" height="4" rx="2" fill={ink} opacity="0.7" />
      <rect x="31" y="91" width="8" height="4" rx="2" fill={ink} opacity="0.7" />
      <rect x="48" y="89" width="8" height="4" rx="2" fill={ink} opacity="0.7" />
      <rect x="59" y="89" width="8" height="4" rx="2" fill={ink} opacity="0.7" />
    </svg>
  )
}

// ─── COAT PATTERN OVERLAYS ───────────────────────────────────────────────────
function PatternOverlay({
  pattern, spotInk, careto, cuatroalbo,
}: {
  pattern: string
  spotInk: string
  careto: boolean
  cuatroalbo: boolean
}) {


  // parse hex to rgba-ready string
  const hex2rgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r},${g},${b}`
  }
  const rgb = hex2rgb(spotInk.startsWith('#') ? spotInk : '#1A100C')
  const spot = (a: number) => `rgba(${rgb},${a})`

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%"
         style={{ position: 'absolute', inset: 6, pointerEvents: 'none' }}>
      {/* Appaloosa spots on rump */}
      {pattern === 'appaloosa' && <>
        <circle cx="24" cy="58" r="5"   fill={spot(0.68)} />
        <circle cx="15" cy="67" r="3.5" fill={spot(0.60)} />
        <circle cx="30" cy="68" r="3"   fill={spot(0.55)} />
        <circle cx="12" cy="55" r="2.5" fill={spot(0.50)} />
        <circle cx="18" cy="48" r="2"   fill={spot(0.45)} />
      </>}
      {/* Pío large patch */}
      {pattern === 'pio' && (
        <ellipse cx="28" cy="62" rx="14" ry="9" fill={spot(0.80)} />
      )}
      {/* Careto — white face */}
      {careto && (
        <ellipse cx="68" cy="17" rx="7" ry="8.5"
                 transform="rotate(12 68 17)"
                 fill="rgba(242,238,234,0.90)" />
      )}
      {/* Cuatroalbo — white socks */}
      {cuatroalbo && <>
        <rect x="20" y="82" width="8" height="14" rx="4" fill="rgba(242,238,234,0.92)" />
        <rect x="31" y="82" width="8" height="14" rx="4" fill="rgba(242,238,234,0.92)" />
        <rect x="48" y="81" width="8" height="13" rx="4" fill="rgba(242,238,234,0.92)" />
        <rect x="59" y="81" width="8" height="13" rx="4" fill="rgba(242,238,234,0.92)" />
      </>}
    </svg>
  )
}

// ─── AZULEJO TILE ─────────────────────────────────────────────────────────────
interface AzulejoProps {
  animal: Pick<Animal,
    'azulejo_ink' | 'azulejo_bg' |
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
  const ink = animal.azulejo_ink ?? '#4A2810'
  const bg  = animal.azulejo_bg  ?? '#F0E4D4'
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
      {/* Corner dots */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
        background: `
          radial-gradient(circle, rgba(123,31,58,0.5) 1.5px, transparent 1.5px) 5px 5px,
          radial-gradient(circle, rgba(123,31,58,0.5) 1.5px, transparent 1.5px) calc(100% - 5px) 5px,
          radial-gradient(circle, rgba(123,31,58,0.5) 1.5px, transparent 1.5px) 5px calc(100% - 5px),
          radial-gradient(circle, rgba(123,31,58,0.5) 1.5px, transparent 1.5px) calc(100% - 5px) calc(100% - 5px)
        `,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }} />
      <HorsePath ink={ink} />
      <PatternOverlay
        pattern={animal.coat_pattern ?? 'lisa'}
        spotInk="#1A100C"
        careto={!!animal.coat_careto}
        cuatroalbo={!!animal.coat_cuatroalbo}
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

  const update = (patch: Partial<typeof local>) => {
    setLocal(prev => ({ ...prev, ...patch }))
  }

  const handleSave = () => {
    onChange(local)
    onClose()
  }

  // Spot color options
  const spotColors = [
    { label: 'Negro', hex: '#1A100C' },
    { label: 'Blanco', hex: '#F0ECE8' },
    { label: 'Castaño', hex: '#8B5C2A' },
    { label: 'Alazán', hex: '#B86030' },
    { label: 'Gris', hex: '#9098A8' },
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
      <div className="flex gap-2 mb-4">
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

      {/* Spot color (only when pattern needs it) */}
      {needsSpot && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2"
             style={{ color: '#A08888' }}>Color de manchas</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {spotColors.map(c => (
              <button
                key={c.hex}
                onClick={() => {/* spot color handled via patternOverlay using fixed dark */}}
                className="w-8 h-8 rounded-full"
                style={{
                  background: c.hex,
                  border: '2px solid rgba(123,31,58,0.3)',
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
          { key: 'coat_careto', label: 'Careto' },
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
