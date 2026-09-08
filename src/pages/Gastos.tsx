import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'
import {
  useGastos,
  useGuardarGasto,
  useBorrarGasto,
  useProveedores,
  useCrearProveedor,
  CATEGORIAS_GASTO,
} from '../hooks/useGastos'
import type { Gasto } from '../types/db'
import { pesos, fechaCorta } from '../lib/formato'

const EMOJI: Record<string, string> = {
  Mercadería: '🥩',
  Servicios: '💡',
  Personal: '👤',
  Alquiler: '🏠',
  Mantenimiento: '🔧',
  Impuestos: '📄',
  Otros: '📦',
}

const METODOS = ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Cheque']

type Borrador = {
  fecha: string
  categoria: string
  proveedor_id: string | null
  descripcion: string
  monto: string
  metodo_pago: string
}

const hoy = () => new Date().toISOString().slice(0, 10)

const vacio = (): Borrador => ({
  fecha: hoy(),
  categoria: 'Mercadería',
  proveedor_id: null,
  descripcion: '',
  monto: '',
  metodo_pago: 'Efectivo',
})

const desde = (g: Gasto): Borrador => ({
  fecha: g.fecha,
  categoria: g.categoria,
  proveedor_id: g.proveedor_id,
  descripcion: g.descripcion ?? '',
  monto: String(g.monto),
  metodo_pago: g.metodo_pago ?? 'Efectivo',
})

export default function Gastos() {
  const [mes, setMes] = useState(() => new Date())
  const { data: gastos = [], isLoading } = useGastos(mes)
  const { data: proveedores = [] } = useProveedores()
  const guardar = useGuardarGasto()
  const borrar = useBorrarGasto()
  const crearProveedor = useCrearProveedor()

  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Gasto | null>(null)
  const [b, setB] = useState<Borrador>(vacio())
  const [nuevoProv, setNuevoProv] = useState('')

  const nombreProv = useMemo(
    () => Object.fromEntries(proveedores.map((p) => [p.id, p.nombre])),
    [proveedores],
  )

  const total = gastos.reduce((a, g) => a + Number(g.monto), 0)
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of gastos) m.set(g.categoria, (m.get(g.categoria) ?? 0) + Number(g.monto))
    return [...m.entries()].sort((a, c) => c[1] - a[1])
  }, [gastos])

  const abrirNuevo = () => {
    setB(vacio())
    setEditando(null)
    setNuevoProv('')
    setAbierto(true)
  }
  const abrirEditar = (g: Gasto) => {
    setB(desde(g))
    setEditando(g)
    setNuevoProv('')
    setAbierto(true)
  }
  const cerrar = () => {
    setAbierto(false)
    setEditando(null)
  }

  const enviar = async () => {
    const monto = parseFloat(b.monto)
    if (!monto || monto <= 0) return

    let proveedor_id = b.proveedor_id
    if (nuevoProv.trim()) {
      const p = await crearProveedor.mutateAsync(nuevoProv.trim())
      proveedor_id = p.id
    }

    await guardar.mutateAsync({
      id: editando?.id,
      fecha: b.fecha,
      categoria: b.categoria,
      proveedor_id,
      descripcion: b.descripcion.trim() || null,
      monto,
      metodo_pago: b.metodo_pago,
      comprobante_url: null,
    })
    cerrar()
  }

  const eliminar = async (g: Gasto) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await borrar.mutateAsync(g.id)
    cerrar()
  }

  const cambiarMes = (delta: number) =>
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <>
      <PageHeader
        title="Gastos"
        action={
          <button
            onClick={abrirNuevo}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label="Nuevo gasto"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-3">
        {/* Selector de mes */}
        <div className="flex items-center justify-between">
          <button onClick={() => cambiarMes(-1)} className="btn-ghost px-3 py-1 text-sm">
            ←
          </button>
          <span className="font-semibold text-verde-900 capitalize">
            {mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => cambiarMes(1)} className="btn-ghost px-3 py-1 text-sm">
            →
          </button>
        </div>

        <div className="card bg-verde-800 text-white border-none">
          <p className="text-sm text-verde-200">Total del mes</p>
          <p className="text-3xl font-bold">{pesos(total)}</p>
          <p className="text-xs text-verde-200 mt-1">
            {gastos.length} gasto{gastos.length === 1 ? '' : 's'}
          </p>
        </div>

        {porCategoria.length > 0 && (
          <div className="card space-y-2">
            <p className="text-xs font-semibold text-verde-700/60 uppercase tracking-wide">
              Por categoría
            </p>
            {porCategoria.map(([cat, monto]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span>
                    {EMOJI[cat] ?? '📦'} {cat}
                  </span>
                  <span className="font-semibold">{pesos(monto)}</span>
                </div>
                <div className="h-1.5 bg-verde-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-verde-700 rounded-full"
                    style={{ width: `${total > 0 ? (monto / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {isLoading && <p className="text-center text-verde-700 py-8 text-sm">Cargando…</p>}

        <div className="space-y-2">
          {gastos.map((g) => (
            <button
              key={g.id}
              onClick={() => abrirEditar(g)}
              className="card flex items-start gap-3 w-full text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-verde-100 flex items-center justify-center shrink-0 text-lg">
                {EMOJI[g.categoria] ?? '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {g.proveedor_id ? nombreProv[g.proveedor_id] : g.categoria}
                </p>
                <p className="text-xs text-verde-700 truncate">
                  {g.descripcion || g.categoria} · {g.metodo_pago} · {fechaCorta(g.fecha)}
                </p>
              </div>
              <p className="font-bold text-alerta shrink-0">{pesos(Number(g.monto))}</p>
            </button>
          ))}
        </div>

        {!isLoading && gastos.length === 0 && (
          <div className="card text-center text-verde-700 text-sm py-8">
            No hay gastos cargados este mes
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
              {editando ? 'Editar gasto' : 'Nuevo gasto'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Fecha</span>
                <input
                  type="date"
                  value={b.fecha}
                  onChange={(e) => setB({ ...b, fecha: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Monto</span>
                <input
                  type="number"
                  inputMode="decimal"
                  autoFocus
                  value={b.monto}
                  onChange={(e) => setB({ ...b, monto: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
            </div>

            <div>
              <span className="text-xs text-verde-700 font-medium">Categoría</span>
              <div className="flex gap-2 flex-wrap mt-1">
                {CATEGORIAS_GASTO.map((c) => (
                  <button
                    key={c}
                    onClick={() => setB({ ...b, categoria: c })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      b.categoria === c ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
                    }`}
                  >
                    {EMOJI[c]} {c}
                  </button>
                ))}
              </div>
            </div>

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

            <label className="block">
              <span className="text-xs text-verde-700 font-medium">Detalle (opcional)</span>
              <input
                value={b.descripcion}
                onChange={(e) => setB({ ...b, descripcion: e.target.value })}
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
              />
            </label>

            <div>
              <span className="text-xs text-verde-700 font-medium">Forma de pago</span>
              <div className="flex gap-2 flex-wrap mt-1">
                {METODOS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setB({ ...b, metodo_pago: m })}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                      b.metodo_pago === m ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button className="btn-ghost flex-1" onClick={cerrar}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => void enviar()}
                disabled={!b.monto || guardar.isPending}
              >
                Guardar
              </button>
            </div>

            {editando && (
              <button
                className="w-full text-alerta text-sm font-medium py-2"
                onClick={() => void eliminar(editando)}
              >
                Eliminar gasto
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
