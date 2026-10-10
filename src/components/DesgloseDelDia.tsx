import type { DesgloseDia } from '../lib/desglose'
import { pesos } from '../lib/formato'

/**
 * Lo que entró en un día, abierto por forma de cobro.
 *
 * La barra acompaña al número, no lo reemplaza: de un vistazo se ve qué
 * pesó más, y el monto exacto está al lado para cuando hay que contar la
 * caja.
 */
export function DesgloseDelDia({ d, titulo }: { d: DesgloseDia; titulo?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          {titulo && (
            <p className="text-sm font-semibold text-verde-900 first-letter:uppercase">
              {titulo}
            </p>
          )}
          <p className="text-xs text-verde-700/70">
            {d.ventas} venta{d.ventas === 1 ? '' : 's'}
            {d.pendientes > 0 && ` · ${d.pendientes} sin completar`}
          </p>
        </div>
        <p className="text-2xl font-bold text-verde-900 shrink-0">{pesos(d.total)}</p>
      </div>

      {d.lineas.length > 0 && (
        <ul className="space-y-2">
          {d.lineas.map((l) => (
            <li key={l.metodo}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-verde-800 truncate">{l.label}</span>
                <span className="font-semibold text-verde-900 shrink-0">{pesos(l.total)}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className="flex-1 h-2 bg-verde-100 rounded-full overflow-hidden"
                  role="img"
                  aria-label={`${Math.round(l.porcion * 100)}% del día`}
                >
                  <div
                    className="h-full bg-verde-600 rounded-full"
                    style={{ width: `${Math.max(2, l.porcion * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-verde-700/60 shrink-0 w-14 text-right">
                  {Math.round(l.porcion * 100)}% · {l.ventas}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {d.lineas.length === 0 && d.pendientes === 0 && (
        <p className="text-sm text-verde-700/60 text-center py-2">Todavía no hay ventas.</p>
      )}
    </div>
  )
}
