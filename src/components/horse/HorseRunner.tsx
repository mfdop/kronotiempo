import { useEffect, useId, useState } from 'react'
import { ArtView } from './horseArt'
import { ICON_ART, getPoseArt, loadPose } from './art'
import type { PoseArt } from './art/types'
import type { HorseCoat } from './horseCoat'
import { HORSE_ANIMATIONS, type Motion } from './horseAnimations'
import { GROUND, xform } from './horseTimeline'

/** Loading indicator: the traced horse galloping (stride frames of the "Correr" action). */
const COAT: HorseCoat = { ink: '#9A8A80', spotInk: '#6E6058', maneInk: '#6E6058', pattern: 'lisa', careto: false, cuatroalbo: false }
const FRAMES = HORSE_ANIMATIONS.find(a => a.id === 'gallop')?.frames
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function motionAt(ms: number): Motion {
  if (!FRAMES) return {}
  const ph = ms / FRAMES.every
  const i = Math.floor(ph), f = ph - i, e = f * f * (3 - 2 * f)
  const a = FRAMES.list[i % FRAMES.list.length], b = FRAMES.list[(i + 1) % FRAMES.list.length]
  const parts: Record<string, number> = {}
  for (const k of new Set([...Object.keys(a.parts ?? {}), ...Object.keys(b.parts ?? {})]))
    parts[k] = lerp(a.parts?.[k] ?? 0, b.parts?.[k] ?? 0, e)
  return { dy: lerp(a.dy ?? 0, b.dy ?? 0, e), rot: lerp(a.rot ?? 0, b.rot ?? 0, e), parts }
}

export function HorseRunner({ size = 72, light = false }: { size?: number; light?: boolean }) {
  const uid = 'hr' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [art, setArt] = useState<PoseArt | undefined>(() => getPoseArt('gallop'))
  const [ms, setMs] = useState(0)
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    let alive = true
    if (!art) loadPose('gallop').then(a => { if (alive) setArt(a) }, () => {})
    return () => { alive = false }
  }, [art])

  useEffect(() => {
    if (!art || reduced) return
    let raf = 0, last = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      if (now - last > 40) { last = now; setMs(now - t0) }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [art, reduced])

  const a = art ?? ICON_ART
  const m = art && !reduced ? motionAt(ms) : {}
  const coat = light ? { ...COAT, ink: '#E8DCD2', spotInk: '#C9B8AC', maneInk: '#C9B8AC' } : COAT
  return (
    <svg viewBox="-14 40 248 270" width={size} height={size * 270 / 248} role="status" aria-label="Cargando"
         style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx={a.box[0] + a.box[2] * 0.5} cy={GROUND + 1} rx={a.box[2] * 0.4} ry={7}
               fill={light ? 'rgba(255,255,255,.14)' : 'rgba(40,30,20,.14)'} />
      <g transform={xform(m, a)}>
        <ArtView art={a} coat={coat} uid={uid} icon={!art} rot={m.parts} />
      </g>
    </svg>
  )
}
