import { supabase } from './supabase'

/**
 * Fotos de ticket guardadas como respaldo de la venta.
 *
 * No se leen ni se interpretan: son el comprobante al que recurrir si una
 * venta queda dudosa. Viven en un bucket privado, así que para mostrarlas
 * hace falta pedir una URL firmada cada vez.
 */

const BUCKET = 'comprobantes'

/** Minutos que dura la URL que se le pasa al `<img>`. */
const MINUTOS_URL = 60

export class BucketFaltante extends Error {
  constructor() {
    super('Todavía no está creado el espacio para guardar las fotos')
    this.name = 'BucketFaltante'
  }
}

/** La foto se comprime antes de subir: del celular vienen de 3-5 MB. */
async function comprimir(archivo: File, ladoMaximo = 1600, calidad = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height))
  const ancho = Math.round(bitmap.width * escala)
  const alto = Math.round(bitmap.height * escala)

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return archivo
  }
  ctx.drawImage(bitmap, 0, 0, ancho, alto)
  bitmap.close()

  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, 'image/jpeg', calidad),
  )
  return blob ?? archivo
}

/**
 * Sube el comprobante y devuelve su ruta dentro del bucket.
 *
 * Se guarda la ruta y no una URL: el bucket es privado y cualquier URL
 * vence, así que la de mostrar se pide en el momento.
 */
export async function subirComprobante(archivo: File): Promise<string> {
  const blob = await comprimir(archivo)
  const hoy = new Date()
  const carpeta = hoy.toLocaleDateString('en-CA')
  const ruta = `${carpeta}/${hoy.getTime()}-${Math.random().toString(36).slice(2, 8)}.jpg`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, blob, { contentType: 'image/jpeg', upsert: false })

  if (error) {
    // Mientras el bucket no exista, Supabase responde "Bucket not found".
    // Conviene distinguirlo: no es un fallo de la foto ni de la conexión.
    if (/bucket.*not.*found/i.test(error.message)) throw new BucketFaltante()
    throw error
  }
  return ruta
}

/** URL temporal para mostrar un comprobante guardado. */
export async function urlDeComprobante(ruta: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(ruta, MINUTOS_URL * 60)
  if (error) return null
  return data.signedUrl
}
