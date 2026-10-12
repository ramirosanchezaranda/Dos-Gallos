import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { MetodoPago, Venta } from '../types/db'

/**
 * Ventas del mostrador.
 *
 * El flujo tiene dos velocidades: en el apuro se guarda solo la foto y la
 * venta queda incompleta; cuando hay un respiro se le carga el texto, el
 * importe y la forma de cobro.
 */

/** Días que se traen para el desglose por jornada. */
export const DIAS_VENTANA = 30

const inicioDeVentana = () => {
  const d = new Date()
  d.setDate(d.getDate() - DIAS_VENTANA)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

const CLAVE = ['ventas'] as const

/** Ventas de la ventana, de la más nueva a la más vieja. */
export function useVentas() {
  return useQuery({
    queryKey: [...CLAVE, 'ventana'],
    queryFn: async (): Promise<Venta[]> => {
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .gte('fecha', inicioDeVentana())
        .order('fecha', { ascending: false })
      if (error) throw error
      return data as Venta[]
    },
  })
}

export interface NuevaVenta {
  detalle: string
  total: number
  metodo_pago: MetodoPago | null
  /** Ruta del comprobante ya subido, si hay. */
  ticket_url: string | null
}

/** Guarda una venta completa: texto, importe y forma de cobro. */
export function useGuardarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: NuevaVenta): Promise<Venta> => {
      const { data, error } = await supabase
        .from('ventas')
        .insert({
          detalle: v.detalle.trim() || null,
          total: v.total,
          metodo_pago: v.metodo_pago,
          ticket_url: v.ticket_url,
          origen: 'manual',
          completa: true,
        })
        .select()
        .single()
      if (error) throw error
      return data as Venta
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLAVE }),
  })
}

/**
 * Anota la venta para completar después, con la foto si se pudo subir.
 *
 * El importe arranca en cero porque la columna no admite nulo; lo que marca
 * que todavía no es una venta de verdad es `completa`, y el desglose la
 * cuenta aparte para no ensuciar el total del día.
 *
 * `ticket_url` puede venir en nulo: si la foto no se pudo subir igual
 * conviene dejar anotada la venta, porque el apuro del mostrador no espera
 * y una venta sin foto se completa, pero una que nunca se guardó se pierde.
 */
export function useGuardarComprobante() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ticket_url: string | null): Promise<Venta> => {
      const { data, error } = await supabase
        .from('ventas')
        .insert({ total: 0, ticket_url, origen: 'ocr', completa: false })
        .select()
        .single()
      if (error) throw error
      return data as Venta
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLAVE }),
  })
}

/** Le pone texto, importe y forma de cobro a una venta que era solo foto. */
export function useCompletarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...v }: NuevaVenta & { id: string }) => {
      const { error } = await supabase
        .from('ventas')
        .update({
          detalle: v.detalle.trim() || null,
          total: v.total,
          metodo_pago: v.metodo_pago,
          completa: true,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLAVE }),
  })
}

export function useBorrarVenta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ventas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: CLAVE }),
  })
}
