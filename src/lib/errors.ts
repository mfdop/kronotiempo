// Supabase's PostgrestError is a plain object, not an Error instance,
// so `e instanceof Error` hides its message. This handles both.
export function errMsg(e: unknown, fallback = 'Error al guardar'): string {
  if (e && typeof e === 'object') {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    if (typeof o.message === 'string' && o.message) {
      const code = typeof o.code === 'string' && o.code ? ` [${o.code}]` : ''
      return `${o.message}${code}`
    }
  }
  return fallback
}
