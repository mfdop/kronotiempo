import type { HorseCoat } from './horseCoat'

// ─── colour helpers ─────────────────────────────────────────────────────────
function rgb(h: string): [number, number, number] {
  let s = h.replace('#', '')
  if (s.length === 3) s = s.split('').map(c => c + c).join('')
  const n = parseInt(s.slice(0, 6), 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
export function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
export function luma(h: string) {
  const [r, g, b] = rgb(h)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

export interface Pal {
  coat: string; shade: string; shadeOp: number; hiOp: number
  spot: string; spotCore: string; white: string
  hair: string; hairD: string; hairL: string; hairLL: string
  hoof: string; hoofL: string; line: string
}

/** Colours for a coat. Light coats keep the reference's dark-brown mane,
 *  muzzle and tail; darker coats get progressively darker (black) points. */
export function palette(c: HorseCoat): Pal {
  const l = luma(c.ink)
  const k = Math.max(0, Math.min(0.84, (0.62 - l) * 1.7))
  const pt = (h: string) => (k ? mix(h, '#0E0A08', k) : h)
  const spotL = luma(c.spotInk)
  return {
    coat: c.ink,
    shade: l > 0.3 ? mix(c.ink, '#3A1A0A', 0.72) : '#000000',
    shadeOp: l > 0.3 ? 0.17 : 0.2,
    hiOp: l > 0.3 ? 0.3 : 0.12,
    spot: c.spotInk,
    spotCore: spotL > 0.55 ? '#FFFFFF' : mix(c.spotInk, '#140A04', 0.35),
    white: '#FBF7F0',
    ...(c.maneInk
      ? { hair: c.maneInk, hairD: mix(c.maneInk, '#0E0A08', 0.4), hairL: mix(c.maneInk, '#FFFFFF', 0.25), hairLL: mix(c.maneInk, '#FFFFFF', 0.5) }
      : { hair: pt('#72594A'), hairD: pt('#422F25'), hairL: pt('#9C816F'), hairLL: pt('#C6AD9B') }),
    hoof: '#655245', hoofL: '#AD9889',
    line: '#261810',
  }
}
