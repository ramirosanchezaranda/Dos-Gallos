import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { IconTrend, IconBox, IconCamera } from '../components/Icons'
import { useProductos } from '../hooks/useProductos'
import { useVentasDelDia } from '../hooks/useVentas'
import { useVentasVentana } from '../hooks/useEstadisticas'
import { suma } from '../lib/estadisticas'
import { useFacturas, estadoReal, diasParaVencer } from '../hooks/useFacturas'
import { useTareas } from '../hooks/useTareas'
import { useAuth } from '../hooks/useAuth'
import { useComprarManana } from '../hooks/useComprarManana'
import { pesos, cantidad as fmtCantidad, horaCorta, fechaLarga } from '../lib/formato'

export default function Panel() {
  const { data: productos = [] } = useProductos()
  const { data: ventasHoy = [] } = useVentasDelDia()
  const { data: ventasVentana = [] } = useVentasVentana()
  const { data: facturas = [] } = useFacturas()
  const { data: tareas = [] } = useTareas()
  const { salir } = useAuth()

  const totalHoy = ventasHoy.reduce((a, v) => a + Number(v.total), 0)

  const hoyFecha = new Date()
  const inicioMes = new Date(hoyFecha.getFullYear(), hoyFecha.getMonth(), 1)
  const totalMes = suma(ventasVentana.filter((v) => new Date(v.fecha) >= inicioMes))
  const stockBajo = productos.filter((p) => p.activo && p.stock_actual < p.stock_minimo)
  const sinPrecio = productos.filter((p) => p.activo && p.precio === 0)

  const facturasVencidas = facturas.filter((f) => estadoReal(f) === 'vencida')
  const facturasPorVencer = facturas.filter((f) => {
    const d = diasParaVencer(f)
    return estadoReal(f) === 'pendiente' && d !== null && d >= 0 && d <= 7
  })
  const tareasAltas = tareas.filter((t) => t.estado !== 'hecho' && t.prioridad === 'alta')
  const { sugerencias } = useComprarManana()

  return (
    <>
      <PageHeader
        title="Dos Gallos"
        action={
          <button onClick={() => void salir()} className="text-xs text-verde-200 font-medium">
            Salir
          </button>
        }
      />

      <div className="p-4 space-y-4">
        <div>
          <p className="font-semibold text-verde-900">¡Buen día!</p>
          <p className="text-sm text-verde-700 capitalize">{fechaLarga(new Date().toISOString())}</p>
        </div>

        {/* Los tres llevan a estadísticas: son el resumen, el detalle está allá. */}
        <div className="grid grid-cols-3 gap-3">
          <Link to="/estadisticas" className="card flex flex-col items-center text-center gap-1">
            <IconTrend className="w-6 h-6 text-verde-700" />
            <p className="text-lg font-bold text-verde-900 leading-tight">{pesos(totalMes)}</p>
            <p className="text-[10px] text-verde-700 leading-tight">Ventas del mes</p>
          </Link>
          <Link to="/estadisticas" className="card flex flex-col items-center text-center gap-1">
            <IconBox className="w-6 h-6 text-verde-700" />
            <p className="text-lg font-bold text-verde-900">{ventasHoy.length}</p>
            <p className="text-[10px] text-verde-700 leading-tight">Ventas hoy</p>
          </Link>
          <Link to="/estadisticas" className="card flex flex-col items-center text-center gap-1">
            <IconBox className={`w-6 h-6 ${stockBajo.length ? 'text-alerta' : 'text-verde-700'}`} />
            <p className="text-lg font-bold text-verde-900">{stockBajo.length}</p>
            <p className="text-[10px] text-verde-700 leading-tight">Stock bajo</p>
          </Link>
        </div>

        <p className="text-xs text-center text-verde-700/60 -mt-1">
          Hoy: {pesos(totalHoy)} · Tocá cualquier tarjeta para ver las estadísticas
        </p>

        <Link to="/venta" className="card flex items-center gap-4 bg-verde-800 text-white border-none">
          <IconCamera className="w-8 h-8 shrink-0" />
          <div>
            <p className="font-bold">Nueva venta</p>
            <p className="text-sm text-verde-200">Fotografiá el ticket de la balanza</p>
          </div>
        </Link>

        {sinPrecio.length > 0 && (
          <Link
            to="/productos"
            className="block bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800"
          >
            <strong>{sinPrecio.length} producto(s) sin precio.</strong> Tocá para cargarlos.
          </Link>
        )}

        {facturasVencidas.length > 0 && (
          <Link
            to="/facturas"
            className="block bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700"
          >
            <strong>
              {facturasVencidas.length} factura{facturasVencidas.length === 1 ? '' : 's'} vencida
              {facturasVencidas.length === 1 ? '' : 's'}
            </strong>{' '}
            por {pesos(facturasVencidas.reduce((a, f) => a + Number(f.total), 0))}
          </Link>
        )}

        {facturasPorVencer.length > 0 && (
          <Link
            to="/facturas"
            className="block bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800"
          >
            <strong>
              {facturasPorVencer.length} factura{facturasPorVencer.length === 1 ? '' : 's'}
            </strong>{' '}
            vence{facturasPorVencer.length === 1 ? '' : 'n'} esta semana
          </Link>
        )}

        {tareasAltas.length > 0 && (
          <Link
            to="/pendientes"
            className="block bg-verde-50 border border-verde-200 rounded-xl p-3 text-sm text-verde-800"
          >
            <strong>{tareasAltas.length} pendiente(s) de prioridad alta</strong>
          </Link>
        )}

        {stockBajo.length > 0 && (
          <div>
            <h2 className="font-semibold text-verde-900 mb-2">Reponer</h2>
            <div className="space-y-2">
              {stockBajo.slice(0, 5).map((p) => (
                <div key={p.id} className="card flex items-center justify-between">
                  <span className="font-medium truncate">{p.nombre}</span>
                  <span className="text-alerta font-bold text-sm shrink-0">
                    {fmtCantidad(p.stock_actual, p.unidad_stock)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sugerencias.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-verde-900">Comprar mañana</h2>
              <Link to="/pedidos" className="text-xs text-verde-700 font-medium">Ver pedidos →</Link>
            </div>
            <div className="card space-y-2 bg-verde-50 border-verde-200">
              {sugerencias.slice(0, 5).map((s) => (
                <div key={s.producto_id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-verde-900 truncate">{s.nombre}</p>
                    <p className="text-[11px] text-verde-700/70">
                      Stock: {fmtCantidad(s.stockActual, s.unidad as 'kg' | 'unidad')}
                      {s.diasRestantes !== null
                        ? ` · para ${s.diasRestantes === 0 ? 'hoy' : `${s.diasRestantes}d`}`
                        : ' · sin ventas recientes'}
                    </p>
                  </div>
                  {s.sugerido > 0 && (
                    <span className="text-xs font-semibold text-verde-700 shrink-0 bg-verde-100 px-2 py-0.5 rounded-full">
                      ~{fmtCantidad(s.sugerido, s.unidad as 'kg' | 'unidad')}
                    </span>
                  )}
                </div>
              ))}
              {sugerencias.length > 5 && (
                <p className="text-xs text-verde-700/60 pt-1">
                  +{sugerencias.length - 5} más · basado en ventas de los últimos 28 días
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <h2 className="font-semibold text-verde-900 mb-2">Ventas de hoy</h2>
          {ventasHoy.length === 0 ? (
            <div className="card text-center text-verde-700 text-sm py-8">
              Todavía no hay ventas registradas
            </div>
          ) : (
            <div className="space-y-2">
              {ventasHoy.map((v) => (
                <div key={v.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {horaCorta(v.fecha)}
                      {v.ticket_nro && ` · Ticket ${v.ticket_nro}`}
                    </p>
                    <p className="text-xs text-verde-700">
                      {v.origen === 'ocr' ? '📷 Desde ticket' : '✍️ Manual'}
                      {v.metodo_pago && ` · ${v.metodo_pago}`}
                    </p>
                  </div>
                  <span className="font-bold text-verde-900">{pesos(Number(v.total))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
