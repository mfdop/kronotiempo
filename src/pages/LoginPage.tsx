import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      navigate('/animales', { replace: true })
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(165deg, #3D0E1C 0%, #5C1629 45%, #7B1F3A 100%)' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className="mb-3 flex items-center justify-center"
          style={{
            width: 100, height: 100,
            borderRadius: 24,
            background: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
            overflow: 'hidden',
          }}
        >
          <img
            src="/logo.png"
            alt="El Tiempo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <p className="text-white/50 text-xs tracking-widest uppercase">
          Yeguada El Tiempo
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-[17px] font-bold mb-5" style={{ color: '#1C1010' }}>
          Acceder
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                   style={{ color: '#A08888' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              autoComplete="email"
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
              style={{
                background: '#F7F3EE',
                border: '1.5px solid rgba(123,31,58,0.22)',
                color: '#1C1010',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                   style={{ color: '#A08888' }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
              style={{
                background: '#F7F3EE',
                border: '1.5px solid rgba(123,31,58,0.22)',
                color: '#1C1010',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
              }}
            />
          </div>

          {error && (
            <p className="text-[13px] rounded-xl px-4 py-2.5"
               style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-[14px] transition-opacity"
            style={{ background: '#7B1F3A', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      <p className="text-white/20 text-[11px] mt-8 tracking-wide">
        Acceso privado · Solo uso personal
      </p>
    </div>
  )
}
