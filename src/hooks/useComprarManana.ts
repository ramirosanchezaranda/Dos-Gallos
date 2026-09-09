import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useProductos } from './useProductos'
import { usePedidos } from './usePedidos'

export interface SugerenciaCompra {
  producto_id: string
  nombre: string
  stockActual: number
  unidad: string
  promedioVentaDiaria: number  // en unidad del producto
  diasRestantes: number | null // stock / promedio — null si promedio = 0
  cantidadPedida: number       // ya pedida (pendiente)
  sugerido: number             // cuánto comprar (aproximado)
}

const DIAS_MUESTRA = 28
const DIAS_OBJETIVO = 3  // stock para cubrir 3 días

const inicio28 = () => {
  const d = new Date()
  d.setDate(d.getDate() - DIAS_MUESTRA)
  return d.toISOString()
}

/** Items vendidos en los últimos 28 días, con producto_id y fecha. */
function useItemsConProducto() {
  return useQuery({
    queryKey: ['comprar_manana', 'items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('venta_items')
        .select('producto_id, cantidad, ventas!inner(fecha)')
        .not('producto_id', 'is', null)
        .gte('ventas.fecha', inicio28())
      if (error) throw error
      return (data as unknown as { producto_id: string; cantidad: number; ventas: { fecha: string } }[]).map(
        (r) => ({ producto_id: r.producto_id, cantidad: Number(r.cantidad), fecha: r.ventas.fecha }),
      )
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useComprarManana() {
  const { data: productos = [] } = useProductos()
  const { data: items = [] } = useItemsConProducto()
  const { data: pedidos = [] } = usePedidos()

  // pedidos used to detect if anything is pending (future: join items)
  void pedidos

  // Build the suggestion list
  const sugerencias: SugerenciaCompra[] = []

  for (const prod of productos) {
    if (!prod.activo) continue

    // Average daily sales for this product
    const ventas = items.filter((it) => it.producto_id === prod.id)
    const totalVendido = ventas.reduce((s, it) => s + it.cantidad, 0)
    const promedioDiario = totalVendido / DIAS_MUESTRA

    const stock = Number(prod.stock_actual)
    const diasRestantes = promedioDiario > 0 ? Math.round(stock / promedioDiario) : null

    // Only suggest if stock covers less than DIAS_OBJETIVO days
    if (diasRestantes !== null && diasRestantes >= DIAS_OBJETIVO) continue
    // If no sales history and stock above minimum, skip
    if (diasRestantes === null && stock >= prod.stock_minimo) continue

    // Quantity already ordered (pending)
    // We use pedido_items, but we can't easily join here without extra queries.
    // Use a simple estimate: check if any pending pedido has this product.
    const cantidadPedida = 0 // will be enriched by component if needed

    // How much to suggest: enough for DIAS_OBJETIVO days minus current stock
    const necesario = promedioDiario * DIAS_OBJETIVO
    const sugerido = Math.max(0, necesario - stock)

    sugerencias.push({
      producto_id: prod.id,
      nombre: prod.nombre,
      stockActual: stock,
      unidad: prod.unidad,
      promedioVentaDiaria: Math.round(promedioDiario * 100) / 100,
      diasRestantes,
      cantidadPedida,
      sugerido: Math.round(sugerido * 10) / 10,
    })
  }

  // Sort: products with no stock first, then by days remaining ascending
  sugerencias.sort((a, b) => {
    const da = a.diasRestantes ?? -1
    const db = b.diasRestantes ?? -1
    return da - db
  })

  return { sugerencias, isLoading: productos.length === 0 }
}
