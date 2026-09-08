import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Categoria, Producto } from '../types/db'

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async (): Promise<Categoria[]> => {
      const { data, error } = await supabase.from('categorias').select('*').order('orden')
      if (error) throw error
      return data as Categoria[]
    },
    staleTime: 1000 * 60 * 30, // las categorías casi no cambian
  })
}

export function useProductos() {
  return useQuery({
    queryKey: ['productos'],
    queryFn: async (): Promise<Producto[]> => {
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('nombre')
      if (error) throw error
      return data as Producto[]
    },
  })
}

type NuevoProducto = Omit<Producto, 'id' | 'created_at' | 'updated_at'>

export function useCrearProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: NuevoProducto) => {
      const { data, error } = await supabase.from('productos').insert(p).select().single()
      if (error) throw error
      return data as Producto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export function useEditarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...cambios }: Partial<Producto> & { id: string }) => {
      const { data, error } = await supabase
        .from('productos')
        .update(cambios)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Producto
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

export function useBorrarProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('productos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}

/** Ajusta el stock y deja el movimiento registrado. */
export function useAjustarStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      producto_id,
      cantidad,
      tipo,
      motivo,
    }: {
      producto_id: string
      cantidad: number
      tipo: 'ingreso' | 'ajuste' | 'merma'
      motivo?: string
    }) => {
      const { data: prod, error: e1 } = await supabase
        .from('productos')
        .select('stock_actual')
        .eq('id', producto_id)
        .single()
      if (e1) throw e1

      const nuevo = Number(prod.stock_actual) + cantidad
      const { error: e2 } = await supabase
        .from('productos')
        .update({ stock_actual: nuevo })
        .eq('id', producto_id)
      if (e2) throw e2

      const { error: e3 } = await supabase
        .from('movimientos_stock')
        .insert({ producto_id, tipo, cantidad, motivo: motivo ?? null })
      if (e3) throw e3
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['productos'] }),
  })
}
