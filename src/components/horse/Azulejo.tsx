import { useState, type ReactNode } from 'react'
import type { Animal } from '../../types'
import { AZULEJO_COLORS, COAT_PATTERNS } from '../../lib/constants'
import { BottomSheet } from '../ui'
import { HorseFigure } from './HorseFigure'
import { coatFromAnimal } from './horseCoat'

// ─── AZULEJO TILE ─────────────────────────────────────────────────────────────
interface AzulejoProps {
  animal: Pick<Animal,
    'azulejo_ink' | 'azulejo_bg' | 'azulejo_spot_ink' | 'azulejo_mane_ink' |
    'azulejo_ground_ink' | 'azulejo_circle_ink' |
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
        ground="pedestal"
        circleInk={animal.azulejo_circle_ink}
        groundInk={animal.azulejo_ground_ink}
        icon={size < 64}
        viewBox="-6 14 236 286"
        style={{ position: 'absolute', inset: '6%', width: '88%', height: '88%' }}
      />
    </div>
  )
}


// ─── COLOR FIELD (label + chip → compact palette + free picker) ─────────────
const HEX_RE = /^#[0-9a-f]{6}$/i
const BORDER = 'rgba(123,31,58,0.11)'

const isLight = (h: string) => {
  const n = parseInt(h.replace('#', '').padEnd(6, '0').slice(0, 6), 16) || 0
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.8
}

function Chip({ hex, size = 28, selected = false }: { hex: string; size?: number; selected?: boolean }) {
  return (
    <span
      className="inline-block rounded-full shrink-0 transition-transform"
      style={{
        width: size, height: size, background: hex,
        border: selected ? '2.5px solid #7B1F3A' : '2.5px solid transparent',
        boxShadow: isLight(hex) ? '0 0 0 1px rgba(0,0,0,0.14)' : undefined,
        transform: selected ? 'scale(1.1)' : 'scale(1)',
      }}
    />
  )
}

function ColorField({ label, swatches, value, onPick, open, onToggle, defaultHex, autoLabel = 'Auto' }: {
  label: string
  swatches: string[]
  value: string | null
  onPick: (hex: string | null) => void
  open: boolean
  onToggle: () => void
  /** When set the field supports "Auto" (null); this is the colour Auto renders as. */
  defaultHex?: string
  autoLabel?: string
}) {
  const allowAuto = defaultHex !== undefined
  const norm = (value ?? '').toLowerCase()
  const isCustom = !!value && !swatches.some(h => h.toLowerCase() === norm)
  const shown = value ?? defaultHex ?? '#888888'
  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      <button type="button" onClick={onToggle}
              className="w-full flex items-center gap-3 py-2.5 text-left">
        <span className="flex-1 text-[14px] font-semibold" style={{ color: '#1C1010' }}>{label}</span>
        <span className="text-[12px]" style={{ color: '#A08888' }}>
          {value === null ? autoLabel : value.toUpperCase()}
        </span>
        <Chip hex={shown} />
        <span className="text-[12px] transition-transform"
              style={{ color: '#A08888', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div className="flex gap-2.5 flex-wrap items-center pb-3 pl-0.5">
          {allowAuto && (
            <button type="button" onClick={() => onPick(null)}
                    className="h-8 px-3 rounded-full text-[12px] font-bold"
                    style={{
                      background: '#fff', color: '#6B5555',
                      border: value === null ? '2.5px solid #7B1F3A' : '1.5px solid rgba(123,31,58,0.22)',
                    }}>{autoLabel}</button>
          )}
          {swatches.map(hex => (
            <button type="button" key={hex} onClick={() => onPick(hex)} aria-label={hex}>
              <Chip hex={hex} size={32} selected={norm === hex.toLowerCase()} />
            </button>
          ))}
          <label
            className="relative w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[16px] font-bold cursor-pointer"
            title="Personalizado"
            style={{
              background: isCustom ? value! : 'conic-gradient(#e33, #ee3, #3e3, #3ee, #33e, #e3e, #e33)',
              color: '#fff', textShadow: '0 0 3px rgba(0,0,0,0.6)',
              border: isCustom ? '2.5px solid #7B1F3A' : '2.5px solid transparent',
            }}
          >
            {isCustom ? '' : '+'}
            <input
              type="color"
              value={HEX_RE.test(value ?? '') ? value! : HEX_RE.test(defaultHex ?? '') ? defaultHex! : '#888888'}
              onChange={e => onPick(e.target.value)}
              aria-label={`${label} personalizado`}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white px-3.5 pt-3 pb-1 mb-3"
             style={{ border: `1px solid ${BORDER}` }}>
      <p className="text-[11px] font-bold uppercase tracking-wider pb-2" style={{ color: '#7B1F3A' }}>{title}</p>
      {children}
    </section>
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
    azulejo_ground_ink: string | null
    azulejo_circle_ink: string | null
    coat_pattern: string
    coat_careto: boolean
    coat_cuatroalbo: boolean
  }
  onChange: (values: AzulejoCustomizerProps['values']) => void
  animalName?: string
}

const COAT_SWATCHES = ['Negro', 'Castaño osc.', 'Castaño', 'Alazán', 'Palomino', 'Isabela', 'Gris', 'Blanco']
  .map(l => AZULEJO_COLORS.find(c => c.label === l)!.ink as string)
const MANE_SWATCHES   = ['#1A100C', '#422F25', '#72594A', '#B8A07C', '#F0ECE8']
const SPOT_SWATCHES   = ['#1A100C', '#F0ECE8', '#8B5C2A', '#B86030', '#9098A8']
const BG_SWATCHES     = ['#F0E4D4', '#E8E0DC', '#FBF5E8', '#EEF0F4', '#EBEBEB', '#F4E1E6', '#E3EBDD', '#DCE6F0']
const CIRCLE_SWATCHES = ['#D9DDC6', '#FFFFFF', '#F3D9DF', '#DCE6F0', '#F4E8C8', '#E6D9EE', '#E3C9B0']
const GROUND_SWATCHES = ['#C1C5A2', '#8A9470', '#B9A58E', '#8C8C8C', '#6B4A3A', '#A8B8C8', '#D8B6C0']
const DEFAULT_CIRCLE = '#D9DDC6'
const DEFAULT_GROUND = '#C1C5A2'

export function AzulejoCustomizer({
  open, onClose, values, onChange, animalName,
}: AzulejoCustomizerProps) {
  const [local, setLocal] = useState(values)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const update = (patch: Partial<typeof local>) => setLocal(prev => ({ ...prev, ...patch }))
  const toggle = (k: string) => setOpenKey(cur => (cur === k ? null : k))

  const handleSave = () => {
    onChange(local)
    onClose()
  }

  const needsSpot = local.coat_pattern !== 'lisa'
  const coat = coatFromAnimal(local)
  const patternLabel = COAT_PATTERNS.find(p => p.value === local.coat_pattern)?.label ?? 'Lisa'

  return (
    <BottomSheet open={open} onClose={onClose} title={`Icono · ${animalName ?? 'Animal'}`}>
      {/* Live preview, same look as the stage */}
      <div className="relative rounded-2xl overflow-hidden mb-3"
           style={{
             height: 190, border: `1px solid ${BORDER}`,
             background: `radial-gradient(90% 70% at 50% 40%, rgba(255,255,255,0.35), rgba(255,255,255,0) 70%), ${local.azulejo_bg}`,
           }}>
        <HorseFigure
          coat={coat}
          ground="pedestal"
          circleInk={local.azulejo_circle_ink}
          groundInk={local.azulejo_ground_ink}
          viewBox="-14 14 248 292"
          style={{ position: 'absolute', inset: '6% 6% 4%', width: '88%', height: '90%' }}
        />
        <p className="absolute left-3 top-2 text-[11px] font-semibold" style={{ color: '#6B5555' }}>
          {patternLabel}
          {local.coat_careto ? ' · Careto' : ''}
          {local.coat_cuatroalbo ? ' · Cuatroalbo' : ''}
        </p>
      </div>

      {/* CAPA */}
      <Section title="Capa">
        <div className="grid grid-cols-4 gap-1.5 pb-2.5">
          {COAT_PATTERNS.map(p => {
            const on = local.coat_pattern === p.value
            return (
              <button key={p.value} type="button" onClick={() => update({ coat_pattern: p.value })}
                      className="py-2 rounded-xl text-[12px] font-semibold transition-all"
                      style={{
                        background: on ? '#7B1F3A' : '#fff',
                        color: on ? '#fff' : '#6B5555',
                        border: `1.5px solid ${on ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                      }}>{p.label}</button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 pb-3">
          {([
            { key: 'coat_careto',     label: 'Careto'     },
            { key: 'coat_cuatroalbo', label: 'Cuatroalbo' },
          ] as const).map(({ key, label }) => {
            const on = local[key]
            return (
              <button key={key} type="button"
                      onClick={() => update({ [key]: !on })}
                      className="flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-semibold transition-all"
                      style={{
                        border: `1.5px solid ${on ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                        color: on ? '#7B1F3A' : '#6B5555', background: '#fff',
                      }}>
                <span className="w-4 h-4 rounded-[4px] flex items-center justify-center text-[10px]"
                      style={{
                        background: on ? '#7B1F3A' : '#fff', color: '#fff',
                        border: `1.5px solid ${on ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                      }}>{on ? '✓' : ''}</span>
                {label}
              </button>
            )
          })}
        </div>
      </Section>

      {/* COLORES DEL CABALLO */}
      <Section title="Colores del caballo">
        <ColorField
          label="Capa" swatches={COAT_SWATCHES} value={local.azulejo_ink}
          open={openKey === 'ink'} onToggle={() => toggle('ink')}
          onPick={hex => {
            if (!hex) return
            // A preset coat suggests its matching background, unless the
            // background was already customised away from the previous preset.
            const prev = AZULEJO_COLORS.find(c => c.ink.toLowerCase() === local.azulejo_ink.toLowerCase())
            const next = AZULEJO_COLORS.find(c => c.ink.toLowerCase() === hex.toLowerCase())
            const bgIsAuto = !prev || prev.bg.toLowerCase() === local.azulejo_bg.toLowerCase()
            update(next && bgIsAuto ? { azulejo_ink: hex, azulejo_bg: next.bg } : { azulejo_ink: hex })
          }}
        />
        <ColorField
          label="Crin y cola" swatches={MANE_SWATCHES} value={local.azulejo_mane_ink}
          open={openKey === 'mane'} onToggle={() => toggle('mane')}
          defaultHex={local.azulejo_ink}
          onPick={hex => update({ azulejo_mane_ink: hex })}
        />
        {needsSpot && (
          <ColorField
            label="Manchas" swatches={SPOT_SWATCHES} value={local.azulejo_spot_ink}
            open={openKey === 'spot'} onToggle={() => toggle('spot')}
            onPick={hex => update({ azulejo_spot_ink: hex ?? local.azulejo_spot_ink })}
          />
        )}
      </Section>

      {/* ESCENA */}
      <Section title="Escena">
        <ColorField
          label="Fondo" swatches={BG_SWATCHES} value={local.azulejo_bg}
          open={openKey === 'bg'} onToggle={() => toggle('bg')}
          onPick={hex => update({ azulejo_bg: hex ?? local.azulejo_bg })}
        />
        <ColorField
          label="Círculo" swatches={CIRCLE_SWATCHES} value={local.azulejo_circle_ink}
          open={openKey === 'circle'} onToggle={() => toggle('circle')}
          defaultHex={DEFAULT_CIRCLE}
          onPick={hex => update({ azulejo_circle_ink: hex })}
        />
        <ColorField
          label="Suelo" swatches={GROUND_SWATCHES} value={local.azulejo_ground_ink}
          open={openKey === 'ground'} onToggle={() => toggle('ground')}
          defaultHex={DEFAULT_GROUND}
          onPick={hex => update({ azulejo_ground_ink: hex })}
        />
      </Section>

      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-xl text-white text-[15px] font-bold mt-1"
        style={{ background: '#7B1F3A' }}
      >
        Guardar icono
      </button>
    </BottomSheet>
  )
}
