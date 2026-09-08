import { useMemo, useState } from 'react'
import type { Producto } from '../types/db'
import { pesos } from '../lib/formato'

interface Props {
  productos: Producto[]
  /** Producto ya elegido, si lo hay. */
  elegido: Producto | null
  /**
   * Precio leído del ticket. No decide nada: solo se usa para poner arriba
   * los productos que están a ese precio, que suelen ser los que buscás.
   */
  precioTicket?: number
  onElegir: (p: Producto) => void
  onCerrar: () => void
}

/** Normaliza para buscar sin tildes ni mayúsculas. */
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function SelectorProducto({
  productos,
  elegido,
  precioTicket,
  onElegir,
  onCerrar,
}: Props) {
  const [busqueda, setBusqueda] = useState('')

  const lista = useMemo(() => {
    const activos = productos.filter((p) => p.activo)
    const q = norm(busqueda.trim())

    const filtrados = q ? activos.filter((p) => norm(p.nombre).includes(q)) : activos

    // Con el precio del ticket, primero los que coinciden exacto, después
    // por cercanía. Sin precio, orden alfabético.
    if (precioTicket === undefined) {
      return filtrados.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    }
    return [...filtrados].sort((a, b) => {
      const da = a.precio > 0 ? Math.abs(a.precio - precioTicket) : Infinity
      const db = b.precio > 0 ? Math.abs(b.precio - precioTicket) : Infinity
      if (da !== db) return da - db
      return a.nombre.localeCompare(b.nombre, 'es')
    })
  }, [productos, busqueda, precioTicket])

  const coincideExacto = (p: Producto) =>
    precioTicket !== undefined && p.precio > 0 && Math.abs(p.precio - precioTicket) < 0.01

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={onCerrar}>
      <div
        className="bg-hueso w-full max-w-lg mx-auto rounded-t-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="p-4 pb-2 shrink-0">
          <div className="w-10 h-1 bg-verde-200 rounded-full mx-auto mb-3" />
          <h2 className="font-bold text-verde-900 mb-1">Elegí el producto</h2>
          {precioTicket !== undefined && (
            <p className="text-xs text-verde-700 mb-2">
              El ticket marca {pesos(precioTicket)}/kg — los de ese precio van primero
            </p>
          )}
          <input
            autoFocus
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar o escribir el nombre..."
            className="w-full border border-verde-200 rounded-xl px-3 py-2.5 text-base
                       focus:outline-none focus:border-verde-700"
          />
        </div>

        {/* Lista */}
        <div className="overflow-y-auto px-4 pb-6 flex-1">
          {lista.length === 0 && (
            <p className="text-center text-verde-700 text-sm py-8">
              No hay productos que coincidan con "{busqueda}"
            </p>
          )}

          <div className="space-y-1.5">
            {lista.map((p) => {
              const exacto = coincideExacto(p)
              const seleccionado = elegido?.id === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onElegir(p)
                    onCerrar()
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border flex items-center gap-3
                    transition-colors active:scale-[0.99]
                    ${
                      seleccionado
                        ? 'bg-verde-700 text-white border-verde-700'
                        : exacto
                          ? 'bg-verde-50 border-verde-200'
                          : 'bg-white border-verde-100'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.nombre}</p>
                    <p
                      className={`text-xs ${seleccionado ? 'text-verde-100' : 'text-verde-700/70'}`}
                    >
                      {p.precio > 0 ? `${pesos(p.precio)}/${p.unidad}` : 'Sin precio cargado'}
                    </p>
                  </div>
                  {exacto && !seleccionado && <span className="badge-green shrink-0">= precio</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
