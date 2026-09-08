import type { Producto } from '../types/db'

/** Cuál de los dos precios de un producto se está usando en un renglón. */
export type TipoPrecio = 'normal' | 'oferta'

/** Márgen para comparar contra lo que leyó el OCR. */
const TOLERANCIA = 0.01

export const tieneOferta = (p: Producto): boolean =>
  p.precio_oferta != null && p.precio_oferta > 0

export const precioDe = (p: Producto, tipo: TipoPrecio): number =>
  tipo === 'oferta' && tieneOferta(p) ? (p.precio_oferta as number) : p.precio

/** Precios cargados del producto, sin los que están en cero. */
const precios = (p: Producto): { tipo: TipoPrecio; valor: number }[] => {
  const out: { tipo: TipoPrecio; valor: number }[] = []
  if (p.precio > 0) out.push({ tipo: 'normal', valor: p.precio })
  if (tieneOferta(p)) out.push({ tipo: 'oferta', valor: p.precio_oferta as number })
  return out
}

/**
 * Con qué precio del producto coincide el del ticket. La oferta gana el
 * desempate: si los dos son iguales, cobrar la oferta da el mismo importe.
 */
export function coincidePrecio(p: Producto, objetivo: number): TipoPrecio | null {
  const iguales = precios(p).filter((x) => Math.abs(x.valor - objetivo) < TOLERANCIA)
  if (iguales.length === 0) return null
  return iguales.some((x) => x.tipo === 'oferta') ? 'oferta' : 'normal'
}

/**
 * Qué tan lejos está el producto del precio leído, mirando los dos precios.
 * Se usa para ordenar el selector; `Infinity` si no tiene ningún precio cargado.
 */
export function distanciaPrecio(p: Producto, objetivo: number): number {
  const ds = precios(p).map((x) => Math.abs(x.valor - objetivo))
  return ds.length > 0 ? Math.min(...ds) : Infinity
}
