import type { ReactNode } from 'react'

/* Storybook-style meadow icons, drawn to match the horse artwork: warm dark-brown
 * ink outline of constant weight, flat fills with a soft cel-shade band, muted
 * natural palette. All icons live in a 48x48 box and stay legible at 20-64px. */

const INK = '#2a1a12'
const SW = 2.2

const C = {
  grass: '#A9BB84', grassLt: '#C5D2A3', grassDk: '#7F9961',
  leaf: '#8FA872', leafDk: '#6F8A55',
  wood: '#B58A5E', woodDk: '#8E6641', woodLt: '#CDA77C',
  hay: '#E0C16E', hayDk: '#BE9A48', hayLt: '#EBD596',
  water: '#8FBACB', waterDk: '#6C9BB0', waterLt: '#C3DDE5',
  stone: '#B2ABA0', stoneDk: '#8D867C', snow: '#F1EEE6',
  roof: '#A85A42', roofDk: '#86432F', wall: '#E3D2B2', wallDk: '#C9B58F',
  sand: '#E4D3A8', sandDk: '#CDB988',
  sun: '#EDC95A', sunDk: '#D4A93C',
  petal: '#EFC9CF', centre: '#E2B33E',
}

const line = {
  stroke: INK, strokeWidth: SW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const,
}
/** Filled path; `s` false = shading band without outline. */
const P = ({ d, f, s = true }: { d: string; f: string; s?: boolean }) =>
  <path d={d} fill={f} {...(s ? line : { stroke: 'none' })} />

/* ── The icons ─────────────────────────────────────────────────────────── */

const Pradera = () => <>
  <P d="M3 40C8 30 19 27 26 30C33 27 41 31 45 40Z" f={C.grass} />
  <P d="M3 40C12 36 33 37 45 40Z" f={C.grassDk} s={false} />
  <P d="M3 40C8 30 19 27 26 30C33 27 41 31 45 40Z" f="none" />
  <P d="M8 41L10 27L15 35L19 19L23 35L28 26L30 41Z" f={C.leaf} />
  <P d="M19 19L23 35L21 41L18 34Z" f={C.leafDk} s={false} />
  <P d="M31 41L33 32L36 37L39 30L41 41Z" f={C.leaf} />
  <circle cx="37" cy="15" r="2.6" fill={C.hay} {...line} />
  <path d="M37 17.6V28" {...line} fill="none" />
</>

const Arbol = () => <>
  <P d="M21 44L22 30L26 30L27 44Z" f={C.wood} />
  <P d="M25 30L26 30L27 44L24.5 44Z" f={C.woodDk} s={false} />
  <path d="M21 44L22 30L26 30L27 44" {...line} fill="none" />
  <path d="M10 28C4 28 3 18 11 17C11 8 25 6 29 13C37 11 42 20 37 25C42 31 32 34 27 31C22 35 12 34 10 28Z"
        fill={C.leaf} />
  <path d="M10 28C13 31 22 35 27 31C32 34 42 31 37 25C35 30 28 29 24 28C19 31 12 31 10 28Z" fill={C.leafDk} />
  <path d="M10 28C4 28 3 18 11 17C11 8 25 6 29 13C37 11 42 20 37 25C42 31 32 34 27 31C22 35 12 34 10 28Z"
        fill="none" {...line} />
  <path d="M15 17C17 14 20 13 22 13" stroke="#C5D6A5" strokeWidth="2" strokeLinecap="round" fill="none" />
</>

const Bosque = () => <>
  <P d="M31 6L42 25H36L44 36H18L26 25H20Z" f={C.leafDk} />
  <P d="M31 6L36 15L33 24L38 36H44L36 25H42Z" f="#5E7848" s={false} />
  <P d="M31 6L42 25H36L44 36H18L26 25H20Z" f="none" />
  <P d="M15 11L27 31H21L30 43H3L11 31H5Z" f={C.leaf} />
  <P d="M15 11L21 22L19 30L24 43H30L21 31H27Z" f={C.leafDk} s={false} />
  <P d="M15 11L27 31H21L30 43H3L11 31H5Z" f="none" />
</>

const Rio = () => <>
  <P d="M3 8H45V40H3Z" f={C.grass} />
  <path d="M3 8H45V13C38 11 30 16 20 12C13 9 8 11 3 13Z" fill={C.grassLt} />
  <path d="M3 36C10 40 30 41 45 38V40H3Z" fill={C.grassDk} />
  <path d="M27 8C33 15 17 19 17 26C17 32 28 33 25 40H38C40 33 28 32 29 26C30 20 42 17 38 8Z"
        fill={C.water} {...line} />
  <path d="M38 8C42 17 30 20 29 26C28 32 40 33 38 40H33C35 33 24 32 24 26C24 20 36 16 33 8Z" fill={C.waterDk} opacity=".55" />
  <path d="M20 26C21 22 24 20 26 19M23 35C25 34 27 34 28 35" stroke={C.waterLt} strokeWidth="1.8" strokeLinecap="round" fill="none" />
  <rect x="3" y="8" width="42" height="32" rx="4" fill="none" {...line} />
</>

const Lago = () => <>
  <path d="M8 29C7 22 8 15 9 9M12 28C13 21 14 16 16 12" stroke={INK} strokeWidth={SW} strokeLinecap="round" fill="none" />
  <P d="M7 9C7 6 11 6 11 9L10.5 15H7.5Z" f={C.wood} />
  <P d="M14 12C14 9 18 9 18 12L17.6 17H14.4Z" f={C.wood} />
  <path d="M38 29C37 24 38 18 40 14M42 30C43 25 42 21 40 18" stroke={C.leafDk} strokeWidth="2.2" strokeLinecap="round" fill="none" />
  <P d="M3 34C3 26 13 22 24 22C35 22 45 26 45 34C45 40 35 44 24 44C13 44 3 40 3 34Z" f={C.water} />
  <path d="M3 34C6 41 16 41 24 41C34 41 42 40 45 34C45 40 35 44 24 44C13 44 3 40 3 34Z" fill={C.waterDk} />
  <path d="M3 34C3 26 13 22 24 22C35 22 45 26 45 34C45 40 35 44 24 44C13 44 3 40 3 34Z" fill="none" {...line} />
  <path d="M12 32C15 30 19 30 22 32M26 37C29 35 33 35 36 37" stroke={C.waterLt} strokeWidth="2" strokeLinecap="round" fill="none" />
</>

const Montana = () => <>
  <P d="M2 40L17 11L26 26L31 18L46 40Z" f={C.stone} />
  <P d="M17 11L26 26L22 40H46L31 18L26 26Z" f={C.stoneDk} s={false} />
  <P d="M2 40L17 11L26 26L31 18L46 40Z" f="none" />
  <P d="M17 11L22 20L19 18L17 22L13 18Z" f={C.snow} />
  <P d="M31 18L35 25L32 23.5L30 26L27 24Z" f={C.snow} />
  <P d="M2 40C10 36 20 37 24 40Z" f={C.grass} />
  <P d="M24 40C32 36 40 37 46 40Z" f={C.grass} />
</>

const Cuadra = () => <>
  <P d="M7 42V22L24 10L41 22V42Z" f={C.wall} />
  <P d="M7 42V22L12 18.5V42Z" f={C.wallDk} s={false} />
  <P d="M7 42V22L24 10L41 22V42Z" f="none" />
  <P d="M3 24L24 7L45 24L41 26L24 13L7 26Z" f={C.roof} />
  <P d="M3 24L24 7L24 13L7 26Z" f={C.roofDk} s={false} />
  <P d="M3 24L24 7L45 24L41 26L24 13L7 26Z" f="none" />
  <P d="M15 42V29H33V42Z" f={C.wood} />
  <path d="M15 29L33 42M33 29L15 42M24 29V42" stroke={INK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
</>

const Cercado = () => <>
  <P d="M2 42C14 39 34 39 46 42Z" f={C.grass} />
  <P d="M6 40V16L9 12L12 16V40Z" f={C.wood} />
  <P d="M21 40V16L24 12L27 16V40Z" f={C.wood} />
  <P d="M36 40V16L39 12L42 16V40Z" f={C.wood} />
  <P d="M2 20H46V26H2Z" f={C.woodLt} />
  <P d="M2 31H46V37H2Z" f={C.woodLt} />
  <path d="M2 24.5H46M2 35.5H46" stroke={C.woodDk} strokeWidth="2" fill="none" />
  <P d="M2 20H46V26H2Z" f="none" />
  <P d="M2 31H46V37H2Z" f="none" />
</>

const Picadero = () => <>
  <P d="M3 28C3 18 13 12 24 12C35 12 45 18 45 28C45 38 35 44 24 44C13 44 3 38 3 28Z" f={C.wood} />
  <P d="M9 28C9 21 16 17 24 17C32 17 39 21 39 28C39 35 32 39 24 39C16 39 9 35 9 28Z" f={C.sand} />
  <path d="M9 30C10 36 17 39 24 39C32 39 38 36 39 30C35 33 30 34 24 34C17 34 12 33 9 30Z" fill={C.sandDk} />
  <path d="M9 28C9 21 16 17 24 17C32 17 39 21 39 28C39 35 32 39 24 39C16 39 9 35 9 28Z" fill="none" {...line} />
  <path d="M17 28V22M31 28V22M17 23H31" {...line} fill="none" />
  <path d="M17 23H31" stroke={C.roof} strokeWidth="1.6" fill="none" />
</>

const Heno = () => <>
  <P d="M5 40V19C5 14 12 12 24 12C36 12 43 14 43 19V40Z" f={C.hay} />
  <path d="M5 40V31C14 34 34 34 43 31V40Z" fill={C.hayDk} />
  <path d="M5 40V19C5 14 12 12 24 12C36 12 43 14 43 19V40Z" fill="none" {...line} />
  <path d="M5 19C5 24 12 26 24 26C36 26 43 24 43 19" {...line} fill="none" />
  <path d="M15 14V40M33 14V40" stroke={C.woodDk} strokeWidth="2.4" fill="none" />
  <path d="M9 30L11 28M22 31L25 29M37 30L39 28M20 21L22 19M28 20L30 18" stroke={C.hayLt} strokeWidth="2" strokeLinecap="round" fill="none" />
  <path d="M10 12L7 7M24 11L24 5M38 12L41 7" stroke={C.hayDk} strokeWidth="2.2" strokeLinecap="round" fill="none" />
</>

const Flores = () => <>
  <P d="M3 42C14 39 34 39 45 42Z" f={C.grass} />
  <path d="M24 40V19M11 40C11 34 12 30 12 26M37 40C37 35 36 32 36 28" stroke={INK} strokeWidth={SW + 1.6} strokeLinecap="round" fill="none" />
  <path d="M24 40V19M11 40C11 34 12 30 12 26M37 40C37 35 36 32 36 28" stroke={C.leafDk} strokeWidth={SW - 0.4} strokeLinecap="round" fill="none" />
  <P d="M24 33C29 28 33 31 31 35C29 34 26 34 24 35Z" f={C.leaf} />
  {([[24, 14, 6.5], [12, 22, 4.8], [36, 24, 4.8]] as const).map(([x, y, r], i) => (
    <g key={i}>
      {[0, 72, 144, 216, 288].map(a => (
        <circle key={a} cx={x + Math.cos((a - 90) * Math.PI / 180) * r * 0.85}
                cy={y + Math.sin((a - 90) * Math.PI / 180) * r * 0.85}
                r={r * 0.62} fill={C.petal} {...line} strokeWidth={SW - 0.5} />
      ))}
      <circle cx={x} cy={y} r={r * 0.5} fill={C.centre} {...line} strokeWidth={SW - 0.6} />
    </g>
  ))}
</>

const Sol = () => <>
  <g {...line} fill="none">
    {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
      <path key={a} d="M24 4V10" transform={`rotate(${a} 24 22)`} />
    ))}
  </g>
  <circle cx="24" cy="22" r="10" fill={C.sun} />
  <path d="M15.5 27C19 32 28 32 32 26C30 30 21 33 15.5 27Z" fill={C.sunDk} />
  <circle cx="24" cy="22" r="10" fill="none" {...line} />
  <P d="M3 44C8 36 18 34 24 37C31 34 41 36 45 44Z" f={C.grass} />
</>

/* ── UI icons ──────────────────────────────────────────────────────────── */

export function WaterDropIcon({ size = 20 }: { size?: number }) {
  const d = 'M24 4C24 4 10 20 10 30C10 38 16 44 24 44C32 44 38 38 38 30C38 20 24 4 24 4Z'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} fill={C.water} />
      <path d="M38 30C38 38 32 44 24 44C16 44 10 38 10 30C16 36 30 38 36 26C37 27 38 28.5 38 30Z" fill={C.waterDk} />
      <path d={d} fill="none" {...line} />
      <path d="M17 31C17 35 19 37 21 38" stroke={C.waterLt} strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  )
}

/** Food: a tied wisp of hay. */
export function FoodIcon({ size = 20 }: { size?: number }) {
  const d = 'M24 6L18 20L10 12L15 28L7 24L15 42H33L41 24L33 28L38 12L30 20Z'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} fill={C.hay} />
      <path d="M24 6L30 20L38 12L33 28L41 24L33 42H27L30 28L26 20Z" fill={C.hayDk} />
      <path d={d} fill="none" {...line} />
      <path d="M14 31H34V36H14Z" fill={C.roof} {...line} />
    </svg>
  )
}

/** Small horse head, used where a horse emoji used to be. */
export function HorseHeadIcon({ size = 20 }: { size?: number }) {
  const d = 'M38 45C38 35 38 27 36 17L36 5L32 10L30 5L28 14C22 20 16 28 12 33C9 36 9 40 13 40C17 41 21 38 24 34C27 36 27 41 26 45Z'
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} fill="#B07A52" />
      <path d="M36 17C38 27 38 35 38 45H26C27 41 27 36 24 34C30 34 34 28 36 17Z" fill="#8C5C3A" />
      <path d="M36 5L36 17C38 27 38 35 38 45L34 45C35 35 35 25 33 16Z" fill="#4A2E20" />
      <path d={d} fill="none" {...line} />
      <circle cx="26" cy="21" r="1.6" fill={INK} />
    </svg>
  )
}

/* ── Registry / helpers ────────────────────────────────────────────────── */

export const MEADOW_ICONS = {
  pradera:  { label: 'Pradera',  Art: Pradera },
  arbol:    { label: 'Árbol',    Art: Arbol },
  bosque:   { label: 'Bosque',   Art: Bosque },
  rio:      { label: 'Río',      Art: Rio },
  lago:     { label: 'Lago',     Art: Lago },
  montana:  { label: 'Montaña',  Art: Montana },
  cuadra:   { label: 'Cuadra',   Art: Cuadra },
  cercado:  { label: 'Cercado',  Art: Cercado },
  picadero: { label: 'Picadero', Art: Picadero },
  heno:     { label: 'Heno',     Art: Heno },
  flores:   { label: 'Flores',   Art: Flores },
  sol:      { label: 'Sol',      Art: Sol },
} as const

export type MeadowIconKey = keyof typeof MEADOW_ICONS
export const MEADOW_ICON_KEYS = Object.keys(MEADOW_ICONS) as MeadowIconKey[]
export const DEFAULT_MEADOW_ICON: MeadowIconKey = 'pradera'

const LEGACY: Record<string, MeadowIconKey> = { '🌿': 'pradera', '🌳': 'arbol', '🐎': 'cercado' }

/** Accepts a key, a legacy emoji, or nothing; always returns a valid key. */
export function normalizeMeadowIcon(v?: string | null): MeadowIconKey {
  if (!v) return DEFAULT_MEADOW_ICON
  if (v in MEADOW_ICONS) return v as MeadowIconKey
  return LEGACY[v] ?? DEFAULT_MEADOW_ICON
}

export function MeadowIcon({ name, size = 24, className }: {
  name?: string | null; size?: number; className?: string
}) {
  const { Art } = MEADOW_ICONS[normalizeMeadowIcon(name)]
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden
         style={{ flexShrink: 0, display: 'block' }}>
      <Art />
    </svg>
  )
}

/** Grid picker used by the create / edit meadow sheets. */
export function MeadowIconPicker({ value, onChange }: {
  value?: string | null; onChange: (k: MeadowIconKey) => void
}): ReactNode {
  const current = normalizeMeadowIcon(value)
  return (
    <div className="grid grid-cols-6 gap-2">
      {MEADOW_ICON_KEYS.map(k => (
        <button key={k} type="button" onClick={() => onChange(k)} aria-label={MEADOW_ICONS[k].label}
          title={MEADOW_ICONS[k].label}
          className="aspect-square rounded-xl flex items-center justify-center"
          style={{
            background: current === k ? '#F5E8EC' : '#F7F3EE',
            border: current === k ? '2px solid #7B1F3A' : '1px solid rgba(123,31,58,0.18)',
          }}>
          <MeadowIcon name={k} size={30} />
        </button>
      ))}
    </div>
  )
}
