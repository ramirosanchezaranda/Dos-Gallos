/**
 * Rotación: qué tan rápido se mueve cada producto y qué te deja.
 *
 * Mira lo contrario que "Comprar mañana". Esa avisa lo que se está por
 * acabar; esta avisa lo que sobra, lo que se vence antes de venderse y lo
 * que ocupa lugar sin dejar plata.
 *
 * Todo es función pura: la fuente de datos vive en el hook.
 */

export type Riesgo = 'alto' | 'medio' | 'bajo' | 'sin-datos'

export interface EntradaRotacion {
  producto_id: string
  nombre: string
  unidad: string
  stock: number
  precio: number
  /** Costo por unidad si algún pedido lo registró. Sin esto no hay margen. */
  costoUnitario: number | null
  vidaUtilDias: number
  /** Unidades vendidas en la ventana. */
  vendido: number
}

export interface FilaRotacion {
  producto_id: string
  nombre: string
  unidad: string
  stock: number
  /** Unidades por día. */
  velocidad: number
  /** Días que tarda en agotarse el stock. `null` si no se vende nada. */
  diasDeStock: number | null
  vidaUtilDias: number
  /** Días que sobran por encima de la vida útil. Positivo = se echa a perder. */
  exceso: number | null
  riesgo: Riesgo
  /** Lo que factura por día. Siempre se puede calcular. */
  facturacionDia: number
  /** Ganancia por día. `null` mientras no se conozca el costo. */
  margenDia: number | null
}

/** Con qué vara se compara la lista entera. */
export type Base = 'margen' | 'facturacion'

/** Unidades vendidas por día. `dias` es la ventana real de datos, no la nominal. */
export const velocidad = (vendido: number, dias: number): number =>
  dias <= 0 ? 0 : vendido / dias

/** Días hasta agotar el stock al ritmo actual. `null` si no hay ventas. */
export const diasDeStock = (stock: number, vel: number): number | null =>
  vel <= 0 ? null : stock / vel

/**
 * Riesgo de merma. Compara cuánto tarda en venderse contra cuánto aguanta:
 * 10 días de stock congelado está bien, 10 días de pollo fresco es pérdida.
 */
export function riesgoMerma(dias: number | null, vidaUtil: number): Riesgo {
  if (dias === null) return 'sin-datos'
  if (vidaUtil <= 0) return 'sin-datos'
  if (dias > vidaUtil) return 'alto'
  if (dias > vidaUtil * 0.75) return 'medio'
  return 'bajo'
}

/**
 * Plata que deja por día de heladera, en las dos varas.
 *
 * Se calculan por separado a propósito: mezclar el margen de un producto con
 * la facturación de otro en un mismo ranking compara cosas distintas y deja
 * arriba al que tiene menos datos cargados.
 */
export function plataPorDia(
  vel: number,
  precio: number,
  costoUnitario: number | null,
): { facturacionDia: number; margenDia: number | null } {
  return {
    facturacionDia: vel * precio,
    margenDia: costoUnitario === null ? null : vel * (precio - costoUnitario),
  }
}

const redondear = (n: number, decimales = 2) => {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

export function calcularRotacion(
  entradas: EntradaRotacion[],
  diasVentana: number,
): FilaRotacion[] {
  return entradas.map((e) => {
    const vel = velocidad(e.vendido, diasVentana)
    const dias = diasDeStock(e.stock, vel)
    const plata = plataPorDia(vel, e.precio, e.costoUnitario)
    return {
      producto_id: e.producto_id,
      nombre: e.nombre,
      unidad: e.unidad,
      stock: e.stock,
      velocidad: redondear(vel),
      diasDeStock: dias === null ? null : redondear(dias, 1),
      vidaUtilDias: e.vidaUtilDias,
      exceso: dias === null ? null : redondear(dias - e.vidaUtilDias, 1),
      riesgo: riesgoMerma(dias, e.vidaUtilDias),
      facturacionDia: Math.round(plata.facturacionDia),
      margenDia: plata.margenDia === null ? null : Math.round(plata.margenDia),
    }
  })
}

/**
 * Con qué vara comparar. Solo hay margen si se conoce el costo de todos:
 * con uno solo sin cargar, el ranking mezclaría ganancia con facturación.
 */
export const baseDeLista = (filas: FilaRotacion[]): Base =>
  filas.length > 0 && filas.every((f) => f.margenDia !== null) ? 'margen' : 'facturacion'

/** El valor de la fila según la vara elegida. */
export const valorSegun = (f: FilaRotacion, base: Base): number =>
  base === 'margen' ? f.margenDia ?? 0 : f.facturacionDia

const ORDEN_RIESGO: Record<Riesgo, number> = { alto: 0, medio: 1, 'sin-datos': 2, bajo: 3 }

/** Lo que se echa a perder primero: más riesgo arriba, y a igual riesgo más exceso. */
export const porMerma = (filas: FilaRotacion[]): FilaRotacion[] =>
  [...filas].sort(
    (a, b) =>
      ORDEN_RIESGO[a.riesgo] - ORDEN_RIESGO[b.riesgo] ||
      (b.exceso ?? -Infinity) - (a.exceso ?? -Infinity),
  )

/** Lo que más plata deja por día arriba, todos medidos con la misma vara. */
export const porPlata = (filas: FilaRotacion[], base: Base): FilaRotacion[] =>
  [...filas].sort((a, b) => valorSegun(b, base) - valorSegun(a, base))

/**
 * Cuántos días tardó en venderse una partida.
 *
 * Suma lo vendido desde que entró hasta cubrir la cantidad recibida.
 * `null` mientras todavía quede mercadería de esa partida.
 */
export function diasEnVenderse(
  recibidoEl: string,
  cantidad: number,
  ventas: { fecha: string; cantidad: number }[],
): number | null {
  if (cantidad <= 0) return null
  const desde = new Date(recibidoEl).getTime()
  const posteriores = ventas
    .map((v) => ({ t: new Date(v.fecha).getTime(), cantidad: v.cantidad }))
    .filter((v) => v.t >= desde)
    .sort((a, b) => a.t - b.t)

  let acumulado = 0
  for (const v of posteriores) {
    acumulado += v.cantidad
    if (acumulado >= cantidad) {
      return Math.max(0, Math.round((v.t - desde) / 86_400_000))
    }
  }
  return null
}
