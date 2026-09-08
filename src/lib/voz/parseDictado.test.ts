import { describe, it, expect } from 'vitest'
import { parseDictado, puntajeProducto, type ProductoDictado } from './parseDictado'

const p = (nombre: string, unidad: 'kg' | 'unidad' = 'kg'): ProductoDictado => ({
  id: nombre,
  nombre,
  unidad,
})

const CATALOGO: ProductoDictado[] = [
  p('Pollo entero'),
  p('Pata y muslo'),
  p('Pechugas'),
  p('Alitas'),
  p('Bondiola'),
  p('Pechito de cerdo'),
  p('Chorizo'),
  p('Morcilla'),
  p('Milanesas de pollo'),
  p('Milanesas de cerdo'),
  p('Maple de huevos', 'unidad'),
  p('Provoleta', 'unidad'),
]

const uno = (frase: string) => {
  const r = parseDictado(frase, CATALOGO)
  expect(r.items).toHaveLength(1)
  return r.items[0]
}

describe('cantidades', () => {
  it('kilos enteros', () => {
    expect(uno('dos kilos de pechugas')).toMatchObject({ cantidad: 2, unidad: 'kg' })
  })

  it('un kilo y medio', () => {
    expect(uno('un kilo y medio de pollo entero')).toMatchObject({ cantidad: 1.5, unidad: 'kg' })
  })

  it('medio kilo', () => {
    expect(uno('medio kilo de morcilla')).toMatchObject({ cantidad: 0.5, unidad: 'kg' })
  })

  it('un kilo y cuarto', () => {
    expect(uno('un kilo y cuarto de chorizo')).toMatchObject({ cantidad: 1.25 })
  })

  it('gramos pasan a kilos', () => {
    expect(uno('novecientos gramos de bondiola')).toMatchObject({ cantidad: 0.9, unidad: 'kg' })
  })

  it('gramos compuestos', () => {
    expect(uno('doscientos cincuenta gramos de chorizo')).toMatchObject({ cantidad: 0.25 })
  })

  it('kilo con gramos sueltos', () => {
    expect(uno('un kilo doscientos de pechito de cerdo')).toMatchObject({ cantidad: 1.2 })
  })

  it('acepta el número dicho como dígito', () => {
    expect(uno('1,5 kilos de pechugas')).toMatchObject({ cantidad: 1.5 })
  })

  it('unidades sin decir la palabra kilo', () => {
    expect(uno('dos maples de huevos')).toMatchObject({ cantidad: 2, unidad: 'unidad' })
  })

  it('toma la unidad del producto cuando no se dijo', () => {
    expect(uno('tres provoletas')).toMatchObject({ cantidad: 3, unidad: 'unidad' })
  })
})

describe('productos', () => {
  it('encuentra el producto dicho', () => {
    expect(uno('dos kilos de pechugas').producto?.nombre).toBe('Pechugas')
  })

  it('tolera el plural', () => {
    expect(uno('dos maples de huevos').producto?.nombre).toBe('Maple de huevos')
  })

  it('prefiere el nombre completo sobre el parcial', () => {
    expect(uno('un kilo de milanesas de cerdo').producto?.nombre).toBe('Milanesas de cerdo')
  })

  it('avisa cuando no lo encuentra', () => {
    const r = parseDictado('dos kilos de cordero', CATALOGO)
    expect(r.items[0].producto).toBeNull()
    expect(r.advertencias.join(' ')).toContain('cordero')
  })
})

describe('varios renglones', () => {
  it('separa con "y"', () => {
    const r = parseDictado('un kilo de chorizo y medio kilo de morcilla', CATALOGO)
    expect(r.items).toHaveLength(2)
    expect(r.items[0]).toMatchObject({ cantidad: 1 })
    expect(r.items[0].producto?.nombre).toBe('Chorizo')
    expect(r.items[1]).toMatchObject({ cantidad: 0.5 })
    expect(r.items[1].producto?.nombre).toBe('Morcilla')
  })

  it('no parte "un kilo y medio" en dos', () => {
    const r = parseDictado('un kilo y medio de pollo entero y dos maples de huevos', CATALOGO)
    expect(r.items).toHaveLength(2)
    expect(r.items[0]).toMatchObject({ cantidad: 1.5 })
    expect(r.items[1]).toMatchObject({ cantidad: 2 })
  })

  it('separa con coma y con "más"', () => {
    const r = parseDictado('un kilo de alitas, dos de pechugas mas tres provoletas', CATALOGO)
    expect(r.items).toHaveLength(3)
  })
})

describe('ruido', () => {
  it('descarta lo que no es ni producto ni cantidad', () => {
    const r = parseDictado('gracias un kilo de chorizo dale', CATALOGO)
    expect(r.items).toHaveLength(1)
    expect(r.items[0].producto?.nombre).toBe('Chorizo')
  })

  it('avisa si no se escuchó nada', () => {
    expect(parseDictado('   ', CATALOGO).advertencias[0]).toBe('No se escuchó nada')
  })

  it('avisa si nada se reconoció', () => {
    expect(parseDictado('buenas tardes', CATALOGO).advertencias[0]).toBe(
      'No se reconoció ningún producto',
    )
  })
})

describe('puntajeProducto', () => {
  it('da 100 al nombre exacto', () => {
    expect(puntajeProducto('pollo entero', 'Pollo entero')).toBe(100)
  })

  it('ignora tildes y mayúsculas', () => {
    expect(puntajeProducto('MORCILLA', 'Morcilla')).toBe(100)
  })

  it('da cero a algo sin relación', () => {
    expect(puntajeProducto('cordero', 'Morcilla')).toBe(0)
  })

  it('puntúa más alto el nombre completo', () => {
    expect(puntajeProducto('milanesas de cerdo', 'Milanesas de cerdo')).toBeGreaterThan(
      puntajeProducto('milanesas de cerdo', 'Milanesas de pollo'),
    )
  })
})
