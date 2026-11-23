import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { HORSE_ANIMATIONS, HORSE_CSS, type EmoteDef } from './horseAnimations'
import type { HorseCoat } from './horseCoat'
import {
  GROUND, POSES, TORSO, TORSO_LINE, TORSO_SHADE, TORSO_LINES, MANTA, add, rot, sub,
  buildTube, lerpPose, solve, solveNamed, tubePt, tubeRegion, tubeSide,
  type LegRig, type Pose, type PoseName, type Rig, type Tube, type V,
} from './horseRig'
import {
  palette, mantaSpot, mix, scatter, Spot, tubeScatter, TubeSpots, Sock, blob, tubeBlob, type Pal,
} from './horseCoatArt'

/* ════════════════════════════════════════════════════════════════════════════
 * HORSE FIGURE — storybook-style horse (ink outline + cel shading), SVG.
 *
 * Side view is a parametric rig (horseRig.ts) so every pose can tween into
 * any other; the front view ("De frente") is its own drawing, crossfaded in
 * via `pose.front`. Coat markings are clipped to each body part.
 * ══════════════════════════════════════════════════════════════════════════ */

// ─── static head art (stand-world coords, pivot HEAD_C) ─────────────────────
const HEAD =
  'M 158 52 C 160 43 167 37 176 37 C 182 37 187 40 191 44 C 197 51 203 63 208 75 ' +
  'C 210 80 213 84 213 89 C 213 95 210 98.5 205.5 99.5 C 201.5 100.5 197.5 100 194.5 98 ' +
  'C 189 95 184 92.5 178 90.5 C 171 88 166 82 163 75 C 160 68 157 60 158 52 Z'
const HEAD_LINE =
  'M 166 39.5 C 169 37.8 172 37 176 37 C 182 37 187 40 191 44 C 197 51 203 63 208 75 ' +
  'C 210 80 213 84 213 89 C 213 95 210 98.5 205.5 99.5 C 201.5 100.5 197.5 100 194.5 98 ' +
  'C 189 95 184 92.5 178 90.5 C 171 88 166 82 163 75'
const CHEEK = 'M 164.5 62 C 164 72 168 81 177 87.5'
const MUZZLE = 'M 186 42 C 196 49 206 62 216 86 L 217 106 L 188 106 C 184 98 179 90 183 80 C 186 70 188 58 186 42 Z'
const CARETO =
  'M 181.5 43.5 C 185 41 190 43 192.5 47 C 196.5 55 202 66 206.5 77 C 208.5 82 211.5 85.5 215 89 L 215 99 ' +
  'C 209.5 97 205.5 92.5 203.5 87 C 199 76.5 193 66 186.5 57 C 183.5 53 181 48.5 181.5 43.5 Z'
const EAR_N = 'M 162 47 C 160.8 40 163.8 32 168.5 25.5 C 172.6 32 175.2 39 173.5 45 Z'
const EAR_N_IN = 'M 164.8 43.5 C 164.4 38 166.1 33 168.6 29.4 C 170.8 33.6 172.1 38 171.2 42.5 Z'
const EAR_F = 'M 179 41 C 179.6 34 182.6 29 186.8 24.6 C 189.3 30.4 190.3 36 188.5 42 Z'
const EAR_F_IN = 'M 181.5 39 C 182.1 34.4 184.1 30.6 186.6 28.4 C 187.9 32 188.5 36 187.4 39.5 Z'
const FORELOCK =
  'M 168 42 C 172 36 180 35 186 39 C 189 41.5 191 45 191.5 49.5 C 189.5 46.8 187.5 45.2 185.5 44.8 ' +
  'C 186.5 47.8 186.3 50.8 185 53.4 C 183.5 49.2 181.5 46.6 178.5 45.4 C 178.6 47.4 177.8 49.2 176.5 50.4 ' +
  'C 175.6 46.6 172.5 43.6 168 42 Z'
const EYE_C: V = [179.6, 60.6]
const EYE = 'M 175.4 60.8 C 176.3 57.6 180.3 56.4 183.3 58.8 C 184.3 60.8 183.1 63.9 180 64.3 C 177.5 64.5 175.7 62.8 175.4 60.8 Z'
const EYELID = 'M 174.3 59.8 C 175.9 56 181.1 55 184.5 57.8'
const LASH = 'M 175.3 57.9 L 173.7 56.7 M 176.9 56.6 L 176 55'
const NOSTRIL = 'M 206 85.5 C 202.6 86 201.4 90.2 203.6 92.6'
const MOUTH = 'M 195.5 97.6 C 199.3 98.8 203.1 98.4 206.3 96.6'
const JAW_PIVOT: V = [184, 91]
const JAW = 'M 181 90 C 187 93 193 96.5 198 98 C 201.5 99 204.5 99 207 98.5 C 208.5 101.5 205 105 199.5 104.5 C 192.5 104 186.5 100 180 95 Z'

const HEAD_SPOTS = scatter(37, [160, 40, 200, 92], 9, 1.8, 3.6,
  (x, y) => Math.hypot(x - 178.5, y - 58.5) > 8 && x < 160 + (y - 40) * 0.55 + 22 && !(x > 186 && y > 70))

// ─── torso coat layouts (torso-local) ───────────────────────────────────────
const TORSO_SPOTS = scatter(11, [30, 102, 182, 186], 44, 3.6, 8.4)
const MANTA_SPOTS = scatter(61, [30, 108, 100, 176], 16, 2.6, 5,
  (x, y) => x < 104 - (y - 104) * 0.35)
const PIO_TORSO = [blob(5, 104, 160, 36, 20), blob(9, 52, 136, 13, 15), blob(3, 160, 128, 12, 15)]

// tube spot layouts
const NECK_SPOTS = tubeScatter(23, 14, 0.02, 0.98, 0.2, 0.32)
const LEG_SPOTS = {
  fn: tubeScatter(41, 8, 0.12, 0.9, 0.5, 0.72), ff: tubeScatter(43, 7, 0.12, 0.9, 0.5, 0.72),
  hn: tubeScatter(53, 9, 0.18, 0.9, 0.42, 0.66), hf: tubeScatter(59, 8, 0.18, 0.9, 0.42, 0.66),
}

// ─── backdrop ───────────────────────────────────────────────────────────────
const BACKDROP =
  'M 18 124 C 34 82 104 60 156 76 C 200 90 204 150 194 192 C 184 236 124 254 70 242 C 22 230 2 168 18 124 Z'

interface Ctx { coat: HorseCoat; p: Pal; uid: string; icon: boolean }

/** Fill + clipped content + outline for a closed shape. */
function Skin({ id, d, ctx, line, children, fill, strokeW }: {
  id: string; d: string; ctx: Ctx; line?: string | null; children?: ReactNode; fill?: string; strokeW?: number
}) {
  const clip = `${ctx.uid}-${id}`
  const sw = (strokeW ?? 1.5) * (ctx.icon ? 2.3 : 1)
  return (
    <>
      <clipPath id={clip}><path d={d} /></clipPath>
      <path d={d} fill={fill ?? ctx.p.coat} />
      {children && <g clipPath={`url(#${clip})`}>{children}</g>}
      {line !== null && (
        <path d={line ?? d} fill="none" stroke={ctx.p.line} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
      )}
    </>
  )
}

// ─── legs ───────────────────────────────────────────────────────────────────
function Leg({ leg, id, ctx, far, hind }: { leg: LegRig; id: 'fn' | 'ff' | 'hn' | 'hf'; ctx: Ctx; far: boolean; hind: boolean }) {
  const { p, coat } = ctx
  const t = leg.tube
  const d = tubeRegion(t)
  const pat = coat.pattern
  const kneeU = hind ? 0.6 : 0.53
  const sw = 1.5 * (ctx.icon ? 2.3 : 1)
  const g0 = tubePt(t, kneeU + 0.04, 0).p, g1 = tubePt(t, 0.9, 0).p
  return (
    <g>
      <linearGradient id={`${ctx.uid}-${id}-pt`} gradientUnits="userSpaceOnUse" x1={g0[0].toFixed(1)} y1={g0[1].toFixed(1)} x2={g1[0].toFixed(1)} y2={g1[1].toFixed(1)}>
        <stop offset="0" stopColor={p.points} stopOpacity="0" />
        <stop offset="0.55" stopColor={p.points} stopOpacity={ctx.icon ? 0.5 : 0.42} />
        <stop offset="1" stopColor={p.points} stopOpacity={ctx.icon ? 0.8 : 0.7} />
      </linearGradient>
      <Skin id={id} d={d} ctx={ctx} line={null}>
        {pat === 'leopardo' && !ctx.icon && <TubeSpots tube={t} list={LEG_SPOTS[id]} fill={p.spot} />}
        {pat === 'leopardo' && ctx.icon && <TubeSpots tube={t} list={LEG_SPOTS[id].slice(0, 3)} fill={p.spot} scale={1.3} />}
        {pat === 'pio' && hind && <path d={tubeBlob(t, 0.2, 0.1, 1.05, 17)} fill={p.patch} />}
        {pat === 'appaloosa' && hind && (
          <>
            <path d={tubeRegion(t, 0, 0.3)} fill={p.white} />
            <path d={blob(id === 'hn' ? 4 : 8, ...tubePt(t, 0.3, 0).p, tubePt(t, 0.3, 0).w * 1.1, tubePt(t, 0.3, 0).w * 0.7)} fill={p.white} />
            <TubeSpots tube={t} list={LEG_SPOTS[id].filter(s => s.u < 0.3)} fill={mantaSpot(coat, p)} />
          </>
        )}
        {far && <path d={d} fill={mix(p.coat, '#5a2c14', 0.42)} opacity={0.55} />}
        {/* dark points on the lower leg (soft gradient towards the fetlock) */}
        <path d={tubeRegion(t, kneeU, 1)} fill={`url(#${ctx.uid}-${id}-pt)`} />
        {coat.cuatroalbo && <Sock tube={t} u0={hind ? 0.77 : 0.74} fill={p.white} />}
        {/* cel shading: back side band + front highlight */}
        <path d={tubeRegion(t, 0, 1, 0.45, 1.05)} fill={p.shade} opacity={0.4} />
      </Skin>
      <path d={tubeSide(t, 1, leg.spec.stroke[0], 1)} fill="none" stroke={p.line} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d={tubeSide(t, -1, leg.spec.stroke[1], 1)} fill="none" stroke={p.line} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      <path d={leg.hoof.path} fill={far ? mix(p.hoof, '#000', 0.2) : p.hoof} stroke={p.line} strokeWidth={sw * 0.9} strokeLinejoin="round" />
            {!ctx.icon && <path d={leg.hoof.line} stroke={p.hoofHi} strokeWidth={2.2} strokeLinecap="round" opacity={0.8} />}
    </g>
  )
}

// ─── head ───────────────────────────────────────────────────────────────────
function Head({ rig, pose, ctx }: { rig: Rig; pose: Pose; ctx: Ctx }) {
  const { p, coat, uid } = ctx
  const sw = 1.5 * (ctx.icon ? 2.3 : 1)
  const jawDeg = pose.jaw * 24
  const jawT = `rotate(${jawDeg.toFixed(1)} ${JAW_PIVOT[0]} ${JAW_PIVOT[1]})`
  const earT = (b: V) => `rotate(${pose.ears.toFixed(1)} ${b[0]} ${b[1]})`
  const open = pose.jaw > 0.03
  const mouthGap = open ? (() => {
    const r = (q: V) => add(JAW_PIVOT, rot(sub(q, JAW_PIVOT), jawDeg))
    const a = r([198, 98]), b = r([207, 98.5])
    return `M 187 93 L 198 97.5 L 208 97 L ${b[0].toFixed(1)} ${b[1].toFixed(1)} L ${a[0].toFixed(1)} ${a[1].toFixed(1)} Z`
  })() : ''
  return (
    <g transform={rig.head.t}>
      <g className="hz-ear hz-ear-f" transform={earT([184, 41])}>
        <path d={EAR_F} fill={mix(p.coat, '#000', 0.15)} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
        {!ctx.icon && <path d={EAR_F_IN} fill={p.earIn} />}
      </g>
      {open && (
        <g transform={jawT}>
          <path d={JAW} fill={p.coat} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
          <path d={JAW} fill={p.points} opacity={0.75} />
          {coat.careto && <path d={JAW} fill={p.white} opacity={0.9} />}
        </g>
      )}
      <Skin id="head" d={HEAD} ctx={ctx} line={HEAD_LINE}>
        {coat.pattern === 'leopardo' && HEAD_SPOTS.slice(0, ctx.icon ? 3 : 9).map((s, i) =>
          <Spot key={i} at={[s.x, s.y]} r={s.r * (ctx.icon ? 1.4 : 1)} seed={s.seed} fill={p.spot} />)}
        <path d={MUZZLE} fill={`url(#${uid}-muz)`} />
        {coat.careto && <path d={CARETO} fill={p.white} />}
        <path d="M 172 88 C 184 93 194 98 206 100 L 206 108 L 168 108 Z" fill={p.shade} opacity={0.45} />
        {!ctx.icon && <path d="M 176 39 C 184 39 190 44 194 50 C 188 47 182 45 176 44 Z" fill={p.hl} opacity={0.6} />}
      </Skin>
      {open && <path d={mouthGap} fill="#3a1a18" stroke={p.line} strokeWidth={sw * 0.7} strokeLinejoin="round" />}
      {!ctx.icon && <path d={CHEEK} fill="none" stroke={p.line} strokeWidth={1.3} strokeLinecap="round" />}
      <path d={NOSTRIL} fill="none" stroke={coat.careto ? '#6e5448' : p.line} strokeWidth={ctx.icon ? 3 : 2} strokeLinecap="round" />
      {!ctx.icon && !open && <path d={MOUTH} fill="none" stroke={p.line} strokeWidth={1.1} strokeLinecap="round" />}
      <g className="hz-eye">
        <g transform={`translate(${EYE_C[0]} ${EYE_C[1]}) scale(0.88 ${(0.88 * (1 - pose.sleepy * 0.85)).toFixed(2)}) translate(${-EYE_C[0]} ${-EYE_C[1]})`}>
          <path d={EYE} fill={p.eye} />
          {!ctx.icon && <circle cx="181.2" cy="59.4" r="1.05" fill="#fff" />}
          {!ctx.icon && <circle cx="178.1" cy="62.6" r="0.45" fill="#fff" opacity="0.7" />}
        </g>
      </g>
      <path d={pose.sleepy > 0.4 ? 'M 174.6 61.2 C 177.1 63.7 181.6 64 184.5 61.2' : EYELID} fill="none" stroke={p.line} strokeWidth={ctx.icon ? 2.4 : 1.3} strokeLinecap="round" />
      {!ctx.icon && pose.sleepy <= 0.4 && <path d={LASH} stroke={p.line} strokeWidth={0.9} strokeLinecap="round" />}
      <g className="hz-ear hz-ear-n" transform={earT([168, 45])}>
        <path d={EAR_N} fill={p.coat} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
        {!ctx.icon && <path d={EAR_N_IN} fill={p.earIn} />}
      </g>
      <path d={FORELOCK} fill={p.mane} stroke={p.line} strokeWidth={sw * 0.8} strokeLinejoin="round" />
      {!ctx.icon && <path d="M 173 40.5 C 179 38.5 184 40.5 188 45 M 179 42.5 C 182 45 183.5 48 184 51" fill="none" stroke={p.maneHi} strokeWidth={1} strokeLinecap="round" />}
    </g>
  )
}

// ─── side view ──────────────────────────────────────────────────────────────
function SideHorse({ rig, pose, ctx }: { rig: Rig; pose: Pose; ctx: Ctx }) {
  const { p, coat } = ctx
  const pat = coat.pattern
  const sw = 1.5 * (ctx.icon ? 2.3 : 1)
  const neck: Tube = rig.neck
  const L = rig.legs
  const nearLegs = (
    <>
      <Leg leg={L.hn} id="hn" ctx={ctx} far={false} hind />
      <Leg leg={L.fn} id="fn" ctx={ctx} far={false} hind={false} />
    </>
  )
  return (
    <g transform={`translate(0 ${rig.dy.toFixed(1)})`}>
      <Leg leg={L.hf} id="hf" ctx={ctx} far hind />
      <Leg leg={L.ff} id="ff" ctx={ctx} far hind={false} />

      {/* tail */}
      <g className="hz-tailsway">
        <path d={rig.tail.locks} fill={p.mane} stroke={p.line} strokeWidth={sw * 0.9} strokeLinejoin="round" />
        <path d={rig.tail.path} fill={p.mane} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
        {!ctx.icon && rig.tail.strands.map((s, i) =>
          <path key={i} d={s} fill="none" stroke={i === 2 ? p.maneLo : p.maneHi} strokeWidth={i === 2 ? 1.6 : 2} strokeLinecap="round" opacity={0.75} />)}
      </g>

      {pose.legsFront <= 0.5 && nearLegs}

      {/* neck (base tucked under the torso) */}
      <Skin id="neck" d={tubeRegion(neck)} ctx={ctx} line={null}>
        {pat === 'leopardo' && <TubeSpots tube={neck} list={ctx.icon ? NECK_SPOTS.slice(0, 4) : NECK_SPOTS} fill={p.spot} scale={ctx.icon ? 1.3 : 1} />}
        {pat === 'pio' && <path d={tubeBlob(neck, 0.42, 0.15, 0.85, 13)} fill={p.patch} />}
        <path d={tubeRegion(neck, 0.3, 1, 0.72, 1.05)} fill={p.shade} opacity={0.4} />
        <path d={tubeRegion(neck, 0.3, 1, -1.05, -0.7)} fill={p.shade} opacity={0.4} />
      </Skin>
      <path d={tubeSide(neck, 1, 0.12, 1)} fill="none" stroke={p.line} strokeWidth={sw} strokeLinecap="round" />

      {/* torso */}
      <g transform={rig.torsoT}>
        <g className="hz-breathe">
          <Skin id="torso" d={TORSO} ctx={ctx} line={TORSO_LINE}>
            {pat === 'leopardo' && TORSO_SPOTS.slice(0, ctx.icon ? 12 : 99).map((s, i) =>
              <Spot key={i} at={[s.x, s.y]} r={s.r * (ctx.icon ? 1.35 : 1)} seed={s.seed} fill={p.spot} />)}
            {pat === 'pio' && PIO_TORSO.map((d, i) => <path key={i} d={d} fill={p.patch} />)}
            {pat === 'appaloosa' && (
              <>
                <path d={MANTA} fill={p.white} />
                {MANTA_SPOTS.slice(0, ctx.icon ? 6 : 99).map((s, i) =>
                  <Spot key={i} at={[s.x, s.y]} r={s.r * (ctx.icon ? 1.4 : 1)} seed={s.seed} fill={mantaSpot(coat, p)} />)}
              </>
            )}
            <path d={TORSO_SHADE} fill={p.shade} opacity={0.55} />
          </Skin>
          {!ctx.icon && <path d={TORSO_LINES} fill="none" stroke={p.line} strokeWidth={1.1} strokeLinecap="round" />}
        </g>
      </g>

      {pose.legsFront > 0.5 && nearLegs}

      {/* mane */}
      <g className="hz-manesway">
        <path d={rig.mane.path} fill={p.mane} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
        {!ctx.icon && rig.mane.strands.map((s, i) =>
          <path key={i} d={s} fill="none" stroke={p.maneHi} strokeWidth={1.1} strokeLinecap="round" opacity={0.8} />)}
      </g>

      <Head rig={rig} pose={pose} ctx={ctx} />
    </g>
  )
}

// ─── front view ("De frente") ───────────────────────────────────────────────
const F = {
  body: 'M 86 106 C 74 110 67 124 66 142 C 65 160 69 176 79 187 L 133 187 C 143 176 147 160 146 142 C 145 124 138 110 126 106 Z',
  chest: 'M 84 150 C 92 160 100 165 106 167 C 112 165 120 160 128 150 M 106 170 L 106 184',
  neck: 'M 93 66 C 91 84 89 98 86 112 L 126 112 C 123 98 121 84 119 66 Z',
  head: 'M 106 35 C 96.5 35 90.5 41 90.5 51 C 90.5 60 93 68 96 76 C 98 82 97.5 90 98.5 97.5 C 99.5 103.5 102 106.5 106 106.5 ' +
        'C 110 106.5 112.5 103.5 113.5 97.5 C 114.5 90 114 82 116 76 C 119 68 121.5 60 121.5 51 C 121.5 41 115.5 35 106 35 Z',
  muzzle: 'M 92 80 C 100 76 112 76 120 80 L 120 110 L 92 110 Z',
  careto: 'M 103 40 C 101.8 50 103.6 60 103.6 70 C 103.6 80 101.2 90 100.4 100 L 111.6 100 C 110.8 90 108.4 80 108.4 70 C 108.4 60 110.2 50 109 40 Z',
  earL: 'M 96 43 C 93 36 92.6 29.5 94 23 C 98.8 27 101.6 33 102 40 Z',
  earR: 'M 116 43 C 119 36 119.4 29.5 118 23 C 113.2 27 110.4 33 110 40 Z',
  forelock: 'M 97 39 C 101 33 111 33 115 39 C 113.5 44 112 47 110.6 51.5 C 109.6 47.5 108.4 45.5 106.4 44.5 C 104.8 46.5 103.8 49.5 103 53.5 C 101.4 48 99.2 43 97 39 Z',
  mane: 'M 93 46 C 86 60 84 80 85 108 C 86.5 113 89 115 91 113 C 89.5 96 90.5 82 93.5 70 C 95 62 97 54 98 48 Z',
  tail: 'M 72 178 C 64 198 62 224 66 254 C 70 264 76 264 80 256 C 80 228 80 202 82 182 Z',
}
const F_SPOTS = scatter(71, [66, 106, 146, 186], 16, 3, 6, (x, y) => Math.hypot(x - 106, (y - 146) * 0.7) < 42)
const F_HEAD_SPOTS = scatter(73, [90, 44, 122, 84], 6, 1.8, 3.2, (x, y) => Math.abs(x - 106) > 5 && Math.hypot(Math.abs(x - 106) - 11, y - 61) > 6)
const F_NECK_SPOTS = scatter(79, [86, 70, 126, 112], 4, 3, 5)
const F_LEGS = {
  l:  buildTube([[93, 172], [92.5, 220], [93, 270], [93.5, 283]], [[9, 8], [7.4, 7.4], [5.6, 5.6], [4.6, 4.6], [5.4, 5.4], [4.4, 4.4], [5, 5]]),
  r:  buildTube([[119, 172], [119.5, 220], [119, 270], [118.5, 283]], [[8, 9], [7.4, 7.4], [5.6, 5.6], [4.6, 4.6], [5.4, 5.4], [4.4, 4.4], [5, 5]]),
  hl: buildTube([[82, 186], [81, 226], [81, 268], [81, 278]], [[7, 7], [5, 5], [4.4, 4.4], [4.2, 4.2]]),
  hr: buildTube([[109, 188], [108, 226], [107.5, 268], [107.5, 278]], [[7, 7], [5, 5], [4.4, 4.4], [4.2, 4.2]]),
}
const F_LEG_SPOTS = tubeScatter(83, 5, 0.04, 0.6, 0.4, 0.6)

function frontHoof(x: number, y: number, s = 1) {
  return `M ${x - 6.5 * s} ${y} L ${x + 6.5 * s} ${y} Q ${x + 8 * s} ${y + 6.5 * s} ${x + 7.5 * s} ${y + 8 * s} L ${x - 7.5 * s} ${y + 8 * s} Q ${x - 8 * s} ${y + 6.5 * s} ${x - 6.5 * s} ${y} Z`
}

function FrontHorse({ ctx }: { ctx: Ctx }) {
  const { p, coat, uid } = ctx
  const pat = coat.pattern
  const sw = 1.5 * (ctx.icon ? 2.3 : 1)
  const leg = (t: Tube, id: string, far: boolean, hx: number, hy: number) => (
    <g>
      <Skin id={id} d={tubeRegion(t)} ctx={ctx} line={null}>
        {pat === 'leopardo' && <TubeSpots tube={t} list={F_LEG_SPOTS} fill={p.spot} />}
        <path d={tubeRegion(t, 0.55, 1)} fill={p.points} opacity={0.38} />
        <path d={tubeRegion(t, 0.7, 1)} fill={p.points} opacity={0.55} />
        {coat.cuatroalbo && <Sock tube={t} u0={0.72} fill={p.white} />}
        <path d={tubeRegion(t, 0, 1, 0.3, 1.05)} fill={p.shade} opacity={0.5} />
        {far && <path d={tubeRegion(t)} fill="#2a160c" opacity={0.28} />}
      </Skin>
      <path d={tubeSide(t, 1, 0.1)} fill="none" stroke={p.line} strokeWidth={sw} strokeLinecap="round" />
      <path d={tubeSide(t, -1, 0.1)} fill="none" stroke={p.line} strokeWidth={sw} strokeLinecap="round" />
      <path d={frontHoof(hx, hy, far ? 0.85 : 1)} fill={far ? mix(p.hoof, '#000', 0.2) : p.hoof} stroke={p.line} strokeWidth={sw * 0.9} strokeLinejoin="round" />
    </g>
  )
  return (
    <g>
      <path d={F.tail} fill={p.mane} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
      {leg(F_LEGS.hl, 'fhl', true, 81, 279)}
      {leg(F_LEGS.hr, 'fhr', true, 107.5, 279)}
      <Skin id="fbody" d={F.body} ctx={ctx}>
        {pat === 'leopardo' && F_SPOTS.map((s, i) => <Spot key={i} at={[s.x, s.y]} r={s.r} seed={s.seed} fill={p.spot} />)}
        {pat === 'pio' && <path d={blob(5, 96, 160, 22, 16)} fill={p.patch} />}
        {pat === 'appaloosa' && <path d="M 50 100 L 76 100 C 66 120 64 140 70 160 L 50 160 Z M 162 100 L 136 100 C 146 120 148 140 142 160 L 162 160 Z" fill={p.white} />}
        <path d="M 60 160 C 80 176 132 176 152 160 L 152 200 L 60 200 Z" fill={p.shade} opacity={0.5} />
        <path d="M 60 110 C 70 140 72 160 82 188 L 60 188 Z M 152 110 C 142 140 140 160 130 188 L 152 188 Z" fill={p.shade} opacity={0.45} />
      </Skin>
      {!ctx.icon && <path d={F.chest} fill="none" stroke={p.line} strokeWidth={1.1} strokeLinecap="round" />}
      {leg(F_LEGS.l, 'fl', false, 93.5, 283)}
      {leg(F_LEGS.r, 'fr', false, 118.5, 283)}
      <Skin id="fneck" d={F.neck} ctx={ctx}>
        {pat === 'leopardo' && F_NECK_SPOTS.map((s, i) => <Spot key={i} at={[s.x, s.y]} r={s.r} seed={s.seed} fill={p.spot} />)}
        {pat === 'pio' && <path d={blob(13, 114, 96, 9, 12)} fill={p.patch} />}
        <path d="M 84 100 L 128 100 L 128 116 L 84 116 Z" fill={p.shade} opacity={0.4} />
      </Skin>
      <path d={F.mane} fill={p.mane} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
      <path d={F.earL} fill={p.coat} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
      <path d={F.earR} fill={p.coat} stroke={p.line} strokeWidth={sw} strokeLinejoin="round" />
      {!ctx.icon && <path d="M 96.4 40 C 95 35 94.8 30.5 95.4 26.5 C 98.4 30 100 34 100.2 38.5 Z M 115.6 40 C 117 35 117.2 30.5 116.6 26.5 C 113.6 30 112 34 111.8 38.5 Z" fill={p.earIn} />}
      <Skin id="fhead" d={F.head} ctx={ctx}>
        {pat === 'leopardo' && F_HEAD_SPOTS.map((s, i) => <Spot key={i} at={[s.x, s.y]} r={s.r} seed={s.seed} fill={p.spot} />)}
        <path d={F.muzzle} fill={`url(#${uid}-fmuz)`} />
        {coat.careto && <path d={F.careto} fill={p.white} />}
        <path d="M 88 44 C 93 60 95 80 99 106 L 88 106 Z" fill={p.shade} opacity={0.4} />
      </Skin>
      <path d="M 102 96 C 99.6 97 99.2 100 101 101.4 M 110 96 C 112.4 97 112.8 100 111 101.4" fill="none" stroke={p.line} strokeWidth={ctx.icon ? 3 : 1.8} strokeLinecap="round" />
      <g className="hz-eye">
        <ellipse cx="96.2" cy="61" rx="2.4" ry="2.8" fill={p.eye} />
        <ellipse cx="115.8" cy="61" rx="2.4" ry="2.8" fill={p.eye} />
        {!ctx.icon && <><circle cx="97" cy="60" r="0.8" fill="#fff" /><circle cx="116.6" cy="60" r="0.8" fill="#fff" /></>}
      </g>
      <path d="M 93 58.3 C 94.2 56.2 97.6 56 99.4 58 M 119 58.3 C 117.8 56.2 114.4 56 112.6 58" fill="none" stroke={p.line} strokeWidth={1.2} strokeLinecap="round" />
      <path d={F.forelock} fill={p.mane} stroke={p.line} strokeWidth={sw * 0.8} strokeLinejoin="round" />
    </g>
  )
}

// ─── emotes (drawn in SVG space, anchored to the rig) ───────────────────────
const TICK = '#9DAF7E'
function Emote({ e, t, rig }: { e: EmoteDef; t: number; rig: Rig }) {
  const k = (t - e.from) / (e.to - e.from)
  if (k <= 0 || k >= 1) return null
  const op = Math.min(1, k * 6, (1 - k) * 6)
  const pop = 0.7 + 0.3 * Math.min(1, k * 5)
  const wob = Math.sin(k * Math.PI * 10) * 1.5
  const head = add(rig.head.at, [0, rig.dy])
  let at: V
  switch (e.at) {
    case 'head': at = head; break
    case 'hooves': at = add(rig.legs.fn.hoof.at, [10, rig.dy - 6]); break
    case 'tail': at = add(rig.toWorld([40, 121]), [-8, rig.dy + 10]); break
    default: at = add(rig.toWorld([110, 108]), [-10, rig.dy - 22])
  }
  const g = (children: ReactNode, dx = 0, dy = 0) => (
    <g opacity={op} transform={`translate(${(at[0] + dx).toFixed(1)} ${(at[1] + dy + wob * 0.4).toFixed(1)}) scale(${pop.toFixed(2)})`}>{children}</g>
  )
  const ticks = (
    <g stroke={TICK} strokeWidth={3.2} strokeLinecap="round" fill="none">
      <path d="M -14 4 L -5 6" /><path d="M -10 -10 L -3 -2" /><path d="M 2 -14 L 3 -5" />
    </g>
  )
  switch (e.kind) {
    case 'ticks': return g(ticks, -4, 0)
    case 'neigh': return g(
      <g stroke={TICK} strokeWidth={2.8} strokeLinecap="round" fill="none">
        {[0, 1, 2].map(i => {
          const s = ((k * 3 + i / 3) % 1)
          return <path key={i} d={`M ${8 + s * 18} ${-10 - s * 6} q ${6 + s * 6} ${8 + s * 6} 0 ${16 + s * 12}`} opacity={1 - s} />
        })}
      </g>, 46, 30)
    case 'munch': return g(
      <g fill="none" stroke={TICK} strokeWidth={2.6} strokeLinecap="round">
        <path d="M 30 70 l -3 -8 M 35 71 l 1 -9 M 40 70 l 4 -7" />
        <path d={`M 18 ${44 + wob} l -8 -4`} /><path d={`M 22 ${36 + wob} l -4 -8`} />
      </g>, 0, 0)
    case 'speed': return g(
      <g stroke={TICK} strokeWidth={3} strokeLinecap="round">
        {[0, 1, 2].map(i => {
          const s = (k * 4 + i / 3) % 1
          return <path key={i} d={`M ${-10 - s * 30} ${-20 + i * 16} l ${-14 + s * 6} 0`} opacity={1 - s} />
        })}
      </g>)
    case 'zzz': return g(
      <g fill={TICK} fontFamily="system-ui, sans-serif" fontWeight={800}>
        {[0, 1, 2].map(i => {
          const s = (k * 2 + i / 3) % 1
          return <text key={i} x={10 + s * 16} y={-18 - s * 22} fontSize={8 + s * 8} opacity={1 - s}>z</text>
        })}
      </g>)
    case 'hearts': return g(
      <g>
        {ticks}
        <path transform={`translate(${-28} ${-18 + wob}) scale(.5)`} d="M22 36 C 6 24 2 16 6 9 C 10 3 18 4 22 11 C 26 4 34 3 38 9 C 42 16 38 24 22 36 Z" fill="#C4607A" />
      </g>, -6, -6)
  }
}

// ─── timeline ───────────────────────────────────────────────────────────────
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export function poseAt(id: string, t: number, still: boolean): Pose {
  const a = HORSE_ANIMATIONS.find(x => x.id === id)
  if (!a) return POSES.stand
  const keyPose = (i: number) => {
    const [, name, over] = a.keys[i]
    return over ? { ...POSES[name], ...over } : POSES[name]
  }
  if (still) return t > 0.04 && t < 0.96 ? keyPose(a.still ?? 1) : POSES.stand
  let i = 0
  while (i < a.keys.length - 2 && a.keys[i + 1][0] <= t) i++
  const [t0] = a.keys[i], [t1] = a.keys[i + 1]
  const k = Math.max(0, Math.min(1, (t - t0) / ((t1 - t0) || 1)))
  return lerpPose(keyPose(i), keyPose(i + 1), ease(k))
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Drives the action timeline with rAF; returns the current progress (0..1) or null. */
function useTimeline(anim: string, live: boolean) {
  const [t, setT] = useState<number | null>(null)
  const raf = useRef(0)
  useEffect(() => {
    const def = HORSE_ANIMATIONS.find(a => a.id === anim)
    if (!def || !live) { setT(null); return }
    const start = performance.now()
    const tick = (now: number) => {
      const k = (now - start) / def.ms
      if (k >= 1) { setT(null); return }
      setT(k)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [anim, live])
  return t
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
  /** Icon mode: thicker lines, fewer/larger spots, no fine details (tiles). */
  icon?: boolean
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

export const HORSE_VIEWBOX = '-14 4 248 300'

export function HorseFigure({
  coat, anim = 'idle', live = false, ground = 'shadow',
  viewBox = HORSE_VIEWBOX, className, style, pose: poseName = 'stand', icon = false,
}: HorseFigureProps) {
  useHorseCss()
  const uid = 'hz' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const t = useTimeline(anim, live)
  const reduced = prefersReducedMotion()
  const pose = t === null ? POSES[poseName] : poseAt(anim, t, reduced)
  const rig = t === null ? solveNamed(poseName) : solve(pose)
  const p = palette(coat)
  const ctx: Ctx = { coat, p, uid, icon }
  const def = t === null ? undefined : HORSE_ANIMATIONS.find(a => a.id === anim)

  const fr = pose.front
  const squash = Math.sin(Math.PI * fr)
  const cx = rig.shadowX
  const sideT = `translate(${cx} ${GROUND}) scale(${(1 - 0.16 * squash).toFixed(3)} ${(1 + 0.02 * squash).toFixed(3)}) translate(${-cx} ${-GROUND})`
  const shadowScale = Math.max(0.5, 1 + Math.min(0, rig.dy - (POSES.stand.gl ? 0 : 0)) * 0) - Math.min(0.4, Math.max(0, -pose.lift) / 60)

  return (
    <svg viewBox={viewBox} className={`hz${live ? ' hz-live' : ''}${className ? ' ' + className : ''}`}
         data-anim={t === null ? 'idle' : anim} style={style} preserveAspectRatio="xMidYMid meet"
         role="img" aria-label="Caballo">
      <defs>
        <linearGradient id={`${uid}-muz`} gradientUnits="userSpaceOnUse" x1="181" y1="54" x2="206" y2="95">
          <stop offset="0.05" stopColor={p.points} stopOpacity="0" />
          <stop offset="0.45" stopColor={p.points} stopOpacity="0.72" />
          <stop offset="1" stopColor={p.points} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${uid}-fmuz`} gradientUnits="userSpaceOnUse" x1="0" y1="70" x2="0" y2="102">
          <stop offset="0" stopColor={p.points} stopOpacity="0" />
          <stop offset="0.5" stopColor={p.points} stopOpacity="0.7" />
          <stop offset="1" stopColor={p.points} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {ground === 'pedestal' && <path d={BACKDROP} fill="#D9DDC6" />}
      {ground !== 'none' && (
        <ellipse cx={(cx - 8).toFixed(1)} cy={GROUND} rx={(92 * shadowScale).toFixed(1)} ry={(8.5 * shadowScale).toFixed(1)}
                 fill={ground === 'pedestal' ? '#C1C5A2' : 'rgba(40,30,20,.16)'} />
      )}

      {fr < 0.99 && (
        <g transform={sideT} opacity={fr > 0 ? Math.max(0, 1 - fr * 1.6).toFixed(2) : undefined}>
          <SideHorse rig={rig} pose={pose} ctx={ctx} />
        </g>
      )}
      {fr > 0.01 && (
        <g opacity={Math.min(1, Math.max(0, fr * 1.6 - 0.6)).toFixed(2)}
           transform={`translate(106 ${GROUND}) scale(${(0.84 + 0.16 * fr).toFixed(3)} 1) translate(-106 ${-GROUND})`}>
          <FrontHorse ctx={ctx} />
        </g>
      )}
      {def?.emotes?.map((e, i) => <Emote key={i} e={e} t={t!} rig={rig} />)}
    </svg>
  )
}

/** Render helper for previews/tests: a specific pose, no timeline. */
export function HorsePoseStatic({ coat, pose, ground = 'pedestal', viewBox = HORSE_VIEWBOX, style, emote }: {
  coat: HorseCoat; pose: Pose; ground?: 'shadow' | 'pedestal' | 'none'; viewBox?: string; style?: CSSProperties; emote?: { e: EmoteDef; t: number }
}) {
  const uid = 'hzs' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const rig = solve(pose)
  const p = palette(coat)
  const ctx: Ctx = { coat, p, uid, icon: false }
  return (
    <svg viewBox={viewBox} style={style} className="hz">
      <defs>
        <linearGradient id={`${uid}-muz`} gradientUnits="userSpaceOnUse" x1="181" y1="54" x2="206" y2="95">
          <stop offset="0.05" stopColor={p.points} stopOpacity="0" />
          <stop offset="0.45" stopColor={p.points} stopOpacity="0.72" />
          <stop offset="1" stopColor={p.points} stopOpacity="1" />
        </linearGradient>
        <linearGradient id={`${uid}-fmuz`} gradientUnits="userSpaceOnUse" x1="0" y1="78" x2="0" y2="100">
          <stop offset="0" stopColor={p.points} stopOpacity="0" />
          <stop offset="0.5" stopColor={p.points} stopOpacity="0.7" />
          <stop offset="1" stopColor={p.points} stopOpacity="0.95" />
        </linearGradient>
      </defs>
      {ground === 'pedestal' && <path d={BACKDROP} fill="#D9DDC6" />}
      {ground !== 'none' && <ellipse cx={rig.shadowX - 8} cy={GROUND} rx={92} ry={8.5} fill="#C1C5A2" />}
      {pose.front > 0.5 ? <FrontHorse ctx={ctx} /> : <SideHorse rig={rig} pose={pose} ctx={ctx} />}
      {emote && <Emote e={emote.e} t={emote.t} rig={rig} />}
    </svg>
  )
}
