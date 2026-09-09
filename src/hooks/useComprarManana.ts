import { useProductos } from './useProductos'
import { useRotacion } from './useRotacion'

/**
 * La mirada opuesta a la card de Rotación.
 *
 * Rotación avisa lo que sobra y se echa a perder; esta avisa lo que se acaba.
 * Las dos salen del mismo cálculo de velocidad para que nunca se contradigan.
 */

export interface SugerenciaCompra {
  producto_id: string
  nombre: string
  stockActual: number
  unidad: string
  promedioVentaDiaria: number
  /** Días que dura el stock. `null` si no hubo ventas en la ventana. */
  diasRestantes: number | null
  /** Cuánto comprar para cubrir los próximos días. */
  sugerido: number
}

/** Días de stock que se quieren tener cubiertos. */
const DIAS_OBJETIVO = 3

export function useComprarManana() {
  const { data: productos = [] } = useProductos()
  const { filas, diasReales, isLoading } = useRotacion()

  const minimoPorProducto = new Map(
    productos.map((p) => [p.id, Number(p.stock_minimo)]),
  )

  const sugerencias: SugerenciaCompra[] = []

  for (const f of filas) {
    const bajoMinimo = f.stock < (minimoPorProducto.get(f.producto_id) ?? 0)

    // Sin ventas no se puede proyectar: solo entra si ya está bajo el mínimo.
    if (f.diasDeStock === null) {
      if (!bajoMinimo) continue
    } else if (f.diasDeStock >= DIAS_OBJETIVO) {
      continue
    }

    sugerencias.push({
      producto_id: f.producto_id,
      nombre: f.nombre,
      stockActual: f.stock,
      unidad: f.unidad,
      promedioVentaDiaria: f.velocidad,
      diasRestantes: f.diasDeStock === null ? null : Math.round(f.diasDeStock),
      sugerido: Math.round(Math.max(0, f.velocidad * DIAS_OBJETIVO - f.stock) * 10) / 10,
    })
  }

  // Lo que primero se queda sin stock, arriba.
  sugerencias.sort((a, b) => (a.diasRestantes ?? -1) - (b.diasRestantes ?? -1))

  return { sugerencias, diasReales, isLoading }
}
