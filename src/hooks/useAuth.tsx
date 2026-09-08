import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

/**
 * Supabase necesita un identificador además de la contraseña, pero en el
 * mostrador escribir el mail cada vez es tiempo perdido: hay un solo usuario.
 * Así que el identificador queda fijo acá y la pantalla pide solo la clave.
 *
 * Es a propósito uno neutro y no un mail personal: este archivo vive en un
 * repositorio público. El TLD `.invalid` está reservado por RFC 2606, no se
 * puede registrar, así que nunca va a haber una casilla real detrás.
 */
const USUARIO = 'mostrador@dosgallos.invalid'

interface AuthCtx {
  session: Session | null
  cargando: boolean
  ingresar: (password: string) => Promise<void>
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

  const ingresar = async (password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: USUARIO, password })
    if (error) {
      throw new Error(
        error.message === 'Invalid login credentials'
          ? 'Contraseña incorrecta'
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
