/* ════════════════════════════════════════════════════════════════════════════
 * HORSE ANIMATIONS — registry of tap actions for the big stage horse.
 *
 * Each action is a timeline of key poses (see POSES in horseRig.ts). The
 * figure tweens every number of the pose between keys with ease-in-out, so a
 * new action only needs a list of keys:
 *
 *   { id: 'saludo', label: 'Saluda', ms: 2000, keys: [
 *       [0, 'stand'], [0.3, 'neigh', { jaw: 0 }], [1, 'stand'] ] }
 *
 *   key = [time 0..1, pose name, optional partial overrides of that pose]
 *   emotes = little overlays (green motion ticks, sound arcs, zzz…) shown
 *            between `from` and `to`, anchored to a part of the horse.
 *
 * To add a brand-new pose, add it to POSES in horseRig.ts (copy `stand` and
 * change angles; the angle convention is documented at the top of that file).
 * Idle loops (breathing, blink, ear flick, tail/mane sway) are pure CSS below
 * and run whenever the figure is `live`.
 * ══════════════════════════════════════════════════════════════════════════ */

import type { Pose, PoseName } from './horseRig'

export type HorseEmote = 'ticks' | 'neigh' | 'speed' | 'zzz' | 'munch' | 'hearts'
export type EmoteAnchor = 'head' | 'hooves' | 'tail' | 'back'

export interface EmoteDef { kind: HorseEmote; from: number; to: number; at: EmoteAnchor }
export type PoseKey = [t: number, pose: PoseName, over?: Partial<Pose>]

export interface HorseAnimation {
  id: string
  label: string
  ms: number
  keys: PoseKey[]
  emotes?: EmoteDef[]
  /** Key index shown (held) instead of tweening when reduced motion is on. */
  still?: number
}

const gallopKeys = (): PoseKey[] => {
  const k: PoseKey[] = [[0, 'stand'], [0.08, 'gallopB']]
  const n = 9
  for (let i = 0; i < n; i++) {
    const t = 0.08 + ((i + 1) / (n + 1)) * 0.8
    k.push([t, i % 2 ? 'gallopB' : 'gallopA'])
  }
  k.push([0.9, 'gallopB'], [1, 'stand'])
  return k
}

export const HORSE_ANIMATIONS: HorseAnimation[] = [
  {
    id: 'graze', label: 'Comiendo', ms: 4200, still: 2,
    keys: [[0, 'stand'], [0.2, 'graze'], [0.3, 'grazeChew'], [0.4, 'graze'], [0.5, 'grazeChew'],
           [0.6, 'graze'], [0.7, 'grazeChew'], [0.8, 'graze'], [1, 'stand']],
    emotes: [{ kind: 'munch', from: 0.22, to: 0.8, at: 'head' }],
  },
  {
    id: 'rear', label: 'Se alza', ms: 2800, still: 2,
    keys: [[0, 'stand'], [0.14, 'stand', { body: { x: 102, y: 150, rot: 4, sx: 1 }, neck: [176, 158, 150, 150] }],
           [0.36, 'rear'], [0.5, 'rear', { fn: [70, 150, 20, 0, -10], ff: [30, 96, -30, -40, -40] }],
           [0.64, 'rear'], [0.78, 'rear', { fn: [70, 150, 20, 0, -10], ff: [30, 96, -30, -40, -40] }],
           [1, 'stand']],
    emotes: [{ kind: 'ticks', from: 0.32, to: 0.85, at: 'hooves' }],
  },
  {
    id: 'gallop', label: 'Correr', ms: 3200, still: 3,
    keys: gallopKeys(),
    emotes: [{ kind: 'speed', from: 0.1, to: 0.9, at: 'tail' }],
  },
  {
    id: 'rest', label: 'Descansa', ms: 5200, still: 2,
    keys: [[0, 'stand'], [0.12, 'kneel'], [0.26, 'rest', { sleepy: 0 }], [0.36, 'rest'], [0.66, 'rest', { head: 4, neck: [176, 166, 157, 156] }],
           [0.76, 'rest', { sleepy: 0 }], [0.88, 'rise'], [1, 'stand']],
    emotes: [{ kind: 'zzz', from: 0.36, to: 0.72, at: 'head' }],
  },
  {
    id: 'front', label: 'De frente', ms: 2800, still: 1,
    keys: [[0, 'stand'], [0.2, 'front'], [0.8, 'front'], [1, 'stand']],
    emotes: [{ kind: 'hearts', from: 0.3, to: 0.75, at: 'head' }],
  },
  {
    id: 'neigh', label: 'Relincha', ms: 2000, still: 1,
    keys: [[0, 'stand'], [0.2, 'neigh'], [0.34, 'neigh', { jaw: 0.35 }], [0.48, 'neigh'],
           [0.62, 'neigh', { jaw: 0.4 }], [0.76, 'neigh'], [1, 'stand']],
    emotes: [{ kind: 'neigh', from: 0.18, to: 0.82, at: 'head' }, { kind: 'ticks', from: 0.18, to: 0.82, at: 'back' }],
  },
]

export const HORSE_CSS = `
.hz{display:block;overflow:visible;-webkit-tap-highlight-color:transparent}
.hz-breathe,.hz-eye,.hz-ear,.hz-tailsway,.hz-manesway{transform-box:fill-box}
.hz-breathe{transform-origin:50% 60%}
.hz-eye{transform-origin:50% 50%}
.hz-ear{transform-origin:50% 100%}
.hz-tailsway{transform-origin:50% 0%}
.hz-manesway{transform-origin:80% 0%}
.hz-live .hz-breathe{animation:hz-breathe 3.6s ease-in-out infinite}
.hz-live .hz-eye{animation:hz-blink 5.2s linear infinite}
.hz-live .hz-ear-n{animation:hz-ear 7s ease-in-out infinite}
.hz-live .hz-ear-f{animation:hz-ear 7s ease-in-out -2.3s infinite}
.hz-live[data-anim="idle"] .hz-tailsway{animation:hz-tail 4.4s ease-in-out infinite}
.hz-live[data-anim="idle"] .hz-manesway{animation:hz-mane 5.6s ease-in-out infinite}
@keyframes hz-breathe{0%,100%{transform:scale(1,1)}50%{transform:scale(1.008,1.025)}}
@keyframes hz-blink{0%,94%,100%{transform:scaleY(1)}96.5%{transform:scaleY(.1)}}
@keyframes hz-ear{0%,82%,100%{transform:rotate(0)}86%{transform:rotate(-14deg)}90%{transform:rotate(5deg)}93%{transform:rotate(0)}}
@keyframes hz-tail{0%,100%{transform:rotate(0)}40%{transform:rotate(4deg)}55%{transform:rotate(2.5deg)}75%{transform:rotate(-2deg)}}
@keyframes hz-mane{0%,100%{transform:skewX(0)}50%{transform:skewX(-3deg)}}
.hz-hint{animation:hz-hint 2.4s ease-in-out infinite}
@keyframes hz-hint{0%,100%{opacity:.55}50%{opacity:1}}
@media (prefers-reduced-motion: reduce){
  .hz-live *,.hz-hint{animation:none!important}
}
`
