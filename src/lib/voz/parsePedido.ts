/**
 * Parser de dictado para pedidos a proveedores.
 *
 * Entiende frases como:
 *   "3 cajones de pollo de aproximadamente 20 kilos cada uno"
 *   "3 kilos de bondiola"
 *   "2 bolsas de alitas de unos 5 kilos"
 *   "dos docenas de huevos"
 *   "un queso provolone de 4 kilos"
 */

import { normalizar, type ProductoDictado } from './parseDictado'

export interface ItemPedidoDictado {
  descripcion: string
  cantidad: number
  unidad: string          // 'kg', 'unidad', 'cajones', 'bolsas', 'docenas', etc.
  estimadoKg: number | null
  producto: ProductoDictado | null
  textoOriginal: string
}

const PALABRA_NUMERO: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, veinte: 20, veinticinco: 25, treinta: 30,
  cuarenta: 40, cincuenta: 50, cien: 100,
}

const UNIDADES_MAP: Record<string, string> = {
  kilo: 'kg', kilos: 'kg', kg: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  gramo: 'kg', gramos: 'kg',
  unidad: 'unidad', unidades: 'unidad', u: 'unidad',
  cajon: 'cajones', cajones: 'cajones',
  bolsa: 'bolsas', bolsas: 'bolsas',
  docena: 'docenas', docenas: 'docenas',
  caja: 'cajas', cajas: 'cajas',
  atado: 'atados', atados: 'atados',
}

const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'lo', 'cada', 'uno', 'una'])

const leerNumero = (tokens: string[], i: number): { valor: number; siguiente: number } | null => {
  const t = tokens[i] ?? ''
  const d = parseFloat(t.replace(',', '.'))
  if (!isNaN(d) && /^\d/.test(t)) return { valor: d, siguiente: i + 1 }
  const v = PALABRA_NUMERO[t]
  if (v !== undefined) return { valor: v, siguiente: i + 1 }
  return null
}

// Buscar "aproximadamente X kilos" / "unos X kilos" / "de X kilos" en la cola
function extraerEstimadoKg(tokens: string[]): number | null {
  const idx = tokens.findIndex((t) => t === 'aproximadamente' || t === 'unos' || t === 'unas')
  let start = idx >= 0 ? idx + 1 : -1
  if (start < 0) {
    // Buscar patrón "de N kilos" al final
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i] === 'de') { start = i + 1; break }
    }
  }
  if (start < 0) return null
  const n = leerNumero(tokens, start)
  if (!n) return null
  const u = tokens[n.siguiente] ?? ''
  if (!u.startsWith('kilo') && u !== 'kg') return null
  return n.valor
}

function buscarProducto(dicho: string, catalogo: ProductoDictado[]): ProductoDictado | null {
  if (!dicho) return null
  const dNorm = normalizar(dicho)
  let mejor: ProductoDictado | null = null
  let mejorScore = 0
  for (const p of catalogo) {
    const pNorm = normalizar(p.nombre)
    if (pNorm === dNorm) return p
    const hits = dNorm.split(' ').filter((t) => t.length > 2 && pNorm.includes(t)).length
    if (hits > mejorScore) { mejorScore = hits; mejor = p }
  }
  return mejorScore >= 1 ? mejor : null
}

function parsearRenglon(texto: string, catalogo: ProductoDictado[]): ItemPedidoDictado {
  const tokens = normalizar(texto).split(' ').filter(Boolean)
  let i = 0

  const n = leerNumero(tokens, i)
  const cantidad = n ? n.valor : 1
  if (n) i = n.siguiente

  const unidadRaw = UNIDADES_MAP[tokens[i] ?? '']
  const unidad = unidadRaw ?? 'unidad'
  if (unidadRaw) i++

  while (RELLENO.has(tokens[i] ?? '')) i++

  const resto = tokens.slice(i)
  const estimadoKg = extraerEstimadoKg(resto)

  // Quitar parte estimada del nombre del producto
  const stopWords = ['aproximadamente', 'unos', 'unas']
  const stopIdx = resto.findIndex((t) => stopWords.includes(t))
  const productoTokens = stopIdx >= 0 ? resto.slice(0, stopIdx) : resto

  // También quitar "de N kilos" al final
  let pTokens = productoTokens
  for (let j = pTokens.length - 1; j >= 0; j--) {
    if (pTokens[j] === 'de') {
      const after = pTokens.slice(j + 1)
      const num = leerNumero(after, 0)
      if (num && (after[num.siguiente] ?? '').startsWith('kilo')) {
        pTokens = pTokens.slice(0, j)
        break
      }
    }
  }

  const descripcion = pTokens.filter((t) => !RELLENO.has(t)).join(' ')
  const producto = buscarProducto(descripcion, catalogo)

  return {
    descripcion: descripcion || texto.trim(),
    cantidad,
    unidad,
    estimadoKg,
    producto,
    textoOriginal: texto.trim(),
  }
}

export function parsePedido(
  texto: string,
  catalogo: ProductoDictado[],
): ItemPedidoDictado[] {
  const limpio = normalizar(texto)
  if (!limpio) return []
  return limpio
    .split(/\s*,\s*|\s+y\s+|\s+mas\s+|\s+tambien\s+/)
    .map((r) => parsearRenglon(r, catalogo))
    .filter((it) => it.descripcion)
}
