import { describe, it, expect } from 'vitest'
import { precioMasCercano, ajustarRenglon, ajustarTicket } from './ajustarConCatalogo'
import type { ItemTicket } from './parseTicket'

/** Los precios reales del mostrador: pocos y bien separados. */
const CATALOGO = [
  1500, 1800, 3000, 4900, 5500, 7000, 8300, 9000, 9500, 9900, 11000, 12000,
  12500, 13000, 13500, 14000, 17900,
]

const item = (p: Partial<ItemTicket> = {}): ItemTicket => ({
  cantidad: 1,
  precioUnitario: 11000,
  subtotal: 11000,
  reconstruido: [],
  textoOriginal: '',
  ...p,
})

describe('precioMasCercano', () => {
  it('acepta el precio exacto', () => {
    expect(precioMasCercano(13500, CATALOGO)).toBe(13500)
  })

  it('corrige la basura que le cuelga el OCR', () => {
    // Casos sacados de fotos reales del mostrador.
    expect(precioMasCercano(13500.06, CATALOGO)).toBe(13500)
    expect(precioMasCercano(12006, CATALOGO)).toBe(12000)
    expect(precioMasCercano(11900, CATALOGO)).toBe(12000)
  })

  it('no inventa un precio que no está en la lista', () => {
    // 4000 no existe en el catálogo y no hay nada lo bastante cerca.
    expect(precioMasCercano(4000, CATALOGO)).toBeNull()
  })

  it('se abstiene si dos precios quedan a la misma distancia', () => {
    expect(precioMasCercano(11500, [11000, 12000])).toBeNull()
  })

  it('no se estira más allá de la tolerancia', () => {
    expect(precioMasCercano(20000, CATALOGO)).toBeNull()
  })

  it('ignora entradas sin sentido', () => {
    expect(precioMasCercano(0, CATALOGO)).toBeNull()
    expect(precioMasCercano(-5, CATALOGO)).toBeNull()
    expect(precioMasCercano(11000, [])).toBeNull()
  })
})

describe('ajustarRenglon', () => {
  it('recupera el peso que el OCR mutiló, a partir del importe', () => {
    // Foto real: "1.150kg @ 11000" salió ".150kg 6 1 1000" con importe 12650.
    const r = ajustarRenglon(
      item({ cantidad: 150, precioUnitario: 11000, subtotal: 12650 }),
      CATALOGO,
    )
    expect(r.cantidad).toBe(1.15)
    expect(r.precioUnitario).toBe(11000)
    expect(r.reconstruido).toContain('cantidad')
  })

  it('endereza el precio y con eso el peso', () => {
    const r = ajustarRenglon(
      item({ cantidad: 0.945, precioUnitario: 13500.06, subtotal: 12690 }),
      CATALOGO,
    )
    expect(r.precioUnitario).toBe(13500)
    expect(r.cantidad).toBe(0.94)
  })

  it('deja el renglón como estaba si ningún precio lo explica', () => {
    const original = item({ cantidad: 2.995, precioUnitario: 4000, subtotal: 11980 })
    expect(ajustarRenglon(original, CATALOGO)).toEqual(original)
  })

  it('no marca nada como reconstruido cuando ya venía bien', () => {
    const r = ajustarRenglon(
      item({ cantidad: 4.225, precioUnitario: 9000, subtotal: 38025 }),
      CATALOGO,
    )
    expect(r).toMatchObject({ cantidad: 4.225, precioUnitario: 9000, subtotal: 38025 })
    expect(r.reconstruido).toEqual([])
  })

  it('cae al peso leído si el importe no sirve', () => {
    const r = ajustarRenglon(
      item({ cantidad: 2, precioUnitario: 12006, subtotal: 0 }),
      CATALOGO,
    )
    expect(r.precioUnitario).toBe(12000)
    expect(r.subtotal).toBe(24000)
  })

  it('descarta un peso absurdo salido de la división', () => {
    // 990000 / 9900 = 100 kg: no es un peso de mostrador.
    const r = ajustarRenglon(
      item({ cantidad: 1.5, precioUnitario: 9900, subtotal: 990000 }),
      CATALOGO,
    )
    expect(r.cantidad).toBe(1.5)
  })
})

describe('ajustarTicket', () => {
  it('cierra con el total el único renglón que no cuadra', () => {
    // Foto real: el segundo importe salió 24540 en vez de 24840, pero el
    // total (37490) sí se leyó bien.
    const r = ajustarTicket(
      [
        item({ cantidad: 1.15, precioUnitario: 11000, subtotal: 12650 }),
        item({ cantidad: 2.045, precioUnitario: 12000, subtotal: 24540 }),
      ],
      CATALOGO,
      37490,
    )
    expect(r[1].cantidad).toBe(2.07)
    expect(r[1].subtotal).toBe(24840)
  })

  it('no toca nada si la suma ya coincide con el total', () => {
    const items = [
      item({ cantidad: 4.225, precioUnitario: 9000, subtotal: 38025 }),
      item({ cantidad: 0.505, precioUnitario: 12000, subtotal: 6060 }),
    ]
    const r = ajustarTicket(items, CATALOGO, 44085)
    expect(r.map((x) => x.subtotal)).toEqual([38025, 6060])
  })

  it('con dos renglones dudosos no adivina cuál arreglar', () => {
    const items = [
      item({ cantidad: 1, precioUnitario: 11900, subtotal: 11000, reconstruido: ['precioUnitario'] }),
      item({ cantidad: 1, precioUnitario: 12006, subtotal: 12000, reconstruido: ['precioUnitario'] }),
    ]
    const r = ajustarTicket(items, CATALOGO, 99999)
    expect(r.map((x) => x.subtotal)).toEqual([11000, 12000])
  })

  it('sin total impreso deja los renglones ajustados nomás', () => {
    const r = ajustarTicket([item({ cantidad: 150, precioUnitario: 11000, subtotal: 12650 })], CATALOGO, null)
    expect(r[0].cantidad).toBe(1.15)
  })
})
