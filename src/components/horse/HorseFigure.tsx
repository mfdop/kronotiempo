import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { HorseCoat } from './horseCoat'
import { HORSE_ANIMATIONS, type EmoteDef, type HorseAnimation, type Motion } from './horseAnimations'
import { ArtView } from './horseArt'
import { ICON_ART, getPoseArt, usePoseArts, type PoseName } from './art'
import type { PoseArt, V2 } from './art/types'

/* ════════════════════════════════════════════════════════════════════════════
 * HorseFigure — the storybook horse, drawn from artwork traced from the
 * reference illustration (art/*.ts, rendered by horseArt.tsx).
 *
 *  - tiles (icon): simplified standing drawing, bundled with the app
 *  - big horse: detailed poses, code-split and loaded on first use
 *  - actions (horseAnimations.ts): crossfade + squash/stretch into a traced
 *    pose, a bit of motion while holding it, then back to standing
 *  - idle (live): breathing, blink, ear flick, tail & mane sway (SMIL)
 * ══════════════════════════════════════════════════════════════════════════ */

export const GROUND = 292
export const HORSE_VIEWBOX = '-14 4 248 300'
const TICK = '#9DAF7E'
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

function xform(m: Motion, art: PoseArt) {
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

// ─── emotes ─────────────────────────────────────────────────────────────────
function Emote({ e, t, at }: { e: EmoteDef; t: number; at: V2 }) {
  const k = (t - e.from) / (e.to - e.from)
  if (k <= 0 || k >= 1) return null
  const op = Math.min(1, k * 6, (1 - k) * 6)
  const pop = (0.7 + 0.3 * Math.min(1, k * 5)) * 1.6
  const wob = Math.sin(k * Math.PI * 10) * 1.5
  const g = (children: ReactNode, dx = 0, dy = 0) => (
    <g opacity={op} transform={`translate(${(at[0] + dx).toFixed(1)} ${(at[1] + dy + wob * 0.4).toFixed(1)}) scale(${pop.toFixed(2)})`}>{children}</g>
  )
  const ticks = (
    <g stroke={TICK} strokeWidth={3.2} strokeLinecap="round" fill="none">
      <path d="M -14 4 L -5 6" /><path d="M -10 -10 L -3 -2" /><path d="M 2 -14 L 3 -5" />
    </g>
  )
  switch (e.kind) {
    case 'ticks': return g(ticks, -2, -4)
    case 'neigh': return g(
      <g stroke={TICK} strokeWidth={2.8} strokeLinecap="round" fill="none">
        {[0, 1, 2].map(i => {
          const s = (k * 3 + i / 3) % 1
          return <path key={i} d={`M ${4 + s * 18} ${-8 - s * 6} q ${6 + s * 6} ${8 + s * 6} 0 ${16 + s * 12}`} opacity={1 - s} />
        })}
      </g>, 14, 30)
    case 'munch': return g(
      <g fill="none" stroke={TICK} strokeWidth={2.6} strokeLinecap="round">
        <path d="M -6 2 l -3 -8 M -1 3 l 1 -9 M 4 2 l 4 -7" />
        <path d={`M -14 ${-14 + wob} l -8 -4`} /><path d={`M -10 ${-22 + wob} l -4 -8`} />
      </g>, 4, -8)
    case 'speed': return g(
      <g stroke={TICK} strokeWidth={3} strokeLinecap="round">
        {[0, 1, 2].map(i => {
          const s = (k * 4 + i / 3) % 1
          return <path key={i} d={`M ${-4 - s * 26} ${-16 + i * 14} l ${-14 + s * 6} 0`} opacity={1 - s} />
        })}
      </g>, 0, -6)
    case 'zzz': return g(
      <g fill={TICK} fontFamily="system-ui, sans-serif" fontWeight={800}>
        {[0, 1, 2].map(i => {
          const s = (k * 2 + i / 3) % 1
          return <text key={i} x={6 + s * 16} y={-8 - s * 22} fontSize={8 + s * 8} opacity={1 - s}>z</text>
        })}
      </g>, 4, 0)
    case 'hearts': return g(
      <g>
        {ticks}
        <path transform={`translate(${-30} ${-16 + wob}) scale(.5)`} d="M22 36 C 6 24 2 16 6 9 C 10 3 18 4 22 11 C 26 4 34 3 38 9 C 42 16 38 24 22 36 Z" fill="#C4607A" />
      </g>, 30, 6)
  }
}

// ─── backdrop ───────────────────────────────────────────────────────────────
function Ground({ kind, cx = 110, rx = 96 }: { kind: 'shadow' | 'pedestal' | 'none'; cx?: number; rx?: number }) {
  if (kind === 'none') return null
  return (
    <>
      {kind === 'pedestal' && <ellipse cx={96} cy={150} rx={104} ry={128} transform="rotate(-24 96 150)" fill="#D9DDC6" />}
      <ellipse cx={cx} cy={GROUND + 1} rx={rx} ry={8} fill={kind === 'pedestal' ? '#C1C5A2' : 'rgba(40,30,20,.16)'} />
    </>
  )
}

// ─── timeline ───────────────────────────────────────────────────────────────
function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Drives the action with rAF; returns elapsed ms or null when idle. */
function useActionClock(anim: string, live: boolean) {
  const [ms, setMs] = useState<number | null>(null)
  const raf = useRef(0)
  useEffect(() => {
    const def = HORSE_ANIMATIONS.find(a => a.id === anim)
    if (!def || !live) { setMs(null); return }
    const start = performance.now()
    const tick = (now: number) => {
      const e = now - start
      if (e >= def.ms) { setMs(null); return }
      setMs(e)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [anim, live])
  return ms
}

// ─── PUBLIC COMPONENT ───────────────────────────────────────────────────────
export interface HorseFigureProps {
  coat: HorseCoat
  /** Current action animation id (see HORSE_ANIMATIONS) or 'idle'. */
  anim?: string
  /** Enables idle loops (breathing, tail, blink) and actions. */
  live?: boolean
  /** 'pedestal' = pale green backdrop blob + ground ellipse (stage), 'shadow' = ground ellipse only. */
  ground?: 'shadow' | 'pedestal' | 'none'
  viewBox?: string
  className?: string
  style?: CSSProperties
  /** Static pose to draw when no action is playing (default 'stand'). */
  pose?: PoseName
  /** Icon mode: simplified drawing with a bolder outline (tiles). */
  icon?: boolean
}

interface Layer { art: PoseArt; op: number; m: Motion; key: string }

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

export function HorseFigure({
  coat, anim = 'idle', live = false, ground = 'shadow',
  viewBox = HORSE_VIEWBOX, className, style, pose: poseName = 'stand', icon = false,
}: HorseFigureProps) {
  const uid = 'hz' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const ready = usePoseArts(!icon)
  const ms = useActionClock(anim, live && ready)
  const reduced = prefersReducedMotion()
  const def = ms === null ? undefined : HORSE_ANIMATIONS.find(a => a.id === anim)

  const stand = (!icon && getPoseArt('stand')) || ICON_ART
  const still = (!icon && poseName !== 'stand' && getPoseArt(poseName)) || stand
  const layers: Layer[] = def && ms !== null
    ? actionLayers(def, ms, stand, getPoseArt(def.pose) ?? stand, reduced)
    : [{ art: still, op: 1, m: {}, key: 's' }]
  const idle = live && !def && !reduced && !icon
  const t = def && ms !== null ? ms / def.ms : 0
  const main = layers[layers.length - 1]
  const lift = main.m.dy ?? 0

  return (
    <svg viewBox={viewBox} className={className} style={{ display: 'block', overflow: 'visible', ...style }}
         preserveAspectRatio="xMidYMid meet" role="img" aria-label="Caballo">
      <Ground kind={ground} rx={Math.max(60, Math.min(120, main.art.box[2] * 0.48)) * (1 + Math.min(0, lift) / 40)}
              cx={main.art.box[0] + main.art.box[2] * 0.5} />
      {idle ? (
        // breathing: slow vertical swell anchored on the ground line
        <g transform={`translate(110 ${GROUND})`}>
          <g>
            <animateTransform attributeName="transform" type="scale" dur="3.6s" repeatCount="indefinite"
              calcMode="spline" keyTimes="0;0.5;1" keySplines=".45 0 .55 1;.45 0 .55 1" values="1 1;1.004 1.011;1 1" />
            <g transform={`translate(-110 ${-GROUND})`}>
              <ArtView art={stand} coat={coat} uid={uid + 's'} idle />
            </g>
          </g>
        </g>
      ) : layers.map(l => (
        <g key={l.key} transform={xform(l.m, l.art)} opacity={l.op < 1 ? l.op.toFixed(3) : undefined}>
          <ArtView art={l.art} coat={coat} uid={uid + l.key} icon={icon} rot={l.m.parts} />
        </g>
      ))}
      {def?.emotes?.map((e, i) => {
        const a = main.art.anchors[e.at]
        return <Emote key={i} e={e} t={t} at={[a[0] + (main.m.dx ?? 0), a[1] + lift]} />
      })}
    </svg>
  )
}

/** Render helper for previews/tests: a given drawing + motion, no clock. */
export function HorseArtStatic({ coat, art, motion = {}, ground = 'pedestal', viewBox = HORSE_VIEWBOX, style, icon = false, emote, layers }: {
  coat: HorseCoat; art: PoseArt; motion?: Motion; ground?: 'shadow' | 'pedestal' | 'none'; viewBox?: string
  style?: CSSProperties; icon?: boolean; emote?: { e: EmoteDef; t: number }; layers?: Layer[]
}) {
  const uid = 'hzs' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const ls = layers ?? [{ art, op: 1, m: motion, key: 's' }]
  const main = ls[ls.length - 1]
  return (
    <svg viewBox={viewBox} style={{ display: 'block', ...style }}>
      <Ground kind={ground} rx={Math.max(60, Math.min(120, main.art.box[2] * 0.48))} cx={main.art.box[0] + main.art.box[2] * 0.5} />
      {ls.map(l => (
        <g key={l.key} transform={xform(l.m, l.art)} opacity={l.op < 1 ? l.op.toFixed(3) : undefined}>
          <ArtView art={l.art} coat={coat} uid={uid + l.key} icon={icon} rot={l.m.parts} />
        </g>
      ))}
      {emote && <Emote e={emote.e} t={emote.t} at={main.art.anchors[emote.e.at]} />}
    </svg>
  )
}
