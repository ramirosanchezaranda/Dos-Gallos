import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthCtx {
  session: Session | null
  cargando: boolean
  ingresar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
  cambiarPassword: (nueva: string) => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const ingresar = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : error.message,
      )
    }
  }

  const salir = async () => {
    await supabase.auth.signOut()
  }

  const cambiarPassword = async (nueva: string) => {
    const { error } = await supabase.auth.updateUser({ password: nueva })
    if (error) throw new Error(error.message)
  }

  return (
    <Ctx.Provider value={{ session, cargando, ingresar, salir, cambiarPassword }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return c
}
