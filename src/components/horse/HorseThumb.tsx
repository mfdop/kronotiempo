import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { HorseCoat } from './horseCoat'
import { HorseArtStatic } from './HorseFigure'
import { getPoseArt, loadPose } from './art'

/* Grid thumbnail of the detailed standing horse, drawn once per distinct coat
 * and shown as a plain <img> (blob URL).
 *
 * Why: the detailed art is ~90 KB of path data per horse. Rendered as inline SVG
 * on every card, a 50-horse grid put ~7 MB of markup in the DOM (long tasks
 * and memory pressure on phones). As an image the browser decodes/rasterises
 * it off the main thread and identical coats share one blob.
 *
 * The SVG covers the whole card (viewBox extended to the card's aspect ratio)
 * so the figure lands exactly where the old inset <svg> drew it. */

// Card is aspect-ratio 1 / 0.9; the old figure box was inset 8% 6% 6%
// (88% x 86%) with viewBox "-14 14 248 292" fitted "meet".
const CARD_H = 0.9
const SCALE = Math.min(0.88 / 248, (0.86 * CARD_H) / 292)    // card-widths per figure unit
const VB_W = 1 / SCALE, VB_H = CARD_H / SCALE
const CX = -14 + 248 / 2
const CY = 14 + 292 / 2 - ((0.08 + 0.43 - 0.5) * CARD_H) / SCALE
const VIEWBOX = `${(CX - VB_W / 2).toFixed(2)} ${(CY - VB_H / 2).toFixed(2)} ${VB_W.toFixed(2)} ${VB_H.toFixed(2)}`

const urls = new Map<string, string>()
const waiting = new Map<string, Array<(u: string) => void>>()
let queue: Array<() => void> = []
let pumping = false

// one thumbnail per task so the main thread never blocks for long
function pump() {
  if (pumping) return
  pumping = true
  const step = () => {
    const job = queue.shift()
    if (job) job()
    if (queue.length) setTimeout(step, 0); else pumping = false
  }
  setTimeout(step, 0)
}

function build(key: string, coat: HorseCoat, circleInk?: string | null, groundInk?: string | null): string {
  const art = getPoseArt('stand')!
  // serialise a detached render (react-dom is already in the main bundle)
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => root.render(<HorseArtStatic coat={coat} art={art} ground="pedestal" viewBox={VIEWBOX} circleInk={circleInk} groundInk={groundInk} />))
  const out = new XMLSerializer().serializeToString(host.firstElementChild!)
  root.unmount()
  const url = URL.createObjectURL(new Blob([out], { type: 'image/svg+xml' }))
  urls.set(key, url)
  return url
}

export function HorseThumb({ coat, circleInk, groundInk }: { coat: HorseCoat; circleInk?: string | null; groundInk?: string | null }) {
  const key = JSON.stringify([coat, circleInk ?? null, groundInk ?? null])
  const [url, setUrl] = useState<string | undefined>(() => urls.get(key))
  const box = useRef<HTMLSpanElement>(null)
  // only draw cards that are on (or near) the screen
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const el = box.current
    if (near || !el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNear(true); io.disconnect() } }, { root: el.closest('.overflow-y-auto'), rootMargin: '500px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  useEffect(() => {
    if (!near) return
    const hit = urls.get(key)
    if (hit) { setUrl(hit); return }
    let alive = true
    const cb = (u: string) => { if (alive) setUrl(u) }
    const list = waiting.get(key)
    if (list) { list.push(cb); return () => { alive = false } }
    waiting.set(key, [cb])
    loadPose('stand').then(() => {
      queue.push(() => {
        const u = urls.get(key) ?? build(key, coat, circleInk, groundInk)
        waiting.get(key)?.forEach(f => f(u))
        waiting.delete(key)
      })
      pump()
    }, () => { waiting.delete(key) })
    return () => { alive = false }
  }, [key, coat, circleInk, groundInk, near])

  return (
    <span ref={box} style={{ position: 'absolute', inset: 0, display: 'block' }}>
      {url && <img src={url} alt="" role="img" aria-label="Caballo" draggable={false}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />}
    </span>
  )
}
