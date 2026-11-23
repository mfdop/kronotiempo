/* ════════════════════════════════════════════════════════════════════════════
 * HORSE RIG — parametric side-view horse (pure geometry, no React).
 *
 * World space: horse faces RIGHT, ground line at y = GROUND, ~230 × 300 units.
 * A Pose is a bag of numbers (torso transform + joint angles); every pose can be
 * linearly interpolated with any other, which is how animations tween.
 *
 * Angle convention for every chain (legs, neck, tail):
 *   absolute degrees in world space, 0 = pointing straight DOWN,
 *   +90 = pointing FORWARD (right), -90 = BACK (left), 180 = UP.
 *
 * Tubes (legs, neck, tail) are built from a Catmull-Rom spine through the
 * joints with per-joint half widths [side a, side b] where side a is the
 * normal n = (-d.y, d.x) of the spine direction d:
 *   legs (pointing down)  → a = back,  b = front
 *   neck (pointing up)    → a = front (throat), b = back (crest)
 * Any (u, v) point on a tube is addressable (u ∈ 0..1 along, v ∈ -1..1 across),
 * which is how spots, socks, points and shading follow moving limbs.
 * ══════════════════════════════════════════════════════════════════════════ */

export type V = [number, number]
export const GROUND = 292
const D2R = Math.PI / 180

// ─── tiny vector helpers ────────────────────────────────────────────────────
export const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]]
export const mul = (a: V, k: number): V => [a[0] * k, a[1] * k]
export const lerpV = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
export const dirOf = (deg: number): V => [Math.sin(deg * D2R), Math.cos(deg * D2R)]
export function rot(p: V, deg: number): V {
  const c = Math.cos(deg * D2R), s = Math.sin(deg * D2R)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]
}
const f1 = (n: number) => (Math.round(n * 10) / 10).toString()
export const P = (p: V) => `${f1(p[0])} ${f1(p[1])}`
export function poly(pts: V[], close = false) {
  if (!pts.length) return ''
  let d = `M${P(pts[0])}`
  for (let i = 1; i < pts.length; i++) d += `L${P(pts[i])}`
  return close ? d + 'Z' : d
}
/** Smooth closed/open path through points (Catmull-Rom → cubic Bézier). */
export function smooth(pts: V[], close = false) {
  const n = pts.length
  if (n < 3) return poly(pts, close)
  const g = (i: number) => close ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]
  let d = `M${P(pts[0])}`
  const last = close ? n : n - 1
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2)
    const c1: V = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: V = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return close ? d + 'Z' : d
}

// ─── deterministic random ───────────────────────────────────────────────────
export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── tubes ──────────────────────────────────────────────────────────────────
interface Sample { p: V; n: V; d: V; u: number; wa: number; wb: number }
export interface Tube { s: Sample[]; len: number }

const smoothstep = (t: number) => t * t * (3 - 2 * t)

export function buildTube(joints: V[], widths: [number, number][], step = 2.4): Tube {
  const n = joints.length
  const J = (i: number): V => {
    if (i < 0) return sub(mul(joints[0], 2), joints[1])
    if (i >= n) return sub(mul(joints[n - 1], 2), joints[n - 2])
    return joints[i]
  }
  const raw: { p: V; wa: number; wb: number }[] = []
  /** widths may list joints only, or joint, mid, joint, mid, … (2n-1 entries). */
  const mids = widths.length === 2 * n - 1
  for (let i = 0; i < n - 1; i++) {
    const p0 = J(i - 1), p1 = J(i), p2 = J(i + 1), p3 = J(i + 2)
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const steps = Math.max(2, Math.ceil(segLen / step))
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t
      const p: V = [0, 1].map(c =>
        0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 +
          (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as V
      let wa: number, wb: number
      if (mids) {
        // joint → mid-segment → joint (lets limbs narrow between knees/fetlocks)
        const [w0, w1, tt] = t < 0.5 ? [widths[2 * i], widths[2 * i + 1], t * 2] : [widths[2 * i + 1], widths[2 * i + 2], t * 2 - 1]
        const e = smoothstep(tt)
        wa = w0[0] + (w1[0] - w0[0]) * e; wb = w0[1] + (w1[1] - w0[1]) * e
      } else {
        const e = smoothstep(t)
        wa = widths[i][0] + (widths[i + 1][0] - widths[i][0]) * e; wb = widths[i][1] + (widths[i + 1][1] - widths[i][1]) * e
      }
      raw.push({ p, wa, wb })
    }
  }
  const wl = widths[widths.length - 1]
  raw.push({ p: joints[n - 1], wa: wl[0], wb: wl[1] })
  let acc = 0
  const lens = raw.map((r, i) => (i === 0 ? 0 : (acc += Math.hypot(r.p[0] - raw[i - 1].p[0], r.p[1] - raw[i - 1].p[1]))))
  const total = acc || 1
  const s: Sample[] = raw.map((r, i) => {
    const a = raw[Math.max(0, i - 1)].p, b = raw[Math.min(raw.length - 1, i + 1)].p
    let d = sub(b, a); const l = Math.hypot(d[0], d[1]) || 1; d = mul(d, 1 / l)
    return { p: r.p, d, n: [-d[1], d[0]], u: lens[i] / total, wa: r.wa, wb: r.wb }
  })
  return { s, len: total }
}

function sampleAt(t: Tube, u: number): Sample {
  const s = t.s
  if (u <= 0) return s[0]
  if (u >= 1) return s[s.length - 1]
  let i = 1
  while (i < s.length - 1 && s[i].u < u) i++
  const a = s[i - 1], b = s[i]
  const k = (u - a.u) / ((b.u - a.u) || 1)
  return {
    p: lerpV(a.p, b.p, k), n: lerpV(a.n, b.n, k), d: lerpV(a.d, b.d, k), u,
    wa: a.wa + (b.wa - a.wa) * k, wb: a.wb + (b.wb - a.wb) * k,
  }
}
const sidePt = (sm: Sample, v: number): V => add(sm.p, mul(sm.n, v * (v >= 0 ? sm.wa : sm.wb)))

/** World point at (u, v) on a tube, plus the local half-width (for sizing). */
export function tubePt(t: Tube, u: number, v: number): { p: V; w: number; d: V } {
  const sm = sampleAt(t, u)
  return { p: sidePt(sm, v), w: (sm.wa + sm.wb) / 2, d: sm.d }
}

function samplesIn(t: Tube, u0: number, u1: number): Sample[] {
  const out = [sampleAt(t, u0)]
  for (const sm of t.s) if (sm.u > u0 && sm.u < u1) out.push(sm)
  out.push(sampleAt(t, u1))
  return out
}

/** Closed region of a tube between u0..u1 and v0..v1 (v0 < v1). */
export function tubeRegion(t: Tube, u0 = 0, u1 = 1, v0 = -1, v1 = 1, vFn?: (u: number, side: 0 | 1) => number) {
  const ss = samplesIn(t, u0, u1)
  const A = ss.map(sm => sidePt(sm, vFn ? vFn(sm.u, 1) : v1))
  const B = ss.map(sm => sidePt(sm, vFn ? vFn(sm.u, 0) : v0)).reverse()
  return poly([...A, ...B], true)
}
/** Open side line (v = ±1) from u0..u1. */
export function tubeSide(t: Tube, side: 1 | -1, u0 = 0, u1 = 1) {
  return poly(samplesIn(t, u0, u1).map(sm => sidePt(sm, side)))
}

// ─── chains (FK) ────────────────────────────────────────────────────────────
export function fk(origin: V, angles: number[], lens: number[]): V[] {
  const pts: V[] = [origin]
  let p = origin
  for (let i = 0; i < lens.length; i++) {
    p = add(p, mul(dirOf(angles[i]), lens[i]))
    pts.push(p)
  }
  return pts
}

// ─── static anatomy ─────────────────────────────────────────────────────────
/** Torso pivot (local = stand world). */
export const TORSO_C: V = [106, 145]

export const TORSO =
  'M 120 103 C 106 110 96 113 85 113 C 72 113 60 110 50 113 C 40 116 33 128 33 142 ' +
  'C 33 156 38 168 50 174 C 60 177 72 176 84 178 C 100 181 120 184 140 186 C 146 186 151 184 155 181 ' +
  'C 170 176 178 160 178 140 C 178 128 177 120 175 113 C 160 114 136 105 120 103 Z'
/** Torso outline (open: no line where legs and neck join). */
export const TORSO_LINE =
  'M 175 116 C 177 124 178 132 178 140 C 178 160 170 176 155 181 ' +
  'M 140 186 C 124 184.5 106 182 90 179 C 84 178 78 177 72 177 ' +
  'M 37 166 C 34 158 33 150 33 142 C 33 128 40 116 50 113 C 60 110 72 113 85 113 C 96 113 106 110 120 103'
/** Cel shade (belly band, rump) and highlight (back), torso-local. */
export const TORSO_SHADE =
  'M 26 150 C 44 166 70 170 96 170 C 122 170 150 170 186 148 L 190 200 L 22 200 Z ' +
  'M 26 116 C 38 126 42 146 40 200 L 20 200 Z'
export const TORSO_HL =
  'M 46 118 C 62 113 84 117 104 114 C 124 111 144 103 166 103 C 150 108 132 116 112 119 C 88 122 66 120 46 124 Z'
/** Small anatomical lines on the torso (elbow, sheath/stifle crease, girth). */
export const TORSO_LINES =
  'M 131 172 C 135 177 141 180 147 181 M 76 175 C 80 179 86 181 92 181'

/** Manta (appaloosa blanket) over loin, croup and rump — torso-local. */
export const MANTA =
  'M 104 104 C 102 112 98 118 100 124 C 94 128 96 136 90 140 C 92 148 84 152 82 160 ' +
  'C 74 168 60 170 46 176 L 20 176 L 20 100 Z'

export const ANCHOR = {
  fn: [145, 158] as V, ff: [164, 156] as V,
  hn: [55, 138] as V, hf: [68, 136] as V,
  neck: [146, 125] as V, tail: [40, 121] as V,
}

export interface LegSpec { len: number[]; w: [number, number][]; stroke: [number, number] }
// w = [back, front] half widths at shoulder/hip, elbow/stifle, knee/hock, fetlock, coronet
export const FRONT_LEG: LegSpec = {
  len: [26.5, 38, 47, 13.2],
  w: [[15, 15], [11, 11], [9.4, 9.4], [6.8, 6.8], [5.6, 5.6], [4.5, 4.5], [5.8, 5.2], [4.4, 4.2], [5, 5.2]],
  stroke: [0.2, 0.22],
}
export const HIND_LEG: LegSpec = {
  len: [42.3, 47.5, 46, 13.3],
  w: [[22, 24], [22, 18], [21, 12.5], [15, 9], [8.6, 5.6], [5.2, 4.6], [6.2, 5], [4.4, 4.2], [5, 5.2]],
  stroke: [0.0, 0.2],
}
export const NECK = {
  len: [22, 21.8, 21.9, 15.2],
  // [front/throat, back/crest]
  w: [[30, 30], [25, 22], [18.5, 14.5], [12.5, 10.5], [10, 9]] as [number, number][],
}
export const TAIL = {
  len: [30.5, 42.2, 40.2, 32.1],
  w: [[4.5, 4.5], [10, 9], [14, 13], [16.5, 15], [19, 17]] as [number, number][],
}
/** Head drawing pivot (= neck end in the stand pose). */
export const HEAD_C: V = [166, 48]

// ─── poses ──────────────────────────────────────────────────────────────────
export interface Pose {
  body: { x: number; y: number; rot: number; sx: number }
  neck: number[]
  head: number
  jaw: number
  ears: number
  tail: number[]
  fn: number[]; ff: number[]; hn: number[]; hf: number[]
  /** 0 = free (use body.y), 1 = drop rig so the lowest near hoof sits on the ground. */
  gl: number
  lift: number
  /** Mane / tail wind: 0 hanging, 1 streaming back. */
  wind: number
  /** 0 side view, 1 front view (crossfade). */
  front: number
  /** Eyes closed 0..1. */
  sleepy: number
}

const STAND: Pose = {
  body: { x: 106, y: 145, rot: 0, sx: 1 },
  neck: [182.6, 164, 155.8, 156.8],
  head: 0, jaw: 0, ears: 0,
  tail: [-22, 0, 6, 10],
  fn: [-10.9, 0, -1.2, 18, 0],
  ff: [-8, -3, -3.5, 18, 0],
  hn: [6.8, -22.2, 1.2, 20, 0],
  hf: [10, -28, 6, 22, 0],
  gl: 1, lift: 0, wind: 0, front: 0, sleepy: 0,
}

export const POSES = {
  stand: STAND,
  /** Comiendo — head to the grass. */
  graze: {
    ...STAND,
    body: { x: 104, y: 145, rot: 4, sx: 1 },
    neck: [160, 128, 98, 70],
    head: 62, ears: 14,
    tail: [-22, 0, 6, 10],
    fn: [-2, 6, 4, 12, 0], ff: [-14, -8, -6, 6, 0],
  },
  grazeChew: {
    ...STAND,
    body: { x: 104, y: 145, rot: 4, sx: 1 },
    neck: [160, 129, 99, 72],
    head: 58, jaw: 0.35, ears: 8,
    tail: [-34, -12, -2, 2],
    fn: [-2, 6, 4, 12, 0], ff: [-14, -8, -6, 6, 0],
  },
  /** Se alza — rears on the hind legs. */
  rear: {
    ...STAND,
    body: { x: 104, y: 120, rot: -48, sx: 1 },
    neck: [196, 186, 174, 166],
    head: -26, jaw: 0.6, ears: -6,
    tail: [-12, -18, -4, 4],
    fn: [52, 128, 0, -20, -30],
    ff: [40, 112, -16, -30, -40],
    hn: [-24, -40, 4, 24, 0],
    hf: [-14, -30, 10, 26, 0],
    wind: 0.2,
  },
  /** Correr — flying gallop, legs fully extended (as the reference). */
  gallopA: {
    ...STAND,
    body: { x: 108, y: 140, rot: -3, sx: 1.06 },
    neck: [170, 140, 122, 116],
    head: -34, ears: 18,
    tail: [-72, -88, -96, -102],
    fn: [30, 62, 76, 96, 70],
    ff: [22, 48, 60, 84, 60],
    hn: [-36, -62, -74, -92, -60],
    hf: [-30, -54, -66, -84, -50],
    gl: 0, lift: -24, wind: 1,
  },
  /** Gallop gathering phase (legs under the body). */
  gallopB: {
    ...STAND,
    body: { x: 108, y: 140, rot: 4, sx: 1.0 },
    neck: [176, 152, 134, 128],
    head: -22, ears: 18,
    tail: [-64, -80, -90, -96],
    fn: [-28, -8, -78, -40, -30],
    ff: [-12, 10, -40, -10, 0],
    hn: [40, 10, 14, 30, 10],
    hf: [30, 2, 2, 20, 0],
    gl: 0, lift: -8, wind: 1,
  },
  /** Descansa — lying down, legs folded. */
  rest: {
    ...STAND,
    body: { x: 104, y: 246, rot: 0, sx: 1 },
    neck: [178, 168, 160, 160],
    head: -4, ears: 6,
    tail: [-62, -86, -96, -94],
    fn: [-50, 96, -88, -96, -90],
    ff: [-40, 100, -80, -90, -90],
    hn: [66, -96, 104, 100, 80],
    hf: [60, -92, 98, 96, 80],
    gl: 0, lift: 0, sleepy: 0.6,
  },
  /** Relincha — head up, mouth open, paws. */
  neigh: {
    ...STAND,
    body: { x: 104, y: 145, rot: -4, sx: 1 },
    neck: [188, 178, 172, 170],
    head: -34, jaw: 1, ears: -8,
    tail: [-44, -24, -10, -4],
    fn: [24, 70, -28, -20, -20],
  },
  /** Going down / getting up: front legs folded, hind legs still standing. */
  kneel: {
    ...STAND,
    body: { x: 106, y: 196, rot: 12, sx: 1 },
    neck: [176, 162, 152, 150],
    head: 6,
    fn: [-50, 96, -88, -96, -90],
    ff: [-40, 100, -80, -90, -90],
    hn: [30, -50, -6, 14, 0],
    hf: [30, -46, 0, 16, 0],
    gl: 0,
  },
  rise: {
    ...STAND,
    body: { x: 108, y: 200, rot: -10, sx: 1 },
    neck: [186, 172, 164, 162],
    head: -8,
    fn: [10, 40, -4, 10, 0],
    ff: [14, 46, 0, 12, 0],
    hn: [66, -96, 104, 100, 80],
    hf: [60, -92, 98, 96, 80],
    gl: 0,
  },
  front: { ...STAND, front: 1 },
} satisfies Record<string, Pose>

export type PoseName = keyof typeof POSES

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const L = (x: number, y: number) => x + (y - x) * t
  const LA = (x: number[], y: number[]) => x.map((v, i) => L(v, y[i]))
  return {
    body: { x: L(a.body.x, b.body.x), y: L(a.body.y, b.body.y), rot: L(a.body.rot, b.body.rot), sx: L(a.body.sx, b.body.sx) },
    neck: LA(a.neck, b.neck), head: L(a.head, b.head), jaw: L(a.jaw, b.jaw), ears: L(a.ears, b.ears),
    tail: LA(a.tail, b.tail),
    fn: LA(a.fn, b.fn), ff: LA(a.ff, b.ff), hn: LA(a.hn, b.hn), hf: LA(a.hf, b.hf),
    gl: L(a.gl, b.gl), lift: L(a.lift, b.lift), wind: L(a.wind, b.wind),
    front: L(a.front, b.front), sleepy: L(a.sleepy, b.sleepy),
  }
}

// ─── solved rig ─────────────────────────────────────────────────────────────
export interface LegRig { tube: Tube; hoof: { at: V; ang: number; path: string; line: string; band: string }; spec: LegSpec }
export interface Rig {
  dy: number
  torsoT: string
  toWorld: (p: V) => V
  legs: { fn: LegRig; ff: LegRig; hn: LegRig; hf: LegRig }
  neck: Tube
  tail: { tube: Tube; path: string; locks: string; strands: string[] }
  mane: { path: string; strands: string[] }
  head: { at: V; rot: number; t: string }
  shadowX: number
}

function hoofShape(at: V, ang: number) {
  // local: x = forward (front normal), y = down along the leg
  const X = dirOf(ang + 90) // forward normal = (cos a, -sin a)
  const Y = dirOf(ang)
  const W = (x: number, y: number): V => add(at, add(mul(X, x), mul(Y, y)))
  const pts = [W(-5.8, -1.2), W(5.8, -1.2), W(11, 9.6), W(10.6, 11.6), W(-7.2, 11.6), W(-7.6, 9.6)]
  return {
    path: `M${P(pts[0])}L${P(pts[1])}Q${P(pts[2])} ${P(pts[3])}L${P(pts[4])}Q${P(pts[5])} ${P(pts[0])}Z`,
    line: poly([W(0.6, 1.4), W(5.2, 9.6)]),
    band: `M${P(W(-6.4, 0.2))}L${P(W(6, 0.2))}L${P(W(6.6, 2.2))}L${P(W(-6.8, 2.2))}Z`,
    bottom: Math.max(...pts.map(p => p[1])),
  }
}

function buildLeg(anchor: V, ang: number[], spec: LegSpec): { rig: LegRig; bottom: number } {
  const pts = fk(anchor, ang, spec.len)
  const tube = buildTube(pts, spec.w)
  const at = pts[pts.length - 1]
  const h = hoofShape(at, ang[4])
  return { rig: { tube, hoof: { at, ang: ang[4], path: h.path, line: h.line, band: h.band }, spec }, bottom: h.bottom }
}

/** Flowing hair lock from a → tip → b, bulging outwards. */
function lockQ(a: V, tip: V, b: V, out: V, bulge: number) {
  const c1 = add(lerpV(a, tip, 0.5), mul(out, bulge))
  const c2 = add(lerpV(tip, b, 0.5), mul(out, bulge * 0.25))
  return `Q${P(c1)} ${P(tip)}Q${P(c2)} ${P(b)}`
}

function buildTail(origin: V, ang: number[], wind: number) {
  const pts = fk(origin, ang, TAIL.len)
  const tube = buildTube(pts, TAIL.w, 3)
  const ss = tube.s.filter((_, i, arr) => i % 2 === 0 || i === arr.length - 1)
  const wave = (u: number, ph: number) => Math.sin(u * Math.PI * 2.6 + ph) * 1.8 * u
  const A = ss.map(sm => add(sidePt(sm, 1), mul(sm.n, wave(sm.u, 0))))
  const B = ss.map(sm => add(sidePt(sm, -1), mul(sm.n, wave(sm.u, 1.9))))
  const end = ss[ss.length - 1]
  const r = rng(7)
  // ragged end: pointed locks fanning out
  const m = 6
  const ea = A[A.length - 1], eb = B[B.length - 1]
  let tipD = ''
  for (let k = 0; k < m; k++) {
    const p0 = lerpV(ea, eb, k / m), p1 = lerpV(ea, eb, (k + 1) / m)
    const len = 9 + Math.sin(((k + 0.5) / m) * Math.PI) * 12 + r() * 7
    const spread = (k - (m - 1) / 2) * 2.4 * (1 - wind * 0.6)
    const tip = add(add(lerpV(p0, p1, 0.5), mul(end.d, len)), mul(end.n, spread))
    const notch = add(p1, mul(end.d, -3 - r() * 5))
    tipD += lockQ(k === 0 ? p0 : p0, tip, k < m - 1 ? notch : p1, end.n, spread * 0.4)
  }
  // loose locks peeling off the sides (drawn behind the main mass)
  const lock = (u: number, side: 1 | -1, len: number) => {
    const sm = sampleAt(tube, u)
    const b0 = sidePt(sm, side * 0.9), b1 = sidePt(sampleAt(tube, u + 0.12), side * 0.6)
    const tip = add(add(b0, mul(sm.n, side * 6)), mul(sm.d, len))
    return `M${P(b0)}Q${P(add(lerpV(b0, tip, 0.5), mul(sm.n, side * 3)))} ${P(tip)}Q${P(lerpV(tip, b1, 0.4))} ${P(b1)}Z`
  }
  const locks = lock(0.5, 1, 22 + wind * 6) + lock(0.68, -1, 20) + lock(0.78, 1, 18)
  const path = smooth(A) + tipD.replace(/^Q/, `L${P(ea)}Q`) + smooth([...B].reverse()).replace(/^M/, 'L') + 'Z'
  const strands = [-0.62, -0.2, 0.2, 0.6].map((v, i) =>
    smooth(ss.filter((_, j) => j % 2 === 0).filter(sm => sm.u > 0.14 + i * 0.05 && sm.u < 0.97 - i * 0.04)
      .map(sm => add(sidePt(sm, v), mul(sm.n, wave(sm.u, 1)))))
  )
  return { tube, path, locks, strands }
}

function buildMane(neck: Tube, wind: number) {
  const g = (() => {
    const a: V = [-0.62, 0.78], b: V = [-0.99, 0.1]
    const v = lerpV(a, b, wind); const l = Math.hypot(v[0], v[1]); return mul(v, 1 / l)
  })()
  const locks = 11
  const r = rng(31)
  const strands: string[] = []
  const u0 = 1, u1 = 0.08
  const start = add(tubePt(neck, 1, -0.6).p, mul(tubePt(neck, 1, 0).d, 6))
  let d = `M${P(start)}`
  let prev = start
  for (let j = 0; j < locks; j++) {
    const ub = u0 + (u1 - u0) * ((j + 1) / locks)
    const um = u0 + (u1 - u0) * ((j + 0.5) / locks)
    const sm = sampleAt(neck, um)
    const c = sidePt(sm, -1)
    const outN = mul(sm.n, -1)
    const size = 0.75 + 0.4 * Math.sin(((j + 1) / (locks + 1)) * Math.PI)
    const tip = add(add(c, mul(outN, (8 + r() * 7) * size)), mul(g, (12 + r() * 9) * size + wind * 10))
    const nb = add(sidePt(sampleAt(neck, ub), -1), mul(outN, (4 + r() * 4) * size + wind * 2))
    d += lockQ(prev, tip, nb, outN, 2.5)
    strands.push(`M${P(add(c, mul(sm.n, 4)))}Q${P(add(lerpV(c, tip, 0.5), mul(outN, 2)))} ${P(lerpV(c, tip, 0.85))}`)
    prev = nb
  }
  // inner edge: hair falling over the near side of the neck (scalloped)
  const inner: V[] = []
  for (let k = 0; k <= 12; k++) {
    const u = u1 + (1 - u1) * (k / 12)
    const sm = sampleAt(neck, u)
    const inset = (k % 2 ? 10 : 6) * (0.5 + 0.5 * u)
    inner.push(add(sidePt(sm, -1), mul(sm.n, inset)))
  }
  inner.push(start)
  d += smooth(inner).replace(/^M/, 'L') + 'Z'
  return { path: d, strands }
}

export function solve(p: Pose): Rig {
  const b = p.body
  const toWorld = (q: V): V => add([b.x, b.y], rot([(q[0] - TORSO_C[0]) * b.sx, q[1] - TORSO_C[1]], b.rot))
  const fn = buildLeg(toWorld(ANCHOR.fn), p.fn, FRONT_LEG)
  const ff = buildLeg(toWorld(ANCHOR.ff), p.ff, FRONT_LEG)
  const hn = buildLeg(toWorld(ANCHOR.hn), p.hn, HIND_LEG)
  const hf = buildLeg(toWorld(ANCHOR.hf), p.hf, HIND_LEG)
  const lowest = Math.max(fn.bottom, hn.bottom)
  const dy = p.gl * (GROUND - lowest) + p.lift
  const neckPts = fk(toWorld(ANCHOR.neck), p.neck, NECK.len)
  const neck = buildTube(neckPts, NECK.w)
  const at = neckPts[neckPts.length - 1]
  return {
    dy,
    torsoT: `translate(${f1(b.x)} ${f1(b.y)}) rotate(${f1(b.rot)}) scale(${b.sx.toFixed(3)} 1) translate(${-TORSO_C[0]} ${-TORSO_C[1]})`,
    toWorld,
    legs: { fn: fn.rig, ff: ff.rig, hn: hn.rig, hf: hf.rig },
    neck,
    tail: buildTail(toWorld(ANCHOR.tail), p.tail, p.wind),
    mane: buildMane(neck, p.wind),
    head: { at, rot: p.head, t: `translate(${f1(at[0])} ${f1(at[1])}) rotate(${f1(p.head)}) translate(${-HEAD_C[0]} ${-HEAD_C[1]})` },
    shadowX: b.x,
  }
}

const cache = new Map<string, Rig>()
/** Memoised rig for a named static pose (tiles render many of these). */
export function solveNamed(name: PoseName): Rig {
  let r = cache.get(name)
  if (!r) { r = solve(POSES[name]); cache.set(name, r) }
  return r
}
