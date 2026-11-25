/* After a new deploy the hashed chunk files of the previous build disappear.
 * An app that was left open (typical for an installed PWA) then fails to
 * import a lazy chunk. The cure is a single hard reload to pick up the new
 * index.html; the sessionStorage flag prevents reload loops. */

const KEY = 'eltiempo:chunk-reload'
const WINDOW_MS = 30_000

export function isChunkLoadError(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : typeof e === 'string' ? e : ''
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Expected a JavaScript.*module script/i.test(msg)
}

/** Reloads once per 30s window. Returns true when a reload was triggered. */
export function reloadOnce(): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0)
    if (Date.now() - last < WINDOW_MS) return false
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch { /* storage blocked: still try once */ }
  window.location.reload()
  return true
}

export function installChunkErrorHandlers() {
  // Fired by Vite when a preload (dynamic import / css) fails
  window.addEventListener('vite:preloadError', (ev) => {
    ev.preventDefault()
    reloadOnce()
  })
  window.addEventListener('unhandledrejection', (ev) => {
    if (isChunkLoadError(ev.reason)) reloadOnce()
  })
}
