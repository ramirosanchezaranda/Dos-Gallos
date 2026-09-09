/**
 * Copia a `public/ocr/` lo que Tesseract necesita en tiempo de ejecución.
 *
 * Por defecto Tesseract se baja el worker, el motor WASM y el modelo de
 * idioma desde jsdelivr. Brave bloquea ese CDN, así que en el mostrador la
 * lectura del ticket fallaba con "No se pudo leer el ticket" antes siquiera
 * de empezar. Sirviéndolos desde la propia app no depende de ningún tercero
 * y además queda disponible sin internet.
 *
 * Los archivos no se versionan: salen de node_modules en cada build, así
 * nunca quedan desfasados respecto de la versión instalada.
 */

import { mkdir, copyFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'public', 'ocr')

const ARCHIVOS = [
  'node_modules/tesseract.js/dist/worker.min.js',
  // El motor: Tesseract elige una de las tres según el SIMD que soporte el
  // dispositivo. Solo las variantes `-lstm`, que son las que usa el modo 1.
  // Cada .wasm.js ya trae el binario adentro, por eso no van los .wasm.
  'node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js',
  'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js',
  // Modelo de español, versión "best_int": bastante más liviana que la full.
  'node_modules/@tesseract.js-data/spa/4.0.0_best_int/spa.traineddata.gz',
]

await mkdir(destino, { recursive: true })

let total = 0
for (const rel of ARCHIVOS) {
  const origen = join(raiz, rel)
  const nombre = rel.split('/').pop()
  try {
    await copyFile(origen, join(destino, nombre))
    total += (await stat(origen)).size
  } catch (e) {
    console.error(`\nNo se pudo copiar ${rel}\n${e.message}\n`)
    console.error('¿Están instaladas las dependencias? Probá con `npm install`.')
    process.exit(1)
  }
}

console.log(`OCR: ${ARCHIVOS.length} archivos en public/ocr (${(total / 1024 / 1024).toFixed(1)} MB)`)
