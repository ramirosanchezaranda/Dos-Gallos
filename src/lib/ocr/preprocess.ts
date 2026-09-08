/**
 * Preprocesado de la foto antes del OCR.
 *
 * Es el paso que más influye en el resultado. Un ticket térmico fotografiado
 * con el celular llega con poco contraste, sombra de la mano y fondo (la mesa).
 * Tesseract sobre la foto cruda falla; sobre la imagen binarizada, acierta.
 */

export interface OpcionesPreproceso {
  /** Ancho máximo. Más de ~1600px no mejora el OCR y lo vuelve lento. */
  anchoMaximo?: number
  /** Tamaño de la ventana del umbral adaptativo, en píxeles. */
  ventana?: number
  /** Cuánto más oscuro que su entorno debe ser un píxel para contar como tinta. */
  sesgo?: number
}

const POR_DEFECTO: Required<OpcionesPreproceso> = {
  anchoMaximo: 1400,
  ventana: 25,
  sesgo: 10,
}

/**
 * Convierte un archivo de imagen en un canvas binarizado listo para OCR.
 *
 * Pasos: escalar → gris ponderado → umbral adaptativo por medias integrales.
 * Se usa umbral ADAPTATIVO y no uno global porque la foto casi siempre tiene
 * un gradiente de luz (sombra de la mano de un lado, reflejo del otro) que
 * un umbral único convierte en media imagen negra.
 */
export async function preprocesarImagen(
  archivo: File | Blob,
  opciones: OpcionesPreproceso = {},
): Promise<HTMLCanvasElement> {
  const { anchoMaximo, ventana, sesgo } = { ...POR_DEFECTO, ...opciones }
  const bitmap = await createImageBitmap(archivo)

  const escala = Math.min(1, anchoMaximo / bitmap.width)
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('No se pudo obtener el contexto 2D del canvas')

  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const img = ctx.getImageData(0, 0, ancho, alto)
  const px = img.data

  // ── Gris ponderado por luminancia ──
  const gris = new Uint8ClampedArray(ancho * alto)
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gris[j] = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0
  }

  // ── Imagen integral, para medias de ventana en O(1) ──
  const integral = new Float64Array((ancho + 1) * (alto + 1))
  for (let y = 0; y < alto; y++) {
    let filaAcum = 0
    for (let x = 0; x < ancho; x++) {
      filaAcum += gris[y * ancho + x]
      integral[(y + 1) * (ancho + 1) + (x + 1)] =
        integral[y * (ancho + 1) + (x + 1)] + filaAcum
    }
  }

  const radio = Math.max(1, Math.floor(ventana / 2))

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const x0 = Math.max(0, x - radio)
      const y0 = Math.max(0, y - radio)
      const x1 = Math.min(ancho - 1, x + radio)
      const y1 = Math.min(alto - 1, y + radio)
      const area = (x1 - x0 + 1) * (y1 - y0 + 1)

      const suma =
        integral[(y1 + 1) * (ancho + 1) + (x1 + 1)] -
        integral[y0 * (ancho + 1) + (x1 + 1)] -
        integral[(y1 + 1) * (ancho + 1) + x0] +
        integral[y0 * (ancho + 1) + x0]

      const media = suma / area
      const v = gris[y * ancho + x] < media - sesgo ? 0 : 255

      const k = (y * ancho + x) * 4
      px[k] = px[k + 1] = px[k + 2] = v
      px[k + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Convierte el canvas preprocesado a Blob, para adjuntarlo o depurar. */
export function canvasABlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo convertir el canvas'))),
      'image/png',
    )
  })
}
