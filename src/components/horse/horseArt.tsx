import type { ReactNode } from 'react'
import type { HorseCoat } from './horseCoat'
import { mix, palette, type Pal } from './horsePalette'
import type { ArtGroup, PoseArt } from './art/types'

/* ════════════════════════════════════════════════════════════════════════════
 * Renderer for the traced horse artwork (see art/types.ts).
 *
 * Layer stack per group (bottom → top):
 *   base (coat colour) → coat pattern, clipped to the silhouette
 *   (pío patches / appaloosa blanket / leopard spots / careto / cuatroalbo)
 *   → highlight + 4 translucent shading bands (so spots get shaded too)
 *   → mane/tail/face hair in 4 tones → hooves → ink lines.
 * Spots and pinto patches are generated here from compact seeds so they can
 * be irregular, painterly blobs without bloating the bundle.
 * ══════════════════════════════════════════════════════════════════════════ */

// ─── procedural blobs (path units = figure units × 5) ───────────────────────
function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

/** Irregular closed blob through k jittered polar points (Catmull-Rom → cubic). */
function blob(rand: () => number, cx: number, cy: number, r: number, k = 9, wob = 1) {
  const ph = [rand() * 6.3, rand() * 6.3, rand() * 6.3]
  const am = [(0.1 + rand() * 0.12) * wob, (0.06 + rand() * 0.1) * wob, (0.04 + rand() * 0.06) * wob]
  const sx = 0.8 + rand() * 0.45, rot = rand() * 6.3, cr = Math.cos(rot), sr = Math.sin(rot)
  const p: [number, number][] = []
  for (let j = 0; j < k; j++) {
    const th = (j / k) * Math.PI * 2
    const rr = r * (1 + am[0] * Math.sin(2 * th + ph[0]) + am[1] * Math.sin(3 * th + ph[1]) + am[2] * Math.sin(5 * th + ph[2])) * (0.9 + rand() * 0.2)
    const x = Math.cos(th) * rr * sx, y = (Math.sin(th) * rr) / sx
    p.push([(cx + x * cr - y * sr) * 5, (cy + x * sr + y * cr) * 5])
  }
  const f = (v: number) => Math.round(v)
  let d = `M${f(p[0][0])} ${f(p[0][1])}`
  for (let j = 0; j < k; j++) {
    const p0 = p[(j - 1 + k) % k], p1 = p[j], p2 = p[(j + 1) % k], p3 = p[(j + 2) % k]
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d + 'Z'
}

const spotCache = new WeakMap<number[], { outer: string; core: string }>()
/** Leopard spots: each seed becomes a clustered, lobed blotch (+ freckles). */
function spotPaths(seeds: number[], salt: number) {
  let v = spotCache.get(seeds)
  if (!v) {
    const rand = rng(1234 + salt * 7919)
    let outer = '', core = ''
    for (let i = 0; i < seeds.length; i += 3) {
      const x = seeds[i], y = seeds[i + 1], r = seeds[i + 2]
      outer += blob(rand, x, y, r * 0.86)
      const n = r > 1.8 ? 1 + Math.floor(rand() * 3) : 0
      for (let q = 0; q < n; q++) {
        const a = rand() * 6.3, dd = r * (0.38 + rand() * 0.32)
        outer += blob(rand, x + Math.cos(a) * dd, y + Math.sin(a) * dd * 1.2, r * (0.42 + rand() * 0.26), 7)
      }
      if (r > 2.6 && rand() < 0.5) {
        const a = rand() * 6.3
        outer += blob(rand, x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4, r * (0.18 + rand() * 0.14), 6)
      }
      if (r > 1.6) core += blob(rand, x + (rand() - 0.5) * r * 0.4, y + (rand() - 0.5) * r * 0.4, r * 0.5, 7, 1.4)
    }
    v = { outer, core }
    spotCache.set(seeds, v)
  }
  return v
}

const pioCache = new WeakMap<number[], string>()
function pioPath(seeds: number[]) {
  let d = pioCache.get(seeds)
  if (d === undefined) {
    const rand = rng(77)
    d = ''
    for (let i = 0; i < seeds.length; i += 3) {
      d += blob(rand, seeds[i], seeds[i + 1], seeds[i + 2], 12, 1.8)
      d += blob(rand, seeds[i] + (rand() - 0.5) * seeds[i + 2], seeds[i + 1] + (rand() - 0.5) * seeds[i + 2], seeds[i + 2] * 0.7, 9, 1.6)
    }
    pioCache.set(seeds, d)
  }
  return d
}

// ─── rendering ──────────────────────────────────────────────────────────────
/** Draw order of groups: parts behind the body first. */
const Z: Record<string, number> = { tail: 0, earF: 1, body: 2, mane: 3, hind: 4, fore: 5, earN: 6 }

export interface ArtViewProps {
  art: PoseArt
  coat: HorseCoat
  uid: string
  /** Tiles: bolder outline, no fine tones. */
  icon?: boolean
  /** Extra rotation (deg) per group id around its pivot. */
  rot?: Record<string, number>
  /** Run the idle loops (tail/mane sway, ear flick, blink) with SMIL. */
  idle?: boolean
}

const SWAY: Record<string, { values: number[]; dur: number; begin?: number }> = {
  tail: { values: [0, 3.5, 2, -2.5, 0], dur: 4.4 },
  mane: { values: [0, 1.1, 0, -0.8, 0], dur: 5.6 },
  earN: { values: [0, 0, -14, 6, 0, 0], dur: 7 },
  earF: { values: [0, 0, -12, 5, 0, 0], dur: 7, begin: -2.3 },
}

function Group({ g, art, coat, pal, uid, icon, angle, idle }: {
  g: ArtGroup; art: PoseArt; coat: HorseCoat; pal: Pal; uid: string; icon: boolean; angle: number; idle: boolean
}) {
  const L = g.L, M = g.M ?? {}
  const cid = `${uid}-${g.id}`
  const seeds = art.spots[g.id]
  const pat = coat.pattern
  // appaloosa (manta) shows spots only inside its blanket
  const showSpots = !!seeds?.length && (pat === 'leopardo' || (pat === 'appaloosa' && !!M.manta))
  const sp = showSpots ? spotPaths(seeds!, g.id.length + art.name.length * 3) : null
  const pio = pat === 'pio' && g.id === 'body' && art.pio.length ? pioPath(art.pio) : ''
  const manta = pat === 'appaloosa' ? M.manta : undefined
  const blaze = coat.careto ? M.blaze : undefined
  const socks = coat.cuatroalbo ? M.socks : undefined
  const patterned = !!(sp || pio)

  const spotEls = sp && (
    <>
      <path d={sp.outer} fill={pal.spot} opacity={0.92} fillRule="nonzero" />
      {!icon && <path d={sp.core} fill={pal.spotCore} opacity={0.22} fillRule="nonzero" />}
    </>
  )

  let body: ReactNode = (
    <g transform="scale(.2)" fillRule="evenodd">
      {patterned && (
        <defs>
          <clipPath id={cid}><path d={L.base} clipRule="evenodd" /></clipPath>
          {manta && <clipPath id={cid + 'm'}><path d={manta} clipRule="evenodd" /></clipPath>}
        </defs>
      )}
      <path d={L.base} fill={pal.coat} />
      {patterned && (
        <g clipPath={`url(#${cid})`}>
          {pio && <path d={pio} fill={pal.white} fillRule="nonzero" />}
          {manta ? <><path d={manta} fill={pal.white} /><g clipPath={`url(#${cid}m)`}>{spotEls}</g></> : spotEls}
        </g>
      )}
      {L.hi && <path d={L.hi} fill="#FFFFFF" opacity={pal.hiOp} />}
      {(['sh1', 'sh2', 'sh3', 'sh4'] as const).map(k => L[k] && <path key={k} d={L[k]} fill={pal.shade} opacity={icon ? pal.shadeOp * 1.6 : pal.shadeOp} />)}
      {L.hair && <path d={L.hair} fill={pal.hair} />}
      {L.hairD && <path d={L.hairD} fill={pal.hairD} />}
      {L.hairL && <path d={L.hairL} fill={pal.hairL} />}
      {L.hairLL && <path d={L.hairLL} fill={pal.hairLL} />}
      {/* white markings sit on top of the dark face / leg points */}
      {blaze && <path d={blaze} fill={pal.white} />}
      {socks && <path d={socks} fill={pal.white} />}
      {L.hoof && <path d={L.hoof} fill={pal.hoof} />}
      {L.hoofL && <path d={L.hoofL} fill={pal.hoofL} />}
      {icon && <path d={L.base} fill="none" stroke={pal.line} strokeWidth={26} strokeLinejoin="round" />}
      {L.ink && <path d={L.ink} fill={pal.line} />}
    </g>
  )
  const pv = g.pivot
  if (pv && idle && SWAY[g.id]) {
    const s = SWAY[g.id]
    body = (
      <g>
        <animateTransform attributeName="transform" type="rotate" dur={`${s.dur}s`} repeatCount="indefinite"
          begin={`${s.begin ?? 0}s`} calcMode="spline"
          keyTimes={s.values.map((_, i) => (i / (s.values.length - 1)).toFixed(3)).join(';')}
          keySplines={s.values.slice(1).map(() => '.45 0 .55 1').join(';')}
          values={s.values.map(v => `${v} ${pv[0]} ${pv[1]}`).join(';')} />
        {body}
      </g>
    )
  }
  if (pv && angle) body = <g transform={`rotate(${angle.toFixed(2)} ${pv[0]} ${pv[1]})`}>{body}</g>
  return body
}

/** All groups of one traced pose (no wrapper svg). */
export function ArtView({ art, coat, uid, icon = false, rot, idle = false }: ArtViewProps) {
  const pal = palette(coat)
  const groups = [...art.groups].sort((a, b) => (Z[a.id] ?? 2) - (Z[b.id] ?? 2))
  const eye = art.eye
  return (
    <>
      {groups.map(g => (
        <Group key={g.id} g={g} art={art} coat={coat} pal={pal} uid={uid} icon={icon} angle={rot?.[g.id] ?? 0} idle={idle} />
      ))}
      {eye && !icon && (
        <g fill="#FFFFFF">
          <circle cx={eye.c[0] + eye.r * 0.3} cy={eye.c[1] - eye.r * 0.28} r={eye.r * 0.3} />
          <circle cx={eye.c[0] - eye.r * 0.3} cy={eye.c[1] + eye.r * 0.3} r={eye.r * 0.13} opacity={0.8} />
        </g>
      )}
      {eye && idle && (
        // blink: an eyelid that drops over the eye for a moment
        <g transform={`translate(${eye.c[0]} ${eye.c[1] - eye.r * 1.25})`}>
          <g>
            <animateTransform attributeName="transform" type="scale" dur="5.2s" repeatCount="indefinite"
              keyTimes="0;0.93;0.955;0.98;1" values="1 0;1 0;1 1;1 0;1 0" />
            <path d={`M${-eye.r * 1.5} 0 C${-eye.r * 1.5} ${eye.r * 2.9} ${eye.r * 1.6} ${eye.r * 2.9} ${eye.r * 1.6} 0 Z`}
              fill={mix(pal.coat, pal.hair, 0.25)} stroke={pal.line} strokeWidth={0.7} />
          </g>
        </g>
      )}
    </>
  )
}
