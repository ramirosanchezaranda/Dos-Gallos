import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { BarrasVerticales, BarrasHorizontales } from '../components/Grafico'
import { useVentasVentana, useItemsVentana, useGastosVentana } from '../hooks/useEstadisticas'
import {
  porDia,
  porDiaSemana,
  topProductos,
  porMetodoPago,
  variacion,
  ticketPromedio,
  suma,
  claveDia,
} from '../lib/estadisticas'
import { pesos, kilos } from '../lib/formato'
import { CardRotacion } from '../components/CardRotacion'
import { CardCalendario } from '../components/CardCalendario'

const METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  qr: 'QR',
}

/** Primer día del mes, corrido `atras` meses. */
const inicioMes = (atras = 0) => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() - atras, 1)
}

export default function Estadisticas() {
  const navigate = useNavigate()
  const { data: ventas = [], isLoading } = useVentasVentana()
  const { data: items = [] } = useItemsVentana()
  const { data: gastos = [] } = useGastosVentana()

  const d = useMemo(() => {
    const esteMes = inicioMes(0)
    const mesPasado = inicioMes(1)

    const enMes = (iso: string, desde: Date, hasta?: Date) => {
      const f = new Date(iso)
      return f >= desde && (!hasta || f < hasta)
    }

    const ventasMes = ventas.filter((v) => enMes(v.fecha, esteMes))
    const ventasMesPasado = ventas.filter((v) => enMes(v.fecha, mesPasado, esteMes))
    const itemsMes = items.filter((i) => enMes(i.fecha, esteMes))

    // Los gastos guardan fecha sin hora, así que se comparan como texto de día.
    const claveInicio = esteMes.toLocaleDateString('en-CA')
    const clavePasado = mesPasado.toLocaleDateString('en-CA')
    const gastosMes = gastos.filter((g) => g.fecha >= claveInicio)
    const gastosMesPasado = gastos.filter((g) => g.fecha >= clavePasado && g.fecha < claveInicio)

    const vendido = suma(ventasMes)
    const gastado = gastosMes.reduce((a, g) => a + g.monto, 0)

    const hoy = claveDia(new Date().toISOString())
    const ventasHoy = ventas.filter((v) => claveDia(v.fecha) === hoy)

    return {
      vendido,
      gastado,
      resultado: vendido - gastado,
      cambioVentas: variacion(vendido, suma(ventasMesPasado)),
      cambioGastos: variacion(gastado, gastosMesPasado.reduce((a, g) => a + g.monto, 0)),
      cantidadVentas: ventasMes.length,
      ticket: ticketPromedio(ventasMes),
      vendidoHoy: suma(ventasHoy),
      ventasHoy: ventasHoy.length,
      dias: porDia(ventas, 14),
      semana: porDiaSemana(ventas),
      top: topProductos(itemsMes, 8),
      metodos: porMetodoPago(ventasMes),
      hayDatos: ventas.length > 0,
    }
  }, [ventas, items, gastos])

  const mesActual = new Date().toLocaleDateString('es-AR', { month: 'long' })
  const mejorDia = [...d.semana].sort((a, b) => b.promedio - a.promedio)[0]

  return (
    <>
      <PageHeader
        title="Estadísticas"
        action={
          <button onClick={() => navigate('/')} className="text-xs text-verde-200 font-medium">
            Volver
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {isLoading && <p className="text-center text-verde-700 py-8 text-sm">Cargando…</p>}

        {!isLoading && !d.hayDatos && (
          <div className="card text-center text-verde-700 text-sm py-10">
            Todavía no hay ventas registradas.
            <br />
            Cuando cargues algunas, acá vas a ver cómo viene el negocio.
          </div>
        )}

        {d.hayDatos && (
          <>
            {/* ─── Titular del mes ─── */}
            <div className="card bg-verde-800 text-white border-none">
              <p className="text-sm text-verde-200">Vendido en {mesActual}</p>
              <p className="text-4xl font-bold leading-tight">{pesos(d.vendido)}</p>
              <p className="text-sm text-verde-200 mt-1">
                {d.cantidadVentas} venta{d.cantidadVentas === 1 ? '' : 's'}
                {d.cambioVentas !== null && (
                  <>
                    {' · '}
                    {d.cambioVentas >= 0 ? '▲' : '▼'} {Math.abs(d.cambioVentas).toFixed(0)}% vs. mes
                    pasado
                  </>
                )}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="card text-center">
                <p className="text-[10px] text-verde-700 leading-tight">Gastado</p>
                <p className="text-base font-bold text-alerta leading-tight mt-0.5">
                  {pesos(d.gastado)}
                </p>
                {d.cambioGastos !== null && (
                  <p className="text-[9px] text-verde-700/60 mt-0.5">
                    {d.cambioGastos >= 0 ? '▲' : '▼'} {Math.abs(d.cambioGastos).toFixed(0)}%
                  </p>
                )}
              </div>
              <div className="card text-center">
                <p className="text-[10px] text-verde-700 leading-tight">Resultado</p>
                <p
                  className={`text-base font-bold leading-tight mt-0.5 ${
                    d.resultado >= 0 ? 'text-verde-800' : 'text-alerta'
                  }`}
                >
                  {pesos(d.resultado)}
                </p>
                <p className="text-[9px] text-verde-700/60 mt-0.5">ventas − gastos</p>
              </div>
              <div className="card text-center">
                <p className="text-[10px] text-verde-700 leading-tight">Ticket promedio</p>
                <p className="text-base font-bold text-verde-800 leading-tight mt-0.5">
                  {pesos(d.ticket)}
                </p>
                <p className="text-[9px] text-verde-700/60 mt-0.5">por venta</p>
              </div>
            </div>

            {/* ─── Ritmo diario ─── */}
            <div className="card">
              <h2 className="font-semibold text-verde-900 text-sm mb-0.5">Últimos 14 días</h2>
              <p className="text-xs text-verde-700/60 mb-2">Tocá una barra para ver el día</p>
              <BarrasVerticales
                datos={d.dias.map((p) => ({
                  etiqueta: p.etiqueta,
                  valor: p.total,
                  detalle:
                    p.ventas > 0
                      ? `${pesos(p.total)} en ${p.ventas} venta${p.ventas === 1 ? '' : 's'}`
                      : 'sin ventas',
                }))}
                cadaCuantas={2}
              />
            </div>

            {/* ─── Semana típica ─── */}
            <div className="card">
              <h2 className="font-semibold text-verde-900 text-sm mb-0.5">
                En qué días vendés más
              </h2>
              <p className="text-xs text-verde-700/60 mb-2">
                Promedio por jornada abierta, últimos 3 meses
              </p>
              <BarrasVerticales
                datos={d.semana.map((s) => ({
                  etiqueta: s.dia,
                  valor: s.promedio,
                  detalle:
                    s.jornadas > 0
                      ? `${pesos(s.promedio)} en promedio (${s.jornadas} ${
                          s.jornadas === 1 ? 'jornada' : 'jornadas'
                        })`
                      : 'sin datos',
                }))}
              />
              {mejorDia && mejorDia.promedio > 0 && (
                <p className="text-xs text-verde-800 mt-2 pt-2 border-t border-verde-100">
                  Tu mejor día es el <strong>{mejorDia.dia}</strong>, con {pesos(mejorDia.promedio)}{' '}
                  en promedio.
                </p>
              )}
            </div>

            {/* ─── Productos ─── */}
            <div className="card">
              <h2 className="font-semibold text-verde-900 text-sm mb-0.5">
                Qué te deja más plata
              </h2>
              <p className="text-xs text-verde-700/60 mb-3">Facturado en {mesActual}</p>
              {d.top.length === 0 ? (
                <p className="text-sm text-verde-700/60 py-4 text-center">
                  Sin ventas cargadas este mes
                </p>
              ) : (
                <BarrasHorizontales
                  datos={d.top.map((p) => ({
                    etiqueta: p.nombre,
                    valor: p.facturado,
                    valorTexto: pesos(p.facturado),
                    detalle: kilos(p.cantidad),
                  }))}
                />
              )}
            </div>

            {/* ─── Cobros ─── */}
            <div className="card">
              <h2 className="font-semibold text-verde-900 text-sm mb-0.5">Cómo te pagan</h2>
              <p className="text-xs text-verde-700/60 mb-3 capitalize">{mesActual}</p>
              {d.metodos.length === 0 ? (
                <p className="text-sm text-verde-700/60 py-4 text-center">Sin datos este mes</p>
              ) : (
                <BarrasHorizontales
                  datos={d.metodos.map((m) => ({
                    etiqueta: METODO[m.metodo] ?? m.metodo,
                    valor: m.total,
                    valorTexto: pesos(m.total),
                    detalle: `${m.ventas} vta${m.ventas === 1 ? '' : 's'}`,
                  }))}
                />
              )}
            </div>

            <CardCalendario ventas={ventas} />

            <CardRotacion />

            <p className="text-xs text-verde-700/60 text-center pb-2">
              Hoy llevás {pesos(d.vendidoHoy)} en {d.ventasHoy} venta
              {d.ventasHoy === 1 ? '' : 's'}.
            </p>
          </>
        )}
      </div>
    </>
  )
}
