import { useMemo, useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { HojaInferior } from '../components/HojaInferior'
import { FormularioVenta } from '../components/FormularioVenta'
import { DesgloseDelDia } from '../components/DesgloseDelDia'
import { useProductos } from '../hooks/useProductos'
import {
  useVentas,
  useGuardarVenta,
  useGuardarComprobante,
  useCompletarVenta,
  useBorrarVenta,
} from '../hooks/useVentasMostrador'
import { subirComprobante, BucketFaltante, SinPermisoEnBucket } from '../lib/comprobantes'
import {
  desglosarPorDia,
  pendientesDeCompletar,
  minutosDesde,
  CORTO_METODO,
  type Metodo,
} from '../lib/desglose'
import { claveDia } from '../lib/estadisticas'
import { pesos, horaCorta, diaYFecha } from '../lib/formato'
import type { Venta } from '../types/db'

type Panel = null | { modo: 'nueva' } | { modo: 'completar'; venta: Venta }

export default function Ventas() {
  const { data: productos = [] } = useProductos()
  const { data: ventas = [], isLoading } = useVentas()
  const guardar = useGuardarVenta()
  const guardarComprobante = useGuardarComprobante()
  const completar = useCompletarVenta()
  const borrar = useBorrarVenta()

  const [panel, setPanel] = useState<Panel>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [fotoNueva, setFotoNueva] = useState<string | null>(null)
  const [recordatorioVisto, setRecordatorioVisto] = useState(false)
  const fotoRef = useRef<HTMLInputElement>(null)
  const soloFotoRef = useRef<HTMLInputElement>(null)

  const dias = useMemo(() => desglosarPorDia(ventas), [ventas])
  const hoy = claveDia(new Date().toISOString())
  const deHoy = dias.find((d) => d.dia === hoy)
  const anteriores = dias.filter((d) => d.dia !== hoy)
  const ventasDeHoy = ventas.filter((v) => claveDia(v.fecha) === hoy)
  const pendientes = useMemo(() => pendientesDeCompletar(ventas), [ventas])

  const subirFoto = async (archivo: File): Promise<string | null> => {
    setSubiendo(true)
    setAviso(null)
    try {
      return await subirComprobante(archivo)
    } catch (e) {
      setAviso(
        e instanceof BucketFaltante
          ? 'Falta crear el espacio de fotos en Supabase. La venta se guarda igual, sin comprobante.'
          : e instanceof SinPermisoEnBucket
            ? 'Al espacio de fotos le faltan los permisos en Supabase. La venta se guarda igual, sin comprobante.'
            : 'No se pudo subir la foto. La venta se guarda igual, sin comprobante.',
      )
      return null
    } finally {
      setSubiendo(false)
    }
  }

  /** Solo la foto: para el apuro. El resto se carga después. */
  const guardarSoloFoto = async (archivo: File) => {
    const ruta = await subirFoto(archivo)
    if (!ruta) return
    await guardarComprobante.mutateAsync(ruta)
    setAviso('Foto guardada. Completala cuando puedas.')
  }

  return (
    <>
      <PageHeader title="Ventas" />

      <div className="p-4 space-y-4">
        {/* ─── Recordatorio de las que quedaron en foto ─── */}
        {pendientes.length > 0 && !recordatorioVisto && (
          <div
            role="alert"
            className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3"
          >
            <div>
              <p className="font-bold text-amber-900">
                {pendientes.length} venta{pendientes.length === 1 ? '' : 's'} sin completar
              </p>
              <p className="text-sm text-amber-800 mt-0.5">
                Sacaste la foto hace {minutosDesde(pendientes[0].fecha)} min y todavía le falta
                el importe.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPanel({ modo: 'completar', venta: pendientes[0] })}
                className="flex-1 bg-amber-600 text-white font-semibold py-3 rounded-xl
                           active:scale-95 transition-transform"
              >
                Completar ahora
              </button>
              <button
                onClick={() => setRecordatorioVisto(true)}
                className="px-4 text-amber-800 font-medium"
              >
                Más tarde
              </button>
            </div>
          </div>
        )}

        {aviso && (
          <p
            role="status"
            className="rounded-xl bg-verde-50 border border-verde-200 px-3 py-2 text-sm text-verde-800"
          >
            {aviso}
          </p>
        )}

        {/* ─── Las dos formas de cargar ─── */}
        <div className="space-y-2">
          <button
            onClick={() => { setFotoNueva(null); setPanel({ modo: 'nueva' }) }}
            className="w-full bg-verde-700 text-white font-bold text-lg py-5 rounded-2xl
                       active:scale-95 transition-transform"
          >
            + Cargar una venta
          </button>

          <button
            onClick={() => soloFotoRef.current?.click()}
            disabled={subiendo}
            className="w-full border-2 border-verde-200 text-verde-800 font-semibold py-4
                       rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {subiendo ? 'Subiendo foto…' : '📷 Solo la foto, completo después'}
          </button>
          <input
            ref={soloFotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void guardarSoloFoto(f)
            }}
          />
        </div>

        {/* ─── Hoy ─── */}
        <section className="card">
          <DesgloseDelDia
            d={deHoy ?? { dia: hoy, total: 0, ventas: 0, pendientes: 0, lineas: [] }}
            titulo={diaYFecha(new Date().toISOString())}
          />
        </section>

        {isLoading && <p className="text-center text-verde-700 py-6 text-sm">Cargando…</p>}

        {/* ─── Las ventas de hoy, una por una ─── */}
        {ventasDeHoy.length > 0 && (
          <section>
            <h2 className="font-semibold text-verde-900 mb-2">Detalle de hoy</h2>
            <ul className="space-y-2">
              {ventasDeHoy.map((v) => (
                <li key={v.id} className="card flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-verde-900 truncate">
                      {v.completa ? v.detalle || 'Sin detalle' : 'Falta completar'}
                    </p>
                    <p className="text-xs text-verde-700/70">
                      {horaCorta(v.fecha)}
                      {v.metodo_pago && ` · ${CORTO_METODO[v.metodo_pago as Metodo] ?? v.metodo_pago}`}
                      {v.ticket_url && ' · 📷'}
                    </p>
                  </div>
                  {v.completa ? (
                    <span className="font-bold text-verde-900 shrink-0">
                      {pesos(Number(v.total))}
                    </span>
                  ) : (
                    <button
                      onClick={() => setPanel({ modo: 'completar', venta: v })}
                      className="shrink-0 bg-amber-100 text-amber-900 font-semibold text-sm
                                 px-3 min-h-11 rounded-xl active:scale-95 transition-transform"
                    >
                      Completar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ─── Días anteriores ─── */}
        {anteriores.length > 0 && (
          <section>
            <h2 className="font-semibold text-verde-900 mb-2">Días anteriores</h2>
            <div className="space-y-2">
              {anteriores.slice(0, 14).map((d) => (
                <details key={d.dia} className="card">
                  <summary className="flex items-baseline justify-between gap-2 cursor-pointer list-none">
                    <span className="text-sm font-medium text-verde-900 first-letter:uppercase">
                      {diaYFecha(d.dia)}
                    </span>
                    <span className="font-bold text-verde-900 shrink-0">{pesos(d.total)}</span>
                  </summary>
                  <div className="mt-3 pt-3 border-t border-verde-100">
                    <DesgloseDelDia d={d} />
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ─── Carga / completado ─── */}
      {panel?.modo === 'nueva' && (
        <HojaInferior
          titulo="Cargar una venta"
          onCerrar={() => setPanel(null)}
          acciones={
            <button
              type="submit"
              form="form-venta"
              disabled={guardar.isPending}
              className="w-full bg-verde-700 text-white font-bold text-lg py-4 rounded-2xl
                         active:scale-95 transition-transform disabled:opacity-40"
            >
              {guardar.isPending ? 'Guardando…' : 'Guardar venta'}
            </button>
          }
        >
          <button
            onClick={() => fotoRef.current?.click()}
            disabled={subiendo}
            className="w-full border-2 border-dashed border-verde-200 text-verde-700
                       font-medium py-3 rounded-xl disabled:opacity-50"
          >
            {subiendo ? 'Subiendo…' : fotoNueva ? '📷 Foto lista — tocá para cambiar' : '📷 Agregar foto del ticket'}
          </button>
          <input
            ref={fotoRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) setFotoNueva(await subirFoto(f))
            }}
          />

          <FormularioVenta
            productos={productos}
            idFormulario="form-venta"
            enviando={guardar.isPending}
            onGuardar={async (v) => {
              await guardar.mutateAsync({ ...v, ticket_url: fotoNueva })
              setFotoNueva(null)
              setPanel(null)
            }}
          />
        </HojaInferior>
      )}

      {panel?.modo === 'completar' && (
        <HojaInferior
          titulo="Completar la venta"
          onCerrar={() => setPanel(null)}
          acciones={
            <button
              type="submit"
              form="form-completar"
              disabled={completar.isPending}
              className="w-full bg-verde-700 text-white font-bold text-lg py-4 rounded-2xl
                         active:scale-95 transition-transform disabled:opacity-40"
            >
              {completar.isPending ? 'Guardando…' : 'Completar venta'}
            </button>
          }
        >
          <p className="text-sm text-verde-700/70">
            Foto sacada a las {horaCorta(panel.venta.fecha)}.
          </p>
          <FormularioVenta
            productos={productos}
            idFormulario="form-completar"
            inicial={{
              detalle: panel.venta.detalle ?? '',
              total: panel.venta.total > 0 ? String(panel.venta.total) : '',
              metodo: panel.venta.metodo_pago,
            }}
            enviando={completar.isPending}
            onGuardar={async (v) => {
              await completar.mutateAsync({ ...v, id: panel.venta.id, ticket_url: null })
              setPanel(null)
            }}
          />
          <button
            onClick={async () => {
              if (confirm('¿Borrar esta venta sin completar?')) {
                await borrar.mutateAsync(panel.venta.id)
                setPanel(null)
              }
            }}
            className="w-full text-alerta text-sm font-medium py-2"
          >
            Borrar esta venta
          </button>
        </HojaInferior>
      )}
    </>
  )
}
