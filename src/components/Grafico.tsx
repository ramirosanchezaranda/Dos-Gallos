import { useState } from 'react'

/**
 * Gráficos de barras de una sola serie. Se usa un único color a propósito:
 * verde y naranja juntos son indistinguibles para el daltonismo más común, así
 * que lo que separa cada barra es su etiqueta, nunca el color.
 */

interface BarraV {
  etiqueta: string
  valor: number
  detalle: string
}

export function BarrasVerticales({
  datos,
  alto = 128,
  cadaCuantas = 1,
}: {
  datos: BarraV[]
  alto?: number
  /** Cada cuántas barras se escribe la etiqueta, para que no se amontonen. */
  cadaCuantas?: number
}) {
  const [sel, setSel] = useState<number | null>(null)
  const max = Math.max(...datos.map((d) => d.valor), 0)
  const activo = sel !== null ? datos[sel] : null

  return (
    <div>
      {/* El detalle vive arriba y no encima de la barra: en un celular el dedo
          tapa justo la zona donde iría un tooltip flotante. */}
      <p className="text-xs h-4 mb-1 text-verde-800 font-medium">
        {activo ? `${activo.etiqueta} · ${activo.detalle}` : ''}
      </p>

      <div className="flex items-end gap-[2px]" style={{ height: alto }}>
        {datos.map((d, i) => (
          <button
            key={i}
            onClick={() => setSel(sel === i ? null : i)}
            className="flex-1 flex items-end h-full min-w-0 group"
            aria-label={`${d.etiqueta}: ${d.detalle}`}
          >
            <span
              className={`w-full rounded-t transition-colors ${
                sel === i ? 'bg-verde-900' : 'bg-verde-600'
              }`}
              style={{
                // Las barras en cero dejan un hilo visible: el día existió y no vendió,
                // que no es lo mismo que un hueco en la serie.
                height: max > 0 ? `${Math.max((d.valor / max) * 100, d.valor > 0 ? 2 : 1)}%` : '1%',
                opacity: d.valor === 0 ? 0.25 : 1,
              }}
            />
          </button>
        ))}
      </div>

      <div className="flex gap-[2px] mt-1">
        {datos.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[9px] text-verde-700/60 truncate min-w-0"
          >
            {i % cadaCuantas === 0 || i === datos.length - 1 ? d.etiqueta : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

interface BarraH {
  etiqueta: string
  valor: number
  /** Texto que va a la derecha, ya formateado. */
  valorTexto: string
  detalle?: string
}

export function BarrasHorizontales({ datos }: { datos: BarraH[] }) {
  const max = Math.max(...datos.map((d) => d.valor), 0)

  return (
    <div className="space-y-2.5">
      {datos.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between items-baseline gap-2 mb-1">
            <span className="text-sm truncate min-w-0">{d.etiqueta}</span>
            <span className="text-sm font-semibold shrink-0">{d.valorTexto}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-verde-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-verde-600 rounded-full"
                style={{ width: max > 0 ? `${Math.max((d.valor / max) * 100, 1)}%` : '0%' }}
              />
            </div>
            {d.detalle && (
              <span className="text-[10px] text-verde-700/60 shrink-0 w-16 text-right">
                {d.detalle}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
