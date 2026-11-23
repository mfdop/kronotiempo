import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Animal } from '../../types'
import { COAT_PATTERNS } from '../../lib/constants'
import { HorseFigure } from './HorseFigure'
import { coatFromAnimal } from './horseCoat'
import { HORSE_ANIMATIONS, type HorseAnimation, type HorseEmote } from './horseAnimations'

/* Big interactive horse shown at the top of the Info tab.
 * Tap → plays the next animation from a shuffled bag (all play once before
 * repeating, never the same one twice in a row). */

// viewBox of the stage figure (room above for rearing, below for the pedestal)
const VB = { x: -8, y: -28, w: 256, h: 248 }

function shuffled<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Position (in viewBox units) → absolute CSS inside the figure box. */
function at(x: number, y: number): CSSProperties {
  return { left: `${((x - VB.x) / VB.w) * 100}%`, top: `${((y - VB.y) / VB.h) * 100}%` }
}

function Emote({ kind, ms }: { kind: HorseEmote; ms: number }) {
  const base = { ['--hz-ms' as string]: `${ms}ms` } as CSSProperties
  const bubble: CSSProperties = {
    background: '#fff', color: '#7B1F3A', borderRadius: 12,
    padding: '3px 9px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(92,22,41,0.18)', border: '1.5px solid rgba(123,31,58,0.15)',
  }
  switch (kind) {
    case 'neigh':
      return (
        // sound waves coming out of the (raised) muzzle + a little note
        <div className="hz-emote" style={{ ...base, ...at(30, 50) }}>
          <svg width="40" height="40" viewBox="0 0 40 40" style={{ position: 'absolute', left: -42, top: -26 }}>
            {[0, 1, 2].map(i => {
              const x = 34 - i * 9, h = 5 + i * 5
              return (
                <path key={i} className="hz-wave" d={`M ${x} ${20 - h} q ${-h * 0.8} ${h} 0 ${2 * h}`}
                      fill="none" stroke="#7B1F3A" strokeWidth="2.4" strokeLinecap="round"
                      style={{ animationDelay: `${i * 0.15}s`, transformOrigin: '38px 20px' }} />
              )
            })}
          </svg>
          <span className="hz-float" style={{ position: 'absolute', left: -30, top: -52, fontSize: 18, color: '#7B1F3A', fontWeight: 800 }}>♪</span>
        </div>
      )
    case 'graze':
      return (
        <div className="hz-emote" style={{ ...base, ...at(104, 46) }}>
          <div style={{ ...bubble, color: '#2E6B3E' }}>ñam ñam</div>
        </div>
      )
    case 'dust':
      return (
        <div className="hz-emote" style={{ ...base, ...at(176, 166) }}>
          <svg width="56" height="26" viewBox="0 0 56 26">
            {[0, 1, 2].map(i => (
              <circle key={i} className="hz-dust" cx={8 + i * 12} cy={16 - (i % 2) * 5} r={5 + i}
                      fill="#C9B8A0" style={{ animationDelay: `${i * 0.12}s`, transformOrigin: `${8 + i * 12}px 16px` }} />
            ))}
          </svg>
        </div>
      )
    case 'shake':
      return (
        <div className="hz-emote" style={{ ...base, ...at(-4, 24) }}>
          <svg width="40" height="40" viewBox="0 0 40 40">
            <g fill="none" stroke="#7B1F3A" strokeWidth="2.4" strokeLinecap="round" className="hz-float">
              <path d="M 6 8 l 8 4" /><path d="M 3 20 l 9 0" /><path d="M 6 32 l 8 -4" />
            </g>
          </svg>
        </div>
      )
    case 'bang':
      return (
        <div className="hz-emote" style={{ ...base, ...at(108, -16) }}>
          <div style={{ ...bubble, fontSize: 16, padding: '1px 10px' }}>!</div>
        </div>
      )
    case 'heart':
      return (
        <div className="hz-emote" style={{ ...base, ...at(72, -2) }}>
          <svg width="44" height="40" viewBox="0 0 44 40" className="hz-float">
            <path d="M22 36 C 6 24 2 16 6 9 C 10 3 18 4 22 11 C 26 4 34 3 38 9 C 42 16 38 24 22 36 Z" fill="#C4607A" />
            <path d="M12 10 C 14 8 17 8 18 10" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )
  }
}

export default function HorseStage({ animal }: { animal: Animal }) {
  const coat = coatFromAnimal(animal)
  const [current, setCurrent] = useState<HorseAnimation | null>(null)
  const [visible, setVisible] = useState(true)
  const bag = useRef<HorseAnimation[]>([])
  const last = useRef<string>('')
  const timer = useRef<number | undefined>(undefined)
  const box = useRef<HTMLDivElement>(null)

  // Pause idle loops while the stage is scrolled out of view (battery).
  useEffect(() => {
    const el = box.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const play = () => {
    if (current) return
    if (bag.current.length === 0) {
      bag.current = shuffled(HORSE_ANIMATIONS)
      if (bag.current[0].id === last.current) bag.current.push(bag.current.shift()!)
    }
    const next = bag.current.shift()!
    last.current = next.id
    setCurrent(next)
    timer.current = window.setTimeout(() => setCurrent(null), next.ms + 80)
  }

  const patternLabel = COAT_PATTERNS.find(p => p.value === coat.pattern)?.label ?? 'Lisa'
  const marks = [coat.careto && 'Careto', coat.cuatroalbo && 'Cuatroalbo'].filter(Boolean)

  return (
    <div ref={box} className="relative rounded-2xl overflow-hidden select-none"
         style={{
           height: 236,
           background: 'radial-gradient(120% 85% at 50% 18%, #FFFFFF 0%, #FBF5EE 48%, #EFE2D4 100%)',
           border: '1px solid rgba(123,31,58,0.11)',
         }}>
      {/* soft back-glow + distant hills for depth */}
      <div className="absolute pointer-events-none" style={{
        left: '50%', top: '42%', width: 260, height: 160, transform: 'translate(-50%,-50%)',
        background: 'radial-gradient(closest-side, rgba(196,96,122,0.16), rgba(196,96,122,0))',
      }} />
      <svg className="absolute left-0 right-0 bottom-0 pointer-events-none" width="100%" height="70"
           viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden>
        <path d="M0 40 C 60 18 120 30 180 22 C 250 12 320 34 400 20 L 400 70 L 0 70 Z" fill="#E7D6C4" opacity="0.7" />
        <path d="M0 52 C 80 36 150 50 220 42 C 290 34 340 48 400 40 L 400 70 L 0 70 Z" fill="#DCC7B2" opacity="0.6" />
      </svg>

      {/* labels */}
      <div className="absolute left-3 top-2.5 z-10 flex items-center gap-1.5">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${current ? '' : 'hz-hint'}`}
              style={{ background: current ? '#7B1F3A' : 'rgba(123,31,58,0.08)', color: current ? '#fff' : '#7B1F3A' }}>
          {current ? current.label : 'Toca al caballo'}
        </span>
      </div>
      <div className="absolute right-3 top-2.5 z-10 text-right">
        <p className="text-[11px] font-semibold" style={{ color: '#6B5555' }}>{patternLabel}</p>
        {marks.length > 0 && (
          <p className="text-[10px]" style={{ color: '#A08888' }}>{marks.join(' · ')}</p>
        )}
      </div>

      {/* figure box keeps the viewBox aspect so emotes can be placed in SVG units */}
      <div className="absolute left-1/2 bottom-0"
           style={{ height: '100%', aspectRatio: `${VB.w} / ${VB.h}`, transform: 'translateX(-50%)' }}>
        <button type="button" onClick={play} aria-label="Tocar al caballo"
                className="absolute inset-0 w-full h-full" style={{ cursor: 'pointer', background: 'none', border: 0, padding: 0 }}>
          <HorseFigure
            coat={coat}
            anim={current?.id ?? 'idle'}
            live={visible}
            ground="pedestal"
            viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
            style={{ width: '100%', height: '100%' }}
          />
        </button>
        {current?.emote && <Emote key={current.id} kind={current.emote} ms={current.ms} />}
      </div>
    </div>
  )
}
