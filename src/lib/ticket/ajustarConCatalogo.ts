import type { ItemTicket } from './parseTicket'

/**
 * Corrige el renglón usando los precios que ya están cargados en la app.
 *
 * La balanza cobra siempre a uno de los precios del catálogo, y esos precios
 * son pocos y están lejos entre sí. Eso los vuelve un corrector: el OCR no
 * necesita acertar el número, alcanza con que caiga más cerca del precio
 * verdadero que de cualquier otro. Leyó `13500.06`, `12006`, `1 1000`; los
 * tres caen sin dudas en 13500, 12000 y 11000.
 *
 * Con el precio ya fijo, el peso sale del importe por división. Es el orden
 * que conviene porque coincide con lo que mejor y peor lee el OCR: el
 * importe va grande y separado a la derecha y sale casi siempre bien; el
 * peso es chico, lleva punto decimal y va pegado a la "kg", y es el que más
 * se rompe (`1.150` sale `.150`, `2.070` sale `070`).
 */

/** Cuánto puede errarle el OCR a un precio y aun así reconocerse. */
const TOLERANCIA_PRECIO = 0.06

/** Pesos plausibles en un mostrador, en kg. */
const PESO_MINIMO = 0.02
const PESO_MAXIMO = 40

/** Diferencia relativa entre dos números. */
const distancia = (a: number, b: number): number =>
  Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9)

/**
 * El precio del catálogo más cercano, si está lo bastante cerca.
 *
 * Devuelve `null` ante un empate: dos precios a la misma distancia significa
 * que el OCR quedó justo en el medio y elegir sería adivinar.
 */
export function precioMasCercano(leido: number, catalogo: number[]): number | null {
  if (!Number.isFinite(leido) || leido <= 0 || catalogo.length === 0) return null

  let mejor: number | null = null
  let mejorD = Infinity
  let segundaD = Infinity
  for (const p of catalogo) {
    const d = distancia(leido, p)
    if (d < mejorD) {
      segundaD = mejorD
      mejorD = d
      mejor = p
    } else if (d < segundaD) {
      segundaD = d
    }
  }

  if (mejor === null || mejorD > TOLERANCIA_PRECIO) return null
  // Si el segundo quedó casi tan cerca como el primero, el número leído cayó
  // en el medio de los dos y elegir sería adivinar.
  if (mejorD > 0 && segundaD / mejorD < 1.5) return null
  return mejor
}

const redondear = (n: number, d: number) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

/** Hasta dónde se estira la búsqueda cuando la aritmética puede decidir. */
const TOLERANCIA_AMPLIA = 0.15

/** Cuánto puede alejarse de un gramo entero para seguir siendo creíble. */
const ERROR_GRAMOS = 0.02

/**
 * El precio del catálogo que hace que el peso dé un número entero de gramos.
 *
 * La balanza pesa de gramo en gramo, así que `importe / precio` tiene que
 * caer en un múltiplo exacto de 0,001 kg. Eso convierte a la aritmética en
 * un test mucho más filoso que la simple cercanía: en una foto real el OCR
 * leyó el precio como 11700, que por distancia cae en 12000 —mal—, pero de
 * los dos candidatos solo 11000 deja el peso redondo (1,060 kg contra
 * 0,97166… kg), y 11000 era el correcto.
 *
 * Por eso acá se busca más lejos que en `precioMasCercano`: cuando la cuenta
 * cierra sola, la distancia importa poco.
 */
export function precioQueDaPesoEntero(
  leido: number,
  importe: number,
  catalogo: number[],
): number | null {
  if (!Number.isFinite(leido) || leido <= 0 || importe <= 0) return null

  let mejor: number | null = null
  let mejorError = Infinity
  let mejorDistancia = Infinity
  let empatados = 0

  for (const p of catalogo) {
    if (distancia(leido, p) > TOLERANCIA_AMPLIA) continue
    const peso = importe / p
    if (peso < PESO_MINIMO || peso > PESO_MAXIMO) continue

    const gramos = peso * 1000
    const error = Math.abs(gramos - Math.round(gramos))
    if (error > ERROR_GRAMOS) continue

    const d = distancia(leido, p)
    if (error < mejorError - 1e-9 || (Math.abs(error - mejorError) < 1e-9 && d < mejorDistancia)) {
      if (Math.abs(error - mejorError) < 1e-9 && Math.abs(d - mejorDistancia) < 1e-9) empatados++
      else empatados = 0
      mejor = p
      mejorError = error
      mejorDistancia = d
    }
  }

  // Dos precios que cierran igual de bien: la cuenta no alcanza para elegir.
  return empatados > 0 ? null : mejor
}

/**
 * Ajusta un renglón contra el catálogo.
 *
 * Devuelve el renglón tal cual si no hay un precio que lo explique: es
 * preferible dejarlo dudoso y que la persona lo corrija a inventarle un
 * precio que no estaba.
 */
export function ajustarRenglon(item: ItemTicket, catalogo: number[]): ItemTicket {
  const porGramos = precioQueDaPesoEntero(item.precioUnitario, item.subtotal, catalogo)
  const precio = porGramos ?? precioMasCercano(item.precioUnitario, catalogo)
  if (precio === null) return item

  const reconstruido = [...item.reconstruido]
  const marcar = (campo: ItemTicket['reconstruido'][number]) => {
    if (!reconstruido.includes(campo)) reconstruido.push(campo)
  }

  if (precio !== item.precioUnitario) marcar('precioUnitario')

  // El importe manda: con el precio ya fijo, el peso es una división.
  const desdeImporte = item.subtotal > 0 ? redondear(item.subtotal / precio, 3) : null
  if (desdeImporte !== null && desdeImporte >= PESO_MINIMO && desdeImporte <= PESO_MAXIMO) {
    if (distancia(desdeImporte, item.cantidad) > 0.005) marcar('cantidad')
    return {
      ...item,
      cantidad: desdeImporte,
      precioUnitario: precio,
      subtotal: item.subtotal,
      reconstruido,
    }
  }

  // Sin importe utilizable queda el peso leído, que es lo menos confiable.
  const subtotal = redondear(item.cantidad * precio, 2)
  if (distancia(subtotal, item.subtotal) > 0.005) marcar('subtotal')
  return { ...item, precioUnitario: precio, subtotal, reconstruido }
}

/**
 * Ajusta todos los renglones y, si hay un único renglón dudoso, lo cierra
 * con el total impreso.
 *
 * El total es el número más grande del ticket y el que mejor sale. Cuando
 * un solo renglón no cierra, la resta contra el total da su importe exacto
 * sin depender de haberlo leído bien.
 */
export function ajustarTicket(
  items: ItemTicket[],
  catalogo: number[],
  total: number | null,
): ItemTicket[] {
  const ajustados = items.map((it) => ajustarRenglon(it, catalogo))
  if (total === null || ajustados.length === 0) return ajustados

  const suma = ajustados.reduce((a, it) => a + it.subtotal, 0)
  if (distancia(suma, total) <= 0.005) return ajustados

  // ¿Cuál de los renglones es el que está mal? Se prueba con cada uno: si
  // ese fuera el equivocado, su importe tendría que ser lo que le falta al
  // total. La balanza pesa de gramo en gramo, así que el candidato correcto
  // es el que deja un peso redondo en gramos; los demás dan una fracción
  // cualquiera.
  let mejor: { i: number; cantidad: number; subtotal: number; error: number } | null = null

  for (let i = 0; i < ajustados.length; i++) {
    const it = ajustados[i]
    const restante = redondear(total - (suma - it.subtotal), 2)
    if (restante <= 0 || it.precioUnitario <= 0) continue

    const gramos = (restante / it.precioUnitario) * 1000
    const error = Math.abs(gramos - Math.round(gramos))
    const cantidad = Math.round(gramos) / 1000
    if (cantidad < PESO_MINIMO || cantidad > PESO_MAXIMO) continue
    if (error > 0.5) continue

    if (!mejor || error < mejor.error) mejor = { i, cantidad, subtotal: restante, error }
  }

  // Sin un candidato claramente mejor no se toca nada: dejar el renglón
  // dudoso y que la persona lo mire es preferible a corregir el equivocado.
  if (!mejor || mejor.error > 0.01) return ajustados

  const copia = [...ajustados]
  const it = copia[mejor.i]
  const reconstruido = [...it.reconstruido]
  if (!reconstruido.includes('cantidad')) reconstruido.push('cantidad')
  copia[mejor.i] = { ...it, cantidad: mejor.cantidad, subtotal: mejor.subtotal, reconstruido }
  return copia
}
