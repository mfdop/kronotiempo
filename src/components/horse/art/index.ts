import { useEffect, useState } from 'react'
import type { PoseArt } from './types'
import icon from './icon'

/* Pose artwork is code-split: the small tile drawing (icon) ships with the
 * app, the detailed poses load on demand the first time a big horse shows. */

export type PoseName = 'stand' | 'front' | 'graze' | 'rear' | 'gallop' | 'rest'

const loaders: Record<PoseName, () => Promise<{ default: PoseArt }>> = {
  stand:  () => import('./stand'),
  front:  () => import('./front'),
  graze:  () => import('./graze'),
  rear:   () => import('./rear'),
  gallop: () => import('./gallop'),
  rest:   () => import('./rest'),
}

const cache: Partial<Record<PoseName, PoseArt>> = {}
let pending: Promise<void> | null = null

export const ICON_ART: PoseArt = icon

export function getPoseArt(name: PoseName): PoseArt | undefined {
  return cache[name]
}

/** Register artwork synchronously (previews / tests). */
export function registerPoseArt(name: PoseName, art: PoseArt) {
  cache[name] = art
}

export function loadAllPoses(): Promise<void> {
  if (!pending) {
    pending = Promise.all(
      (Object.keys(loaders) as PoseName[]).map(n =>
        cache[n] ? Promise.resolve() : loaders[n]().then(m => { cache[n] = m.default })),
    ).then(() => undefined)
    pending.catch(() => { pending = null })
  }
  return pending
}

/** Loads every pose once; re-renders the caller when they arrive. */
export function usePoseArts(enabled: boolean): boolean {
  const [ready, setReady] = useState(() => !!cache.stand && !!cache.gallop)
  useEffect(() => {
    if (!enabled || ready) return
    let alive = true
    loadAllPoses().then(() => { if (alive) setReady(true) }, () => {})
    return () => { alive = false }
  }, [enabled, ready])
  return ready
}

/** Load a single pose (e.g. the loading indicator only needs the gallop). */
export function loadPose(name: PoseName): Promise<PoseArt> {
  const c = cache[name]
  return c ? Promise.resolve(c) : loaders[name]().then(m => (cache[name] = m.default))
}
