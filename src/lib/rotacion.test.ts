import { describe, it, expect } from 'vitest'
import {
  velocidad,
  diasDeStock,
  riesgoMerma,
  plataPorDia,
  calcularRotacion,
  porMerma,
  porPlata,
  baseDeLista,
  diasEnVenderse,
  type EntradaRotacion,
} from './rotacion'

const entrada = (p: Partial<EntradaRotacion> = {}): EntradaRotacion => ({
  producto_id: 'x',
  nombre: 'Pollo entero',
  unidad: 'kg',
  stock: 10,
  precio: 6000,
  costoUnitario: null,
  vidaUtilDias: 3,
  vendido: 28,
  ...p,
})

describe('velocidad', () => {
  it('reparte lo vendido en los días de la ventana', () => {
    expect(velocidad(28, 28)).toBe(1)
    expect(velocidad(56, 28)).toBe(2)
  })

  it('sin días de datos no inventa un ritmo', () => {
    expect(velocidad(10, 0)).toBe(0)
  })
})

describe('diasDeStock', () => {
  it('divide el stock por el ritmo', () => {
    expect(diasDeStock(10, 2)).toBe(5)
  })

  it('sin ventas no se puede saber', () => {
    expect(diasDeStock(10, 0)).toBeNull()
  })
})

describe('riesgoMerma', () => {
  it('marca alto cuando tarda más de lo que aguanta', () => {
    expect(riesgoMerma(5, 3)).toBe('alto')
  })

  it('marca medio cuando está al filo', () => {
    expect(riesgoMerma(2.5, 3)).toBe('medio')
  })

  it('marca bajo cuando se vende bastante antes', () => {
    expect(riesgoMerma(1, 3)).toBe('bajo')
  })

  it('el mismo plazo pesa distinto según la vida útil', () => {
    expect(riesgoMerma(10, 3)).toBe('alto')
    expect(riesgoMerma(10, 90)).toBe('bajo')
  })

  it('sin ventas no arriesga un diagnóstico', () => {
    expect(riesgoMerma(null, 3)).toBe('sin-datos')
  })
})

describe('plataPorDia', () => {
  it('con costo devuelve las dos varas', () => {
    expect(plataPorDia(2, 6000, 4000)).toEqual({ facturacionDia: 12000, margenDia: 4000 })
  })

  it('sin costo el margen queda en blanco', () => {
    expect(plataPorDia(2, 6000, null)).toEqual({ facturacionDia: 12000, margenDia: null })
  })
})

describe('baseDeLista', () => {
  const conCosto = (costo: number | null) =>
    calcularRotacion([entrada({ costoUnitario: costo })], 28)[0]

  it('usa margen solo si están todos los costos', () => {
    expect(baseDeLista([conCosto(4000), conCosto(3000)])).toBe('margen')
  })

  it('un solo costo faltante baja toda la lista a facturación', () => {
    expect(baseDeLista([conCosto(4000), conCosto(null)])).toBe('facturacion')
  })

  it('una lista vacía no promete margen', () => {
    expect(baseDeLista([])).toBe('facturacion')
  })
})

describe('ranking con una sola vara', () => {
  // Chorizo deja poco margen pero factura mucho; pollo al reves. Si se
  // mezclaran las varas, el que tiene costo cargado ganaria por tenerlo.
  const filas = calcularRotacion(
    [
      entrada({ producto_id: 'chorizo', precio: 12000, costoUnitario: 11000, stock: 5, vendido: 28 }),
      entrada({ producto_id: 'pollo', precio: 6000, costoUnitario: null, stock: 5, vendido: 28 }),
    ],
    28,
  )

  it('sin todos los costos compara facturación contra facturación', () => {
    const base = baseDeLista(filas)
    expect(base).toBe('facturacion')
    expect(porPlata(filas, base)[0].producto_id).toBe('chorizo')
  })

  it('el margen no se cuela en el ranking de facturación', () => {
    const chorizo = filas.find((f) => f.producto_id === 'chorizo')!
    expect(chorizo.margenDia).toBe(1000)
    expect(chorizo.facturacionDia).toBe(12000)
  })
})

describe('calcularRotacion', () => {
  it('arma la fila completa', () => {
    const [f] = calcularRotacion([entrada({ stock: 10, vendido: 28 })], 28)
    expect(f).toMatchObject({
      velocidad: 1,
      diasDeStock: 10,
      vidaUtilDias: 3,
      exceso: 7,
      riesgo: 'alto',
      margenDia: null,
    })
  })

  it('un producto que rota rápido no da riesgo', () => {
    const [f] = calcularRotacion([entrada({ stock: 2, vendido: 56 })], 28)
    expect(f.diasDeStock).toBe(1)
    expect(f.riesgo).toBe('bajo')
    expect(f.exceso).toBe(-2)
  })

  it('sin ventas deja el diagnóstico en blanco', () => {
    const [f] = calcularRotacion([entrada({ vendido: 0 })], 28)
    expect(f.diasDeStock).toBeNull()
    expect(f.exceso).toBeNull()
    expect(f.riesgo).toBe('sin-datos')
  })
})

describe('ordenamientos', () => {
  const filas = calcularRotacion(
    [
      entrada({ producto_id: 'ok', stock: 1, vendido: 28, vidaUtilDias: 3 }),
      entrada({ producto_id: 'vence', stock: 20, vendido: 28, vidaUtilDias: 3 }),
      entrada({ producto_id: 'quieto', stock: 5, vendido: 0 }),
    ],
    28,
  )

  it('merma pone primero lo que se echa a perder', () => {
    expect(porMerma(filas)[0].producto_id).toBe('vence')
  })

  it('merma deja lo sano al final', () => {
    expect(porMerma(filas).at(-1)?.producto_id).toBe('ok')
  })

  it('plata ordena por lo que deja cada día', () => {
    const orden = porPlata(filas, 'facturacion')
    expect(orden[0].facturacionDia).toBeGreaterThan(orden.at(-1)!.facturacionDia)
  })

  it('lo que no se vende no deja plata', () => {
    expect(filas.find((f) => f.producto_id === 'quieto')!.facturacionDia).toBe(0)
  })
})

describe('diasEnVenderse', () => {
  const ventas = [
    { fecha: '2026-09-01', cantidad: 4 },
    { fecha: '2026-09-02', cantidad: 3 },
    { fecha: '2026-09-04', cantidad: 5 },
  ]

  it('cuenta los días hasta cubrir la partida', () => {
    expect(diasEnVenderse('2026-09-01', 7, ventas)).toBe(1)
  })

  it('llega al final si hace falta', () => {
    expect(diasEnVenderse('2026-09-01', 12, ventas)).toBe(3)
  })

  it('devuelve null si todavía queda mercadería', () => {
    expect(diasEnVenderse('2026-09-01', 100, ventas)).toBeNull()
  })

  it('ignora lo vendido antes de que llegara la partida', () => {
    expect(diasEnVenderse('2026-09-03', 4, ventas)).toBe(1)
  })

  it('se vendió todo el mismo día', () => {
    expect(diasEnVenderse('2026-09-01', 4, ventas)).toBe(0)
  })
})
