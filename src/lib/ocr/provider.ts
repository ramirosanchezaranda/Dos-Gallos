/**
 * Capa de OCR intercambiable.
 *
 * La app pide "convertí esta foto en texto" y no sabe quién lo hace. Hoy lo
 * resuelve Tesseract en el navegador (gratis, sin claves, offline). El día
 * que se quiera precisión de IA de visión, se implementa esta misma interfaz
 * en otro archivo y se cambia una línea en `getOcrProvider()`: ni el parser
 * ni la UI se enteran.
 */

export interface ResultadoOcr {
  /** Texto plano reconocido, con saltos de línea. */
  texto: string
  /** Confianza media 0-100 que reporta el motor, si la da. */
  confianza: number | null
  /** Qué motor lo produjo, para guardarlo junto a la venta. */
  motor: string
  /** Milisegundos que tardó, útil para decidir si conviene cambiar de motor. */
  duracionMs: number
}

export interface OcrProvider {
  nombre: string
  /** Reconoce texto en una imagen ya preprocesada. */
  reconocer(imagen: HTMLCanvasElement | Blob, onProgreso?: (p: number) => void): Promise<ResultadoOcr>
  /** Libera recursos (workers, modelos). Idempotente. */
  liberar(): Promise<void>
}
