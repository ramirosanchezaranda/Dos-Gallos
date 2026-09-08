import type { Producto, Unidad } from '../types/db'

/** Un producto que se cobra y se cuenta distinto necesita el peso por pieza. */
export const necesitaPesoUnidad = (unidad: Unidad, unidadStock: Unidad) => unidad !== unidadStock

/**
 * Cuánto hay que descontar del stock al vender `cantidad`, que viene en la
 * unidad en que se cobra. `null` si falta el peso por pieza para convertir.
 *
 * Tiene que dar lo mismo que `registrar_venta()`, que es quien descuenta de verdad.
 */
export function descuentoDeStock(p: Producto, cantidad: number): number | null {
  if (p.unidad_stock === p.unidad) return cantidad
  if (!p.peso_unidad || p.peso_unidad <= 0) return null
  const enStock = p.unidad === 'kg' ? cantidad / p.peso_unidad : cantidad * p.peso_unidad
  return Math.round(enStock * 1000) / 1000
}
