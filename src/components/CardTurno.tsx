import type { BloqueTurno } from '../lib/turnos'
import type { Venta } from '../types/db'
import { pesos, horaCorta } from '../lib/formato'

const ORIGEN: Record<string, string> = {
  ocr: '📷 Desde ticket',
  voz: '🎙 Dictada',
  manual: '✍️ Manual',
}

/** Un turno del día con su total y el detalle de las ventas. */
export function CardTurno({ bloque }: { bloque: BloqueTurno<Venta> }) {
  const vacio = bloque.ventas.length === 0

  return (
    <div className={`card ${vacio ? 'bg-verde-50/60' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold text-verde-900 text-sm">{bloque.label}</h3>
        {bloque.horario && (
          <span className="text-[11px] text-verde-700/60 shrink-0">{bloque.horario}</span>
        )}
      </div>

      {vacio ? (
        <p className="text-sm text-verde-700/60 mt-1">Sin ventas en este turno</p>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-verde-900">{pesos(bloque.total)}</span>
            <span className="text-xs text-verde-700/70">
              {bloque.ventas.length} venta{bloque.ventas.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-verde-100 space-y-1.5">
            {bloque.ventas.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-verde-900">
                    {horaCorta(v.fecha)}
                    {v.ticket_nro && ` · Ticket ${v.ticket_nro}`}
                  </p>
                  <p className="text-[11px] text-verde-700/70 truncate">
                    {ORIGEN[v.origen] ?? ORIGEN.manual}
                    {v.metodo_pago && ` · ${v.metodo_pago}`}
                  </p>
                </div>
                <span className="font-semibold text-verde-900 text-sm shrink-0">
                  {pesos(Number(v.total))}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
