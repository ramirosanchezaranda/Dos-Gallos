import { useState } from 'react'
import { Calendario } from './Calendario'
import { CardTurno } from './CardTurno'
import { useVentasDeFecha } from '../hooks/useVentas'
import { porTurno, totalesPorDia } from '../lib/turnos'
import type { VentaResumen } from '../lib/estadisticas'
import { pesos, diaYFecha } from '../lib/formato'

export function CardCalendario({ ventas }: { ventas: VentaResumen[] }) {
  const [dia, setDia] = useState<string | null>(null)
  const totales = totalesPorDia(ventas)
  const { data: delDia = [], isLoading } = useVentasDeFecha(dia)

  const total = dia ? totales.get(dia) ?? 0 : 0

  return (
    <div className="card">
      <h2 className="font-semibold text-verde-900 text-sm mb-0.5">Ventas por día</h2>
      <p className="text-xs text-verde-700/60 mb-3">
        Tocá un día para ver cómo se repartió entre los dos turnos
      </p>

      <Calendario totales={totales} seleccionado={dia} onSeleccionar={setDia} />

      {dia && (
        <div className="mt-4 pt-3 border-t border-verde-100 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-verde-900 first-letter:uppercase">{diaYFecha(dia)}</p>
            <span className="text-sm font-bold text-verde-800 shrink-0">{pesos(total)}</span>
          </div>

          {isLoading ? (
            <p className="text-sm text-verde-700/60 py-3 text-center">Cargando…</p>
          ) : delDia.length === 0 ? (
            <p className="text-sm text-verde-700/60 py-3 text-center">
              No hubo ventas ese día.
            </p>
          ) : (
            porTurno(delDia).map((b) => <CardTurno key={b.turno} bloque={b} />)
          )}
        </div>
      )}
    </div>
  )
}
