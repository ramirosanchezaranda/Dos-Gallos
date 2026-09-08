import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { ingresar } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await ingresar(email.trim(), password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ingresar')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-verde-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center text-white space-y-2">
          <div className="text-5xl">🐓</div>
          <h1 className="text-2xl font-bold tracking-wide">Dos Gallos</h1>
          <p className="text-verde-200 text-sm">Control de stock</p>
        </div>

        <form onSubmit={enviar} className="bg-hueso rounded-2xl p-5 space-y-3">
          <label className="block">
            <span className="text-xs text-verde-700 font-medium">Email</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2.5 text-base"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs text-verde-700 font-medium">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2.5 text-base"
              required
            />
          </label>

          {error && (
            <p className="text-sm text-alerta bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full py-3" disabled={cargando}>
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
