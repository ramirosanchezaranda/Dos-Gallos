import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Gasto, Proveedor } from '../types/db'

export const CATEGORIAS_GASTO = [
  'Mercadería',
  'Servicios',
  'Personal',
  'Alquiler',
  'Mantenimiento',
  'Impuestos',
  'Otros',
] as const

export function useProveedores() {
  return useQuery({
    queryKey: ['proveedores'],
    queryFn: async (): Promise<Proveedor[]> => {
      const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
      if (error) throw error
      return data as Proveedor[]
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useCrearProveedor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const { data, error } = await supabase
        .from('proveedores')
        .insert({ nombre })
        .select()
        .single()
      if (error) throw error
      return data as Proveedor
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedores'] }),
  })
}

/** Gastos del mes indicado (por defecto, el corriente). */
export function useGastos(mes?: Date) {
  const base = mes ?? new Date()
  const desde = new Date(base.getFullYear(), base.getMonth(), 1)
  const hasta = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  return useQuery({
    queryKey: ['gastos', iso(desde)],
    queryFn: async (): Promise<Gasto[]> => {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .gte('fecha', iso(desde))
        .lte('fecha', iso(hasta))
        .order('fecha', { ascending: false })
      if (error) throw error
      return data as Gasto[]
    },
  })
}

type NuevoGasto = Omit<Gasto, 'id' | 'created_at'>

export function useGuardarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...g }: Partial<NuevoGasto> & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from('gastos').update(g).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('gastos').insert(g as NuevoGasto)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gastos'] }),
  })
}

export function useBorrarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gastos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gastos'] }),
  })
}
