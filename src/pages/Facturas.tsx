import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'
import {
  useFacturas,
  useGuardarFactura,
  useBorrarFactura,
  estadoReal,
  diasParaVencer,
} from '../hooks/useFacturas'
import { useProveedores, useCrearProveedor } from '../hooks/useGastos'
import type { Factura, TipoFactura, EstadoFactura } from '../types/db'
import { pesos, fechaCorta } from '../lib/formato'

const TIPOS: TipoFactura[] = ['A', 'B', 'C', 'X', 'M']
type Filtro = 'todas' | 'pendientes' | 'vencidas' | 'pagadas'

const BADGE: Record<EstadoFactura, string> = {
  pendiente: 'badge-amber',
  pagada: 'badge-green',
  vencida: 'badge-red',
  anulada: 'badge-green',
}
const LABEL: Record<EstadoFactura, string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  vencida: 'Vencida',
  anulada: 'Anulada',
}

type Borrador = {
  tipo: TipoFactura
  numero: string
  proveedor_id: string | null
  fecha_emision: string
  fecha_vencimiento: string
  neto: string
  iva: string
  total: string
  estado: EstadoFactura
}

const hoy = () => new Date().toISOString().slice(0, 10)

const vacio = (): Borrador => ({
  tipo: 'A',
  numero: '',
  proveedor_id: null,
  fecha_emision: hoy(),
  fecha_vencimiento: '',
  neto: '',
  iva: '',
  total: '',
  estado: 'pendiente',
})

const desde = (f: Factura): Borrador => ({
  tipo: f.tipo,
  numero: f.numero,
  proveedor_id: f.proveedor_id,
  fecha_emision: f.fecha_emision,
  fecha_vencimiento: f.fecha_vencimiento ?? '',
  neto: f.neto != null ? String(f.neto) : '',
  iva: f.iva != null ? String(f.iva) : '',
  total: String(f.total),
  estado: f.estado,
})

export default function Facturas() {
  const { data: facturas = [], isLoading } = useFacturas()
  const { data: proveedores = [] } = useProveedores()
  const guardar = useGuardarFactura()
  const borrar = useBorrarFactura()
  const crearProveedor = useCrearProveedor()

  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Factura | null>(null)
  const [b, setB] = useState<Borrador>(vacio())
  const [nuevoProv, setNuevoProv] = useState('')

  const nombreProv = useMemo(
    () => Object.fromEntries(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores],
  )

  const lista = useMemo(() => {
    if (filtro === 'todas') return facturas
    const buscado: EstadoFactura =
      filtro === 'pendientes' ? 'pendiente' : filtro === 'vencidas' ? 'vencida' : 'pagada'
    return facturas.filter((f) => estadoReal(f) === buscado)
  }, [facturas, filtro])

  const porPagar = facturas
    .filter((f) => estadoReal(f) !== 'pagada' && estadoReal(f) !== 'anulada')
    .reduce((a, f) => a + Number(f.total), 0)
  const vencidas = facturas.filter((f) => estadoReal(f) === 'vencida')

  const abrirNuevo = () => {
    setB(vacio())
    setEditando(null)
    setNuevoProv('')
    setAbierto(true)
  }
  const abrirEditar = (f: Factura) => {
    setB(desde(f))
    setEditando(f)
    setNuevoProv('')
    setAbierto(true)
  }
  const cerrar = () => {
    setAbierto(false)
    setEditando(null)
  }

  /** Al escribir el neto, propone el IVA 21% y el total. */
  const alCambiarNeto = (v: string) => {
    const neto = parseFloat(v)
    if (!neto) return setB({ ...b, neto: v })
    const iva = Math.round(neto * 0.21 * 100) / 100
    setB({ ...b, neto: v, iva: String(iva), total: String(Math.round((neto + iva) * 100) / 100) })
  }

  const enviar = async () => {
    const total = parseFloat(b.total)
    if (!b.numero.trim() || !total) return

    let proveedor_id = b.proveedor_id
    if (nuevoProv.trim()) {
      const p = await crearProveedor.mutateAsync(nuevoProv.trim())
      proveedor_id = p.id
    }

    await guardar.mutateAsync({
      id: editando?.id,
      tipo: b.tipo,
      numero: b.numero.trim(),
      proveedor_id,
      fecha_emision: b.fecha_emision,
      fecha_vencimiento: b.fecha_vencimiento || null,
      neto: b.neto ? parseFloat(b.neto) : null,
      iva: b.iva ? parseFloat(b.iva) : null,
      total,
      estado: b.estado,
      archivo_url: null,
    })
    cerrar()
  }

  const marcarPagada = async (f: Factura) => {
    await guardar.mutateAsync({ id: f.id, estado: 'pagada' })
  }

  const eliminar = async (f: Factura) => {
    if (!confirm(`¿Eliminar la factura ${f.numero}?`)) return
    await borrar.mutateAsync(f.id)
    cerrar()
  }

  return (
    <>
      <PageHeader
        title="Facturas"
        action={
          <button
            onClick={abrirNuevo}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label="Nueva factura"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-3">
        {vencidas.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <strong>
              {vencidas.length} factura{vencidas.length === 1 ? '' : 's'} vencida
              {vencidas.length === 1 ? '' : 's'}
            </strong>{' '}
            por {pesos(vencidas.reduce((a, f) => a + Number(f.total), 0))}
          </div>
        )}

        <div className="card bg-verde-800 text-white border-none">
          <p className="text-sm text-verde-200">Pendiente de pago</p>
          <p className="text-3xl font-bold">{pesos(porPagar)}</p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {(['todas', 'pendientes', 'vencidas', 'pagadas'] as Filtro[]).map((t) => (
            <button
              key={t}
              onClick={() => setFiltro(t)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium capitalize ${
                filtro === t ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-center text-verde-700 py-8 text-sm">Cargando…</p>}

        <div className="space-y-2">
          {lista.map((f) => {
            const est = estadoReal(f)
            const dias = diasParaVencer(f)
            return (
              <div key={f.id} className="card space-y-2">
                <button onClick={() => abrirEditar(f)} className="w-full text-left space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {f.proveedor_id ? nombreProv[f.proveedor_id] : 'Sin proveedor'}
                      </p>
                      <p className="text-xs text-verde-700">
                        Tipo {f.tipo} · {f.numero}
                      </p>
                    </div>
                    <span className={`${BADGE[est]} shrink-0`}>{LABEL[est]}</span>
                  </div>

                  <div className="grid grid-cols-3 text-xs gap-2">
                    <div>
                      <p className="text-verde-700/60">Emisión</p>
                      <p>{fechaCorta(f.fecha_emision)}</p>
                    </div>
                    <div>
                      <p className="text-verde-700/60">Vence</p>
                      <p className={est === 'vencida' ? 'text-alerta font-semibold' : ''}>
                        {f.fecha_vencimiento ? fechaCorta(f.fecha_vencimiento) : '—'}
                        {dias !== null && est === 'pendiente' && dias <= 7 && (
                          <span className="text-amber-600"> ({dias}d)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-verde-700/60">Total</p>
                      <p className="font-bold">{pesos(Number(f.total))}</p>
                    </div>
                  </div>
                </button>

                {est !== 'pagada' && est !== 'anulada' && (
                  <button
                    onClick={() => void marcarPagada(f)}
                    className="w-full py-1.5 rounded-lg bg-verde-100 text-verde-800 text-sm font-medium"
                  >
                    Marcar como pagada
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {!isLoading && lista.length === 0 && (
          <div className="card text-center text-verde-700 text-sm py-8">
            No hay facturas {filtro !== 'todas' && filtro}
          </div>
        )}
      </div>

      {/* ─── Formulario ─── */}
      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={cerrar}>
          <div
            className="bg-hueso w-full max-w-lg mx-auto rounded-t-3xl max-h-[90vh] overflow-y-auto p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-verde-200 rounded-full mx-auto" />
            <h2 className="font-bold text-verde-900">
              {editando ? 'Editar factura' : 'Nueva factura'}
            </h2>

            <div>
              <span className="text-xs text-verde-700 font-medium">Tipo</span>
              <div className="flex gap-2 mt-1">
                {TIPOS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setB({ ...b, tipo: t })}
                    className={`w-10 h-10 rounded-lg font-bold ${
                      b.tipo === t ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs text-verde-700 font-medium">Número</span>
              <input
                value={b.numero}
                onChange={(e) => setB({ ...b, numero: e.target.value })}
                placeholder="0001-00001234"
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
              />
            </label>

            <label className="block">
              <span className="text-xs text-verde-700 font-medium">Proveedor</span>
              <select
                value={b.proveedor_id ?? ''}
                onChange={(e) => setB({ ...b, proveedor_id: e.target.value || null })}
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base bg-white"
              >
                <option value="">Sin proveedor</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <input
                value={nuevoProv}
                onChange={(e) => setNuevoProv(e.target.value)}
                placeholder="…o escribí uno nuevo"
                className="w-full mt-2 border border-verde-200 rounded-lg px-3 py-2 text-base"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Emisión</span>
                <input
                  type="date"
                  value={b.fecha_emision}
                  onChange={(e) => setB({ ...b, fecha_emision: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Vencimiento</span>
                <input
                  type="date"
                  value={b.fecha_vencimiento}
                  onChange={(e) => setB({ ...b, fecha_vencimiento: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Neto</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={b.neto}
                  onChange={(e) => alCambiarNeto(e.target.value)}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-2 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">IVA</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={b.iva}
                  onChange={(e) => setB({ ...b, iva: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-2 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Total</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={b.total}
                  onChange={(e) => setB({ ...b, total: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-2 py-2 text-base font-semibold"
                />
              </label>
            </div>
            <p className="text-xs text-verde-700/60 -mt-1">
              Al cargar el neto se calcula el IVA 21% y el total. Podés corregirlos.
            </p>

            <div className="flex gap-2 pt-2">
              <button className="btn-ghost flex-1" onClick={cerrar}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => void enviar()}
                disabled={!b.numero.trim() || !b.total || guardar.isPending}
              >
                Guardar
              </button>
            </div>

            {editando && (
              <button
                className="w-full text-alerta text-sm font-medium py-2"
                onClick={() => void eliminar(editando)}
              >
                Eliminar factura
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
