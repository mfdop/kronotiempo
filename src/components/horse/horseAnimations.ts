/* ════════════════════════════════════════════════════════════════════════════
 * HORSE ANIMATIONS — registry of tap actions for the big stage horse.
 *
 * Each action shows one traced pose drawing (art/<pose>.ts). The figure
 * crossfades stand → pose with a little squash & stretch, holds it while
 * `motion(k)` adds life (k = 0..1 across the hold), then returns to stand.
 *
 *   motion(k) → { dx, dy, rot, sx, sy, pivot, parts }
 *     rot/sx/sy act around `pivot` ('hooves' = middle of the ground line,
 *     'hind' = hind hooves, or explicit figure coords);
 *     parts = extra rotation (deg) of separately traced groups
 *     (stand: tail / mane / earN / earF, gallop: tail / hind / fore).
 *   frames: list of motions cycled every `every` ms (gallop stride).
 *   emotes: little overlays (green motion ticks, sound arcs, zzz…) shown
 *     between `from` and `to` (fractions of the whole action).
 *
 * To add an action: push an entry below; to add a new drawing, trace it
 * with tools/horse-trace and add it to art/index.ts.
 * Idle loops (breathing, blink, ear flick, tail & mane sway) run in the
 * figure itself whenever it is `live`.
 * ══════════════════════════════════════════════════════════════════════════ */

import type { PoseName } from './art'
import type { V2 } from './art/types'

export type HorseEmote = 'ticks' | 'neigh' | 'speed' | 'zzz' | 'munch' | 'hearts'
export type EmoteAnchor = 'head' | 'hooves' | 'tail' | 'back'
export interface EmoteDef { kind: HorseEmote; from: number; to: number; at: EmoteAnchor }

export interface Motion {
  dx?: number; dy?: number; rot?: number; sx?: number; sy?: number
  pivot?: 'hooves' | 'hind' | V2
  parts?: Record<string, number>
}

export interface HorseAnimation {
  id: string
  label: string
  ms: number
  pose: PoseName
  motion?: (k: number) => Motion
  frames?: { every: number; list: Motion[] }
  emotes?: EmoteDef[]
}

const bump = (k: number, a: number, b: number) => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI))

export const HORSE_ANIMATIONS: HorseAnimation[] = [
  {
    id: 'graze', label: 'Comiendo', ms: 4200, pose: 'graze',
    // chewing: tiny rhythmic squash of the whole drawing
    motion: k => ({ sy: 1 - 0.007 * Math.abs(Math.sin(k * Math.PI * 9)), sx: 1 + 0.004 * Math.abs(Math.sin(k * Math.PI * 9)) }),
    emotes: [{ kind: 'munch', from: 0.15, to: 0.85, at: 'head' }],
  },
  {
    id: 'rear', label: 'Se alza', ms: 2800, pose: 'rear',
    motion: k => ({ rot: -2.5 * bump(k, 0, 0.5) - 2 * bump(k, 0.45, 1), dy: -3 * bump(k, 0, 0.5) - 2.5 * bump(k, 0.45, 1), pivot: 'hind' }),
    emotes: [{ kind: 'ticks', from: 0.2, to: 0.85, at: 'hooves' }],
  },
  {
    id: 'gallop', label: 'Correr', ms: 3200, pose: 'gallop',
    frames: {
      every: 115,
      list: [
        { dy: 0, rot: 0 },
        { dy: -3.5, rot: -1.2, parts: { hind: -13, fore: 11, tail: -4 } },
        { dy: -1.5, rot: 0.8, parts: { hind: -24, fore: 20, tail: 3 } },
        { dy: -3.5, rot: -0.4, parts: { hind: -12, fore: 9, tail: -2 } },
      ],
    },
    emotes: [{ kind: 'speed', from: 0.1, to: 0.9, at: 'tail' }],
  },
  {
    id: 'rest', label: 'Descansa', ms: 5200, pose: 'rest',
    motion: k => ({ sy: 1 + 0.012 * Math.sin(k * Math.PI * 6), pivot: 'hooves' }),
    emotes: [{ kind: 'zzz', from: 0.25, to: 0.8, at: 'head' }],
  },
  {
    id: 'front', label: 'De frente', ms: 2800, pose: 'front',
    motion: k => ({ rot: 1.4 * Math.sin(k * Math.PI * 3), pivot: 'hooves' }),
    emotes: [{ kind: 'hearts', from: 0.25, to: 0.8, at: 'head' }],
  },
  {
    id: 'neigh', label: 'Relincha', ms: 2000, pose: 'stand',
    motion: k => {
      const b = bump(k, 0.05, 0.55) + 0.7 * bump(k, 0.5, 0.95)
      return { rot: -6 * b, dy: -1.5 * b, pivot: 'hind', parts: { earN: -16 * b, earF: -14 * b, tail: 6 * b, mane: 2.5 * b } }
    },
    emotes: [{ kind: 'neigh', from: 0.12, to: 0.88, at: 'head' }, { kind: 'ticks', from: 0.12, to: 0.88, at: 'back' }],
  },
]
