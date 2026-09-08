/**
 * Normalización de texto OCR de tickets de balanza.
 *
 * El papel térmico + la cámara del celular producen confusiones muy
 * predecibles entre letras y dígitos. Estas funciones las corrigen SOLO
 * dentro de contextos numéricos, para no romper el texto legible.
 */

/** Confusiones habituales letra → dígito en impresión térmica. */
const OCR_A_DIGITO: Record<string, string> = {
  O: '0', o: '0', Q: '0', D: '0',
  I: '1', l: '1', '|': '1', i: '1', '!': '1',
  Z: '2', z: '2',
  S: '5', s: '5',
  b: '6', G: '6',
  T: '7',
  B: '8',
  g: '9', q: '9',
}

/** Convierte a dígitos los caracteres de una cadena que debería ser numérica. */
export function forzarDigitos(s: string): string {
  return s.replace(/[A-Za-z|!]/g, (c) => OCR_A_DIGITO[c] ?? c)
}

/**
 * Parsea un número de ticket a float.
 *
 * La balanza imprime `0.430`, `4000.00`, `1720.00`: punto decimal y sin
 * separador de miles. Pero el OCR confunde `.` con `,` (en el ticket real
 * "FECHA:02/02,14" salió con coma donde hay una barra), y otras balanzas
 * usan formato argentino `4.500,00`. Regla general: el ÚLTIMO separador
 * es el decimal si deja 1-3 decimales; si no, era separador de miles.
 *
 * Devuelve null si no queda un número válido.
 */
export function parseNumero(raw: string | undefined | null): number | null {
  if (!raw) return null

  // Sin ningún dígito real de entrada no hay número que rescatar. Sin esta
  // guarda, forzarDigitos convertiría texto suelto ("MUCHAS GRACIAS") en
  // un número inventado.
  if (!/\d/.test(raw)) return null

  const s = forzarDigitos(raw.trim())
    .replace(/[$\s]/g, '')
    .replace(/[^\d.,-]/g, '')

  if (!s || !/\d/.test(s)) return null

  const corte = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','))

  if (corte === -1) {
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  const decimales = s.length - corte - 1
  const entero = s.slice(0, corte).replace(/[.,]/g, '')
  const resto = s.slice(corte + 1)

  // 1-3 decimales → separador decimal real. Otro caso → era de miles.
  const s2 = decimales >= 1 && decimales <= 3 ? `${entero}.${resto}` : `${entero}${resto}`

  const n = Number(s2)
  return Number.isFinite(n) ? n : null
}

/** Colapsa espacios y descarta caracteres de control de una línea OCR. */
export function limpiarLinea(linea: string): string {
  // eslint-disable-next-line no-control-regex
  return linea.replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim()
}

/** Divide el texto OCR en líneas útiles (descarta vacías). */
export function aLineas(texto: string): string[] {
  return texto.split(/\r?\n/).map(limpiarLinea).filter((l) => l.length > 0)
}
