import { useId, type CSSProperties, type ReactNode } from 'react'
import { HORSE_CSS } from './horseAnimations'
import type { HorseCoat } from './horseCoat'

/* ════════════════════════════════════════════════════════════════════════════
 * HORSE FIGURE — layered, articulated 2.5D horse (SVG)
 *
 * Coordinate space: viewBox 0 0 240 200, horse faces LEFT, ground at y = 187.
 * Rig hierarchy (every group is animatable from CSS, see horseAnimations.ts):
 *
 *   .hz-shadow                       ground shadow (outside the rig)
 *   .hz-rig                          whole horse (bounce / rear / buck)
 *     .hz-body                       pitch
 *       .hz-leg.hz-ff / .hz-fh       far legs  (darker, drawn first)
 *         .hz-up > .hz-lo            upper segment > lower segment (+hoof)
 *       .hz-tail
 *       .hz-barrel                   torso (breathing)
 *       .hz-leg.hz-nf / .hz-nh       near legs
 *       .hz-neck
 *         .hz-mane
 *         .hz-head > .hz-ear, .hz-eye, .hz-jaw
 *
 * Coat markings live inside each part and are clipped by that part's own
 * outline, so spots / socks / careto follow the moving pieces.
 * ══════════════════════════════════════════════════════════════════════════ */

// ─── colour helpers ──────────────────────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [90, 60, 40]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b)
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t))
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
}
function luma(hex: string) {
  const [r, g, b] = rgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

// ─── geometry helpers ────────────────────────────────────────────────────────
/** Shift an absolute M/L/C/Z path by dx,dy. */
function shift(d: string, dx: number, dy: number) {
  let i = 0
  return d.replace(/-?\d*\.?\d+/g, m => {
    const v = parseFloat(m) + (i++ % 2 === 0 ? dx : dy)
    return String(Math.round(v * 10) / 10)
  })
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Spot = [cx: number, cy: number, rx: number, ry: number, rot: number]
function scatter(seed: number, box: [number, number, number, number], n: number, rMin: number, rMax: number): Spot[] {
  const r = rng(seed)
  const out: Spot[] = []
  let guard = 0
  while (out.length < n && guard++ < n * 40) {
    const rx = rMin + r() * (rMax - rMin)
    const cx = box[0] + r() * (box[2] - box[0])
    const cy = box[1] + r() * (box[3] - box[1])
    if (out.some(s => Math.hypot(s[0] - cx, s[1] - cy) < (s[2] + rx) * 1.25)) continue
    out.push([cx, cy, rx, rx * (0.75 + r() * 0.3), Math.round(r() * 180)])
  }
  return out
}

/** Organic closed blob (for pío patches). */
function blob(seed: number, cx: number, cy: number, rx: number, ry: number, k = 8) {
  const r = rng(seed)
  const pts: [number, number][] = []
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2
    const f = 0.72 + r() * 0.5
    pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f])
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < k; i++) {
    const p0 = pts[(i - 1 + k) % k], p1 = pts[i], p2 = pts[(i + 1) % k], p3 = pts[(i + 2) % k]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + ' Z'
}

// ─── PART GEOMETRY ───────────────────────────────────────────────────────────
const BARREL =
  'M 64 100 C 66 86 80 78 94 80 C 108 82 120 89 136 87 C 150 85 162 77 175 82 ' +
  'C 186 87 189 104 182 117 C 178 125 168 130 156 128 C 140 132 116 134 100 130 ' +
  'C 84 128 70 124 65 114 C 63 110 63 104 64 100 Z'

const NECK =
  'M 65 116 C 55 100 46 82 44 64 C 43 50 52 37 66 37 C 84 39 98 60 108 86 ' +
  'C 106 96 100 106 94 116 Z'
const NECK_LINE =
  'M 64.6 114 C 55 100 46 82 44 64 C 43 50 52 37 66 37 C 84 39 98 60 107 84'

const MANE =
  'M 55 33 C 63 25 76 26 85 34 C 94 43 102 57 108 71 C 110 76 112 81 112 87 ' +
  'C 108 85 105 83 103 82 C 103 86 101 89 98 90 C 97 84 95 80 92 77 ' +
  'C 92 81 90 84 87 85 C 86 78 84 72 81 67 C 81 71 79 74 76 75 ' +
  'C 75 67 73 60 69 54 C 68 58 66 60 63 60 C 63 52 61 45 57 40 C 56 38 55 36 55 33 Z'
const MANE_STRANDS =
  'M 64 33 C 74 36 81 44 86 54 M 77 38 C 86 46 92 56 96 68 M 90 50 C 97 60 102 70 106 80 M 62 40 C 66 46 69 52 70 58'

const HEAD =
  'M 64 32 C 56 30 47 34 43 42 L 29 62 C 24 69 25 78 33 80 C 38 81 43 79 46 76 ' +
  'C 52 72 61 67 67 60 C 73 52 72 37 64 32 Z'
const CARETO =
  'M 55 31 C 50 32 45 36 42 41 L 27 62 C 23 68 23 77 30 81 L 40 81 ' +
  'C 36 76 35 70 38 65 L 47 51 C 50 46 54 41 59 36 Z'
const MUZZLE = 'M 22 72 C 26 64 36 64 42 70 C 44 76 42 82 34 83 C 26 83 21 79 22 72 Z'
const EAR = 'M 58 35 C 55 27 57 19 61 12 C 66 18 69 27 66 35 Z'
const EAR_IN = 'M 60 32 C 59.5 26 60.5 21 61.5 17 C 63.5 21 65 27 64 32 Z'
const FORELOCK =
  'M 66 33 C 58 31 51 35 47 43 C 51 41 53 41 55 43 C 55 39 58 37 61 37 C 60 40 61 42 63 43 C 64 39 66 36 66 33 Z'
const JAW = 'M 46 75 C 43 79 38 82 32 82 C 30 82 29 80 31 79 C 36 78 40 77 44 74 Z'
const MOUTH = 'M 47 74 L 30 77 L 31 81 L 45 78 Z'

const TAIL =
  'M 170 82 C 186 79 195 92 195 110 C 195 127 197 142 203 157 C 196 160 188 151 184 139 ' +
  'C 180 125 182 106 168 92 Z'
const TAIL_STRANDS =
  'M 182 88 C 189 100 188 118 189 132 M 188 96 C 193 110 191 128 196 146 M 177 92 C 183 104 182 120 185 134'

// Legs (near side). Upper top is hidden inside the barrel.
interface LegGeo {
  upper: string; upperLine: string
  lower: string; hoof: string
  up: [number, number]; lo: [number, number]
  sockY: number
}
const FRONT_LEG: LegGeo = {
  upper: 'M 70 104 C 69 122 71 138 73 151 C 75 156 83 156 85 151 C 87 138 89 122 90 104 Z',
  upperLine: 'M 69.6 118 C 70 130 71 140 73 151 C 75 156 83 156 85 151 C 86.5 140 88 128 89 118',
  lower: 'M 73 147 L 85 147 C 85 157 84 165 84 171 C 84 176 82 179 80 181 L 70 181 ' +
         'C 72 177 73 174 73 170 C 73 162 73 155 73 147 Z',
  hoof: 'M 69 180 L 81 180 C 82 183 83 185 83.5 187 L 65.5 187 C 66 185 67 182 69 180 Z',
  up: [79, 112], lo: [79, 151], sockY: 158,
}
const HIND_LEG: LegGeo = {
  upper: 'M 150 104 C 150 124 158 140 162 152 C 164 158 175 158 177 152 C 179 140 183 122 181 104 Z',
  upperLine: 'M 152.5 126 C 155 136 159 144 162 152 C 164 158 175 158 177 152 C 178 144 179.5 134 181.5 122',
  lower: 'M 163 149 L 176 149 C 175 157 173 164 172 171 C 172 176 170 179 168 181 L 158 181 ' +
         'C 160 177 162 174 162 170 C 162.5 162 163 156 163 149 Z',
  hoof: 'M 157 180 L 169 180 C 170 183 171 185 171.5 187 L 153.5 187 C 154 185 155 182 157 180 Z',
  up: [166, 114], lo: [170, 152], sockY: 160,
}

// Coat markings (local coordinates of each part)
const MANTA_BARREL =
  'M 120 70 C 140 66 170 64 196 80 L 196 140 L 152 140 C 150 128 146 120 140 116 ' +
  'C 142 110 136 106 132 104 C 134 98 128 94 124 92 C 126 86 120 82 122 78 Z'
const MANTA_THIGH = 'M 140 90 L 196 90 L 196 132 C 186 136 176 134 168 130 C 160 128 152 126 146 122 Z'

const LEO = {
  barrel: scatter(11, [62, 78, 188, 134], 26, 2.6, 5.2),
  neck:   scatter(23, [46, 40, 104, 116], 10, 2.2, 4.2),
  head:   scatter(37, [26, 32, 72, 82], 9, 1.4, 2.6).filter(s => Math.hypot(s[0] - 55, s[1] - 45) > 9).slice(0, 6),
  front:  scatter(41, [68, 110, 92, 160], 5, 1.8, 3),
  hind:   scatter(53, [148, 110, 184, 160], 6, 2, 3.4),
}
const MANTA_SPOTS = {
  barrel: scatter(61, [128, 76, 190, 132], 14, 2.2, 4.4),
  thigh:  scatter(67, [146, 106, 184, 132], 5, 2, 3.2),
}
const PIO = {
  barrel: [blob(5, 112, 112, 26, 19), blob(9, 160, 96, 15, 13)],
  neck:   [blob(13, 72, 84, 13, 18)],
  hind:   [blob(17, 166, 128, 12, 11)],
  front:  [blob(19, 80, 122, 9, 10)],
}

function Spots({ list, fill }: { list: Spot[]; fill: string }) {
  return (
    <>
      {list.map(([cx, cy, rx, ry, rot], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
                 transform={`rotate(${rot} ${cx.toFixed(1)} ${cy.toFixed(1)})`} fill={fill} />
      ))}
    </>
  )
}

// ─── Palette derived from the coat ───────────────────────────────────────────
interface Pal {
  ink: string; line: string; mane: string; maneHi: string
  spot: string; blanket: string; mantaSpot: string; white: string
  hoof: string; hoofLine: string; eye: string
}
function palette(c: HorseCoat): Pal {
  const L = luma(c.ink)
  const mane = L > 0.62 ? mix(c.ink, '#3a2c22', 0.35) : mix(c.ink, '#0d0806', 0.62)
  const spotLight = luma(c.spotInk) > 0.75
  return {
    ink: c.ink,
    line: mix(c.ink, '#140a06', L > 0.6 ? 0.45 : 0.55),
    mane,
    maneHi: mix(mane, '#ffffff', 0.18),
    spot: c.spotInk,
    blanket: '#F7F2EA',
    mantaSpot: spotLight ? (L > 0.6 ? '#2A1E18' : c.ink) : c.spotInk,
    white: '#FFFDF8',
    hoof: c.cuatroalbo ? '#A8977E' : '#2F2420',
    hoofLine: c.cuatroalbo ? '#6E604E' : '#120c0a',
    eye: '#1B1210',
  }
}

// ─── A skinned part: fill, clipped markings + shading, outline ──────────────
function Skin({
  id, d, line, p, uid, children, overlay, far = false, strokeW = 1.3,
}: {
  id: string; d: string; line?: string; p: Pal; uid: string
  children?: ReactNode; overlay?: ReactNode; far?: boolean; strokeW?: number
}) {
  const clip = `${uid}-${id}`
  return (
    <>
      <clipPath id={clip}><path d={d} /></clipPath>
      <path d={d} fill={p.ink} />
      <g clipPath={`url(#${clip})`}>
        {children}
        <path d={d} fill={`url(#${uid}-shade)`} />
        {overlay}
        {far && <path d={d} fill="#1a0e08" opacity={0.26} />}
      </g>
      <path d={line ?? d} fill="none" stroke={p.line} strokeWidth={strokeW}
            strokeLinejoin="round" strokeLinecap="round" />
    </>
  )
}

function Leg({
  geo, kind, cls, far, dx, dy, p, coat, uid,
}: {
  geo: LegGeo; kind: 'front' | 'hind'; cls: string; far: boolean
  dx: number; dy: number; p: Pal; coat: HorseCoat; uid: string
}) {
  const S = (d: string) => (dx || dy ? shift(d, dx, dy) : d)
  const up = { transformOrigin: `${geo.up[0] + dx}px ${geo.up[1] + dy}px` }
  const lo = { transformOrigin: `${geo.lo[0] + dx}px ${geo.lo[1] + dy}px` }
  const t = `translate(${dx} ${dy})`
  const pat = coat.pattern
  const upperMarks = (
    <g transform={t}>
      {pat === 'leopardo' && <Spots list={LEO[kind]} fill={p.spot} />}
      {pat === 'pio' && PIO[kind].map((b, i) => <path key={i} d={b} fill={p.spot} />)}
      {pat === 'appaloosa' && kind === 'hind' && (
        <>
          <path d={MANTA_THIGH} fill={p.blanket} />
          <Spots list={MANTA_SPOTS.thigh} fill={p.mantaSpot} />
        </>
      )}
    </g>
  )
  const lowerMarks = (
    <g transform={t}>
      {pat === 'leopardo' && !coat.cuatroalbo && (
        <Spots list={kind === 'front' ? [[78, 160, 1.8, 1.5, 0]] : [[168, 160, 1.8, 1.5, 0]]} fill={p.spot} />
      )}
    </g>
  )
  // White socks go above the shading so they stay bright and readable.
  const sock = coat.cuatroalbo ? (
    <g transform={t}>
      <path d={`M 60 ${geo.sockY + 1} C 70 ${geo.sockY - 3} 80 ${geo.sockY + 3} 200 ${geo.sockY - 1} L 200 200 L 60 200 Z`}
            fill={p.white} />
      <path d={`M 60 ${geo.sockY + 1} C 70 ${geo.sockY - 3} 80 ${geo.sockY + 3} 200 ${geo.sockY - 1}`}
            fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={1} />
    </g>
  ) : null
  return (
    <g className={`hz-leg ${cls}`}>
      <g className="hz-up" style={up}>
        <g className="hz-lo" style={lo}>
          <Skin id={`${cls}-lo`} d={S(geo.lower)} p={p} uid={uid} far={far} overlay={sock}>{lowerMarks}</Skin>
          <path d={S(geo.hoof)} fill={p.hoof} stroke={p.hoofLine} strokeWidth={1.1} strokeLinejoin="round" />
          {far && <path d={S(geo.hoof)} fill="#000" opacity={0.18} />}
        </g>
        <Skin id={`${cls}-up`} d={S(geo.upper)} line={S(geo.upperLine)} p={p} uid={uid} far={far}>
          {upperMarks}
        </Skin>
      </g>
    </g>
  )
}

// ─── PUBLIC COMPONENT ────────────────────────────────────────────────────────
export interface HorseFigureProps {
  coat: HorseCoat
  /** Current action animation id (see HORSE_ANIMATIONS) or 'idle'. */
  anim?: string
  /** Enables idle loop (breathing, tail, blink) and actions. */
  live?: boolean
  ground?: 'shadow' | 'pedestal' | 'none'
  viewBox?: string
  className?: string
  style?: CSSProperties
}

let cssInjected = false
function useHorseCss() {
  if (typeof document !== 'undefined' && !cssInjected) {
    cssInjected = true
    const el = document.createElement('style')
    el.setAttribute('data-horse-rig', '')
    el.textContent = HORSE_CSS
    document.head.appendChild(el)
  }
}

export function HorseFigure({
  coat, anim = 'idle', live = false, ground = 'shadow',
  viewBox = '0 0 240 200', className, style,
}: HorseFigureProps) {
  useHorseCss()
  const uid = 'hz' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const p = palette(coat)
  const pat = coat.pattern

  return (
    <svg viewBox={viewBox} className={`hz${live ? ' hz-live' : ''}${className ? ' ' + className : ''}`}
         data-anim={anim} style={style} preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Caballo">
      <defs>
        <linearGradient id={`${uid}-shade`} gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="190">
          <stop offset="0"    stopColor="#fff" stopOpacity="0.30" />
          <stop offset="0.36" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="0.5"  stopColor="#fff" stopOpacity="0" />
          <stop offset="0.6"  stopColor="#000" stopOpacity="0" />
          <stop offset="0.72" stopColor="#000" stopOpacity="0.20" />
          <stop offset="1"    stopColor="#000" stopOpacity="0.10" />
        </linearGradient>
        <radialGradient id={`${uid}-gloss`}>
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-ground`}>
          <stop offset="0"   stopColor="#1a0c06" stopOpacity="0.42" />
          <stop offset="0.6" stopColor="#1a0c06" stopOpacity="0.16" />
          <stop offset="1"   stopColor="#1a0c06" stopOpacity="0" />
        </radialGradient>
        {ground === 'pedestal' && (
          <>
            <radialGradient id={`${uid}-grass`} cx="0.45" cy="0.35" r="0.75">
              <stop offset="0"   stopColor="#B9DC86" />
              <stop offset="0.6" stopColor="#8DC15E" />
              <stop offset="1"   stopColor="#6B9E43" />
            </radialGradient>
            <linearGradient id={`${uid}-soil`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7A5434" />
              <stop offset="1" stopColor="#4E3220" />
            </linearGradient>
          </>
        )}
      </defs>

      {ground === 'pedestal' && (
        <g className="hz-pedestal">
          <path d="M 16 189 A 104 21 0 0 0 224 189 L 224 197 A 104 21 0 0 1 16 197 Z" fill={`url(#${uid}-soil)`} />
          <ellipse cx="120" cy="189" rx="104" ry="21" fill={`url(#${uid}-grass)`} />
          <ellipse cx="120" cy="189" rx="104" ry="21" fill="none" stroke="#E4F3C8" strokeOpacity="0.7" strokeWidth="1.4" />
          <ellipse cx="120" cy="189.5" rx="82" ry="15" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" strokeDasharray="3 4" />
          <g fill="none" stroke="#5E8F38" strokeWidth="1.3" strokeLinecap="round">
            <path d="M 34 192 l -2 -6 M 37 193 l 1 -7 M 40 192 l 3 -5" />
            <path d="M 196 186 l -2 -6 M 199 187 l 1 -7 M 202 186 l 3 -5" />
            <path d="M 118 203 l -2 -5 M 121 204 l 1 -6 M 124 203 l 3 -4" stroke="#6F9F46" />
            <path d="M 70 200 l -1 -5 M 73 200 l 2 -5" />
          </g>
          <circle cx="58" cy="196" r="1.8" fill="#fff" opacity="0.85" />
          <circle cx="56.5" cy="195" r="1.1" fill="#F6D36B" />
          <circle cx="182" cy="198" r="1.6" fill="#fff" opacity="0.85" />
          <circle cx="183.2" cy="197" r="1" fill="#F6D36B" />
        </g>
      )}
      {ground !== 'none' && (
        <ellipse className="hz-shadow" cx="122" cy="187.5" rx="66" ry="8.5"
                 fill={`url(#${uid}-ground)`} style={{ transformOrigin: '122px 187.5px' }} />
      )}

      <g className="hz-rig">
        <g className="hz-body">
          {/* far legs */}
          <Leg geo={HIND_LEG}  kind="hind"  cls="hz-fh" far dx={-12} dy={-3} p={p} coat={coat} uid={uid} />
          <Leg geo={FRONT_LEG} kind="front" cls="hz-ff" far dx={11}  dy={-3} p={p} coat={coat} uid={uid} />

          {/* tail */}
          <g className="hz-tail">
            <path d={TAIL} fill={p.mane} stroke={mix(p.mane, '#000', 0.35)} strokeWidth={1.2} strokeLinejoin="round" />
            <path d={TAIL_STRANDS} fill="none" stroke={p.maneHi} strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />
          </g>

          {/* near legs (tops tucked under the barrel) */}
          <Leg geo={HIND_LEG}  kind="hind"  cls="hz-nh" far={false} dx={0} dy={0} p={p} coat={coat} uid={uid} />
          <Leg geo={FRONT_LEG} kind="front" cls="hz-nf" far={false} dx={0} dy={0} p={p} coat={coat} uid={uid} />

          {/* barrel */}
          <g className="hz-barrel">
            <Skin id="barrel" d={BARREL} p={p} uid={uid}>
              {pat === 'leopardo' && <Spots list={LEO.barrel} fill={p.spot} />}
              {pat === 'pio' && PIO.barrel.map((b, i) => <path key={i} d={b} fill={p.spot} />)}
              {pat === 'appaloosa' && (
                <>
                  <path d={MANTA_BARREL} fill={p.blanket} />
                  <Spots list={MANTA_SPOTS.barrel} fill={p.mantaSpot} />
                </>
              )}
              <ellipse cx="132" cy="94" rx="34" ry="8" fill={`url(#${uid}-gloss)`} />
              <ellipse cx="166" cy="92" rx="14" ry="9" fill={`url(#${uid}-gloss)`} />
              <ellipse cx="78" cy="98" rx="10" ry="10" fill={`url(#${uid}-gloss)`} opacity={0.7} />
            </Skin>
          </g>

          {/* neck + head */}
          <g className="hz-neck">
            <Skin id="neck" d={NECK} line={NECK_LINE} p={p} uid={uid}>
              {pat === 'leopardo' && <Spots list={LEO.neck} fill={p.spot} />}
              {pat === 'pio' && PIO.neck.map((b, i) => <path key={i} d={b} fill={p.spot} />)}
              <ellipse cx="68" cy="62" rx="9" ry="16" fill={`url(#${uid}-gloss)`} opacity={0.6}
                       transform="rotate(-30 68 62)" />
            </Skin>
            <g className="hz-mane" style={{ transformOrigin: '70px 40px' }}>
              <path d={MANE} fill={p.mane} stroke={mix(p.mane, '#000', 0.35)} strokeWidth={1.1} strokeLinejoin="round" />
              <path d={MANE_STRANDS} fill="none" stroke={p.maneHi} strokeWidth={1} strokeLinecap="round" opacity={0.85} />
            </g>

            <g className="hz-head" style={{ transformOrigin: '60px 44px' }}>
             <g transform="translate(60 44) scale(1.1) translate(-60 -44)">
              {/* far ear */}
              <g className="hz-ear hz-ear-far" style={{ transformOrigin: '67px 34px' }}>
                <path d={shift(EAR, 6, 1)} fill={mix(p.ink, '#000', 0.3)} stroke={p.line} strokeWidth={1.1} strokeLinejoin="round" />
              </g>
              <path d={MOUTH} fill="#4A1E22" />
              <g className="hz-jaw" style={{ transformOrigin: '46px 75px' }}>
                <path d={JAW} fill={p.ink} stroke={p.line} strokeWidth={1.1} strokeLinejoin="round" />
                {coat.careto && <path d={JAW} fill={p.white} opacity={0.95} />}
              </g>
              <Skin id="head" d={HEAD} p={p} uid={uid}>
                {pat === 'leopardo' && <Spots list={LEO.head} fill={p.spot} />}
                <path d={MUZZLE} fill="#000" opacity={0.12} />
                {coat.careto && <path d={CARETO} fill={p.white} />}
                <ellipse cx="60" cy="56" rx="8" ry="7" fill={`url(#${uid}-gloss)`} opacity={0.8} />
              </Skin>
              {/* nostril + mouth line */}
              <path d="M 29.5 67 C 28 69 28.5 72 30.5 72.5" fill="none"
                    stroke={coat.careto ? '#8A6F66' : mix(p.line, '#000', 0.3)} strokeWidth={1.6} strokeLinecap="round" />
              <path d="M 33 78.5 C 37 78.6 41 77.6 44 75.6" fill="none"
                    stroke={coat.careto ? '#8A6F66' : p.line} strokeWidth={1} strokeLinecap="round" />
              {/* eye */}
              <g className="hz-eye" style={{ transformOrigin: '55px 45px' }}>
                <ellipse cx="55" cy="45" rx="4.3" ry="4.9" fill={p.eye} />
                <circle cx="53.6" cy="43.1" r="1.6" fill="#fff" />
                <circle cx="56.3" cy="47" r="0.6" fill="#fff" opacity="0.8" />
              </g>
              <path d="M 50.5 41.5 C 52.5 39 57 38.6 59.5 41" fill="none" stroke={p.line} strokeWidth={1.1} strokeLinecap="round" />
              {/* near ear */}
              <g className="hz-ear hz-ear-near" style={{ transformOrigin: '62px 34px' }}>
                <path d={EAR} fill={p.ink} stroke={p.line} strokeWidth={1.2} strokeLinejoin="round" />
                <path d={EAR_IN} fill={mix(p.ink, '#2a1410', 0.45)} />
              </g>
              <path d={FORELOCK} fill={p.mane} stroke={mix(p.mane, '#000', 0.35)} strokeWidth={0.9} strokeLinejoin="round" />
             </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  )
}

