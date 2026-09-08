import { describe, it, expect } from 'vitest'
import { descuentoDeStock, necesitaPesoUnidad } from './stock'
import type { Producto, Unidad } from '../types/db'

const prod = (unidad: Unidad, unidad_stock: Unidad, peso_unidad: number | null = null): Producto => ({
  id: 'x',
  nombre: 'Producto',
  categoria_id: null,
  unidad,
  unidad_stock,
  peso_unidad,
  precio: 4900,
  precio_oferta: null,
  oferta_detalle: null,
  plu: null,
  stock_actual: 20,
  stock_minimo: 0,
  activo: true,
  created_at: '',
  updated_at: '',
})

describe('necesitaPesoUnidad', () => {
  it('no hace falta si se cobra y se cuenta igual', () => {
    expect(necesitaPesoUnidad('kg', 'kg')).toBe(false)
    expect(necesitaPesoUnidad('unidad', 'unidad')).toBe(false)
  })

  it('hace falta si difieren', () => {
    expect(necesitaPesoUnidad('kg', 'unidad')).toBe(true)
    expect(necesitaPesoUnidad('unidad', 'kg')).toBe(true)
  })
})

describe('descuentoDeStock', () => {
  it('descuenta tal cual cuando la unidad coincide', () => {
    expect(descuentoDeStock(prod('kg', 'kg'), 1.85)).toBe(1.85)
    expect(descuentoDeStock(prod('unidad', 'unidad'), 3)).toBe(3)
  })

  it('cobrado por kilo y contado por pieza: divide por el peso', () => {
    // Pollo entero: 4,4 kg vendidos con piezas de 2,2 kg = 2 pollos.
    expect(descuentoDeStock(prod('kg', 'unidad', 2.2), 4.4)).toBe(2)
  })

  it('cobrado por pieza y contado en kilos: multiplica', () => {
    expect(descuentoDeStock(prod('unidad', 'kg', 2.2), 3)).toBeCloseTo(6.6, 3)
  })

  it('redondea a gramos', () => {
    // 1,850 / 0,7 = 2,642857... piezas
    expect(descuentoDeStock(prod('kg', 'unidad', 0.7), 1.85)).toBe(2.643)
  })

  it('no puede convertir sin el peso por pieza', () => {
    expect(descuentoDeStock(prod('kg', 'unidad', null), 4.4)).toBeNull()
    expect(descuentoDeStock(prod('kg', 'unidad', 0), 4.4)).toBeNull()
  })
})
