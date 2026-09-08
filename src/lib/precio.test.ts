import { describe, it, expect } from 'vitest'
import { coincidePrecio, distanciaPrecio, precioDe, tieneOferta } from './precio'
import type { Producto } from '../types/db'

const prod = (precio: number, precio_oferta: number | null = null): Producto => ({
  id: 'x',
  nombre: 'Producto',
  categoria_id: null,
  unidad: 'kg',
  unidad_stock: 'kg',
  peso_unidad: null,
  precio,
  precio_oferta,
  oferta_detalle: precio_oferta != null ? 'Llevando 2' : null,
  plu: null,
  stock_actual: 10,
  stock_minimo: 0,
  activo: true,
  created_at: '',
  updated_at: '',
})

describe('tieneOferta', () => {
  it('es falso sin precio de oferta', () => {
    expect(tieneOferta(prod(11000))).toBe(false)
  })

  it('es falso si la oferta quedó en cero', () => {
    expect(tieneOferta(prod(11000, 0))).toBe(false)
  })

  it('es verdadero con precio de oferta cargado', () => {
    expect(tieneOferta(prod(11000, 9000))).toBe(true)
  })
})

describe('precioDe', () => {
  it('devuelve el de lista o el de oferta según se pida', () => {
    const p = prod(11000, 9000)
    expect(precioDe(p, 'normal')).toBe(11000)
    expect(precioDe(p, 'oferta')).toBe(9000)
  })

  it('cae al de lista si se pide oferta y no hay', () => {
    expect(precioDe(prod(11000), 'oferta')).toBe(11000)
  })
})

describe('coincidePrecio', () => {
  it('reconoce el precio de lista', () => {
    expect(coincidePrecio(prod(11000, 9000), 11000)).toBe('normal')
  })

  it('reconoce el de oferta', () => {
    expect(coincidePrecio(prod(11000, 9000), 9000)).toBe('oferta')
  })

  it('devuelve null si no da con ninguno', () => {
    expect(coincidePrecio(prod(11000, 9000), 8000)).toBeNull()
  })

  it('ignora el precio en cero de un producto sin cargar', () => {
    expect(coincidePrecio(prod(0), 0)).toBeNull()
  })

  it('con los dos precios iguales prefiere la oferta', () => {
    expect(coincidePrecio(prod(9000, 9000), 9000)).toBe('oferta')
  })

  it('tolera el redondeo de centavos del ticket', () => {
    expect(coincidePrecio(prod(11000, 9000), 9000.005)).toBe('oferta')
  })
})

describe('distanciaPrecio', () => {
  it('mide contra el precio más cercano de los dos', () => {
    expect(distanciaPrecio(prod(11000, 9000), 9500)).toBe(500)
  })

  it('es infinita si el producto no tiene ningún precio', () => {
    expect(distanciaPrecio(prod(0), 5000)).toBe(Infinity)
  })
})
