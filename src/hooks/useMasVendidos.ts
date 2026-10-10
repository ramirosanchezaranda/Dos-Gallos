import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Los productos que más veces se vendieron últimamente.
 *
 * Se cuenta por cantidad de veces que aparecieron en una venta, no por
 * kilos: para elegir rápido en el mostrador importa lo que más seguido se
 * pide, no lo que más pesa.
 */

const DIAS = 30

const desde = () => {
  const d = new Date()
  d.setDate(d.getDate() - DIAS)
  return d.toISOString()
}

export function useMasVendidos(limite = 6) {
  return useQuery({
    queryKey: ['mas_vendidos', limite],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('venta_items')
        .select('producto_id, ventas!inner(fecha)')
        .not('producto_id', 'is', null)
        .gte('ventas.fecha', desde())
      if (error) throw error

      const veces = new Map<string, number>()
      for (const r of data as unknown as { producto_id: string }[]) {
        veces.set(r.producto_id, (veces.get(r.producto_id) ?? 0) + 1)
      }

      return [...veces.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limite)
        .map(([id]) => id)
    },
  })
}
