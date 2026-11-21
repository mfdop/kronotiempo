import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

function describeAuthError(error: AuthError): string {
  const code = error.code ?? ''
  const msg = error.message ?? ''
  const status = error.status
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg))
    return 'Email o contraseña incorrectos (o el usuario no existe en este proyecto de Supabase)'
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return 'El email no está confirmado. Confirma el usuario en Supabase → Authentication → Users'
  if (/invalid api key/i.test(msg) || code === 'invalid_api_key' || status === 401)
    return 'Clave de API de Supabase inválida. Revisa VITE_SUPABASE_ANON_KEY en Vercel (y vuelve a desplegar)'
  if (status === 0 || /failed to fetch|network|retryable/i.test(msg) || error.name === 'AuthRetryableFetchError')
    return 'No se pudo conectar con Supabase. Revisa VITE_SUPABASE_URL en Vercel (y vuelve a desplegar)'
  if (status === 429 || code === 'over_request_rate_limit')
    return 'Demasiados intentos. Espera unos minutos'
  if (status && status >= 500)
    return `Error del servidor de Supabase (${status}). ¿Proyecto pausado?`
  return `Error de acceso: ${msg}${code ? ` [${code}]` : ''}`
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: describeAuthError(error) }
      return { error: null }
    } catch (e) {
      return { error: `No se pudo conectar con Supabase (${e instanceof Error ? e.message : 'error de red'}). Revisa VITE_SUPABASE_URL.` }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
