import { parseNumero, aLineas, forzarDigitos } from './normalize'

/**
 * Parser de tickets de la balanza de Dos Gallos.
 *
 * Formato real (ticket 2026-09, balanza sin PLU programados):
 *
 *            DOS GALLOS
 *       23 DE JUNIO 4417
 *   FECHA:02/02/14        T.1508
 *   HORA: 08:30
 *
 *     0.430kg @ 4000.00$/kg
 *                   1720.00$
 *                  ----------
 *   01 ART.  TOTAL =  1720.00$
 *        ||| 2099998000008 |||
 *   MUCHAS GRACIAS POR SU COMPRA
 *
 * PUNTO CLAVE: el ticket NO imprime el nombre del producto. Solo peso,
 * precio por kilo e importe. La identificación del producto se hace
 * después, por el precio/kg, en `matchProducto.ts`.
 */

export interface ItemTicket {
  /** Peso en kg (o unidades). */
  cantidad: number
  /** Precio por kg leído del ticket. Es la clave para identificar el producto. */
  precioUnitario: number
  /** Importe del renglón. */
  subtotal: number
  /** Qué campos vinieron del papel y cuáles se reconstruyeron por aritmética. */
  reconstruido: Array<'cantidad' | 'precioUnitario' | 'subtotal'>
  /** Texto original del renglón, para mostrar al usuario si duda. */
  textoOriginal: string
}

export type Confianza = 'alta' | 'media' | 'baja'

export interface TicketParseado {
  items: ItemTicket[]
  /** Total impreso en el ticket (renglón "TOTAL ="). */
  total: number | null
  /** Cantidad de artículos declarada ("01 ART."). */
  articulosDeclarados: number | null
  /** Número de ticket ("T.1508"). */
  numero: string | null
  /** Fecha/hora impresas. Ojo: el reloj de la balanza puede estar mal. */
  fecha: string | null
  hora: string | null
  /** Código de barras EAN-13 si se leyó. */
  codigoBarras: string | null
  confianza: Confianza
  /** Problemas detectados, en castellano, para mostrar en la pantalla de revisión. */
  advertencias: string[]
  /** Texto OCR crudo, se guarda en la venta para depurar. */
  textoCrudo: string
}

/** Tolerancia relativa al validar peso × precio = importe. */
const TOLERANCIA = 0.02

// ─────────────────────────────────────────────────────────────
//  Expresiones del formato
// ─────────────────────────────────────────────────────────────

/**
 * `0.430kg @ 4000.00$/kg` — el peso, y a la derecha el precio por kilo.
 *
 * Sobre fotos reales el separador llega de cualquier forma: `@` sale `E`,
 * `a`, `3`, `4`, y el `$/kg` termina en `F/Kg`, `.0$/9` o `.08/E5`. Por eso
 * el ancla es el número pegado a `kg` y entre medio se admite cualquier
 * cosa corta, en vez de exigir el `$/kg` literal.
 *
 * Todo lo que sigue a `kg` es opcional: si el OCR se comió el precio, el
 * renglón se detecta igual y `reconciliarItem` lo recupera del importe.
 */
const RE_ITEM =
  /([\d.,OoIlSsBZq|]+)\s*[kK][gG9qoO0a]?(?:\s*\S{0,2}\s*([\d.,OoIlSsBZq|]{2,}))?/

/**
 * `1 U @ 1500.00$/U` — el renglón por unidad, que no lleva peso.
 *
 * La `U` va sola entre espacios; pedirla así evita confundirla con la `U`
 * de otras palabras del ticket.
 */
const RE_ITEM_UNIDAD =
  /(?:^|\s)([\d OoIlSsB|]{1,3})\s+[uU]\s*\S{0,2}?\s*([\d.,OoIlSsBZq|]{2,})/

/** Importe suelto a la derecha: `1720.00$` */
const RE_IMPORTE = /([\d.,OoIlSsBZq|]+)\s*\$/

/** `01 ART.   TOTAL =  1720.00$` */
const RE_TOTAL = /([\d OoIlSsB]{1,3})\s*ART[.\s]*TOTAL\s*[=:]?\s*([\d.,OoIlSsBZq|]+)/i

/** `TOTAL = 1720.00$` sin contador de artículos. */
const RE_TOTAL_SIMPLE = /TOTAL\s*[=:]?\s*([\d.,OoIlSsBZq|]+)/i

const RE_NUMERO = /\bT[.\s:]*(\d{2,6})\b/
const RE_FECHA = /FECHA\s*[:.]?\s*(\d{1,2})\s*[/.,-]\s*(\d{1,2})\s*[/.,-]\s*(\d{2,4})/i
const RE_HORA = /HORA\s*[:.]?\s*(\d{1,2})\s*[:.]\s*(\d{2})/i
const RE_EAN13 = /\b(\d{13})\b/

// ─────────────────────────────────────────────────────────────

/** Valida el dígito verificador de un EAN-13. */
export function ean13Valido(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const d = code.split('').map(Number)
  const suma = d.slice(0, 12).reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (suma % 10)) % 10 === d[12]
}

/** ¿a y b son iguales dentro de la tolerancia? */
function casi(a: number, b: number, tol = TOLERANCIA): boolean {
  if (a === 0 && b === 0) return true
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9) <= tol
}

/**
 * Reconstruye el renglón usando la redundancia del ticket.
 *
 * El ticket imprime tres números ligados por `peso × precio = importe`.
 * Si el OCR arruina uno, los otros dos lo recuperan. Esto es lo que hace
 * que el sistema sirva sobre papel térmico gastado.
 */
function reconciliarItem(
  cantidad: number | null,
  precio: number | null,
  subtotal: number | null,
  textoOriginal: string,
): ItemTicket | null {
  const reconstruido: ItemTicket['reconstruido'] = []
  let c = cantidad
  let p = precio
  let s = subtotal

  const tiene = [c, p, s].filter((v) => v !== null && v > 0).length
  if (tiene < 2) return null

  if ((c === null || c <= 0) && p && s) {
    c = Number((s / p).toFixed(3))
    reconstruido.push('cantidad')
  }
  if ((p === null || p <= 0) && c && s) {
    p = Number((s / c).toFixed(2))
    reconstruido.push('precioUnitario')
  }
  if ((s === null || s <= 0) && c && p) {
    s = Number((c * p).toFixed(2))
    reconstruido.push('subtotal')
  }

  if (!c || !p || !s) return null

  // Los tres presentes pero la cuenta no cierra: el importe manda,
  // porque es el número más grande y el que menos se confunde.
  if (reconstruido.length === 0 && !casi(c * p, s)) {
    const cDesdeS = Number((s / p).toFixed(3))
    const pDesdeS = Number((s / c).toFixed(2))
    // Elegimos corregir el campo que queda "más redondo": los precios por
    // kilo suelen ser valores enteros o con .50, los pesos no.
    if (Math.abs(pDesdeS - Math.round(pDesdeS)) < 0.01) {
      p = pDesdeS
      reconstruido.push('precioUnitario')
    } else {
      c = cDesdeS
      reconstruido.push('cantidad')
    }
  }

  return { cantidad: c, precioUnitario: p, subtotal: s, reconstruido, textoOriginal }
}

/**
 * Parsea el texto OCR de un ticket.
 *
 * Nunca tira excepción: si no entiende nada devuelve items vacíos con
 * confianza 'baja' y las advertencias correspondientes, para que la
 * pantalla de revisión ofrezca carga manual.
 */
export function parseTicket(textoCrudo: string): TicketParseado {
  const lineas = aLineas(textoCrudo)
  const advertencias: string[] = []
  const items: ItemTicket[] = []

  // ── Encabezado ──
  const texto = lineas.join('\n')
  const mNum = texto.match(RE_NUMERO)
  const mFecha = texto.match(RE_FECHA)
  const mHora = texto.match(RE_HORA)

  let codigoBarras: string | null = null
  for (const l of lineas) {
    const m = forzarDigitos(l.replace(/\s/g, '')).match(RE_EAN13)
    if (m && ean13Valido(m[1])) {
      codigoBarras = m[1]
      break
    }
  }

  // ── Renglones de producto ──
  // Cada ítem es `<peso>kg @ <precio>$/kg`; el importe puede venir en la
  // misma línea o en la siguiente, alineado a la derecha.
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i]
    // La línea de total también empieza con números y "ART.": si no se
    // descarta primero, se cuela como si fuera un renglón de producto.
    if (RE_TOTAL.test(linea) || RE_TOTAL_SIMPLE.test(linea)) continue

    const m = linea.match(RE_ITEM) ?? linea.match(RE_ITEM_UNIDAD)
    if (!m) continue

    const cantidad = parseNumero(m[1])
    const precio = parseNumero(m[2])

    // Importe: primero en el resto de la misma línea, si no en la siguiente.
    const resto = linea.slice((m.index ?? 0) + m[0].length)
    let subtotal = parseNumero(resto.match(RE_IMPORTE)?.[1] ?? null)
    let textoOriginal = linea

    if (subtotal === null && i + 1 < lineas.length) {
      const sig = lineas[i + 1]
      // Que la línea siguiente sea SOLO un importe, no otro renglón de ítem.
      if (!RE_ITEM.test(sig) && !RE_ITEM_UNIDAD.test(sig) && !RE_TOTAL.test(sig)) {
        const mImp = sig.match(RE_IMPORTE)
        if (mImp) {
          subtotal = parseNumero(mImp[1])
          textoOriginal = `${linea} ${sig}`
          i++ // consumimos la línea del importe
        }
      }
    }

    const item = reconciliarItem(cantidad, precio, subtotal, textoOriginal)
    if (item) items.push(item)
    else advertencias.push(`No se pudo interpretar el renglón: "${linea}"`)
  }

  // ── Total y contador de artículos ──
  let total: number | null = null
  let articulosDeclarados: number | null = null

  const mTotal = texto.match(RE_TOTAL)
  if (mTotal) {
    articulosDeclarados = parseNumero(mTotal[1])
    total = parseNumero(mTotal[2])
  } else {
    const mSimple = texto.match(RE_TOTAL_SIMPLE)
    if (mSimple) total = parseNumero(mSimple[1])
  }

  // ── Validaciones cruzadas ──
  const sumaItems = items.reduce((acc, it) => acc + it.subtotal, 0)
  let confianza: Confianza = 'alta'

  if (items.length === 0) {
    confianza = 'baja'
    advertencias.push('No se detectó ningún producto en el ticket.')
  }

  if (articulosDeclarados !== null && items.length > 0 && articulosDeclarados !== items.length) {
    confianza = 'baja'
    advertencias.push(
      `El ticket declara ${articulosDeclarados} artículo(s) pero se detectaron ${items.length}.`,
    )
  }

  if (total !== null && items.length > 0 && !casi(sumaItems, total)) {
    confianza = 'baja'
    advertencias.push(
      `La suma de los renglones ($${sumaItems.toFixed(2)}) no coincide con el total del ticket ($${total.toFixed(2)}).`,
    )
  }

  if (confianza === 'alta' && items.some((it) => it.reconstruido.length > 0)) {
    confianza = 'media'
    advertencias.push('Algún valor se reconstruyó por cálculo. Verificá antes de confirmar.')
  }

  if (total === null && items.length > 0) {
    if (confianza === 'alta') confianza = 'media'
    advertencias.push('No se leyó el total del ticket; se usa la suma de los renglones.')
  }

  return {
    items,
    total,
    articulosDeclarados,
    numero: mNum ? mNum[1] : null,
    fecha: mFecha ? `${mFecha[1].padStart(2, '0')}/${mFecha[2].padStart(2, '0')}/${mFecha[3]}` : null,
    hora: mHora ? `${mHora[1].padStart(2, '0')}:${mHora[2]}` : null,
    codigoBarras,
    confianza,
    advertencias,
    textoCrudo,
  }
}
