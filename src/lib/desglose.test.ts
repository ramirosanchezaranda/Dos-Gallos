import { describe, it, expect } from 'vitest'
import {
  desglosarDia,
  desglosarPorDia,
  minutosDesde,
  pendientesDeCompletar,
  type VentaDesglosable,
} from './desglose'

const venta = (
  total: number,
  metodo: string | null,
  dia = 5,
  hora = 10,
  completa = true,
): VentaDesglosable => ({
  fecha: new Date(2026, 2, dia, hora, 0, 0).toISOString(),
  total,
  metodo_pago: metodo,
  completa,
})

describe('desglosarDia', () => {
  it('suma por forma de cobro', () => {
    const d = desglosarDia(
      [venta(1000, 'efectivo'), venta(500, 'efectivo'), venta(2000, 'debito')],
      '2026-03-05',
    )
    expect(d.total).toBe(3500)
    expect(d.ventas).toBe(3)
    expect(d.lineas.map((l) => [l.metodo, l.total])).toEqual([
      ['debito', 2000],
      ['efectivo', 1500],
    ])
  })

  it('ordena de mayor a menor', () => {
    const d = desglosarDia([venta(100, 'qr'), venta(900, 'efectivo')], '2026-03-05')
    expect(d.lineas[0].metodo).toBe('efectivo')
  })

  it('calcula qué parte del día fue cada medio', () => {
    const d = desglosarDia([venta(750, 'efectivo'), venta(250, 'qr')], '2026-03-05')
    expect(d.lineas.find((l) => l.metodo === 'efectivo')!.porcion).toBeCloseTo(0.75)
    expect(d.lineas.find((l) => l.metodo === 'qr')!.porcion).toBeCloseTo(0.25)
  })

  it('agrupa aparte lo que no tiene medio cargado', () => {
    const d = desglosarDia([venta(1000, null), venta(500, 'efectivo')], '2026-03-05')
    expect(d.lineas.find((l) => l.metodo === 'sin_metodo')).toMatchObject({ total: 1000 })
  })

  it('un medio desconocido no se toma por bueno', () => {
    const d = desglosarDia([venta(1000, 'cheque')], '2026-03-05')
    expect(d.lineas[0].metodo).toBe('sin_metodo')
  })

  it('las pendientes se cuentan aparte y no suman al total', () => {
    const d = desglosarDia(
      [venta(1000, 'efectivo'), venta(0, null, 5, 11, false)],
      '2026-03-05',
    )
    expect(d.total).toBe(1000)
    expect(d.ventas).toBe(1)
    expect(d.pendientes).toBe(1)
    expect(d.lineas).toHaveLength(1)
  })

  it('un día sin ventas no rompe ni divide por cero', () => {
    const d = desglosarDia([], '2026-03-05')
    expect(d).toMatchObject({ total: 0, ventas: 0, pendientes: 0, lineas: [] })
  })

  it('un día entero de pendientes da total cero sin líneas', () => {
    const d = desglosarDia([venta(0, null, 5, 10, false)], '2026-03-05')
    expect(d.total).toBe(0)
    expect(d.pendientes).toBe(1)
    expect(d.lineas).toEqual([])
  })
})

describe('desglosarPorDia', () => {
  const ventas = [
    venta(1000, 'efectivo', 5),
    venta(2000, 'debito', 5),
    venta(700, 'efectivo', 4),
  ]

  it('separa por día', () => {
    expect(desglosarPorDia(ventas)).toHaveLength(2)
  })

  it('pone el día más reciente primero', () => {
    const [primero, segundo] = desglosarPorDia(ventas)
    expect(primero.dia > segundo.dia).toBe(true)
    expect(primero.total).toBe(3000)
    expect(segundo.total).toBe(700)
  })

  it('sin ventas devuelve vacío', () => {
    expect(desglosarPorDia([])).toEqual([])
  })
})

describe('minutosDesde', () => {
  it('cuenta los minutos corridos', () => {
    const ahora = new Date(2026, 2, 5, 10, 30).getTime()
    expect(minutosDesde(new Date(2026, 2, 5, 10, 0).toISOString(), ahora)).toBe(30)
  })

  it('una fecha futura no da negativo', () => {
    const ahora = new Date(2026, 2, 5, 10, 0).getTime()
    expect(minutosDesde(new Date(2026, 2, 5, 11, 0).toISOString(), ahora)).toBe(0)
  })
})

describe('pendientesDeCompletar', () => {
  const ahora = new Date(2026, 2, 5, 12, 0).getTime()
  const aLas = (hora: number, minuto: number, completa = false) => ({
    fecha: new Date(2026, 2, 5, hora, minuto).toISOString(),
    completa,
  })

  it('avisa por las que ya llevan rato', () => {
    expect(pendientesDeCompletar([aLas(11, 30)], 5, ahora)).toHaveLength(1)
  })

  it('no salta encima de una foto recién sacada', () => {
    expect(pendientesDeCompletar([aLas(11, 58)], 5, ahora)).toHaveLength(0)
  })

  it('ignora las que ya están completas', () => {
    expect(pendientesDeCompletar([aLas(9, 0, true)], 5, ahora)).toHaveLength(0)
  })

  it('devuelve primero la más vieja, que es la más urgente', () => {
    const r = pendientesDeCompletar([aLas(11, 0), aLas(9, 0), aLas(10, 0)], 5, ahora)
    expect(r.map((v) => new Date(v.fecha).getHours())).toEqual([9, 10, 11])
  })

  it('justo en el límite ya cuenta', () => {
    expect(pendientesDeCompletar([aLas(11, 55)], 5, ahora)).toHaveLength(1)
  })
})
