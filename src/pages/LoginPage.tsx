import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: 'linear-gradient(165deg, #5C1629 0%, #7B1F3A 100%)' }}>

      {/* Logo / nombre */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🐴</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">EquiGest</h1>
        <p className="text-white/60 text-sm mt-1">Yeguada El Tiempo</p>
      </div>

      {/* Tarjeta login */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-5" style={{ color: '#1C1010' }}>
          Acceder
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                   style={{ color: '#A08888' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: '#F7F3EE',
                border: '1.5px solid rgba(123,31,58,0.22)',
                color: '#1C1010',
              }}
              onFocus={e => e.target.style.borderColor = '#7B1F3A'}
              onBlur={e => e.target.style.borderColor = 'rgba(123,31,58,0.22)'}
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block"
                   style={{ color: '#A08888' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: '#F7F3EE',
                border: '1.5px solid rgba(123,31,58,0.22)',
                color: '#1C1010',
              }}
              onFocus={e => e.target.style.borderColor = '#7B1F3A'}
              onBlur={e => e.target.style.borderColor = 'rgba(123,31,58,0.22)'}
            />
          </div>

          {error && (
            <p className="text-sm rounded-xl px-4 py-2.5"
               style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-opacity"
            style={{ background: '#7B1F3A', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <p className="text-white/30 text-xs mt-8">
        Acceso privado · Solo uso personal
      </p>
    </div>
  )
}
