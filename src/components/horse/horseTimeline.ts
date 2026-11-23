import type { HorseAnimation, Motion } from './horseAnimations'
import type { PoseArt, V2 } from './art/types'

/* Timeline maths for the stage horse: which traced drawing(s) to show at a
 * given moment of an action, and the transform that adds the motion. */

export const GROUND = 292
const IN_MS = 300
const OUT_MS = 340

// ─── geometry helpers ───────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t) }
const easeOutBack = (t: number) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function pivotOf(m: Motion, art: PoseArt): V2 {
  if (Array.isArray(m.pivot)) return m.pivot
  if (m.pivot === 'hind') return [art.box[0] + art.box[2] * 0.2, GROUND]
  return [110, GROUND]
}

export function xform(m: Motion, art: PoseArt) {
  const [px, py] = pivotOf(m, art)
  const f = (v: number) => v.toFixed(3)
  return `translate(${f((m.dx ?? 0) + px)} ${f((m.dy ?? 0) + py)}) rotate(${f(m.rot ?? 0)}) scale(${f(m.sx ?? 1)} ${f(m.sy ?? 1)}) translate(${-px} ${-py})`
}

function lerpMotion(a: Motion, b: Motion, t: number): Motion {
  const parts: Record<string, number> = {}
  for (const k of new Set([...Object.keys(a.parts ?? {}), ...Object.keys(b.parts ?? {})]))
    parts[k] = lerp(a.parts?.[k] ?? 0, b.parts?.[k] ?? 0, t)
  return {
    dx: lerp(a.dx ?? 0, b.dx ?? 0, t), dy: lerp(a.dy ?? 0, b.dy ?? 0, t), rot: lerp(a.rot ?? 0, b.rot ?? 0, t),
    sx: lerp(a.sx ?? 1, b.sx ?? 1, t), sy: lerp(a.sy ?? 1, b.sy ?? 1, t), pivot: a.pivot ?? b.pivot, parts,
  }
}

/** Motion of the held pose at `ms` into the action. */
function holdMotion(def: HorseAnimation, ms: number): Motion {
  const k = clamp01(ms / def.ms)
  if (def.frames) {
    const { every, list } = def.frames
    const ph = Math.max(0, ms - IN_MS * 0.6) / every
    const i = Math.floor(ph), f = ph - i
    const e = f * f * (3 - 2 * f)
    return lerpMotion(list[i % list.length], list[(i + 1) % list.length], e)
  }
  return def.motion ? def.motion(k) : {}
}


export interface Layer { art: PoseArt; op: number; m: Motion; key: string }

/** Which drawings to show at `ms` into action `def` (crossfades in/out). */
export function actionLayers(def: HorseAnimation, ms: number, stand: PoseArt, pose: PoseArt, reduced: boolean): Layer[] {
  if (reduced) {
    const on = ms > def.ms * 0.04 && ms < def.ms * 0.96
    return [{ art: on ? pose : stand, op: 1, m: {}, key: on ? 'p' : 's' }]
  }
  const hold = holdMotion(def, ms)
  if (def.pose === 'stand') return [{ art: stand, op: 1, m: hold, key: 's' }]
  const kin = clamp01(ms / IN_MS), kout = clamp01((def.ms - ms) / OUT_MS)
  const k = Math.min(kin, kout) // 0 → stand, 1 → pose
  if (k >= 1) return [{ art: pose, op: 1, m: hold, key: 'p' }]
  const fade = smooth(0.3, 0.7, k)
  const squash = Math.sin(Math.min(1, k / 0.6) * Math.PI) // anticipation on the outgoing drawing
  const pop = easeOutBack(smooth(0.3, 1, k))
  const out: Layer[] = []
  if (fade < 1) out.push({ art: stand, op: 1 - fade, m: { sx: 1 + 0.05 * squash, sy: 1 - 0.07 * squash, pivot: 'hooves' }, key: 's' })
  if (fade > 0) {
    const h = lerpMotion({}, hold, k)
    out.push({ art: pose, op: fade, key: 'p', m: { ...h, sx: (h.sx ?? 1) * (0.94 + 0.06 * pop), sy: (h.sy ?? 1) * (1.06 - 0.06 * pop) } })
  }
  return out
}
