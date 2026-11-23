import { useEffect, useState, useCallback } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'

const VAPID = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''

type Status =
  | 'loading' | 'unsupported' | 'not-installed' | 'no-key'
  | 'default' | 'denied' | 'granted-off' | 'granted-on'

function urlBase64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
}

async function getRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'))
}

export default function NotificationsCard() {
  const [status, setStatus] = useState<Status>('loading')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isIOS() && !isStandalone()) return setStatus('not-installed')
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return setStatus('unsupported')
    }
    if (!VAPID) return setStatus('no-key')
    if (Notification.permission === 'denied') return setStatus('denied')
    if (Notification.permission === 'default') return setStatus('default')
    try {
      const reg = await getRegistration()
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'granted-on' : 'granted-off')
    } catch {
      setStatus('granted-off')
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function subscribe() {
    await getRegistration()
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      }))
    const json = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent,
    }, { onConflict: 'endpoint' })
    if (error) throw error
  }

  // requestPermission must be invoked directly from the click handler (iOS requirement)
  const enable = () => {
    setMsg(null)
    setBusy(true)
    Notification.requestPermission()
      .then(async (perm) => {
        if (perm !== 'granted') { await refresh(); return }
        await subscribe()
        setStatus('granted-on')
      })
      .catch((e) => setMsg(`No se pudo activar: ${e?.message ?? e}`))
      .finally(() => setBusy(false))
  }

  const resubscribe = async () => {
    setBusy(true); setMsg(null)
    try { await subscribe(); setStatus('granted-on') }
    catch (e) { setMsg(`No se pudo activar: ${(e as Error).message}`) }
    finally { setBusy(false) }
  }

  const disable = async () => {
    setBusy(true); setMsg(null)
    try {
      const reg = await getRegistration()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('granted-off')
    } catch (e) { setMsg(`Error: ${(e as Error).message}`) }
    finally { setBusy(false) }
  }

  const sendTest = async () => {
    setBusy(true); setMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } })
      if (error) throw error
      setMsg(data?.sent ? 'Prueba enviada. Debería llegar en unos segundos.' : 'El servidor no pudo entregar la prueba.')
    } catch (e) { setMsg(`Error al enviar la prueba: ${(e as Error).message}`) }
    finally { setBusy(false) }
  }

  const btn = (primary: boolean): CSSProperties => ({
    background: primary ? '#7B1F3A' : 'transparent',
    color: primary ? '#fff' : '#7B1F3A',
    border: primary ? 'none' : '1px solid rgba(123,31,58,0.3)',
    opacity: busy ? 0.6 : 1,
  })

  const text: Record<string, string> = {
    unsupported: 'Este navegador no admite notificaciones push. En iPhone necesitas iOS 16.4 o superior: abre la app en Safari → Compartir → Añadir a pantalla de inicio y ábrela desde el icono.',
    'not-installed': 'En iPhone las notificaciones solo funcionan con la app instalada: en Safari pulsa Compartir → Añadir a pantalla de inicio (iOS 16.4+), abre Kronotiempo desde el icono y vuelve aquí.',
    'no-key': 'Faltan las claves de notificaciones (VITE_VAPID_PUBLIC_KEY) en la configuración de la app. Consulta PUSH_SETUP.md.',
    default: 'Recibe cada mañana un resumen de partos, herrados, vacunas y tareas.',
    denied: 'Las notificaciones están bloqueadas. En el iPhone: Ajustes → Notificaciones → Kronotiempo → Permitir notificaciones. Luego vuelve aquí.',
    'granted-off': 'Permiso concedido, pero este dispositivo no está suscrito.',
    'granted-on': 'Notificaciones activas en este dispositivo.',
  }

  return (
    <div className="mx-3 mb-1 rounded-2xl overflow-hidden"
      style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
        <p className="text-[13px] font-bold" style={{ color: '#1C1010' }}>🔔 Notificaciones</p>
      </div>
      <div className="px-4 py-3">
        {status === 'loading' ? (
          <p className="text-[12px]" style={{ color: '#A08888' }}>Comprobando…</p>
        ) : (
          <p className="text-[12px] leading-snug" style={{ color: '#6B5555' }}>{text[status]}</p>
        )}
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {status === 'default' && (
            <button onClick={enable} disabled={busy} className="px-3 py-2 rounded-xl text-[13px] font-semibold" style={btn(true)}>
              Activar notificaciones
            </button>
          )}
          {status === 'granted-off' && (
            <button onClick={resubscribe} disabled={busy} className="px-3 py-2 rounded-xl text-[13px] font-semibold" style={btn(true)}>
              Activar en este dispositivo
            </button>
          )}
          {status === 'granted-on' && (
            <>
              <button onClick={sendTest} disabled={busy} className="px-3 py-2 rounded-xl text-[13px] font-semibold" style={btn(true)}>
                Enviar prueba
              </button>
              <button onClick={disable} disabled={busy} className="px-3 py-2 rounded-xl text-[13px] font-semibold" style={btn(false)}>
                Desactivar
              </button>
            </>
          )}
        </div>
        {msg && <p className="text-[11px] mt-2" style={{ color: '#C62B4F' }}>{msg}</p>}
      </div>
    </div>
  )
}
