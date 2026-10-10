import { useMemo, useState, useId } from 'react'
import type { MetodoPago, Producto } from '../types/db'
import { METODOS, CORTO_METODO, type Metodo } from '../lib/desglose'
import { pesos } from '../lib/formato'

/**
 * Carga de una venta: cuánto, qué y cómo pagó.
 *
 * El orden sigue al del mostrador. Primero el importe, que es el dato que
 * no puede faltar y el único que hace falta mirar dos veces; después el
 * detalle, que es memoria para más adelante; y al final la forma de cobro,
 * que se resuelve de un toque.
 */

interface Props {
  productos: Producto[]
  /** Id del `<form>`, para poder dejar el botón de guardar en el pie fijo. */
  idFormulario: string
  /** Valores de arranque, al completar una venta que ya existía. */
  inicial?: { detalle: string; total: string; metodo: MetodoPago | null }
  enviando?: boolean
  onGuardar: (v: { detalle: string; total: number; metodo_pago: MetodoPago | null }) => void
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function FormularioVenta({
  productos,
  idFormulario,
  inicial,
  enviando = false,
  onGuardar,
}: Props) {
  const [detalle, setDetalle] = useState(inicial?.detalle ?? '')
  const [total, setTotal] = useState(inicial?.total ?? '')
  const [metodo, setMetodo] = useState<MetodoPago | null>(inicial?.metodo ?? 'efectivo')

  const idImporte = useId()
  const idDetalle = useId()

  // Sugerencias sobre la última palabra: así se puede encadenar varios
  // productos en un mismo renglón sin que el buscador se pierda.
  const sugerencias = useMemo(() => {
    const activos = productos.filter((p) => p.activo)
    const ultima = norm(detalle.split(/[,+]/).pop() ?? '').trim()
    if (!ultima) return activos.slice(0, 6)
    return activos.filter((p) => norm(p.nombre).includes(ultima)).slice(0, 6)
  }, [productos, detalle])

  const agregar = (nombre: string) => {
    const partes = detalle.split(/([,+])/)
    // Reemplaza lo que se venía escribiendo por el nombre completo.
    partes[partes.length - 1] = partes.length > 1 ? ` ${nombre}` : nombre
    setDetalle(partes.join('') + ', ')
  }

  const importe = parseFloat(total.replace(',', '.'))
  const puedeGuardar = Number.isFinite(importe) && importe > 0 && !enviando

  return (
    <form
      id={idFormulario}
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (puedeGuardar)
          onGuardar({ detalle: detalle.replace(/[\s,+]+$/, ''), total: importe, metodo_pago: metodo })
      }}
    >
      {/* ─── Importe ─── */}
      <div>
        <label htmlFor={idImporte} className="block text-sm font-semibold text-verde-900 mb-1.5">
          ¿Cuánto fue?
        </label>
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-verde-700/50"
          >
            $
          </span>
          <input
            id={idImporte}
            autoFocus
            type="text"
            inputMode="decimal"
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0"
            className="w-full border-2 border-verde-200 rounded-2xl pl-10 pr-4 py-4
                       text-3xl font-bold text-verde-900 text-right
                       focus:outline-none focus:border-verde-700"
          />
        </div>
      </div>

      {/* ─── Detalle ─── */}
      <div>
        <label htmlFor={idDetalle} className="block text-sm font-semibold text-verde-900 mb-1.5">
          ¿Qué se vendió?{' '}
          <span className="font-normal text-verde-700/60">(opcional)</span>
        </label>
        <input
          id={idDetalle}
          type="text"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          placeholder="Pechugas, 2 maples de huevo…"
          className="w-full border-2 border-verde-200 rounded-2xl px-4 py-3 text-base
                     focus:outline-none focus:border-verde-700"
        />
        {sugerencias.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {sugerencias.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => agregar(p.nombre)}
                className="px-4 min-h-11 rounded-full bg-verde-100 text-verde-800
                           text-sm font-medium active:scale-95 transition-transform
                           max-w-full truncate"
              >
                {p.nombre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Forma de cobro ─── */}
      <fieldset>
        <legend className="text-sm font-semibold text-verde-900 mb-1.5">¿Cómo pagó?</legend>
        <div className="grid grid-cols-2 gap-2">
          {METODOS.map((m) => {
            const activo = metodo === m
            return (
              <button
                key={m}
                type="button"
                aria-pressed={activo}
                onClick={() => setMetodo(m as MetodoPago)}
                className={`py-4 px-3 rounded-2xl text-base font-semibold border-2
                            transition-colors active:scale-95 ${
                              activo
                                ? 'bg-verde-700 text-white border-verde-700'
                                : 'bg-white text-verde-800 border-verde-200'
                            }`}
              >
                {CORTO_METODO[m as Metodo]}
              </button>
            )
          })}
        </div>
      </fieldset>

      {Number.isFinite(importe) && importe > 0 && (
        <p aria-live="polite" className="text-center text-sm text-verde-700/70">
          Se va a guardar {pesos(importe)}
        </p>
      )}
    </form>
  )
}
