import { describe, it, expect } from 'vitest'
import {
  porDia,
  porDiaSemana,
  topProductos,
  porMetodoPago,
  variacion,
  ticketPromedio,
} from './estadisticas'
import type { VentaResumen } from './estadisticas'

/** Mediodía UTC: cae el mismo día en cualquier huso de América. */
const venta = (dia: string, total: number, metodo: string | null = 'efectivo'): VentaResumen => ({
  fecha: `${dia}T12:00:00Z`,
  total,
  metodo_pago: metodo,
})

describe('porDia', () => {
  const hasta = new Date('2026-09-08T12:00:00Z')

  it('rellena con cero los días sin ventas', () => {
    const serie = porDia([venta('2026-09-08', 1000)], 3, hasta)
    expect(serie).toHaveLength(3)
    expect(serie.map((p) => p.total)).toEqual([0, 0, 1000])
  })

  it('suma varias ventas del mismo día', () => {
    const serie = porDia([venta('2026-09-07', 500), venta('2026-09-07', 300)], 2, hasta)
    expect(serie[0]).toMatchObject({ total: 800, ventas: 2 })
  })

  it('deja afuera lo anterior a la ventana', () => {
    const serie = porDia([venta('2026-08-01', 9999), venta('2026-09-08', 100)], 2, hasta)
    expect(suma_serie(serie)).toBe(100)
  })

  const suma_serie = (s: { total: number }[]) => s.reduce((a, p) => a + p.total, 0)
})

describe('porDiaSemana', () => {
  it('promedia por jornada, no por venta', () => {
    // Dos martes: uno con dos ventas de 500, otro con una de 1000.
    // Total 2000 en 2 jornadas = 1000 de promedio.
    const filas = porDiaSemana([
      venta('2026-09-01', 500),
      venta('2026-09-01', 500),
      venta('2026-09-08', 1000),
    ])
    const martes = filas.find((f) => f.dia === 'Mar')!
    expect(martes.total).toBe(2000)
    expect(martes.jornadas).toBe(2)
    expect(martes.promedio).toBe(1000)
  })

  it('devuelve los siete días arrancando el lunes', () => {
    const filas = porDiaSemana([])
    expect(filas.map((f) => f.dia)).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'])
    expect(filas.every((f) => f.promedio === 0)).toBe(true)
  })
})

describe('topProductos', () => {
  const items = [
    { descripcion: 'Pollo entero', cantidad: 2, subtotal: 9800 },
    { descripcion: 'Pollo entero', cantidad: 1, subtotal: 4900 },
    { descripcion: 'Chorizo', cantidad: 1, subtotal: 12000 },
    { descripcion: 'Morcilla', cantidad: 0.5, subtotal: 4750 },
  ]

  it('agrupa y ordena por facturación', () => {
    const top = topProductos(items)
    expect(top[0]).toMatchObject({ nombre: 'Pollo entero', facturado: 14700, cantidad: 3 })
    expect(top[1].nombre).toBe('Chorizo')
  })

  it('recorta al límite pedido', () => {
    expect(topProductos(items, 2)).toHaveLength(2)
  })

  it('no pierde los ítems sin nombre', () => {
    expect(topProductos([{ descripcion: '  ', cantidad: 1, subtotal: 10 }])[0].nombre).toBe(
      'Sin nombre',
    )
  })
})

describe('porMetodoPago', () => {
  it('agrupa y ordena por monto', () => {
    const filas = porMetodoPago([
      venta('2026-09-08', 100, 'efectivo'),
      venta('2026-09-08', 900, 'debito'),
      venta('2026-09-08', 200, 'efectivo'),
    ])
    expect(filas[0]).toMatchObject({ metodo: 'debito', total: 900, ventas: 1 })
    expect(filas[1]).toMatchObject({ metodo: 'efectivo', total: 300, ventas: 2 })
  })

  it('agrupa las ventas sin método', () => {
    expect(porMetodoPago([venta('2026-09-08', 100, null)])[0].metodo).toBe('Sin especificar')
  })
})

describe('variacion', () => {
  it('calcula el porcentaje de cambio', () => {
    expect(variacion(150, 100)).toBe(50)
    expect(variacion(50, 100)).toBe(-50)
  })

  it('no divide por cero', () => {
    expect(variacion(100, 0)).toBeNull()
  })
})

describe('ticketPromedio', () => {
  it('promedia los totales', () => {
    expect(ticketPromedio([venta('2026-09-08', 100), venta('2026-09-08', 300)])).toBe(200)
  })

  it('es cero sin ventas', () => {
    expect(ticketPromedio([])).toBe(0)
  })
})
