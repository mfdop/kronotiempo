import { useState, useId } from 'react'
import type { Animal } from '../../types'
import { AZULEJO_COLORS, COAT_PATTERNS } from '../../lib/constants'
import { BottomSheet } from '../ui'

// ─── SVG PATH DATA ────────────────────────────────────────────────────────────
// All paths share this transform (SVG source coordinate space → viewBox 452×495)
const T = 'translate(-164.429852,631.000000) scale(0.100000,-0.100000)'

const P_HEAD1 = "M2173 6283 c-21 -80 -3 -168 47 -232 41 -51 157 -147 167 -137 10 9 -18 157 -40 216 -14 39 -38 73 -83 118 -34 34 -67 62 -73 62 -6 0 -14 -12 -18 -27z"
const P_HEAD2 = "M2046 6204 c7 -31 14 -57 16 -58 2 -2 18 1 36 6 27 7 32 13 32 37 0 24 -7 33 -40 50 -22 12 -44 21 -49 21 -5 0 -3 -25 5 -56z"
const P_BODY  = "M2665 6232 c-49 -8 -193 -46 -227 -59 -21 -8 -38 -20 -38 -27 0 -24 22 -86 28 -82 16 10 170 -16 242 -40 96 -32 209 -89 302 -150 92 -62 237 -204 316 -312 147 -200 248 -447 240 -591 l-3 -56 -18 60 c-133 444 -371 762 -692 927 -116 59 -223 95 -307 104 l-68 7 3 -84 c3 -103 -6 -108 -98 -50 -35 23 -68 41 -72 41 -5 0 -35 -28 -68 -62 -94 -98 -111 -109 -183 -127 l-67 -16 -68 -180 c-77 -206 -143 -344 -198 -417 -48 -64 -54 -93 -34 -149 9 -24 20 -67 25 -96 10 -66 13 -70 53 -78 17 -4 55 -18 84 -32 82 -38 127 -13 157 88 22 74 29 81 133 155 l97 69 106 0 c125 1 174 18 246 90 65 66 96 140 101 245 3 47 0 104 -5 128 -13 57 3 54 31 -5 17 -38 21 -67 22 -138 0 -82 -3 -97 -32 -156 l-33 -66 39 -84 c65 -138 75 -192 75 -374 0 -113 -5 -180 -16 -230 -10 -38 -29 -122 -44 -185 -34 -143 -38 -309 -11 -409 18 -66 95 -231 108 -231 4 0 10 18 14 39 7 42 29 80 40 69 4 -4 1 -49 -7 -100 -8 -62 -13 -185 -12 -368 1 -323 18 -483 69 -669 18 -69 50 -207 69 -306 20 -99 49 -245 66 -325 l30 -145 -35 -72 c-19 -39 -35 -81 -35 -92 0 -13 -14 -30 -37 -45 -78 -49 -121 -125 -130 -228 l-6 -58 209 2 209 3 -3 55 c-4 73 -18 117 -54 162 l-29 38 36 31 c79 69 82 124 25 388 -130 598 -137 733 -59 1053 68 280 165 453 322 575 55 43 117 80 117 69 0 -2 -32 -35 -71 -73 -81 -77 -194 -222 -182 -233 12 -11 221 -47 348 -61 193 -20 362 0 630 74 137 39 129 27 96 151 -25 95 -28 247 -6 350 20 92 34 104 23 19 -18 -138 8 -317 63 -441 89 -199 217 -319 524 -490 61 -34 132 -76 160 -94 56 -37 116 -112 134 -166 15 -45 28 -249 36 -568 l6 -242 -50 -57 c-51 -58 -81 -125 -81 -180 0 -28 -6 -34 -41 -50 -70 -32 -122 -124 -135 -240 l-7 -55 213 0 213 0 -7 67 c-7 70 -30 129 -67 174 -29 37 -19 58 51 109 101 73 96 31 91 675 -4 665 6 609 -133 736 -104 96 -133 136 -154 221 -22 86 -14 142 52 335 66 196 84 283 84 413 0 314 -150 579 -398 703 -114 57 -180 71 -302 64 -71 -4 -118 -13 -185 -37 -167 -59 -311 -98 -381 -105 -128 -13 -252 26 -339 106 -45 41 -111 127 -103 134 1 1 30 -1 63 -6 33 -4 61 -6 63 -4 5 5 -25 61 -90 163 l-58 94 39 -3 c22 -2 43 0 47 3 6 7 -80 137 -142 215 -19 23 -34 44 -34 47 0 3 18 6 40 6 37 0 40 2 30 19 -5 11 -52 57 -104 103 -52 45 -95 86 -95 91 -1 4 13 7 29 7 17 0 30 4 30 9 0 14 -99 93 -171 137 -40 25 -56 40 -47 45 20 13 -15 43 -93 79 -67 31 -69 33 -54 50 10 10 14 23 10 29 -8 13 -88 37 -178 52 -57 9 -67 14 -61 28 21 53 25 51 -94 51 -108 0 -111 1 -114 23 -2 16 -9 22 -23 19z m-450 -611 c3 -5 1 -12 -5 -16 -6 -3 -19 -24 -31 -46 -19 -38 -22 -40 -62 -37 -42 3 -42 3 -42 43 0 32 5 42 25 52 29 15 106 17 115 4z m-399 -586 c4 -16 -3 -42 -20 -77 -18 -36 -23 -55 -16 -62 16 -16 42 5 68 54 23 47 29 38 12 -19 -10 -36 -46 -81 -64 -81 -16 0 -66 96 -66 127 0 28 44 83 67 83 7 0 15 -11 19 -25z"
const P_HEAD3 = "M2080 6107 c-88 -54 -131 -91 -175 -149 -55 -72 -150 -261 -134 -267 6 -2 70 16 142 40 l131 42 93 90 c51 50 93 94 93 98 0 5 -15 28 -32 52 -18 23 -42 59 -53 80 -11 20 -22 37 -25 36 -3 0 -21 -11 -40 -22z"
const P_RHIN  = "M5155 4961 c-38 -11 -97 -31 -129 -46 l-60 -26 73 -40 c113 -61 160 -96 241 -179 128 -130 202 -278 235 -464 19 -110 19 -166 0 -331 -29 -255 -15 -377 61 -531 88 -179 235 -300 425 -349 31 -8 81 -15 110 -14 l54 0 -30 22 c-152 113 -232 246 -250 417 -9 86 5 165 68 395 l52 190 -1 155 c-1 170 -15 243 -73 379 -85 199 -240 347 -431 411 -95 31 -253 36 -345 11z"
const P_LHIN  = "M2690 3650 c-14 -10 -47 -29 -75 -42 -72 -33 -331 -174 -367 -201 -87 -64 -98 -157 -44 -369 47 -182 86 -290 161 -443 73 -149 161 -269 222 -303 22 -12 102 -35 177 -51 159 -34 152 -37 142 67 -13 147 -52 236 -116 262 -27 11 -34 10 -68 -14 -51 -35 -74 -33 -112 10 -50 58 -129 255 -155 390 -16 79 -9 124 25 167 20 25 132 87 231 127 l56 22 6 165 c5 156 4 166 -17 198 -24 40 -32 41 -66 15z"
const P_FRLEG = "M4380 3409 c-36 -10 -71 -21 -77 -24 -19 -7 20 -88 81 -171 30 -38 110 -124 180 -189 206 -193 209 -216 74 -515 -39 -85 -106 -242 -149 -349 -43 -107 -86 -202 -96 -213 -9 -10 -38 -29 -63 -42 -53 -26 -96 -89 -108 -155 -7 -40 -11 -45 -47 -58 -21 -7 -50 -23 -62 -35 -38 -35 -75 -123 -82 -193 l-7 -65 208 0 208 0 0 48 c0 63 -14 108 -50 166 l-31 49 27 29 c16 15 51 35 78 43 68 20 101 55 127 134 12 36 85 217 161 401 105 253 152 355 193 416 67 99 84 159 66 237 -11 53 -12 54 -89 97 -120 68 -245 154 -299 207 -51 50 -153 180 -153 194 0 12 -15 10 -90 -12z"

const P_CARETO = "M 2020 5750 L 2010 5690 L 1995 5630 L 1980 5570 L 1965 5510 L 1955 5460 L 1950 5420 C 1947 5400 1952 5385 1967 5385 C 1982 5385 1992 5400 1997 5420 L 2007 5470 L 2022 5530 L 2037 5590 L 2052 5650 L 2064 5710 L 2072 5760 C 2075 5775 2070 5788 2057 5788 C 2044 5788 2023 5770 2020 5750 Z"

// ─── HORSE SVG (full silhouette with toggleable layers) ───────────────────────
function HorseSVG({
  ink, spotInk, pattern, careto, cuatroalbo, uid,
}: {
  ink: string
  spotInk: string
  pattern: string
  careto: boolean
  cuatroalbo: boolean
  uid: string
}) {
  return (
    <svg
      viewBox="0 0 452.070148 495.041434"
      width="100%" height="100%"
      style={{ position: 'absolute', inset: 0 }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <clipPath id={uid}>
          <path transform={T} d={P_HEAD1} />
          <path transform={T} d={P_HEAD2} />
          <path transform={T} d={P_BODY}  />
          <path transform={T} d={P_HEAD3} />
          <path transform={T} d={P_RHIN}  />
          <path transform={T} d={P_LHIN}  />
          <path transform={T} d={P_FRLEG} />
        </clipPath>
      </defs>

      {/* ── Base layer ── */}
      <g transform={T} fill={ink} stroke="none">
        <path d={P_HEAD1} />
        <path d={P_HEAD2} />
        <path d={P_BODY}  />
        <path d={P_HEAD3} />
        <path d={P_RHIN}  />
        <path d={P_LHIN}  />
        <path d={P_FRLEG} />
      </g>

      {/* ── Appaloosa spots ── */}
      {pattern === 'appaloosa' && (
        <g clipPath={`url(#${uid})`}>
          <g transform={T} fill={spotInk}>
            <circle cx="4450" cy="4650" r="95"  />
            <circle cx="4680" cy="4820" r="70"  />
            <circle cx="4880" cy="4720" r="110" />
            <circle cx="5020" cy="4520" r="75"  />
            <circle cx="4940" cy="4300" r="95"  />
            <circle cx="4700" cy="4220" r="65"  />
            <circle cx="4480" cy="4350" r="85"  />
            <circle cx="4320" cy="4500" r="58"  />
            <circle cx="4780" cy="4430" r="52"  />
            <circle cx="4580" cy="4530" r="62"  />
            <circle cx="4860" cy="4900" r="55"  />
            <circle cx="4380" cy="4250" r="48"  />
          </g>
        </g>
      )}

      {/* ── Pío patches ── */}
      {pattern === 'pio' && (
        <g clipPath={`url(#${uid})`}>
          <g transform={T} fill={spotInk}>
            <ellipse cx="3400" cy="4300" rx="700" ry="500" />
            <ellipse cx="2900" cy="4000" rx="450" ry="380" />
            <ellipse cx="4400" cy="4400" rx="550" ry="430" />
          </g>
        </g>
      )}

      {/* ── Careto (face blaze) ── */}
      {careto && (
        <g clipPath={`url(#${uid})`}>
          <path transform={T} fill="#F0EBE0" d={P_CARETO} />
        </g>
      )}

      {/* ── Cuatroalbo (white socks) ── */}
      {cuatroalbo && (
        <g clipPath={`url(#${uid})`}>
          <rect transform={T} fill="#F0EBE0" x="2280" y="2400" width="410" height="350" rx="70" />
          <rect transform={T} fill="#F0EBE0" x="2930" y="1630" width="320" height="410" rx="75" />
          <rect transform={T} fill="#F0EBE0" x="4164" y="1680" width="460" height="480" rx="80" />
          <rect transform={T} fill="#F0EBE0" x="5194" y="1680" width="530" height="440" rx="80" />
        </g>
      )}
    </svg>
  )
}

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
  const uid         = useId().replace(/:/g, '')
  const ink         = animal.azulejo_ink      ?? '#4A2810'
  const bg          = animal.azulejo_bg       ?? '#F0E4D4'
  const spotInk     = animal.azulejo_spot_ink ?? '#1A100C'
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

      <HorseSVG
        ink={ink}
        spotInk={spotInk}
        pattern={animal.coat_pattern ?? 'lisa'}
        careto={!!animal.coat_careto}
        cuatroalbo={!!animal.coat_cuatroalbo}
        uid={`horse-clip-${uid}`}
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
