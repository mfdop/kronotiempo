import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { HorseCoat } from './horseCoat'
import { HORSE_ANIMATIONS, type EmoteDef, type Motion } from './horseAnimations'
import { ArtView } from './horseArt'
import { ICON_ART, getPoseArt, usePoseArts, type PoseName } from './art'
import type { PoseArt, V2 } from './art/types'
import { GROUND, actionLayers, xform, type Layer } from './horseTimeline'

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

export const HORSE_VIEWBOX = '-14 4 248 300'
const TICK = '#9DAF7E'

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
function Ground({ kind, cx = 110, rx = 96, circleInk, groundInk }: { kind: 'shadow' | 'pedestal' | 'none'; cx?: number; rx?: number; circleInk?: string | null; groundInk?: string | null }) {
  if (kind === 'none') return null
  return (
    <>
      {kind === 'pedestal' && <ellipse cx={96} cy={150} rx={104} ry={128} transform="rotate(-24 96 150)" fill={circleInk ?? '#D9DDC6'} />}
      <ellipse cx={cx} cy={GROUND + 1} rx={rx} ry={8} fill={groundInk ?? (kind === 'pedestal' ? '#C1C5A2' : 'rgba(40,30,20,.16)')} />
    </>
  )
}

// ─── timeline ───────────────────────────────────────────────────────────────
function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Drives the action with rAF; returns elapsed ms or null when idle. */
function useActionClock(anim: string, live: boolean) {
  const [st, setSt] = useState<{ anim: string; ms: number } | null>(null)
  const raf = useRef(0)
  useEffect(() => {
    const def = HORSE_ANIMATIONS.find(a => a.id === anim)
    if (!def || !live) return
    const start = performance.now()
    const tick = (now: number) => {
      const e = Math.max(0, now - start)
      if (e >= def.ms) { setSt(null); return }
      setSt({ anim, ms: e })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [anim, live])
  return live && st && st.anim === anim ? st.ms : null
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
  /** Custom backdrop circle / ground ellipse colours (null = default tones). */
  circleInk?: string | null
  groundInk?: string | null
  viewBox?: string
  className?: string
  style?: CSSProperties
  /** Static pose to draw when no action is playing (default 'stand'). */
  pose?: PoseName
  /** Icon mode: simplified drawing with a bolder outline (tiles). */
  icon?: boolean
}

export function HorseFigure({
  coat, anim = 'idle', live = false, ground = 'shadow', circleInk, groundInk,
  viewBox = HORSE_VIEWBOX, className, style, pose: poseName = 'stand', icon = false,
}: HorseFigureProps) {
  const uid = 'hz' + useId().replace(/[^a-zA-Z0-9]/g, '')
  // Static tiles only need the standing pose; live figures also need the action poses.
  const ready = usePoseArts(!icon, live ? undefined : [poseName])
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
      <Ground kind={ground} circleInk={circleInk} groundInk={groundInk} rx={Math.max(60, Math.min(120, main.art.box[2] * 0.48)) * (1 + Math.min(0, lift) / 40)}
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
export function HorseArtStatic({ coat, art, motion = {}, ground = 'pedestal', viewBox = HORSE_VIEWBOX, style, icon = false, emote, layers, circleInk, groundInk }: {
  circleInk?: string | null; groundInk?: string | null
  coat: HorseCoat; art: PoseArt; motion?: Motion; ground?: 'shadow' | 'pedestal' | 'none'; viewBox?: string
  style?: CSSProperties; icon?: boolean; emote?: { e: EmoteDef; t: number }; layers?: Layer[]
}) {
  const uid = 'hzs' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const ls = layers ?? [{ art, op: 1, m: motion, key: 's' }]
  const main = ls[ls.length - 1]
  return (
    <svg viewBox={viewBox} style={{ display: 'block', ...style }}>
      <Ground kind={ground} circleInk={circleInk} groundInk={groundInk} rx={Math.max(60, Math.min(120, main.art.box[2] * 0.48))} cx={main.art.box[0] + main.art.box[2] * 0.5} />
      {ls.map(l => (
        <g key={l.key} transform={xform(l.m, l.art)} opacity={l.op < 1 ? l.op.toFixed(3) : undefined}>
          <ArtView art={l.art} coat={coat} uid={uid + l.key} icon={icon} rot={l.m.parts} />
        </g>
      ))}
      {emote && <Emote e={emote.e} t={emote.t} at={main.art.anchors[emote.e.at]} />}
    </svg>
  )
}
