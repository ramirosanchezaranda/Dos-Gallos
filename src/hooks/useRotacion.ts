import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProductos, useCategorias } from './useProductos'
import { calcularRotacion, diasEnVenderse, type EntradaRotacion } from '../lib/rotacion'

/** Ventana nominal. La real depende de desde cuándo hay ventas cargadas. */
export const VENTANA_ROTACION = 28

const desdeISO = (dias: number) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString()
}

const DIA_MS = 86_400_000

interface VentaProducto {
  producto_id: string
  cantidad: number
  fecha: string
}

/** Ventas por producto de la ventana, con fecha para poder fechar las partidas. */
function useVentasPorProducto() {
  return useQuery({
    queryKey: ['rotacion', 'ventas'],
    queryFn: async (): Promise<VentaProducto[]> => {
      const { data, error } = await supabase
        .from('venta_items')
        .select('producto_id, cantidad, ventas!inner(fecha)')
        .not('producto_id', 'is', null)
        .gte('ventas.fecha', desdeISO(VENTANA_ROTACION))
      if (error) throw error
      return (data as unknown as { producto_id: string; cantidad: number; ventas: { fecha: string } }[]).map(
        (r) => ({ producto_id: r.producto_id, cantidad: Number(r.cantidad), fecha: r.ventas.fecha }),
      )
    },
    staleTime: 5 * 60 * 1000,
  })
}

interface PartidaRecibida {
  producto_id: string
  cantidad: number
  costo_unitario: number | null
  recibido_el: string
}

/** Partidas ya recibidas: dan el costo real y la fecha de entrada de cada lote. */
function usePartidas() {
  return useQuery({
    queryKey: ['rotacion', 'partidas'],
    queryFn: async (): Promise<PartidaRecibida[]> => {
      const { data, error } = await supabase
        .from('pedido_items')
        .select('producto_id, cantidad_recibida, costo_unitario, pedidos!inner(estado, fecha)')
        .not('producto_id', 'is', null)
        .not('cantidad_recibida', 'is', null)
        .eq('pedidos.estado', 'recibido')
      if (error) throw error
      return (
        data as unknown as {
          producto_id: string
          cantidad_recibida: number
          costo_unitario: number | null
          pedidos: { fecha: string }
        }[]
      ).map((r) => ({
        producto_id: r.producto_id,
        cantidad: Number(r.cantidad_recibida),
        costo_unitario: r.costo_unitario === null ? null : Number(r.costo_unitario),
        recibido_el: r.pedidos.fecha,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export interface Historial {
  producto_id: string
  nombre: string
  dias: number
  cantidad: number
  unidad: string
}

export function useRotacion() {
  const { data: productos = [], isLoading: cargandoProd } = useProductos()
  const { data: categorias = [] } = useCategorias()
  const { data: ventas = [], isLoading: cargandoVentas } = useVentasPorProducto()
  const { data: partidas = [] } = usePartidas()

  const vidaPorCategoria = new Map(categorias.map((c) => [c.id, c.vida_util_dias]))

  // Días de datos reales: desde la venta más vieja hasta hoy. Con una semana
  // de uso no tiene sentido dividir por 28, exagera lo lento que rota todo.
  const masVieja = ventas.reduce<number | null>((min, v) => {
    const t = new Date(v.fecha).getTime()
    return min === null || t < min ? t : min
  }, null)
  const diasReales =
    masVieja === null
      ? 0
      : Math.min(VENTANA_ROTACION, Math.max(1, Math.ceil((Date.now() - masVieja) / DIA_MS)))

  // Último costo conocido por producto.
  const costoPorProducto = new Map<string, number>()
  for (const p of [...partidas].sort((a, b) => a.recibido_el.localeCompare(b.recibido_el))) {
    if (p.costo_unitario !== null) costoPorProducto.set(p.producto_id, p.costo_unitario)
  }

  const vendidoPorProducto = new Map<string, number>()
  for (const v of ventas) {
    vendidoPorProducto.set(v.producto_id, (vendidoPorProducto.get(v.producto_id) ?? 0) + v.cantidad)
  }

  const entradas: EntradaRotacion[] = productos
    .filter((p) => p.activo)
    .map((p) => ({
      producto_id: p.id,
      nombre: p.nombre,
      unidad: p.unidad_stock,
      stock: Number(p.stock_actual),
      precio: Number(p.precio),
      costoUnitario: costoPorProducto.get(p.id) ?? null,
      vidaUtilDias: (p.categoria_id && vidaPorCategoria.get(p.categoria_id)) || 7,
      vendido: vendidoPorProducto.get(p.id) ?? 0,
    }))

  const filas = calcularRotacion(entradas, diasReales)

  // Historial: cuánto tardó en venderse cada partida ya cubierta.
  const nombrePorProducto = new Map(productos.map((p) => [p.id, p]))
  const historial: Historial[] = []
  for (const partida of partidas) {
    const prod = nombrePorProducto.get(partida.producto_id)
    if (!prod) continue
    const dias = diasEnVenderse(
      partida.recibido_el,
      partida.cantidad,
      ventas.filter((v) => v.producto_id === partida.producto_id),
    )
    if (dias !== null) {
      historial.push({
        producto_id: partida.producto_id,
        nombre: prod.nombre,
        dias,
        cantidad: partida.cantidad,
        unidad: prod.unidad_stock,
      })
    }
  }
  historial.sort((a, b) => a.dias - b.dias)

  return {
    filas,
    historial,
    diasReales,
    partidasSeguidas: partidas.length,
    isLoading: cargandoProd || cargandoVentas,
  }
}

/** Edición de la vida útil de cada categoría. */
export function useGuardarVidaUtil() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, dias }: { id: string; dias: number }) => {
      const { error } = await supabase
        .from('categorias')
        .update({ vida_util_dias: dias })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}
