import { useEffect, useRef, useState } from 'react'
import type { Animal } from '../../types'
import { COAT_PATTERNS } from '../../lib/constants'
import { HorseFigure } from './HorseFigure'
import { coatFromAnimal } from './horseCoat'
import { HORSE_ANIMATIONS, type HorseAnimation } from './horseAnimations'

/* Big interactive horse shown at the top of the Info tab.
 * Tap → plays the next action from a shuffled bag (all play once before
 * repeating, never the same one twice in a row). Actions and their poses
 * live in horseAnimations.ts / horseRig.ts. */

// viewBox of the stage figure: room above for rearing, sideways for galloping
const VB = '-44 -34 316 336'

const HINT_CSS = '.hz-hint{animation:hz-hint 2.4s ease-in-out infinite}@keyframes hz-hint{0%,100%{opacity:.55}50%{opacity:1}}@media (prefers-reduced-motion: reduce){.hz-hint{animation:none}}'

function shuffled<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
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
    timer.current = window.setTimeout(() => setCurrent(null), next.ms + 60)
  }

  const patternLabel = COAT_PATTERNS.find(p => p.value === coat.pattern)?.label ?? 'Lisa'
  const marks = [coat.careto && 'Careto', coat.cuatroalbo && 'Cuatroalbo'].filter(Boolean)

  return (
    <div ref={box} className="relative rounded-2xl overflow-hidden select-none"
         style={{
           height: 260,
           background: 'radial-gradient(120% 90% at 50% 20%, #FFFFFF 0%, #FBF7F0 55%, #F1EADF 100%)',
           border: '1px solid rgba(123,31,58,0.11)',
         }}>
      <style>{HINT_CSS}</style>
      {/* labels */}
      <div className="absolute left-3 top-2.5 z-10 flex items-center gap-1.5">
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${current ? '' : 'hz-hint'}`}
              style={{ background: current ? '#7E8C62' : 'rgba(126,140,98,0.14)', color: current ? '#fff' : '#56643E' }}>
          {current ? current.label : 'Toca al caballo'}
        </span>
      </div>
      <div className="absolute right-3 top-2.5 z-10 text-right">
        <p className="text-[11px] font-semibold" style={{ color: '#6B5555' }}>{patternLabel}</p>
        {marks.length > 0 && (
          <p className="text-[10px]" style={{ color: '#A08888' }}>{marks.join(' · ')}</p>
        )}
      </div>

      <button type="button" onClick={play} aria-label="Tocar al caballo"
              className="absolute inset-0 w-full h-full"
              style={{ cursor: 'pointer', background: 'none', border: 0, padding: 0 }}>
        <HorseFigure
          coat={coat}
          anim={current?.id ?? 'idle'}
          live={visible}
          ground="pedestal"
          viewBox={VB}
          style={{ width: '100%', height: '100%' }}
        />
      </button>
    </div>
  )
}
