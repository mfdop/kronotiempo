import type { ReactNode } from 'react'
import type { HorseCoat } from './horseCoat'
import { rng, add, mul, P, tubePt, tubeRegion, type Tube, type V } from './horseRig'

/* Coat palette + marking helpers shared by the side and front drawings. */

// ─── colour helpers ──────────────────────────────────────────────────────────
function rgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return [90, 60, 40]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
export function luma(hex: string) {
  const [r, g, b] = rgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export interface Pal {
  coat: string; shade: string; hl: string; line: string
  mane: string; maneHi: string; maneLo: string
  points: string; spot: string; white: string; patch: string
  hoof: string; hoofHi: string; eye: string; earIn: string
}

export function palette(c: HorseCoat): Pal {
  let coat = c.ink
  const L0 = luma(coat)
  if (L0 < 0.12) coat = mix(coat, '#5a4438', 0.32)        // keep black horses readable
  const L = luma(coat)
  const light = L > 0.5
  const mane = light ? '#574638' : mix(coat, '#0b0705', 0.62)
  const spotLight = luma(c.spotInk) > 0.7
  return {
    coat,
    shade: mix(coat, light ? '#7a4a2a' : '#1a0d06', light ? 0.22 : 0.32),
    hl: mix(coat, '#fffaf2', light ? 0.45 : 0.22),
    line: L < 0.2 ? '#0b0806' : '#22180F',
    mane, maneHi: mix(mane, '#e8cdb4', 0.42), maneLo: mix(mane, '#000', 0.35),
    points: light ? '#5E4A3C' : mix(coat, '#0b0705', 0.5),
    spot: c.spotInk,
    white: '#FBF5EC',
    // pío patches are white on dark coats; on light coats use the chosen spot colour
    patch: L > 0.62 ? (spotLight ? '#5E4A3C' : c.spotInk) : '#FBF5EC',
    hoof: c.cuatroalbo ? '#A89A8A' : '#4E4540',
    hoofHi: c.cuatroalbo ? '#D4CABE' : '#9A8F88',
    eye: '#2A1C15',
    earIn: mix(coat, '#5a2a1a', light ? 0.55 : 0.4),
  }
}
/** Spot colour inside the white manta blanket. */
export function mantaSpot(c: HorseCoat, p: Pal) {
  return luma(c.spotInk) > 0.7 ? p.coat : c.spotInk
}

// ─── spot shapes ─────────────────────────────────────────────────────────────
/** Painterly appaloosa spot: a cluster of overlapping translucent lobes. */
export type Lobe = [dx: number, dy: number, r: number]
export function lobes(seed: number): Lobe[] {
  const r = rng(seed)
  const k = 4 + Math.floor(r() * 3)
  const out: Lobe[] = [[0, 0, 0.55 + r() * 0.15]]
  let a = r() * Math.PI * 2
  for (let i = 1; i < k; i++) {
    a += 1.2 + r() * 1.6
    const d = 0.32 + r() * 0.4
    out.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, 0.28 + r() * 0.3])
  }
  return out
}
export function Spot({ at, r, seed, fill, op = 0.95 }: { at: V; r: number; seed: number; fill: string; op?: number }) {
  const L = lobes(seed)
  const q = rng(seed + 5)
  return (
    <g opacity={op}>
      <path d={blob(seed, at[0], at[1], r * (0.8 + q() * 0.25), r * (0.62 + q() * 0.3), 7)} fill={fill} />
      {L.slice(1, 3).map(([dx, dy, rr], i) => (
        <circle key={i} cx={(at[0] + dx * r * 1.15).toFixed(1)} cy={(at[1] + dy * r * 1.15).toFixed(1)} r={(rr * r * 0.75).toFixed(2)} fill={fill} />
      ))}
    </g>
  )
}

export interface SpotDef { x: number; y: number; r: number; seed: number }
/** Poisson-ish scatter in a box (local coords). */
export function scatter(seed: number, box: [number, number, number, number], n: number, rMin: number, rMax: number,
                        keep?: (x: number, y: number) => boolean): SpotDef[] {
  const r = rng(seed)
  const out: SpotDef[] = []
  let guard = 0
  while (out.length < n && guard++ < n * 60) {
    const rr = rMin + r() * (rMax - rMin)
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1])
    if (keep && !keep(x, y)) continue
    if (out.some(s => Math.hypot(s.x - x, s.y - y) < (s.r + rr) * 1.12)) continue
    out.push({ x, y, r: rr, seed: seed * 131 + out.length })
  }
  return out
}

/** Organic closed blob (pío patches). */
export function blob(seed: number, cx: number, cy: number, rx: number, ry: number, k = 9) {
  const r = rng(seed)
  const pts: V[] = []
  for (let i = 0; i < k; i++) {
    const a = (i / k) * Math.PI * 2
    const f = 0.7 + r() * 0.5
    pts.push([cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f])
  }
  let d = `M${P(pts[0])}`
  for (let i = 0; i < k; i++) {
    const p0 = pts[(i - 1 + k) % k], p1 = pts[i], p2 = pts[(i + 1) % k], p3 = pts[(i + 2) % k]
    d += `C${P([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${P([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${P(p2)}`
  }
  return d + 'Z'
}

// ─── tube spots (u, v) ──────────────────────────────────────────────────────
export interface TubeSpot { u: number; v: number; k: number; seed: number }
export function tubeScatter(seed: number, n: number, u0: number, u1: number, kMin: number, kMax: number): TubeSpot[] {
  const r = rng(seed)
  const out: TubeSpot[] = []
  for (let i = 0; i < n; i++) {
    out.push({ u: u0 + ((i + 0.2 + r() * 0.6) / n) * (u1 - u0), v: (r() * 2 - 1) * 0.75, k: kMin + r() * (kMax - kMin), seed: seed * 977 + i })
  }
  return out
}
export function TubeSpots({ tube, list, fill, scale = 1 }: { tube: Tube; list: TubeSpot[]; fill: string; scale?: number }) {
  return (
    <>
      {list.map((s, i) => {
        const q = tubePt(tube, s.u, s.v)
        return <Spot key={i} at={q.p} r={Math.max(1.6, q.w * s.k) * scale} seed={s.seed} fill={fill} />
      })}
    </>
  )
}

/** Socks: white from the coronet up to u0, scalloped top edge. */
export function Sock({ tube, u0, fill }: { tube: Tube; u0: number; fill: string }) {
  const scallops: ReactNode[] = [-0.55, 0, 0.55].map((v, i) => {
    const q = tubePt(tube, u0 + 0.006 * (i % 2 ? 1 : -1), v)
    return <circle key={i} cx={q.p[0].toFixed(1)} cy={q.p[1].toFixed(1)} r={(q.w * 0.55).toFixed(2)} fill={fill} />
  })
  return (<><path d={tubeRegion(tube, u0, 1)} fill={fill} />{scallops}</>)
}

/** Point on a tube offset along its local direction (for blobs). */
export function tubeBlob(tube: Tube, u: number, v: number, k: number, seed: number) {
  const q = tubePt(tube, u, v)
  const c = add(q.p, mul(q.d, 0))
  return blob(seed, c[0], c[1], q.w * k, q.w * k * 0.9)
}
