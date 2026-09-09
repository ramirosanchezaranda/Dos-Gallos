import { createWorker, type Worker } from 'tesseract.js'
import type { OcrProvider, ResultadoOcr } from './provider'

/**
 * OCR con Tesseract.js — corre entero en el navegador, sin costo ni claves.
 *
 * Está afinado para el ticket de la balanza:
 *  - lista blanca de caracteres: el ticket solo usa dígitos, mayúsculas y
 *    unos pocos símbolos, así que prohibir el resto elimina de raíz muchas
 *    confusiones;
 *  - modo de segmentación por bloque uniforme, que es lo que es un ticket;
 *  - el worker se crea una sola vez y se reutiliza (arrancarlo cuesta ~2s).
 */

const CARACTERES =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:/@$=-() '

/** Carpeta propia con el worker, el motor y el modelo. */
const BASE = '/ocr/'

let workerCache: Worker | null = null
let creando: Promise<Worker> | null = null

async function obtenerWorker(onProgreso?: (p: number) => void): Promise<Worker> {
  if (workerCache) return workerCache
  if (creando) return creando

  creando = (async () => {
    const w = await createWorker('spa', 1, {
      // Servidos por la propia app en vez de jsdelivr. Brave bloquea ese CDN
      // y la lectura fallaba antes de arrancar; así tampoco depende de que
      // haya internet. Los copia scripts/copiar-ocr.mjs en cada build.
      workerPath: `${BASE}worker.min.js`,
      corePath: BASE,
      langPath: BASE,
      gzip: true,
      // Siempre una función: Tesseract la llama sin comprobar, y pasarle
      // `undefined` cuando no hay callback de progreso lo hace explotar.
      logger: (m) => {
        if (m.status === 'recognizing text') onProgreso?.(m.progress)
      },
    })
    await w.setParameters({
      tessedit_char_whitelist: CARACTERES,
      // PSM 3 = segmentación automática. Sobre fotos reales del mostrador
      // rinde bastante mejor que el modo "bloque uniforme": el ticket sale
      // inclinado y con el código de barras al pie, y el modo uniforme
      // desalineaba los renglones enteros.
      tessedit_pageseg_mode: '3' as never,
      preserve_interword_spaces: '1',
    })
    workerCache = w
    creando = null
    return w
  })()

  return creando
}

export const tesseractProvider: OcrProvider = {
  nombre: 'tesseract.js',

  async reconocer(imagen, onProgreso): Promise<ResultadoOcr> {
    const inicio = performance.now()
    const worker = await obtenerWorker(onProgreso)
    const { data } = await worker.recognize(imagen)

    return {
      texto: data.text ?? '',
      confianza: typeof data.confidence === 'number' ? data.confidence : null,
      motor: 'tesseract.js/spa',
      duracionMs: Math.round(performance.now() - inicio),
    }
  },

  async liberar() {
    if (workerCache) {
      await workerCache.terminate()
      workerCache = null
    }
    creando = null
  },
}

/**
 * Devuelve el motor de OCR activo.
 *
 * Punto único de cambio para enchufar IA de visión más adelante.
 */
export function getOcrProvider(): OcrProvider {
  return tesseractProvider
}
