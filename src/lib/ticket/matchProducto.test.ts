import { describe, it, expect } from 'vitest'
import { matchProducto, type ProductoCandidato } from './matchProducto'
import type { ItemTicket } from './parseTicket'

const item = (precioUnitario: number): ItemTicket => ({
  cantidad: 0.43,
  precioUnitario,
  subtotal: 0.43 * precioUnitario,
  reconstruido: [],
  textoOriginal: '',
})

const prod = (
  nombre: string,
  precio: number,
  extra: Partial<ProductoCandidato> = {},
): ProductoCandidato => ({
  id: nombre,
  nombre,
  precio,
  unidad: 'kg',
  stock_actual: 10,
  activo: true,
  ...extra,
})

const catalogo = [
  prod('Supremas', 4000),
  prod('Pata muslo', 3200),
  prod('Alitas', 2800),
  prod('Bondiola', 5500),
]

describe('matchProducto', () => {
  it('identifica el producto por precio exacto', () => {
    const r = matchProducto(item(4000), catalogo)
    expect(r.tipo).toBe('exacto')
    expect(r.sugerido?.nombre).toBe('Supremas')
  })

  it('marca ambiguo cuando dos productos comparten precio', () => {
    const r = matchProducto(item(4000), [...catalogo, prod('Milanesas pollo', 4000)])
    expect(r.tipo).toBe('ambiguo')
    expect(r.sugerido).toBeNull()
    expect(r.candidatos.map((c) => c.nombre).sort()).toEqual(['Milanesas pollo', 'Supremas'])
  })

  it('marca aproximado si el precio cambió apenas', () => {
    const r = matchProducto(item(4050), catalogo) // +1,25%
    expect(r.tipo).toBe('aproximado')
    expect(r.candidatos[0].nombre).toBe('Supremas')
    expect(r.sugerido).toBeNull() // nunca elige solo si no es exacto
  })

  it('no coincide si el precio está lejos, pero sugiere los más cercanos', () => {
    const r = matchProducto(item(9999), catalogo)
    expect(r.tipo).toBe('sin_coincidencia')
    expect(r.candidatos[0].nombre).toBe('Bondiola') // el más cercano a 9999
  })

  it('ignora productos sin precio cargado', () => {
    const r = matchProducto(item(4000), [prod('Sin precio', 0), prod('Supremas', 4000)])
    expect(r.tipo).toBe('exacto')
    expect(r.sugerido?.nombre).toBe('Supremas')
  })

  it('ignora productos dados de baja', () => {
    const r = matchProducto(item(4000), [
      prod('Viejo', 4000, { activo: false }),
      prod('Supremas', 4000),
    ])
    expect(r.tipo).toBe('exacto')
    expect(r.sugerido?.nombre).toBe('Supremas')
  })

  it('con catálogo vacío no rompe', () => {
    const r = matchProducto(item(4000), [])
    expect(r.tipo).toBe('sin_coincidencia')
    expect(r.candidatos).toEqual([])
  })
})
