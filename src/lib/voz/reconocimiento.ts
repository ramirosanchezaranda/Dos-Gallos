/**
 * Dictado con el reconocimiento de voz del navegador. En Android Chrome viene
 * incluido: no hace falta servidor, API key ni subir audio a ningún lado.
 *
 * Safari en iPhone no lo soporta de forma confiable, por eso `vozSoportada()`
 * decide si el botón se muestra siquiera.
 */

interface ResultadoVoz {
  isFinal: boolean
  0: { transcript: string }
}

interface EventoResultado {
  resultIndex: number
  results: { length: number; [i: number]: ResultadoVoz }
}

interface Reconocedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: EventoResultado) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

type ConstructorVoz = new () => Reconocedor

const constructor = (): ConstructorVoz | null => {
  const w = window as unknown as {
    SpeechRecognition?: ConstructorVoz
    webkitSpeechRecognition?: ConstructorVoz
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const vozSoportada = (): boolean => constructor() !== null

const MENSAJES: Record<string, string> = {
  'not-allowed': 'Falta darle permiso al micrófono',
  'service-not-allowed': 'Falta darle permiso al micrófono',
  'no-speech': 'No se escuchó nada',
  'audio-capture': 'No se encontró el micrófono',
  network: 'Hace falta internet para transcribir',
  aborted: '',
}

export interface ManejadoresVoz {
  /** Texto provisorio, se va corrigiendo mientras hablás. */
  onParcial?: (texto: string) => void
  /** Texto definitivo acumulado al soltar. */
  onFinal: (texto: string) => void
  onError: (mensaje: string) => void
  onFin?: () => void
}

/**
 * Empieza a escuchar. Devuelve la función para cortar, que además entrega lo
 * que se haya entendido hasta ese momento.
 */
export function escuchar(m: ManejadoresVoz): () => void {
  const Ctor = constructor()
  if (!Ctor) {
    m.onError('Este navegador no puede escuchar. Probá con Chrome en Android.')
    return () => {}
  }

  const r = new Ctor()
  r.lang = 'es-AR'
  r.continuous = true
  r.interimResults = true
  r.maxAlternatives = 1

  let definitivo = ''

  r.onresult = (e) => {
    let parcial = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) definitivo += res[0].transcript + ' '
      else parcial += res[0].transcript
    }
    m.onParcial?.((definitivo + parcial).trim())
  }

  r.onerror = (e) => {
    const msg = MENSAJES[e.error] ?? 'No se pudo escuchar'
    if (msg) m.onError(msg)
  }

  r.onend = () => {
    m.onFinal(definitivo.trim())
    m.onFin?.()
  }

  try {
    r.start()
  } catch {
    m.onError('No se pudo abrir el micrófono')
  }

  return () => r.stop()
}
