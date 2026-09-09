import { describe, it, expect } from 'vitest'
import { turnoDe, porTurno, porDiaYTurno, totalesPorDia } from './turnos'

/** Una venta del 5 de marzo a la hora indicada, en horario local. */
const aLas = (h: number, m = 0, total = 1000, dia = 5) => ({
  fecha: new Date(2026, 2, dia, h, m, 0).toISOString(),
  total,
})

describe('turnoDe', () => {
  it('la mañana arranca a las 9 en punto', () => {
    expect(turnoDe(aLas(9, 0).fecha)).toBe('manana')
  })

  it('la mañana llega hasta las 13:30 inclusive', () => {
    expect(turnoDe(aLas(13, 30).fecha)).toBe('manana')
    expect(turnoDe(aLas(13, 31).fecha)).toBe('fuera')
  })

  it('la tarde va de 17 a 20:30', () => {
    expect(turnoDe(aLas(17, 0).fecha)).toBe('tarde')
    expect(turnoDe(aLas(19, 45).fecha)).toBe('tarde')
    expect(turnoDe(aLas(20, 30).fecha)).toBe('tarde')
  })

  it('el hueco del mediodía queda afuera', () => {
    expect(turnoDe(aLas(15, 0).fecha)).toBe('fuera')
  })

  it('antes de abrir y después de cerrar queda afuera', () => {
    expect(turnoDe(aLas(8, 59).fecha)).toBe('fuera')
    expect(turnoDe(aLas(21, 0).fecha)).toBe('fuera')
  })
})

describe('porTurno', () => {
  it('reparte cada venta en su turno', () => {
    const b = porTurno([aLas(10), aLas(11), aLas(18)])
    expect(b[0]).toMatchObject({ turno: 'manana', total: 2000 })
    expect(b[1]).toMatchObject({ turno: 'tarde', total: 1000 })
  })

  it('muestra los dos turnos aunque uno esté en cero', () => {
    const b = porTurno([aLas(10)])
    expect(b).toHaveLength(2)
    expect(b[1]).toMatchObject({ turno: 'tarde', total: 0 })
  })

  it('no inventa un bloque de fuera de horario si no hizo falta', () => {
    expect(porTurno([aLas(10), aLas(18)]).map((b) => b.turno)).toEqual(['manana', 'tarde'])
  })

  it('agrega fuera de horario solo cuando hubo una venta ahí', () => {
    const b = porTurno([aLas(10), aLas(15)])
    expect(b.map((x) => x.turno)).toEqual(['manana', 'tarde', 'fuera'])
    expect(b[2].total).toBe(1000)
  })

  it('ordena las ventas de cada turno por hora', () => {
    const b = porTurno([aLas(12), aLas(9, 30), aLas(11)])
    const horas = b[0].ventas.map((v) => new Date(v.fecha).getHours())
    expect(horas).toEqual([9, 11, 12])
  })

  it('sin ventas devuelve los dos turnos vacíos', () => {
    const b = porTurno([])
    expect(b).toHaveLength(2)
    expect(b.every((x) => x.total === 0)).toBe(true)
  })
})

describe('porDiaYTurno', () => {
  const ventas = [
    aLas(10, 0, 1000, 5),
    aLas(18, 0, 2000, 5),
    aLas(9, 30, 500, 4),
  ]

  it('separa por día', () => {
    expect(porDiaYTurno(ventas)).toHaveLength(2)
  })

  it('pone el día más reciente primero', () => {
    const [primero, segundo] = porDiaYTurno(ventas)
    expect(primero.dia > segundo.dia).toBe(true)
  })

  it('suma el total del día completo', () => {
    expect(porDiaYTurno(ventas)[0].total).toBe(3000)
    expect(porDiaYTurno(ventas)[0].cantidad).toBe(2)
  })

  it('adentro de cada día quedan los turnos', () => {
    const [hoy] = porDiaYTurno(ventas)
    expect(hoy.bloques[0]).toMatchObject({ turno: 'manana', total: 1000 })
    expect(hoy.bloques[1]).toMatchObject({ turno: 'tarde', total: 2000 })
  })
})

describe('totalesPorDia', () => {
  it('suma lo de cada día para el calendario', () => {
    const m = totalesPorDia([aLas(10, 0, 1000, 5), aLas(18, 0, 2000, 5), aLas(10, 0, 700, 4)])
    expect([...m.values()].sort((a, b) => a - b)).toEqual([700, 3000])
  })

  it('sin ventas queda vacío', () => {
    expect(totalesPorDia([]).size).toBe(0)
  })
})
