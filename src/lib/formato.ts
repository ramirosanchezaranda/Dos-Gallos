/** Formateo de números y fechas en convención argentina. */

export const pesos = (n: number, decimales = 0): string =>
  n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })

/** Peso en kg con 3 decimales, como lo imprime la balanza. */
export const kilos = (n: number): string =>
  `${n.toLocaleString('es-AR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kg`

export const cantidad = (n: number, unidad: string): string =>
  unidad === 'kg' ? kilos(n) : `${n.toLocaleString('es-AR')} u.`

export const fechaCorta = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })

export const fechaLarga = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

/**
 * Una clave `2026-09-08` sola la lee como medianoche UTC y en Argentina cae
 * el día anterior. Con la hora explícita queda en horario local.
 */
const comoFecha = (iso: string): Date =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso)

/** Fecha sin ceros a la izquierda: `8/9/26`. */
export const fechaNumerica = (iso: string): string =>
  comoFecha(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  })

/** Día y fecha juntos, como se anota una jornada: `lunes 8/9/26`. */
export const diaYFecha = (iso: string): string =>
  `${comoFecha(iso).toLocaleDateString('es-AR', { weekday: 'long' })} ${fechaNumerica(iso)}`

export const horaCorta = (iso: string): string =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

/**
 * ID local para renglones en edición.
 *
 * `crypto.randomUUID()` solo existe en contexto seguro: probando la app por
 * IP de red local (http://192.168.x.x) no está definido y rompería la carga
 * de ventas. Este fallback evita ese caso.
 */
export const idLocal = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
