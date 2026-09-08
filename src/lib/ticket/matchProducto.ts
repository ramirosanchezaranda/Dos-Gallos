import type { ItemTicket } from './parseTicket'

/**
 * Identificación del producto a partir del precio por kilo.
 *
 * La balanza de Dos Gallos no imprime el nombre del producto: solo peso,
 * $/kg e importe. Por eso el precio por kilo ES el identificador. Si las
 * supremas están a $4000/kg, un renglón con `4000.00$/kg` es supremas.
 *
 * Es un match numérico exacto, mucho más confiable que adivinar un nombre
 * sobre papel térmico. Sus dos límites:
 *
 *  1. Dos productos al mismo precio son indistinguibles → se ofrecen ambos
 *     y elige el usuario.
 *  2. Si cambiaron el precio en la balanza pero no en la app (o al revés),
 *     no matchea → el usuario elige a mano y se ofrece actualizar el precio.
 */

export interface ProductoCandidato {
  id: string
  nombre: string
  precio: number
  unidad: 'kg' | 'unidad'
  stock_actual: number
  activo: boolean
}

export type TipoMatch =
  /** Un solo producto activo con ese precio exacto. */
  | 'exacto'
  /** Varios productos comparten ese precio: hay que elegir. */
  | 'ambiguo'
  /** Ninguno coincide exactamente, pero hay alguno cerca (±2%). */
  | 'aproximado'
  /** Nada parecido: producto nuevo o precio desactualizado. */
  | 'sin_coincidencia'

export interface ResultadoMatch {
  tipo: TipoMatch
  /** Elegido automáticamente solo cuando `tipo === 'exacto'`. */
  sugerido: ProductoCandidato | null
  /** Todos los candidatos, ordenados por cercanía de precio. */
  candidatos: ProductoCandidato[]
}

/** Tolerancia para considerar un precio "cercano" (2%). */
const TOLERANCIA_APROX = 0.02

/**
 * Busca el producto que corresponde a un renglón del ticket.
 *
 * Los productos con precio 0 se ignoran: son los que todavía no tienen el
 * precio cargado y harían match con cualquier cosa.
 */
export function matchProducto(
  item: ItemTicket,
  productos: ProductoCandidato[],
): ResultadoMatch {
  const precio = item.precioUnitario
  const activos = productos.filter((p) => p.activo && p.precio > 0)

  const exactos = activos.filter((p) => Math.abs(p.precio - precio) < 0.01)

  if (exactos.length === 1) {
    return { tipo: 'exacto', sugerido: exactos[0], candidatos: exactos }
  }
  if (exactos.length > 1) {
    return { tipo: 'ambiguo', sugerido: null, candidatos: ordenarPorCercania(exactos, precio) }
  }

  const cercanos = activos.filter(
    (p) => Math.abs(p.precio - precio) / Math.max(p.precio, precio) <= TOLERANCIA_APROX,
  )
  if (cercanos.length > 0) {
    return {
      tipo: 'aproximado',
      sugerido: null,
      candidatos: ordenarPorCercania(cercanos, precio),
    }
  }

  // Sin coincidencia: devolvemos igual los 5 más cercanos, para que la
  // pantalla de revisión ofrezca algo en vez de una lista vacía.
  return {
    tipo: 'sin_coincidencia',
    sugerido: null,
    candidatos: ordenarPorCercania(activos, precio).slice(0, 5),
  }
}

function ordenarPorCercania(ps: ProductoCandidato[], precio: number): ProductoCandidato[] {
  return [...ps].sort((a, b) => Math.abs(a.precio - precio) - Math.abs(b.precio - precio))
}

/** Mensaje en castellano para mostrar junto al renglón. */
export function explicarMatch(r: ResultadoMatch, precio: number): string {
  switch (r.tipo) {
    case 'exacto':
      return `Identificado por el precio ($${precio.toLocaleString('es-AR')}/kg)`
    case 'ambiguo':
      return `${r.candidatos.length} productos están a $${precio.toLocaleString('es-AR')}/kg. Elegí cuál es.`
    case 'aproximado':
      return `Ningún producto está exactamente a $${precio.toLocaleString('es-AR')}/kg. ¿Cambió el precio?`
    case 'sin_coincidencia':
      return `No hay ningún producto a $${precio.toLocaleString('es-AR')}/kg. Elegilo o cargalo como nuevo.`
  }
}
