/**
 * Desglose de lo vendido por día y por forma de cobro.
 *
 * Es la cuenta que se hace al cerrar: cuánto entró en total, cuánto por
 * cada medio, y qué queda pendiente de completar.
 */

import { claveDia } from './estadisticas'

export type Metodo = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'

export const METODOS: Metodo[] = ['efectivo', 'debito', 'credito', 'transferencia', 'qr']

export const LABEL_METODO: Record<Metodo, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  qr: 'QR',
}

/** Nombre corto para los lugares angostos del celular. */
export const CORTO_METODO: Record<Metodo, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transf.',
  qr: 'QR',
}

export interface VentaDesglosable {
  fecha: string
  total: number
  metodo_pago: string | null
  completa: boolean
}

export interface LineaMetodo {
  metodo: Metodo | 'sin_metodo'
  label: string
  total: number
  ventas: number
  /** Qué parte del día se cobró así, de 0 a 1. */
  porcion: number
}

export interface DesgloseDia {
  /** Clave YYYY-MM-DD, ordenable como texto. */
  dia: string
  total: number
  ventas: number
  /** Ventas que todavía son solo la foto. No suman al total. */
  pendientes: number
  /** Solo los medios que se usaron ese día, de mayor a menor. */
  lineas: LineaMetodo[]
}

const esMetodo = (m: string | null): m is Metodo =>
  m !== null && (METODOS as string[]).includes(m)

/**
 * Agrupa las ventas de un día por forma de cobro.
 *
 * Las incompletas se cuentan aparte y no entran en el total: todavía no
 * tienen importe, y sumarlas como cero haría creer que el día cerró en
 * menos de lo que fue.
 */
export function desglosarDia(ventas: VentaDesglosable[], dia: string): DesgloseDia {
  const completas = ventas.filter((v) => v.completa)
  const pendientes = ventas.length - completas.length

  const acumulado = new Map<Metodo | 'sin_metodo', { total: number; ventas: number }>()
  for (const v of completas) {
    const k = esMetodo(v.metodo_pago) ? v.metodo_pago : 'sin_metodo'
    const a = acumulado.get(k) ?? { total: 0, ventas: 0 }
    a.total += Number(v.total)
    a.ventas += 1
    acumulado.set(k, a)
  }

  const total = completas.reduce((s, v) => s + Number(v.total), 0)

  const lineas: LineaMetodo[] = [...acumulado.entries()]
    .map(([metodo, a]) => ({
      metodo,
      label: metodo === 'sin_metodo' ? 'Sin especificar' : LABEL_METODO[metodo],
      total: a.total,
      ventas: a.ventas,
      porcion: total > 0 ? a.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total)

  return { dia, total, ventas: completas.length, pendientes, lineas }
}

/** Un desglose por cada día con ventas, del más reciente al más viejo. */
export function desglosarPorDia(ventas: VentaDesglosable[]): DesgloseDia[] {
  const porDia = new Map<string, VentaDesglosable[]>()
  for (const v of ventas) {
    const k = claveDia(v.fecha)
    const lista = porDia.get(k)
    if (lista) lista.push(v)
    else porDia.set(k, [v])
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, delDia]) => desglosarDia(delDia, dia))
}

/** Minutos desde que se cargó una venta. */
export const minutosDesde = (iso: string, ahora = Date.now()): number =>
  Math.max(0, Math.floor((ahora - new Date(iso).getTime()) / 60000))

/**
 * Ventas con la foto cargada que ya llevan rato esperando el texto.
 *
 * El margen evita que el recordatorio salte encima apenas sacaste la foto,
 * que es justo cuando no tenés tiempo de completarla.
 */
export function pendientesDeCompletar<T extends { fecha: string; completa: boolean }>(
  ventas: T[],
  minutosMinimos = 5,
  ahora = Date.now(),
): T[] {
  return ventas
    .filter((v) => !v.completa && minutosDesde(v.fecha, ahora) >= minutosMinimos)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}
