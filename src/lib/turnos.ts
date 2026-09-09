/**
 * Los dos turnos del mostrador: mañana de 9 a 13:30, tarde de 17 a 20:30.
 *
 * Sirve para leer el día como se trabaja de verdad — cuánto entró en cada
 * atención — en vez de un total suelto que no dice en qué momento se vendió.
 */

import { claveDia } from './estadisticas'

export type Turno = 'manana' | 'tarde' | 'fuera'

interface DefTurno {
  id: Turno
  label: string
  /** Minutos desde medianoche. Los dos extremos entran. */
  desde: number
  hasta: number
}

const hm = (h: number, m = 0) => h * 60 + m

export const TURNOS: DefTurno[] = [
  { id: 'manana', label: 'Mañana', desde: hm(9), hasta: hm(13, 30) },
  { id: 'tarde', label: 'Tarde', desde: hm(17), hasta: hm(20, 30) },
]

export const LABEL_TURNO: Record<Turno, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  fuera: 'Fuera de horario',
}

/** Vacío en `fuera`: no tiene un rango propio y el título ya lo dice. */
export const HORARIO_TURNO: Record<Turno, string> = {
  manana: '9:00 a 13:30',
  tarde: '17:00 a 20:30',
  fuera: '',
}

/** En qué turno cae una venta. Lo que no entra en ninguno es `fuera`. */
export function turnoDe(iso: string): Turno {
  const d = new Date(iso)
  const min = d.getHours() * 60 + d.getMinutes()
  const t = TURNOS.find((x) => min >= x.desde && min <= x.hasta)
  return t ? t.id : 'fuera'
}

export interface VentaEnTurno {
  fecha: string
  total: number
}

export interface BloqueTurno<V extends VentaEnTurno> {
  turno: Turno
  label: string
  horario: string
  ventas: V[]
  total: number
}

export interface DiaConTurnos<V extends VentaEnTurno> {
  /** Clave YYYY-MM-DD, ordenable como texto. */
  dia: string
  total: number
  cantidad: number
  bloques: BloqueTurno<V>[]
}

const bloqueVacio = <V extends VentaEnTurno>(turno: Turno): BloqueTurno<V> => ({
  turno,
  label: LABEL_TURNO[turno],
  horario: HORARIO_TURNO[turno],
  ventas: [],
  total: 0,
})

/**
 * Parte las ventas de un día en sus turnos.
 *
 * Mañana y tarde salen siempre, aunque estén en cero: un turno sin ventas es
 * información, no una fila que haya que esconder. "Fuera de horario" solo
 * aparece si de verdad hubo alguna.
 */
export function porTurno<V extends VentaEnTurno>(ventas: V[]): BloqueTurno<V>[] {
  const bloques: Record<Turno, BloqueTurno<V>> = {
    manana: bloqueVacio('manana'),
    tarde: bloqueVacio('tarde'),
    fuera: bloqueVacio('fuera'),
  }

  for (const v of ventas) {
    const b = bloques[turnoDe(v.fecha)]
    b.ventas.push(v)
    b.total += Number(v.total)
  }

  for (const b of Object.values(bloques)) {
    b.ventas.sort((a, z) => a.fecha.localeCompare(z.fecha))
  }

  const salida = [bloques.manana, bloques.tarde]
  if (bloques.fuera.ventas.length > 0) salida.push(bloques.fuera)
  return salida
}

/** Agrupa por día (más reciente primero) y adentro por turno. */
export function porDiaYTurno<V extends VentaEnTurno>(ventas: V[]): DiaConTurnos<V>[] {
  const porDia = new Map<string, V[]>()
  for (const v of ventas) {
    const k = claveDia(v.fecha)
    const lista = porDia.get(k)
    if (lista) lista.push(v)
    else porDia.set(k, [v])
  }

  return [...porDia.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([dia, delDia]) => ({
      dia,
      total: delDia.reduce((s, v) => s + Number(v.total), 0),
      cantidad: delDia.length,
      bloques: porTurno(delDia),
    }))
}

/** Totales por día, para pintar el calendario. */
export function totalesPorDia<V extends VentaEnTurno>(ventas: V[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const v of ventas) {
    const k = claveDia(v.fecha)
    m.set(k, (m.get(k) ?? 0) + Number(v.total))
  }
  return m
}
