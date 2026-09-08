import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'
import {
  useProductos,
  useCategorias,
  useCrearProducto,
  useEditarProducto,
  useBorrarProducto,
  useAjustarStock,
} from '../hooks/useProductos'
import type { Producto, Unidad } from '../types/db'
import { pesos, cantidad as fmtCantidad } from '../lib/formato'
import { tieneOferta } from '../lib/precio'

type Borrador = {
  nombre: string
  categoria_id: string | null
  unidad: Unidad
  precio: string
  precio_oferta: string
  oferta_detalle: string
  stock_actual: string
  stock_minimo: string
  activo: boolean
}

const vacio = (categoria_id: string | null): Borrador => ({
  nombre: '',
  categoria_id,
  unidad: 'kg',
  precio: '',
  precio_oferta: '',
  oferta_detalle: '',
  stock_actual: '0',
  stock_minimo: '0',
  activo: true,
})

const desde = (p: Producto): Borrador => ({
  nombre: p.nombre,
  categoria_id: p.categoria_id,
  unidad: p.unidad,
  precio: String(p.precio),
  precio_oferta: p.precio_oferta != null ? String(p.precio_oferta) : '',
  oferta_detalle: p.oferta_detalle ?? '',
  stock_actual: String(p.stock_actual),
  stock_minimo: String(p.stock_minimo),
  activo: p.activo,
})

export default function Productos() {
  const { data: productos = [], isLoading } = useProductos()
  const { data: categorias = [] } = useCategorias()
  const crear = useCrearProducto()
  const editar = useEditarProducto()
  const borrar = useBorrarProducto()
  const ajustar = useAjustarStock()

  const [catActiva, setCatActiva] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Producto | null>(null)
  const [creando, setCreando] = useState(false)
  const [borrador, setBorrador] = useState<Borrador>(vacio(null))
  const [ingreso, setIngreso] = useState<{ p: Producto; cant: string } | null>(null)

  const nombreCat = useMemo(
    () => Object.fromEntries(categorias.map((c) => [c.id, c.nombre])),
    [categorias],
  )

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(
      (p) =>
        (!catActiva || p.categoria_id === catActiva) &&
        (!q || p.nombre.toLowerCase().includes(q)),
    )
  }, [productos, catActiva, busqueda])

  const sinPrecio = productos.filter((p) => p.activo && p.precio === 0).length

  const abrirNuevo = () => {
    setBorrador(vacio(catActiva))
    setCreando(true)
  }
  const abrirEditar = (p: Producto) => {
    setBorrador(desde(p))
    setEditando(p)
  }
  const cerrar = () => {
    setCreando(false)
    setEditando(null)
  }

  const guardar = async () => {
    const oferta = parseFloat(borrador.precio_oferta)
    const payload = {
      nombre: borrador.nombre.trim(),
      categoria_id: borrador.categoria_id,
      unidad: borrador.unidad,
      precio: parseFloat(borrador.precio) || 0,
      precio_oferta: oferta > 0 ? oferta : null,
      oferta_detalle: oferta > 0 ? borrador.oferta_detalle.trim() || null : null,
      stock_actual: parseFloat(borrador.stock_actual) || 0,
      stock_minimo: parseFloat(borrador.stock_minimo) || 0,
      activo: borrador.activo,
      plu: null,
    }
    if (!payload.nombre) return
    if (editando) await editar.mutateAsync({ id: editando.id, ...payload })
    else await crear.mutateAsync(payload)
    cerrar()
  }

  const confirmarBorrado = async (p: Producto) => {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return
    await borrar.mutateAsync(p.id)
    cerrar()
  }

  const guardarIngreso = async () => {
    if (!ingreso) return
    const c = parseFloat(ingreso.cant)
    if (!c) return setIngreso(null)
    await ajustar.mutateAsync({
      producto_id: ingreso.p.id,
      cantidad: c,
      tipo: c > 0 ? 'ingreso' : 'ajuste',
      motivo: c > 0 ? 'Ingreso de mercadería' : 'Ajuste manual',
    })
    setIngreso(null)
  }

  return (
    <>
      <PageHeader
        title="Productos & Stock"
        action={
          <button
            onClick={abrirNuevo}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label="Nuevo producto"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-3">
        {sinPrecio > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
            <strong>{sinPrecio} producto(s) sin precio.</strong> Cargalos para que aparezcan en la
            venta.
          </div>
        )}

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border border-verde-200 rounded-xl px-3 py-2 text-base"
        />

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setCatActiva(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
              !catActiva ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
            }`}
          >
            Todos ({productos.length})
          </button>
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCatActiva(c.id === catActiva ? null : c.id)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium ${
                catActiva === c.id ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
              }`}
            >
              {c.emoji} {c.nombre}
            </button>
          ))}
        </div>

        {isLoading && <p className="text-center text-verde-700 py-8 text-sm">Cargando…</p>}

        <div className="space-y-2">
          {lista.map((p) => {
            const bajo = p.stock_actual < p.stock_minimo
            return (
              <div key={p.id} className="card flex items-center gap-3">
                <button onClick={() => abrirEditar(p)} className="flex-1 min-w-0 text-left">
                  <p className={`font-semibold truncate ${!p.activo ? 'line-through opacity-50' : ''}`}>
                    {p.nombre}
                  </p>
                  <p className="text-xs text-verde-700">
                    {p.categoria_id ? nombreCat[p.categoria_id] : 'Sin categoría'} ·{' '}
                    {p.precio > 0 ? (
                      `${pesos(p.precio)}/${p.unidad}`
                    ) : (
                      <span className="text-alerta font-semibold">sin precio</span>
                    )}
                  </p>
                  {tieneOferta(p) && (
                    <p className="text-xs text-verde-800 font-medium mt-0.5">
                      🏷 Oferta {pesos(p.precio_oferta as number)}/{p.unidad}
                      {p.oferta_detalle && ` · ${p.oferta_detalle}`}
                    </p>
                  )}
                </button>
                <button
                  onClick={() => setIngreso({ p, cant: '' })}
                  className="text-right shrink-0"
                  aria-label="Ajustar stock"
                >
                  <p className={`font-bold text-sm ${bajo ? 'text-alerta' : 'text-verde-700'}`}>
                    {fmtCantidad(p.stock_actual, p.unidad)}
                  </p>
                  {bajo && <span className="badge-red">bajo</span>}
                </button>
              </div>
            )
          })}
        </div>

        {!isLoading && lista.length === 0 && (
          <div className="card text-center text-verde-700 text-sm py-8">
            No hay productos que coincidan
          </div>
        )}
      </div>

      {/* ─── Alta / edición ─── */}
      {(creando || editando) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={cerrar}>
          <div
            className="bg-hueso w-full max-w-lg mx-auto rounded-t-3xl max-h-[90vh] overflow-y-auto p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-verde-200 rounded-full mx-auto" />
            <h2 className="font-bold text-verde-900">
              {editando ? 'Editar producto' : 'Nuevo producto'}
            </h2>

            <label className="block">
              <span className="text-xs text-verde-700 font-medium">Nombre</span>
              <input
                autoFocus
                value={borrador.nombre}
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })}
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
              />
            </label>

            <label className="block">
              <span className="text-xs text-verde-700 font-medium">Categoría</span>
              <select
                value={borrador.categoria_id ?? ''}
                onChange={(e) =>
                  setBorrador({ ...borrador, categoria_id: e.target.value || null })
                }
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base bg-white"
              >
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Se vende por</span>
                <select
                  value={borrador.unidad}
                  onChange={(e) =>
                    setBorrador({ ...borrador, unidad: e.target.value as Unidad })
                  }
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base bg-white"
                >
                  <option value="kg">Kilo</option>
                  <option value="unidad">Unidad</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">
                  Precio por {borrador.unidad}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={borrador.precio}
                  onChange={(e) => setBorrador({ ...borrador, precio: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
            </div>

            <div className="rounded-xl border border-verde-200 bg-verde-50/50 p-3 space-y-3">
              <p className="text-xs font-semibold text-verde-800 uppercase tracking-wide">
                Oferta (opcional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-verde-700 font-medium">
                    Precio por {borrador.unidad}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Sin oferta"
                    value={borrador.precio_oferta}
                    onChange={(e) => setBorrador({ ...borrador, precio_oferta: e.target.value })}
                    className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base bg-white"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-verde-700 font-medium">Cuándo aplica</span>
                  <input
                    value={borrador.oferta_detalle}
                    onChange={(e) => setBorrador({ ...borrador, oferta_detalle: e.target.value })}
                    placeholder="Llevando 2"
                    className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base bg-white"
                  />
                </label>
              </div>
              <p className="text-xs text-verde-700/60">
                Es el precio por {borrador.unidad} ya con la oferta aplicada. Dejalo vacío si el
                producto no tiene.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Stock actual</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={borrador.stock_actual}
                  onChange={(e) => setBorrador({ ...borrador, stock_actual: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs text-verde-700 font-medium">Avisar bajo</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={borrador.stock_minimo}
                  onChange={(e) => setBorrador({ ...borrador, stock_minimo: e.target.value })}
                  className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={borrador.activo}
                onChange={(e) => setBorrador({ ...borrador, activo: e.target.checked })}
                className="w-4 h-4 accent-[#14451C]"
              />
              <span className="text-sm text-verde-800">Producto activo (aparece en la venta)</span>
            </label>

            <div className="flex gap-2 pt-2">
              <button className="btn-ghost flex-1" onClick={cerrar}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => void guardar()}
                disabled={!borrador.nombre.trim() || crear.isPending || editar.isPending}
              >
                Guardar
              </button>
            </div>

            {editando && (
              <button
                className="w-full text-alerta text-sm font-medium py-2"
                onClick={() => void confirmarBorrado(editando)}
              >
                Eliminar producto
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Ingreso / ajuste de stock ─── */}
      {ingreso && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
             onClick={() => setIngreso(null)}>
          <div className="bg-hueso rounded-2xl p-4 w-full max-w-sm space-y-3"
               onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-verde-900">{ingreso.p.nombre}</h2>
            <p className="text-sm text-verde-700">
              Stock actual: {fmtCantidad(ingreso.p.stock_actual, ingreso.p.unidad)}
            </p>
            <label className="block">
              <span className="text-xs text-verde-700 font-medium">
                Cantidad a sumar (negativo para restar)
              </span>
              <input
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.001"
                value={ingreso.cant}
                onChange={(e) => setIngreso({ ...ingreso, cant: e.target.value })}
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
              />
            </label>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setIngreso(null)}>
                Cancelar
              </button>
              <button className="btn-primary flex-1" onClick={() => void guardarIngreso()}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
