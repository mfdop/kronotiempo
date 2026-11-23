// Supabase Edge Function (Deno). Daily Web Push digest + test mode.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
// Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import webpush from 'npm:web-push@3'
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
)

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

type Sub = { id: string; owner_id: string; endpoint: string; p256dh: string; auth: string }

// ── date helpers (UTC, yyyy-mm-dd strings) ───────────────────
const ymd = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)
const SHOEING_INTERVAL_DAYS = 90

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

async function buildDigest(ownerId: string, now: Date): Promise<string | null> {
  const today = ymd(now)
  const in7 = ymd(addDays(now, 7))
  const in14 = ymd(addDays(now, 14))

  const { data: animals } = await admin
    .from('animals').select('id, name, status').eq('owner_id', ownerId)
  const active = (animals ?? []).filter((a) => !['vendido', 'fallecido', 'cedido'].includes(a.status))
  const ids = active.map((a) => a.id as string)
  const nameOf = new Map(active.map((a) => [a.id as string, a.name as string]))
  const parts: string[] = []

  if (ids.length > 0) {
    // Partos próximos (14 días)
    const { data: preg } = await admin
      .from('pregnancies').select('mare_id, expected_birth_date')
      .eq('result', 'gestante').gte('expected_birth_date', today).lte('expected_birth_date', in14)
      .in('mare_id', ids)
    if (preg && preg.length) parts.push(plural(preg.length, 'parto próximo', 'partos próximos'))

    // Herrados: último por animal, vence en <=7 días o vencido
    const { data: shoes } = await admin
      .from('shoeing_records').select('animal_id, date, next_estimated_date')
      .in('animal_id', ids).order('date', { ascending: false })
    const seen = new Set<string>()
    let overdue = 0, soon = 0
    for (const s of shoes ?? []) {
      if (seen.has(s.animal_id)) continue
      seen.add(s.animal_id)
      const due = s.next_estimated_date ?? ymd(addDays(new Date(s.date + 'T00:00:00Z'), SHOEING_INTERVAL_DAYS))
      if (due < today) overdue++
      else if (due <= in7) soon++
    }
    if (overdue) parts.push(plural(overdue, 'herrado vencido', 'herrados vencidos'))
    if (soon) parts.push(plural(soon, 'herrado próximo', 'herrados próximos'))

    // Vacunas: última por animal+tipo, vence en <=14 días o vencida
    const { data: vacs } = await admin
      .from('vaccines').select('animal_id, type, custom_name, date_applied, next_date')
      .in('animal_id', ids).order('date_applied', { ascending: false })
    const latest = new Map<string, { animal_id: string; label: string; next_date: string | null }>()
    for (const v of vacs ?? []) {
      const label = (v.custom_name ?? v.type ?? 'vacuna') as string
      const k = `${v.animal_id}|${label.toLowerCase()}`
      if (!latest.has(k)) latest.set(k, { animal_id: v.animal_id, label, next_date: v.next_date })
    }
    const vacLines: string[] = []
    for (const v of latest.values()) {
      if (!v.next_date || v.next_date > in14) continue
      vacLines.push(`${nameOf.get(v.animal_id) ?? 'Animal'}: vacuna ${v.label} ${v.next_date < today ? 'vencida' : 'próxima'}`)
    }
    if (vacLines.length <= 2) parts.push(...vacLines)
    else parts.push(plural(vacLines.length, 'vacuna pendiente', 'vacunas pendientes'))
  }

  // Tareas manuales pendientes hoy o vencidas
  const { data: tasks } = await admin
    .from('tasks').select('id').eq('owner_id', ownerId).eq('status', 'pendiente')
    .eq('origin', 'manual').not('due_date', 'is', null).lte('due_date', today)
  if (tasks && tasks.length) parts.push(plural(tasks.length, 'tarea para hoy o vencida', 'tareas para hoy o vencidas'))

  return parts.length ? parts.join(' · ') : null
}

async function sendTo(subs: Sub[], payload: Record<string, unknown>) {
  let sent = 0, removed = 0, failed = 0
  const body = JSON.stringify(payload)
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 12 },
      )
      sent++
      await admin.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', s.id)
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        removed++
        await admin.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        failed++
        console.error('push failed', code, (e as Error).message)
      }
    }
  }))
  return { sent, removed, failed }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { test?: boolean } = {}
  try { body = await req.json() } catch { /* empty body */ }

  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const isService = bearer !== '' && bearer === SERVICE_KEY
  const isCron = CRON_SECRET !== '' && req.headers.get('x-cron-secret') === CRON_SECRET

  // ── Test mode: caller's own JWT ──
  if (body.test === true && !isService && !isCron) {
    if (!bearer) return json({ error: 'No autorizado' }, 401)
    const { data, error } = await admin.auth.getUser(bearer)
    if (error || !data.user) return json({ error: 'Token no válido' }, 401)
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('owner_id', data.user.id)
    if (!subs || subs.length === 0) return json({ error: 'Sin suscripciones' }, 404)
    const r = await sendTo(subs as Sub[], {
      title: 'Kronotiempo', body: 'Notificación de prueba', data: { url: '/agenda' }, tag: 'test',
    })
    return json({ mode: 'test', ...r })
  }

  // ── Daily mode: service role or CRON_SECRET only ──
  if (!isService && !isCron) return json({ error: 'No autorizado' }, 401)

  const { data: subs, error } = await admin.from('push_subscriptions').select('*')
  if (error) return json({ error: error.message }, 500)
  const byOwner = new Map<string, Sub[]>()
  for (const s of (subs ?? []) as Sub[]) {
    byOwner.set(s.owner_id, [...(byOwner.get(s.owner_id) ?? []), s])
  }

  const now = new Date()
  const totals = { owners: byOwner.size, notified: 0, sent: 0, removed: 0, failed: 0 }
  for (const [ownerId, ownerSubs] of byOwner) {
    try {
      const text = await buildDigest(ownerId, now)
      if (!text) continue
      totals.notified++
      const r = await sendTo(ownerSubs, {
        title: 'Kronotiempo · Agenda de hoy', body: text, data: { url: '/agenda' }, tag: 'daily',
      })
      totals.sent += r.sent; totals.removed += r.removed; totals.failed += r.failed
    } catch (e) {
      console.error('owner failed', ownerId, e)
    }
  }
  return json({ mode: 'daily', ...totals })
})
