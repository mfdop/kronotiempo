import { useSyncExternalStore } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/* Global "couldn't load" notice. Many screens default their data to [] when a
 * query fails, which looks like an empty list; this banner tells the user that
 * the data did not load and lets them retry. Cleared by the next success. */

let failed = false
const listeners = new Set<() => void>()
const set = (v: boolean) => { if (failed !== v) { failed = v; listeners.forEach(l => l()) } }

// Only connectivity-type failures (not "no rows", RLS, etc.)
export const reportQueryError = (error: unknown) => {
  const o = (error ?? {}) as { message?: string; name?: string; status?: number }
  const text = `${o.name ?? ''} ${o.message ?? ''}`
  if (/fetch|network|timeout|timed out|abort|load failed/i.test(text) || (typeof o.status === 'number' && o.status >= 500)) set(true)
}
export const reportQueryOk = () => set(false)

export default function ConnectionBanner() {
  const qc = useQueryClient()
  const show = useSyncExternalStore(
    cb => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => failed,
  )
  if (!show) return null
  return (
    <div role="alert" className="fixed left-3 right-3 z-50 flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5"
         style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)', background: '#1C1010', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.25)' }}>
      <span className="text-[12.5px]">No se pudieron cargar los datos. Revisa la conexión.</span>
      <button className="text-[12.5px] font-bold shrink-0" style={{ color: '#F3C6D2' }}
              onClick={() => { set(false); qc.invalidateQueries() }}>
        Reintentar
      </button>
    </div>
  )
}
