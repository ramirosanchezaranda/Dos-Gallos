import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Pedido, PedidoItem, PedidoItemConProducto } from '../types/db'

// ─── Queries ─────────────────────────────────────────────────

export function usePedidos() {
  return useQuery({
    queryKey: ['pedidos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Pedido[]
    },
  })
}

export function usePedidoItems(pedidoId: string | null) {
  return useQuery({
    queryKey: ['pedido_items', pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedido_items')
        .select('*, productos(nombre)')
        .eq('pedido_id', pedidoId!)
        .order('created_at')
      if (error) throw error
      return (data ?? []).map((row: PedidoItem & { productos: { nombre: string } | null }) => ({
        ...row,
        producto_nombre: row.productos?.nombre ?? null,
        productos: undefined,
      })) as PedidoItemConProducto[]
    },
  })
}

// ─── Mutations ───────────────────────────────────────────────

type NuevoPedido = Pick<Pedido, 'proveedor' | 'notas'> & { items: NuevoItem[] }
type NuevoItem = Pick<PedidoItem, 'producto_id' | 'descripcion' | 'cantidad_pedida' | 'unidad' | 'cantidad_estimada_kg'>

export function useCrearPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nuevo: NuevoPedido) => {
      const { data: pedido, error: ep } = await supabase
        .from('pedidos')
        .insert({ proveedor: nuevo.proveedor || null, notas: nuevo.notas || null })
        .select()
        .single()
      if (ep) throw ep

      if (nuevo.items.length > 0) {
        const { error: ei } = await supabase.from('pedido_items').insert(
          nuevo.items.map((it) => ({ ...it, pedido_id: pedido.id })),
        )
        if (ei) throw ei
      }
      return pedido as Pedido
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}

export function useActualizarEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      estado,
      costo_total,
    }: {
      id: string
      estado: Pedido['estado']
      costo_total?: number | null
    }) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado, costo_total: costo_total ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}

export function useRegistrarRecibo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      pedidoId,
      items,
      costo_total,
    }: {
      pedidoId: string
      items: { id: string; cantidad_recibida: number; producto_id: string | null }[]
      costo_total: number | null
    }) => {
      // Update items with received quantities
      for (const it of items) {
        const { error } = await supabase
          .from('pedido_items')
          .update({ cantidad_recibida: it.cantidad_recibida })
          .eq('id', it.id)
        if (error) throw error

        // Add to stock if product is linked
        if (it.producto_id && it.cantidad_recibida > 0) {
          const { data: prod } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', it.producto_id)
            .single()
          if (prod) {
            const nuevo = Number(prod.stock_actual) + it.cantidad_recibida
            await supabase.from('productos').update({ stock_actual: nuevo }).eq('id', it.producto_id)
            await supabase.from('movimientos_stock').insert({
              producto_id: it.producto_id,
              tipo: 'ingreso',
              cantidad: it.cantidad_recibida,
              motivo: 'pedido recibido',
            })
          }
        }
      }

      // Mark order as received
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'recibido', costo_total })
        .eq('id', pedidoId)
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pedidos'] })
      qc.invalidateQueries({ queryKey: ['pedido_items', vars.pedidoId] })
      qc.invalidateQueries({ queryKey: ['productos'] })
    },
  })
}

export function useBorrarPedido() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pedidos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pedidos'] }),
  })
}
