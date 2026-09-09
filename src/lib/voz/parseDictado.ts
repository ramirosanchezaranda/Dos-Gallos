/**
 * Convierte lo que se dicta en el mostrador ("un kilo y medio de pollo entero
 * y dos maples de huevo") en renglones de venta.
 *
 * Es deterministico a proposito: no hay modelo de lenguaje detras, solo reglas.
 * Lo que sale siempre se muestra para confirmar, nunca se guarda solo.
 */

export interface ProductoDictado {
  id: string
  nombre: string
  unidad: 'kg' | 'unidad'
}

export interface ItemDictado {
  /** En kilos o en piezas, segun `unidad`. `null` si no se dijo cantidad. */
  cantidad: number | null
  unidad: 'kg' | 'unidad' | null
  /** Lo que se entendio como nombre del producto. */
  textoProducto: string
  producto: ProductoDictado | null
  /** Otros productos que encajaban casi igual de bien. */
  alternativas: ProductoDictado[]
  textoOriginal: string
}

export interface DictadoParseado {
  items: ItemDictado[]
  advertencias: string[]
}

// ─── Normalizacion ────────────────────────────────────────────

const sinTildes = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export const normalizar = (s: string) =>
  sinTildes(s.toLowerCase())
    // La coma decimal pasa a punto antes que nada: mas adelante la coma es
    // separador de renglones y partiria "1,5" al medio.
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/[^a-z0-9\s.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Quita la 's' o 'es' final para que "maples" encuentre "maple". */
const singular = (t: string) =>
  t.length > 4 && t.endsWith('es') ? t.slice(0, -2) : t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t

// ─── Numeros dichos en palabras ───────────────────────────────

const PALABRA_NUMERO: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
  siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
  catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
  diecinueve: 19, veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23,
  veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27,
  veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
  doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500,
  seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
  mil: 1000,
}

const comoDigitos = (t: string): number | null => {
  if (!/^\d+([.,]\d+)?$/.test(t)) return null
  const n = parseFloat(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Lee un numero a partir de `i`. Suma palabras mientras vayan de mayor a menor
 * ("doscientos cincuenta" = 250) para no juntar dos cantidades distintas.
 */
function leerNumero(tokens: string[], i: number): { valor: number; siguiente: number } | null {
  const digito = comoDigitos(tokens[i] ?? '')
  if (digito !== null) return { valor: digito, siguiente: i + 1 }

  let total: number | null = null
  let ultimo = Infinity
  let j = i
  while (j < tokens.length) {
    const v = PALABRA_NUMERO[tokens[j]]
    if (v === undefined || v >= ultimo) break
    total = (total ?? 0) + v
    ultimo = v
    j++
  }
  return total === null ? null : { valor: total, siguiente: j }
}

const UNIDADES: Record<string, 'kg' | 'gramos' | 'unidad'> = {
  kilo: 'kg', kilos: 'kg', kg: 'kg', kilogramo: 'kg', kilogramos: 'kg',
  gramo: 'gramos', gramos: 'gramos', gr: 'gramos', g: 'gramos',
  unidad: 'unidad', unidades: 'unidad', u: 'unidad',
}

const RELLENO = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'lo'])

// ─── Separacion en renglones ──────────────────────────────────

/** Marca interna para una "y" que no separa. No existe en el habla. */
const MARCA = '\u0001'

/**
 * Hay productos que llevan "y" en el nombre: "Pata y muslo", "Mila de soja y
 * espinaca". Sin esto, pedir "dos kilos de pata y muslo" salia partido en dos
 * renglones. Se protegen del mas largo al mas corto para que gane el nombre
 * completo cuando uno contiene al otro.
 */
function protegerNombres(texto: string, catalogo: ProductoDictado[]): string {
  const conY = catalogo
    .map((p) => normalizar(p.nombre))
    .filter((n) => n.includes(' y '))
    .sort((a, b) => b.length - a.length)

  let salida = texto
  for (const nombre of conY) {
    if (salida.includes(nombre)) {
      salida = salida.split(nombre).join(nombre.replaceAll(' y ', MARCA))
    }
  }
  return salida
}

/**
 * Parte la frase en renglones. La "y" es el separador natural, pero tambien
 * aparece dentro de "un kilo y medio", asi que esas se protegen antes.
 *
 * Solo cuenta como cantidad si viene pegada a la unidad: en "un kilo de chorizo
 * y medio kilo de morcilla" ese "y medio" arranca un renglon nuevo, y proteger
 * los dos casos igual se comia el separador.
 */
function separar(texto: string, catalogo: ProductoDictado[]): string[] {
  const protegido = protegerNombres(texto, catalogo)
    .replace(/\b(kilos?|kg|kilogramos?)\s+y\s+medi[oa]\b/g, '$1 ymedio')
    .replace(/\b(kilos?|kg|kilogramos?)\s+y\s+cuarto\b/g, '$1 ycuarto')
  return protegido
    .split(/\s*,\s*|\s+y\s+|\s+mas\s+|\s+tambien\s+/)
    .map((s) => s.replaceAll(MARCA, ' y ').trim())
    .filter(Boolean)
}

// ─── Busqueda del producto ────────────────────────────────────

/** Puntaje 0-100 de cuanto se parece lo dicho al nombre del producto. */
export function puntajeProducto(dicho: string, nombre: string): number {
  const d = normalizar(dicho)
  const n = normalizar(nombre)
  if (!d) return 0
  if (d === n) return 100

  const tokensD = d.split(' ').map(singular).filter((t) => t.length > 1 && !RELLENO.has(t))
  const tokensN = n.split(' ').map(singular).filter((t) => t.length > 1 && !RELLENO.has(t))
  if (tokensD.length === 0 || tokensN.length === 0) return 0

  let coinciden = 0
  for (const t of tokensD) {
    if (tokensN.some((x) => x === t || (t.length > 3 && x.startsWith(t)) || (x.length > 3 && t.startsWith(x)))) {
      coinciden++
    }
  }
  if (coinciden === 0) return 0

  // Pesa cuanto de lo dicho se reconocio y cuanto del nombre se cubrio, para
  // que "pollo" no gane sobre "pollo entero" cuando se dijo "pollo entero".
  const cubreDicho = coinciden / tokensD.length
  const cubreNombre = coinciden / tokensN.length
  return Math.round((cubreDicho * 0.6 + cubreNombre * 0.4) * 95)
}

const UMBRAL = 35

function buscarProducto(dicho: string, catalogo: ProductoDictado[]) {
  const puntuados = catalogo
    .map((p) => ({ p, puntaje: puntajeProducto(dicho, p.nombre) }))
    .filter((x) => x.puntaje >= UMBRAL)
    .sort((a, b) => b.puntaje - a.puntaje)

  if (puntuados.length === 0) return { producto: null, alternativas: [] as ProductoDictado[] }
  const mejor = puntuados[0]
  return {
    producto: mejor.p,
    alternativas: puntuados.slice(1, 4).filter((x) => mejor.puntaje - x.puntaje <= 15).map((x) => x.p),
  }
}

// ─── Parser ───────────────────────────────────────────────────

function parseRenglon(texto: string, catalogo: ProductoDictado[]): ItemDictado {
  const tokens = normalizar(texto).split(' ').filter(Boolean)
  let i = 0
  let cantidad: number | null = null
  let unidad: 'kg' | 'unidad' | null = null

  if (tokens[i] === 'medio' || tokens[i] === 'media') {
    cantidad = 0.5
    i++
  } else {
    const n = leerNumero(tokens, i)
    if (n) {
      cantidad = n.valor
      i = n.siguiente
    }
  }

  const u = UNIDADES[tokens[i] ?? '']
  if (u) {
    i++
    if (u === 'gramos') {
      unidad = 'kg'
      if (cantidad !== null) cantidad = cantidad / 1000
    } else {
      unidad = u
    }
  }

  if (tokens[i] === 'ymedio') {
    cantidad = (cantidad ?? 0) + 0.5
    i++
  } else if (tokens[i] === 'ycuarto') {
    cantidad = (cantidad ?? 0) + 0.25
    i++
  } else if (unidad === 'kg' && cantidad !== null) {
    // "un kilo doscientos" = 1,200 kg: lo que sigue al kilo son gramos.
    const g = leerNumero(tokens, i)
    if (g && g.valor >= 50 && g.valor < 1000) {
      cantidad += g.valor / 1000
      i = g.siguiente
    }
  }

  while (RELLENO.has(tokens[i] ?? '')) i++

  const textoProducto = tokens.slice(i).join(' ')
  const { producto, alternativas } = buscarProducto(textoProducto, catalogo)

  return {
    cantidad,
    unidad: unidad ?? producto?.unidad ?? null,
    textoProducto,
    producto,
    alternativas,
    textoOriginal: texto.trim(),
  }
}

export function parseDictado(texto: string, catalogo: ProductoDictado[]): DictadoParseado {
  const limpio = normalizar(texto)
  if (!limpio) return { items: [], advertencias: ['No se escuchó nada'] }

  const items = separar(limpio, catalogo)
    .map((r) => parseRenglon(r, catalogo))
    // Un pedazo sin producto ni cantidad suele ser ruido ("gracias", "dale").
    .filter((it) => it.producto !== null || it.cantidad !== null)

  const advertencias: string[] = []
  if (items.length === 0) advertencias.push('No se reconoció ningún producto')
  for (const it of items) {
    if (!it.producto) advertencias.push(`No encontré "${it.textoProducto}" en la lista`)
    else if (it.cantidad === null) advertencias.push(`Falta la cantidad de ${it.producto.nombre}`)
    else if (it.alternativas.length > 0)
      advertencias.push(`"${it.textoProducto}" se parece también a ${it.alternativas[0].nombre}`)
  }

  return { items, advertencias }
}
