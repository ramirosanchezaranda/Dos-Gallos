import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { ItemResumen, VentaResumen } from '../lib/estadisticas'

/** Días que se traen de una vez: alcanza para comparar meses y ver la semana típica. */
export const VENTANA_DIAS = 95

const inicioDeVentana = () => {
  const d = new Date()
  d.setDate(d.getDate() - VENTANA_DIAS)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Ventas de la ventana, livianas: solo lo que las estadísticas necesitan. */
export function useVentasVentana() {
  return useQuery({
    queryKey: ['estadisticas', 'ventas'],
    queryFn: async (): Promise<VentaResumen[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('fecha,total,metodo_pago')
        .gte('fecha', inicioDeVentana().toISOString())
        .order('fecha')
      if (error) throw error
      return data as VentaResumen[]
    },
  })
}

/** Ítems vendidos en la ventana. La fecha vive en `ventas`, por eso el join. */
export function useItemsVentana() {
  return useQuery({
    queryKey: ['estadisticas', 'items'],
    queryFn: async (): Promise<(ItemResumen & { fecha: string })[]> => {
      const { data, error } = await supabase
        .from('venta_items')
        .select('descripcion,cantidad,subtotal,ventas!inner(fecha)')
        .gte('ventas.fecha', inicioDeVentana().toISOString())
      if (error) throw error
      return (data as unknown as RawItem[]).map((r) => ({
        descripcion: r.descripcion ?? '',
        cantidad: Number(r.cantidad),
        subtotal: Number(r.subtotal),
        fecha: r.ventas.fecha,
      }))
    },
  })
}

type RawItem = {
  descripcion: string | null
  cantidad: number
  subtotal: number
  ventas: { fecha: string }
}

/** Gastos de la ventana, para poder restarlos de lo vendido. */
export function useGastosVentana() {
  return useQuery({
    queryKey: ['estadisticas', 'gastos'],
    queryFn: async (): Promise<{ fecha: string; monto: number }[]> => {
      const { data, error } = await supabase
        .from('gastos')
        .select('fecha,monto')
        .gte('fecha', inicioDeVentana().toISOString().slice(0, 10))
      if (error) throw error
      return (data as { fecha: string; monto: number }[]).map((g) => ({
        fecha: g.fecha,
        monto: Number(g.monto),
      }))
    },
  })
}
