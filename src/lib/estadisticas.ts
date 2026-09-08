/**
 * Agregaciones para la pantalla de estadísticas. Son funciones puras sobre las
 * filas que ya trajo la consulta, así se pueden probar sin base de datos.
 */

export interface VentaResumen {
  fecha: string
  total: number
  metodo_pago: string | null
}

export interface ItemResumen {
  descripcion: string
  cantidad: number
  subtotal: number
}

/** Fecha local en formato YYYY-MM-DD. El negocio piensa en días, no en UTC. */
export const claveDia = (iso: string): string => new Date(iso).toLocaleDateString('en-CA')

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export interface PuntoDia {
  iso: string
  etiqueta: string
  total: number
  ventas: number
}

/** Serie de los últimos `dias` días, incluyendo los que no tuvieron ventas. */
export function porDia(ventas: VentaResumen[], dias: number, hasta = new Date()): PuntoDia[] {
  const acumulado = new Map<string, { total: number; ventas: number }>()
  for (const v of ventas) {
    const k = claveDia(v.fecha)
    const a = acumulado.get(k) ?? { total: 0, ventas: 0 }
    a.total += Number(v.total)
    a.ventas += 1
    acumulado.set(k, a)
  }

  const serie: PuntoDia[] = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hasta)
    d.setDate(d.getDate() - i)
    const iso = d.toLocaleDateString('en-CA')
    const a = acumulado.get(iso) ?? { total: 0, ventas: 0 }
    serie.push({ iso, etiqueta: String(d.getDate()), total: a.total, ventas: a.ventas })
  }
  return serie
}

export interface PuntoSemana {
  dia: string
  promedio: number
  total: number
  jornadas: number
}

/**
 * Promedio vendido por día de la semana. Se divide por la cantidad de jornadas
 * distintas, no por la de ventas: si abriste tres martes, el martes vale por tres.
 */
export function porDiaSemana(ventas: VentaResumen[]): PuntoSemana[] {
  const total = new Array(7).fill(0) as number[]
  const jornadas = Array.from({ length: 7 }, () => new Set<string>())

  for (const v of ventas) {
    const d = new Date(v.fecha)
    const i = d.getDay()
    total[i] += Number(v.total)
    jornadas[i].add(claveDia(v.fecha))
  }

  // Arranca el lunes, que es como se lee una semana de trabajo.
  const orden = [1, 2, 3, 4, 5, 6, 0]
  return orden.map((i) => ({
    dia: DIAS[i],
    total: total[i],
    jornadas: jornadas[i].size,
    promedio: jornadas[i].size > 0 ? total[i] / jornadas[i].size : 0,
  }))
}

export interface FilaProducto {
  nombre: string
  facturado: number
  cantidad: number
}

/** Productos ordenados por lo que facturaron. */
export function topProductos(items: ItemResumen[], limite = 8): FilaProducto[] {
  const m = new Map<string, FilaProducto>()
  for (const it of items) {
    const nombre = it.descripcion?.trim() || 'Sin nombre'
    const f = m.get(nombre) ?? { nombre, facturado: 0, cantidad: 0 }
    f.facturado += Number(it.subtotal)
    f.cantidad += Number(it.cantidad)
    m.set(nombre, f)
  }
  return [...m.values()].sort((a, b) => b.facturado - a.facturado).slice(0, limite)
}

export interface FilaMetodo {
  metodo: string
  total: number
  ventas: number
}

export function porMetodoPago(ventas: VentaResumen[]): FilaMetodo[] {
  const m = new Map<string, FilaMetodo>()
  for (const v of ventas) {
    const metodo = v.metodo_pago ?? 'Sin especificar'
    const f = m.get(metodo) ?? { metodo, total: 0, ventas: 0 }
    f.total += Number(v.total)
    f.ventas += 1
    m.set(metodo, f)
  }
  return [...m.values()].sort((a, b) => b.total - a.total)
}

/** Variación porcentual contra el período anterior. `null` si no hay con qué comparar. */
export function variacion(actual: number, anterior: number): number | null {
  if (!anterior) return null
  return ((actual - anterior) / anterior) * 100
}

export const suma = (ventas: VentaResumen[]): number =>
  ventas.reduce((a, v) => a + Number(v.total), 0)

export const ticketPromedio = (ventas: VentaResumen[]): number =>
  ventas.length > 0 ? suma(ventas) / ventas.length : 0
