import { describe, it, expect } from 'vitest'
import { fechaNumerica, diaYFecha } from './formato'

describe('fechaNumerica', () => {
  it('va sin ceros a la izquierda', () => {
    expect(fechaNumerica('2026-09-08')).toBe('8/9/26')
  })

  it('mantiene los dos dígitos cuando corresponden', () => {
    expect(fechaNumerica('2026-12-25')).toBe('25/12/26')
  })

  it('una clave de día no se corre al día anterior', () => {
    // Con `new Date('2026-09-08')` a secas, en Argentina daría el 7.
    expect(fechaNumerica('2026-09-08')).toBe('8/9/26')
    expect(fechaNumerica('2026-01-01')).toBe('1/1/26')
  })

  it('también acepta una fecha con hora', () => {
    expect(fechaNumerica(new Date(2026, 8, 8, 15, 30).toISOString())).toBe('8/9/26')
  })
})

describe('diaYFecha', () => {
  it('pone el día de la semana adelante', () => {
    expect(diaYFecha('2026-09-08')).toBe('martes 8/9/26')
  })

  it('acierta el día de la semana sin correrse', () => {
    expect(diaYFecha('2026-09-07')).toBe('lunes 7/9/26')
    expect(diaYFecha('2026-09-13')).toBe('domingo 13/9/26')
  })
})
