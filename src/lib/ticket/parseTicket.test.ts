import { describe, it, expect } from 'vitest'
import { parseTicket, ean13Valido } from './parseTicket'
import { parseNumero } from './normalize'

/** Transcripción fiel del ticket real (ver __fixtures__/ticket-real-01.jpg). */
const TICKET_REAL = `
          DOS GALLOS
     23 DE JUNIO 4417

FECHA:02/02/14              T.1508
HORA: 08:30

   0.430kg @ 4000.00$/kg
                     1720.00$
                   -----------
01 ART.    TOTAL =   1720.00$

       2099998000008
MUCHAS GRACIAS POR SU COMPRA
`

/** El mismo ticket tal como lo devolvió el OCR, con errores típicos. */
const TICKET_OCR_SUCIO = `
          DOS GALLOS
     23 DE JUNIO 4417)GG

FECHA:02/02,14              T.1508
HORA: 08:30

   O.43Okg @ 4OOO.OO$/kg
                     172O.OO$
                   -----------
Ol ART.    TOTAL =   172O.OO$

       2O99998OOOOO8
MUCHAS GRACIAS POR SU COMPRA
`

const TICKET_TRES_ITEMS = `
          DOS GALLOS
FECHA:08/09/26              T.1601
HORA: 10:15

   0.430kg @ 4000.00$/kg
                     1720.00$
   1.250kg @ 3200.00$/kg
                     4000.00$
   0.800kg @ 5500.00$/kg
                     4400.00$
                   -----------
03 ART.    TOTAL =  10120.00$
`

describe('parseNumero', () => {
  it('lee el formato de la balanza (punto decimal, sin miles)', () => {
    expect(parseNumero('0.430')).toBe(0.43)
    expect(parseNumero('4000.00')).toBe(4000)
    expect(parseNumero('1720.00$')).toBe(1720)
  })

  it('lee también el formato argentino con separador de miles', () => {
    expect(parseNumero('4.500,00')).toBe(4500)
    expect(parseNumero('10.120,50')).toBe(10120.5)
  })

  it('corrige letras que el OCR confundió con dígitos', () => {
    expect(parseNumero('4OOO.OO')).toBe(4000)
    expect(parseNumero('O.43O')).toBe(0.43)
    expect(parseNumero('l72O.OO')).toBe(1720)
  })

  it('devuelve null si no hay número', () => {
    expect(parseNumero('')).toBeNull()
    expect(parseNumero('MUCHAS GRACIAS')).toBeNull()
    expect(parseNumero(null)).toBeNull()
  })
})

describe('ean13Valido', () => {
  it('valida el código del ticket real', () => {
    expect(ean13Valido('2099998000008')).toBe(true)
  })
  it('rechaza un dígito verificador incorrecto', () => {
    expect(ean13Valido('2099998000007')).toBe(false)
  })
})

describe('parseTicket — ticket real', () => {
  const r = parseTicket(TICKET_REAL)

  it('detecta un único producto', () => {
    expect(r.items).toHaveLength(1)
  })

  it('extrae peso, precio por kilo e importe', () => {
    expect(r.items[0].cantidad).toBe(0.43)
    expect(r.items[0].precioUnitario).toBe(4000)
    expect(r.items[0].subtotal).toBe(1720)
  })

  it('extrae total, contador de artículos y número de ticket', () => {
    expect(r.total).toBe(1720)
    expect(r.articulosDeclarados).toBe(1)
    expect(r.numero).toBe('1508')
  })

  it('extrae fecha, hora y código de barras', () => {
    expect(r.fecha).toBe('02/02/14')
    expect(r.hora).toBe('08:30')
    expect(r.codigoBarras).toBe('2099998000008')
  })

  it('da confianza alta porque la aritmética cierra', () => {
    expect(r.confianza).toBe('alta')
    expect(r.advertencias).toHaveLength(0)
  })
})

describe('parseTicket — OCR con errores típicos de papel térmico', () => {
  const r = parseTicket(TICKET_OCR_SUCIO)

  it('recupera los valores pese a las O por 0 y l por 1', () => {
    expect(r.items).toHaveLength(1)
    expect(r.items[0].cantidad).toBe(0.43)
    expect(r.items[0].precioUnitario).toBe(4000)
    expect(r.items[0].subtotal).toBe(1720)
    expect(r.total).toBe(1720)
  })
})

describe('parseTicket — varios productos', () => {
  const r = parseTicket(TICKET_TRES_ITEMS)

  it('detecta los tres renglones', () => {
    expect(r.items).toHaveLength(3)
    expect(r.articulosDeclarados).toBe(3)
  })

  it('lee cada renglón con su precio por kilo', () => {
    expect(r.items.map((i) => i.precioUnitario)).toEqual([4000, 3200, 5500])
    expect(r.items.map((i) => i.cantidad)).toEqual([0.43, 1.25, 0.8])
  })

  it('la suma de renglones coincide con el total', () => {
    const suma = r.items.reduce((a, i) => a + i.subtotal, 0)
    expect(suma).toBeCloseTo(r.total!, 2)
    expect(r.confianza).toBe('alta')
  })
})

describe('parseTicket — reconstrucción por aritmética', () => {
  it('recupera el precio por kilo si el OCR lo perdió', () => {
    const r = parseTicket(`
   0.430kg @ $/kg
                     1720.00$
01 ART.    TOTAL =   1720.00$
`)
    // Sin precio legible: 1720 / 0.430 = 4000
    expect(r.items).toHaveLength(1)
    expect(r.items[0].precioUnitario).toBe(4000)
    expect(r.items[0].reconstruido).toContain('precioUnitario')
    expect(r.confianza).toBe('media')
  })

  it('calcula el importe si falta, a partir de peso y precio', () => {
    const r = parseTicket(`
   0.430kg @ 4000.00$/kg
01 ART.    TOTAL =   1720.00$
`)
    expect(r.items[0].subtotal).toBe(1720)
    expect(r.items[0].reconstruido).toContain('subtotal')
  })
})

describe('parseTicket — casos que deben bajar la confianza', () => {
  it('avisa si el contador de artículos no coincide', () => {
    const r = parseTicket(`
   0.430kg @ 4000.00$/kg
                     1720.00$
03 ART.    TOTAL =   1720.00$
`)
    expect(r.confianza).toBe('baja')
    expect(r.advertencias.join(' ')).toMatch(/declara 3 art/i)
  })

  it('avisa si la suma no coincide con el total impreso', () => {
    const r = parseTicket(`
   0.430kg @ 4000.00$/kg
                     1720.00$
01 ART.    TOTAL =   9999.00$
`)
    expect(r.confianza).toBe('baja')
    expect(r.advertencias.join(' ')).toMatch(/no coincide con el total/i)
  })

  it('no explota con texto que no es un ticket', () => {
    const r = parseTicket('hola qué tal\nesto no es un ticket')
    expect(r.items).toHaveLength(0)
    expect(r.confianza).toBe('baja')
    expect(r.advertencias.length).toBeGreaterThan(0)
  })

  it('no explota con texto vacío', () => {
    const r = parseTicket('')
    expect(r.items).toHaveLength(0)
    expect(r.confianza).toBe('baja')
  })
})
