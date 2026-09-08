import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ItemVentaRPC, MetodoPago, OrigenVenta, Venta } from '../types/db'

export function useVentasDelDia() {
  return useQuery({
    queryKey: ['ventas', 'hoy'],
    queryFn: async (): Promise<Venta[]> => {
      const desde = new Date()
      desde.setHours(0, 0, 0, 0)
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .gte('fecha', desde.toISOString())
        .order('fecha', { ascending: false })
      if (error) throw error
      return data as Venta[]
    },
  })
}

export function useUltimasVentas(limite = 20) {
  return useQuery({
    queryKey: ['ventas', 'ultimas', limite],
    queryFn: async (): Promise<Venta[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(limite)
      if (error) throw error
      return data as Venta[]
    },
  })
}

export interface RegistrarVentaArgs {
  items: ItemVentaRPC[]
  metodo_pago?: MetodoPago | null
  origen?: OrigenVenta
  ticket_nro?: string | null
  ticket_url?: string | null
  ocr_raw?: string | null
}

/**
 * Registra la venta llamando a la función de Postgres, que hace venta +
 * ítems + descuento de stock en una sola transacción. Si algo falla, no
 * queda nada a medias.
 */
export function useRegistrarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: RegistrarVentaArgs): Promise<string> => {
      const { data, error } = await supabase.rpc('registrar_venta', {
        p_items: args.items,
        p_metodo_pago: args.metodo_pago ?? undefined,
        p_origen: args.origen ?? 'manual',
        p_ticket_nro: args.ticket_nro ?? undefined,
        p_ticket_url: args.ticket_url ?? undefined,
        p_ocr_raw: args.ocr_raw ?? undefined,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ventas'] })
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}
