import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useProductos } from '../hooks/useProductos'
import {
  usePedidos,
  usePedidoItems,
  useCrearPedido,
  useRegistrarRecibo,
  useBorrarPedido,
} from '../hooks/usePedidos'
import { escuchar, vozSoportada } from '../lib/voz/reconocimiento'
import { parsePedido, type ItemPedidoDictado } from '../lib/voz/parsePedido'
import type { Pedido } from '../types/db'
import type { ProductoDictado } from '../lib/voz/parseDictado'
import { pesos } from '../lib/formato'

type Panel = 'lista' | 'nuevo' | 'recibo'

// ─── Estado del formulario de recibo ─────────────────────────

interface RecibidoRow {
  id: string
  producto_id: string | null
  descripcion: string
  unidad: string
  cantidad_pedida: number
  recibida: string
}

// ─── Utilidades ───────────────────────────────────────────────

const fechaCorta = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  recibido: 'Recibido',
}
const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  parcial: 'bg-blue-100 text-blue-800',
  recibido: 'bg-green-100 text-green-800',
}

// ─── Subcomponente: dictado de pedido ────────────────────────

function PanelNuevo({
  catalogo,
  onGuardar,
  onCancelar,
}: {
  catalogo: ProductoDictado[]
  onGuardar: (items: ItemPedidoDictado[], proveedor: string, notas: string) => void
  onCancelar: () => void
}) {
  const [escuchando, setEscuchando] = useState(false)
  const [items, setItems] = useState<ItemPedidoDictado[]>([])
  const [proveedor, setProveedor] = useState('')
  const [notas, setNotas] = useState('')
  const [parcial, setParcial] = useState('')
  const [stopFn, setStopFn] = useState<(() => void) | null>(null)

  const iniciarDictado = () => {
    if (!vozSoportada()) return
    setEscuchando(true)
    const stop = escuchar({
      onParcial: setParcial,
      onFinal: (texto) => {
        setEscuchando(false)
        setParcial('')
        if (texto.trim()) setItems((prev) => [...prev, ...parsePedido(texto, catalogo)])
      },
      onError: () => { setEscuchando(false); setParcial('') },
    })
    setStopFn(() => stop)
  }

  const detenerDictado = () => {
    stopFn?.()
    setStopFn(null)
    setEscuchando(false)
    setParcial('')
  }

  const quitarItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx))

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-verde-900 text-lg">Nuevo pedido</h2>
        <button onClick={onCancelar} className="text-verde-700 text-sm">Cancelar</button>
      </div>

      <input
        value={proveedor}
        onChange={(e) => setProveedor(e.target.value)}
        placeholder="Proveedor (opcional)"
        className="w-full border border-verde-200 rounded-xl px-3 py-2 text-base"
      />

      {/* Dictado */}
      <div className="card space-y-3">
        <p className="text-sm font-medium text-verde-800">Dictá los productos</p>
        <p className="text-xs text-verde-700/70">
          "3 cajones de pollo de unos 20 kilos, 3 kilos de bondiola, 2 bolsas de alitas"
        </p>
        {parcial && (
          <p className="text-sm italic text-verde-700 bg-verde-50 rounded-lg px-3 py-2">{parcial}</p>
        )}
        <button
          onClick={escuchando ? detenerDictado : iniciarDictado}
          disabled={!vozSoportada()}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
            escuchando
              ? 'bg-alerta text-white animate-pulse'
              : 'bg-verde-700 text-white'
          } disabled:opacity-40`}
        >
          {escuchando ? '⏹ Listo, ya terminé' : '🎙 Dictar productos'}
        </button>
      </div>

      {/* Lista de items */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-verde-800">Productos del pedido</p>
          {items.map((it, idx) => (
            <div key={idx} className="card flex items-start justify-between gap-2 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-verde-900 text-sm capitalize">{it.descripcion}</p>
                <p className="text-xs text-verde-700/70 mt-0.5">
                  {it.cantidad} {it.unidad}
                  {it.estimadoKg ? ` · ~${it.estimadoKg} kg` : ''}
                  {it.producto ? (
                    <span className="text-verde-700"> · {it.producto.nombre}</span>
                  ) : (
                    <span className="text-amber-600"> · producto no reconocido</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => quitarItem(idx)}
                className="text-verde-700/50 text-lg leading-none shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Notas (opcional)"
        rows={2}
        className="w-full border border-verde-200 rounded-xl px-3 py-2 text-sm resize-none"
      />

      <button
        disabled={items.length === 0}
        onClick={() => onGuardar(items, proveedor, notas)}
        className="btn-primary w-full disabled:opacity-40"
      >
        Guardar pedido
      </button>
    </div>
  )
}

// ─── Subcomponente: registrar recibo ─────────────────────────

function PanelRecibo({
  pedido,
  onGuardar,
  onCancelar,
}: {
  pedido: Pedido
  onGuardar: (rows: RecibidoRow[], costo: number | null) => void
  onCancelar: () => void
}) {
  const { data: items = [] } = usePedidoItems(pedido.id)
  const [rows, setRows] = useState<RecibidoRow[]>(() =>
    items.map((it) => ({
      id: it.id,
      producto_id: it.producto_id,
      descripcion: it.descripcion,
      unidad: it.unidad,
      cantidad_pedida: it.cantidad_pedida,
      recibida: String(it.cantidad_pedida),
    })),
  )
  const [costo, setCosto] = useState(pedido.costo_total ? String(pedido.costo_total) : '')

  // Sync rows when items load
  const synced = rows.length === items.length
  const displayRows = synced
    ? rows
    : items.map((it) => ({
        id: it.id,
        producto_id: it.producto_id,
        descripcion: it.descripcion,
        unidad: it.unidad,
        cantidad_pedida: it.cantidad_pedida,
        recibida: String(it.cantidad_pedida),
      }))

  const setRecibida = (id: string, val: string) =>
    setRows((prev) =>
      prev.length
        ? prev.map((r) => (r.id === id ? { ...r, recibida: val } : r))
        : displayRows.map((r) => (r.id === id ? { ...r, recibida: val } : r)),
    )

  const handleGuardar = () => {
    const final = (rows.length ? rows : displayRows).map((r) => ({
      ...r,
      cantidad_recibida: parseFloat(r.recibida) || 0,
    }))
    onGuardar(final, costo ? parseFloat(costo) : null)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-verde-900 text-lg">Registrar llegada</h2>
        <button onClick={onCancelar} className="text-verde-700 text-sm">Cancelar</button>
      </div>

      <p className="text-sm text-verde-700">
        {pedido.proveedor && <span className="font-medium">{pedido.proveedor} · </span>}
        {fechaCorta(pedido.fecha)}
      </p>

      <div className="space-y-2">
        {(rows.length ? rows : displayRows).map((r) => (
          <div key={r.id} className="card space-y-1">
            <p className="text-sm font-medium capitalize">{r.descripcion}</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-verde-700/60">
                Pedido: {r.cantidad_pedida} {r.unidad}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-xs text-verde-700">Recibido:</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={r.recibida}
                  onChange={(e) => setRecibida(r.id, e.target.value)}
                  className="w-20 border border-verde-200 rounded-lg px-2 py-1 text-sm text-right"
                />
                <span className="text-xs text-verde-700">{r.unidad}</span>
              </div>
            </div>
            {!r.producto_id && (
              <p className="text-[10px] text-amber-600">Sin stock vinculado — no ajusta inventario</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-verde-700 shrink-0">Costo total:</label>
        <input
          type="number"
          inputMode="decimal"
          value={costo}
          onChange={(e) => setCosto(e.target.value)}
          placeholder="0"
          className="flex-1 border border-verde-200 rounded-xl px-3 py-2 text-base text-right"
        />
      </div>

      <button onClick={handleGuardar} className="btn-primary w-full">
        Confirmar recibo y ajustar stock
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────

export default function Pedidos() {
  const { data: productos = [] } = useProductos()
  const { data: pedidos = [], isLoading } = usePedidos()
  const crearPedido = useCrearPedido()
  const registrarRecibo = useRegistrarRecibo()
  const borrarPedido = useBorrarPedido()

  const [panel, setPanel] = useState<Panel>('lista')
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<Pedido | null>(null)

  const catalogo: ProductoDictado[] = productos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    unidad: p.unidad,
  }))

  const handleGuardarPedido = async (
    items: ItemPedidoDictado[],
    proveedor: string,
    notas: string,
  ) => {
    await crearPedido.mutateAsync({
      proveedor,
      notas,
      items: items.map((it) => ({
        producto_id: it.producto?.id ?? null,
        descripcion: it.descripcion,
        cantidad_pedida: it.cantidad,
        unidad: it.unidad,
        cantidad_estimada_kg: it.estimadoKg,
      })),
    })
    setPanel('lista')
  }

  const handleGuardarRecibo = async (rows: RecibidoRow[], costo: number | null) => {
    if (!pedidoSeleccionado) return
    await registrarRecibo.mutateAsync({
      pedidoId: pedidoSeleccionado.id,
      items: rows.map((r) => ({
        id: r.id,
        producto_id: r.producto_id,
        cantidad_recibida: parseFloat(String(r.recibida)) || 0,
      })),
      costo_total: costo,
    })
    setPanel('lista')
    setPedidoSeleccionado(null)
  }

  const pendientes = pedidos.filter((p) => p.estado !== 'recibido')
  const recibidos = pedidos.filter((p) => p.estado === 'recibido')

  if (panel === 'nuevo') {
    return (
      <>
        <PageHeader title="Pedidos" />
        <PanelNuevo
          catalogo={catalogo}
          onGuardar={handleGuardarPedido}
          onCancelar={() => setPanel('lista')}
        />
      </>
    )
  }

  if (panel === 'recibo' && pedidoSeleccionado) {
    return (
      <>
        <PageHeader title="Pedidos" />
        <PanelRecibo
          pedido={pedidoSeleccionado}
          onGuardar={handleGuardarRecibo}
          onCancelar={() => { setPanel('lista'); setPedidoSeleccionado(null) }}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        action={
          <button
            onClick={() => setPanel('nuevo')}
            className="text-white/90 text-sm font-medium"
          >
            + Nuevo
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {isLoading && <p className="text-center text-verde-700 py-8 text-sm">Cargando…</p>}

        {!isLoading && pedidos.length === 0 && (
          <div className="card text-center py-10 space-y-2">
            <p className="text-4xl">📦</p>
            <p className="text-verde-700 font-medium">Sin pedidos todavía</p>
            <p className="text-sm text-verde-700/60">Tocá "+ Nuevo" para registrar un pedido</p>
          </div>
        )}

        {pendientes.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-verde-700 uppercase tracking-wide">Pendientes</p>
            {pendientes.map((p) => (
              <PedidoCard
                key={p.id}
                pedido={p}
                onRecibo={() => { setPedidoSeleccionado(p); setPanel('recibo') }}
                onBorrar={() => void borrarPedido.mutateAsync(p.id)}
              />
            ))}
          </section>
        )}

        {recibidos.length > 0 && (
          <section className="space-y-2">
            <p className="text-xs font-semibold text-verde-700 uppercase tracking-wide">Recibidos</p>
            {recibidos.map((p) => (
              <PedidoCard
                key={p.id}
                pedido={p}
                onBorrar={() => void borrarPedido.mutateAsync(p.id)}
              />
            ))}
          </section>
        )}
      </div>
    </>
  )
}

function PedidoCard({
  pedido,
  onRecibo,
  onBorrar,
}: {
  pedido: Pedido
  onRecibo?: () => void
  onBorrar: () => void
}) {
  const { data: items = [] } = usePedidoItems(pedido.id)

  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-verde-900 text-sm">
            {pedido.proveedor || 'Sin proveedor'} · {fechaCorta(pedido.fecha)}
          </p>
          {items.length > 0 && (
            <p className="text-xs text-verde-700/70 mt-0.5 truncate">
              {items.map((it) => `${it.cantidad_pedida} ${it.unidad} ${it.descripcion}`).join(', ')}
            </p>
          )}
          {pedido.costo_total && (
            <p className="text-xs text-verde-700 mt-0.5">{pesos(pedido.costo_total)}</p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${ESTADO_COLOR[pedido.estado]}`}>
          {ESTADO_LABEL[pedido.estado]}
        </span>
      </div>

      {pedido.notas && (
        <p className="text-xs text-verde-700/60 italic">{pedido.notas}</p>
      )}

      <div className="flex gap-2 pt-1">
        {onRecibo && (
          <button
            onClick={onRecibo}
            className="flex-1 py-1.5 rounded-lg bg-verde-100 text-verde-800 text-xs font-medium"
          >
            Registrar llegada
          </button>
        )}
        <button
          onClick={onBorrar}
          className="py-1.5 px-3 rounded-lg bg-red-50 text-red-700 text-xs font-medium"
        >
          Borrar
        </button>
      </div>
    </div>
  )
}
