import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Factura, EstadoFactura } from '../types/db'

export function useFacturas() {
  return useQuery({
    queryKey: ['facturas'],
    queryFn: async (): Promise<Factura[]> => {
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Factura[]
    },
  })
}

type NuevaFactura = Omit<Factura, 'id' | 'created_at'>

export function useGuardarFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...f }: Partial<NuevaFactura> & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from('facturas').update(f).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('facturas').insert(f as NuevaFactura)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }),
  })
}

export function useBorrarFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('facturas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['facturas'] }),
  })
}

/**
 * Estado real de la factura.
 *
 * "Vencida" no se guarda en la base: se deriva de la fecha, porque una
 * factura pendiente se vuelve vencida sola con el paso del tiempo y nadie
 * va a estar actualizando el campo a mano.
 */
export function estadoReal(f: Factura): EstadoFactura {
  if (f.estado === 'pagada' || f.estado === 'anulada') return f.estado
  if (!f.fecha_vencimiento) return 'pendiente'
  const hoy = new Date().toISOString().slice(0, 10)
  return f.fecha_vencimiento < hoy ? 'vencida' : 'pendiente'
}

/** Días hasta el vencimiento; negativo si ya venció. */
export function diasParaVencer(f: Factura): number | null {
  if (!f.fecha_vencimiento) return null
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const venc = new Date(`${f.fecha_vencimiento}T00:00:00`)
  return Math.round((venc.getTime() - hoy.getTime()) / 86400000)
}
