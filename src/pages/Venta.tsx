import { useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SelectorProducto } from '../components/SelectorProducto'
import { IconCamera, IconPlus } from '../components/Icons'
import { useProductos } from '../hooks/useProductos'
import { useRegistrarVenta } from '../hooks/useVentas'
import { preprocesarImagen } from '../lib/ocr/preprocess'
import { parseTicket, type TicketParseado } from '../lib/ticket/parseTicket'
import { ajustarTicket } from '../lib/ticket/ajustarConCatalogo'
import type { MetodoPago, Producto } from '../types/db'
import { pesos, idLocal, cantidad as fmtCantidad } from '../lib/formato'
import { coincidePrecio, precioDe, tieneOferta, type TipoPrecio } from '../lib/precio'
import { descuentoDeStock } from '../lib/stock'

type Paso = 'captura' | 'leyendo' | 'revision' | 'listo'

/** Un renglón en edición: lo que leyó el ticket + el producto que elegiste. */
interface Renglon {
  id: string
  cantidad: number
  precioUnitario: number
  producto: Producto | null
  /** Si el renglón va con el precio de lista o con el de oferta. */
  tipoPrecio: TipoPrecio
  /** Precio tal como salió del ticket, para ordenar el selector. */
  precioTicket: number | undefined
}

const nuevoRenglon = (): Renglon => ({
  id: idLocal(),
  cantidad: 0,
  precioUnitario: 0,
  producto: null,
  tipoPrecio: 'normal',
  precioTicket: undefined,
})

const METODOS: { valor: MetodoPago; label: string }[] = [
  { valor: 'efectivo', label: 'Efectivo' },
  { valor: 'debito', label: 'Débito' },
  { valor: 'credito', label: 'Crédito' },
  { valor: 'transferencia', label: 'Transf.' },
  { valor: 'qr', label: 'QR' },
]

export default function Venta() {
  const [paso, setPaso] = useState<Paso>('captura')
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ticket, setTicket] = useState<TicketParseado | null>(null)
  const [renglones, setRenglones] = useState<Renglon[]>([])
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [editandoProducto, setEditandoProducto] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const { data: productos = [] } = useProductos()
  const registrar = useRegistrarVenta()

  // ── Captura + OCR ────────────────────────────────────────
  const procesarFoto = async (archivo: File) => {
    setPaso('leyendo')
    setProgreso(0)
    setError(null)
    try {
      const canvas = await preprocesarImagen(archivo)
      // Tesseract pesa ~300 kB: se carga recién cuando hace falta, para que
      // abrir la app en el mostrador siga siendo instantáneo.
      const { getOcrProvider } = await import('../lib/ocr/tesseract')
      const ocr = await getOcrProvider().reconocer(canvas, setProgreso)
      const leido = parseTicket(ocr.texto)

      // Los precios cargados corrigen la lectura: la balanza cobra siempre a
      // uno de ellos, así que alcanza con que el OCR caiga cerca del correcto.
      const precios = [...new Set(productos.filter((p) => p.activo && p.precio > 0).map((p) => p.precio))]
      const parseado = {
        ...leido,
        items: ajustarTicket(leido.items, precios, leido.total),
      }

      setTicket(parseado)
      setRenglones(
        parseado.items.length > 0
          ? parseado.items.map((it) => ({
              id: idLocal(),
              cantidad: it.cantidad,
              precioUnitario: it.precioUnitario,
              producto: null,
              tipoPrecio: 'normal' as TipoPrecio,
              precioTicket: it.precioUnitario,
            }))
          : [nuevoRenglon()],
      )
      setPaso('revision')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el ticket')
      setPaso('captura')
    }
  }

  const empezarManual = () => {
    setTicket(null)
    setRenglones([nuevoRenglon()])
    setPaso('revision')
  }

  const reiniciar = () => {
    setTicket(null)
    setRenglones([])
    setProgreso(0)
    setError(null)
    setPaso('captura')
  }

  // ── Edición de renglones ─────────────────────────────────
  const actualizar = (id: string, cambios: Partial<Renglon>) =>
    setRenglones((rs) => rs.map((r) => (r.id === id ? { ...r, ...cambios } : r)))

  const eliminar = (id: string) => setRenglones((rs) => rs.filter((r) => r.id !== id))

  const elegirProducto = (id: string, p: Producto) => {
    const r = renglones.find((x) => x.id === id)
    // Manda el precio del ticket; del producto solo sale si el ticket no trajo
    // ninguno. Contra ese precio se decide si el renglón va con oferta.
    const precioUnitario = r && r.precioUnitario > 0 ? r.precioUnitario : p.precio
    actualizar(id, {
      producto: p,
      precioUnitario,
      tipoPrecio: coincidePrecio(p, precioUnitario) ?? 'normal',
    })
  }

  const cambiarTipoPrecio = (r: Renglon, tipo: TipoPrecio) => {
    if (!r.producto) return
    actualizar(r.id, { tipoPrecio: tipo, precioUnitario: precioDe(r.producto, tipo) })
  }

  const total = renglones.reduce((acc, r) => acc + r.cantidad * r.precioUnitario, 0)
  const listoParaGuardar =
    renglones.length > 0 && renglones.every((r) => r.producto && r.cantidad > 0 && r.precioUnitario > 0)

  const guardar = async () => {
    try {
      await registrar.mutateAsync({
        items: renglones.map((r) => ({
          producto_id: r.producto!.id,
          descripcion: r.producto!.nombre,
          cantidad: r.cantidad,
          precio_unitario: r.precioUnitario,
        })),
        metodo_pago: metodoPago,
        origen: ticket ? 'ocr' : 'manual',
        ticket_nro: ticket?.numero ?? null,
        // Queda guardado lo que se leyo o se dicto, para poder revisar despues
        // una venta que salio rara.
        ocr_raw: ticket?.textoCrudo ?? null,
      })
      setPaso('listo')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la venta')
    }
  }

  const renglonEditando = renglones.find((r) => r.id === editandoProducto)

  return (
    <>
      <PageHeader title="Nueva venta" />

      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ─── CAPTURA ─── */}
        {paso === 'captura' && (
          <div className="space-y-4">
            <p className="text-verde-700 text-sm">
              Sacá una foto del ticket de la balanza. Se leen el peso y el precio; el producto lo
              elegís vos.
            </p>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-56 rounded-2xl border-2 border-dashed border-verde-200
                         flex flex-col items-center justify-center gap-3 text-verde-700
                         active:bg-verde-50 transition-colors"
            >
              <IconCamera className="w-12 h-12" />
              <p className="font-semibold">Tomar foto del ticket</p>
              <p className="text-xs text-verde-700/60">o tocá para elegir una imagen</p>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void procesarFoto(f)
                e.target.value = ''
              }}
            />

            <button
              onClick={empezarManual}
              className="w-full card flex items-center gap-3 text-verde-700 font-medium"
            >
              <IconPlus className="w-5 h-5" />
              Cargar venta a mano
            </button>
          </div>
        )}

        {/* ─── LEYENDO ─── */}
        {paso === 'leyendo' && (
          <div className="py-16 text-center space-y-4">
            <div className="w-14 h-14 border-4 border-verde-200 border-t-verde-700 rounded-full animate-spin mx-auto" />
            <p className="font-semibold text-verde-900">Leyendo el ticket…</p>
            <div className="w-full bg-verde-100 rounded-full h-2 max-w-xs mx-auto overflow-hidden">
              <div
                className="bg-verde-700 h-full transition-all duration-300"
                style={{ width: `${Math.round(progreso * 100)}%` }}
              />
            </div>
            <p className="text-xs text-verde-700/60">La primera vez tarda unos segundos más</p>
          </div>
        )}

        {/* ─── REVISIÓN ─── */}
        {paso === 'revision' && (
          <div className="space-y-4">
            {ticket && (
              <div
                className={`rounded-xl p-3 text-sm border ${
                  ticket.confianza === 'alta'
                    ? 'bg-verde-50 border-verde-200 text-verde-800'
                    : ticket.confianza === 'media'
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <p className="font-semibold">
                  {ticket.items.length > 0
                    ? `Se leyeron ${ticket.items.length} renglón(es)`
                    : 'No se pudo leer el ticket'}
                  {ticket.numero && ` · Ticket ${ticket.numero}`}
                </p>
                {ticket.advertencias.map((a, i) => (
                  <p key={i} className="text-xs mt-1">
                    {a}
                  </p>
                ))}
                {ticket.items.length > 0 && (
                  <p className="text-xs mt-1">Elegí el producto de cada renglón para continuar.</p>
                )}
              </div>
            )}


            {renglones.map((r, i) => (
              <div key={r.id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-verde-700/60 uppercase tracking-wide">
                    Renglón {i + 1}
                  </span>
                  {renglones.length > 1 && (
                    <button
                      onClick={() => eliminar(r.id)}
                      className="text-xs text-alerta font-medium"
                    >
                      Quitar
                    </button>
                  )}
                </div>

                {/* Producto */}
                <button
                  onClick={() => setEditandoProducto(r.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border ${
                    r.producto
                      ? 'border-verde-200 bg-verde-50'
                      : 'border-dashed border-amber-300 bg-amber-50'
                  }`}
                >
                  {r.producto ? (
                    <>
                      <p className="font-semibold text-verde-900">{r.producto.nombre}</p>
                      <p className="text-xs text-verde-700">Tocá para cambiar</p>
                    </>
                  ) : (
                    <p className="font-medium text-amber-800">Elegí el producto →</p>
                  )}
                </button>

                {/* Precio de lista u oferta */}
                {r.producto && tieneOferta(r.producto) && (
                  <div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cambiarTipoPrecio(r, 'normal')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                          r.tipoPrecio === 'normal'
                            ? 'bg-verde-700 text-white'
                            : 'bg-verde-100 text-verde-800'
                        }`}
                      >
                        Lista {pesos(r.producto.precio)}
                      </button>
                      <button
                        onClick={() => cambiarTipoPrecio(r, 'oferta')}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                          r.tipoPrecio === 'oferta'
                            ? 'bg-verde-700 text-white'
                            : 'bg-verde-100 text-verde-800'
                        }`}
                      >
                        🏷 Oferta {pesos(r.producto.precio_oferta as number)}
                      </button>
                    </div>
                    {r.producto.oferta_detalle && (
                      <p className="text-xs text-verde-700/60 mt-1">
                        La oferta aplica: {r.producto.oferta_detalle.toLowerCase()}
                      </p>
                    )}
                  </div>
                )}

                {/* Peso y precio */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-verde-700 font-medium">
                      {r.producto?.unidad === 'unidad' ? 'Cantidad' : 'Peso (kg)'}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.001"
                      value={r.cantidad || ''}
                      onChange={(e) =>
                        actualizar(r.id, { cantidad: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-verde-700 font-medium">Precio unitario</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={r.precioUnitario || ''}
                      onChange={(e) => {
                        const precioUnitario = parseFloat(e.target.value) || 0
                        actualizar(r.id, {
                          precioUnitario,
                          tipoPrecio:
                            (r.producto && coincidePrecio(r.producto, precioUnitario)) ?? 'normal',
                        })
                      }}
                      className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
                    />
                  </label>
                </div>

                <div className="flex justify-between items-baseline pt-1 border-t border-verde-100">
                  <span className="text-xs text-verde-700">Subtotal</span>
                  <span className="font-bold text-verde-900">
                    {pesos(r.cantidad * r.precioUnitario, 2)}
                  </span>
                </div>

                {/* Cuando se cobra y se cuenta distinto, el descuento no es obvio. */}
                {r.producto &&
                  r.producto.unidad_stock !== r.producto.unidad &&
                  r.cantidad > 0 && (
                    <p className="text-xs text-verde-700/60 -mt-1">
                      Descuenta{' '}
                      {fmtCantidad(descuentoDeStock(r.producto, r.cantidad) ?? 0, r.producto.unidad_stock)}{' '}
                      del stock
                    </p>
                  )}
              </div>
            ))}

            <button
              onClick={() => setRenglones((rs) => [...rs, nuevoRenglon()])}
              className="w-full card flex items-center justify-center gap-2 text-verde-700 font-medium"
            >
              <IconPlus className="w-4 h-4" />
              Agregar otro producto
            </button>

            {/* Método de pago */}
            <div>
              <p className="text-xs text-verde-700 font-medium mb-2">Forma de pago</p>
              <div className="flex gap-2 flex-wrap">
                {METODOS.map((m) => (
                  <button
                    key={m.valor}
                    onClick={() => setMetodoPago(m.valor)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      metodoPago === m.valor
                        ? 'bg-verde-700 text-white'
                        : 'bg-verde-100 text-verde-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total y acciones */}
            <div className="card bg-verde-800 text-white border-none flex justify-between items-center">
              <span className="text-verde-200">Total</span>
              <span className="text-2xl font-bold">{pesos(total, 2)}</span>
            </div>

            <div className="flex gap-3 pb-4">
              <button className="btn-ghost flex-1" onClick={reiniciar}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                disabled={!listoParaGuardar || registrar.isPending}
                onClick={() => void guardar()}
              >
                {registrar.isPending ? 'Guardando…' : 'Confirmar venta'}
              </button>
            </div>

            {!listoParaGuardar && renglones.length > 0 && (
              <p className="text-xs text-center text-verde-700/60 -mt-2 pb-4">
                Falta elegir el producto o completar peso y precio
              </p>
            )}
          </div>
        )}

        {/* ─── LISTO ─── */}
        {paso === 'listo' && (
          <div className="text-center space-y-4 py-16">
            <div className="w-16 h-16 rounded-full bg-verde-100 flex items-center justify-center mx-auto text-3xl">
              ✓
            </div>
            <h2 className="text-xl font-bold text-verde-900">¡Venta registrada!</h2>
            <p className="text-verde-700 text-sm">El stock quedó actualizado</p>
            <button className="btn-primary" onClick={reiniciar}>
              Cargar otra venta
            </button>
          </div>
        )}
      </div>

      {renglonEditando && (
        <SelectorProducto
          productos={productos}
          elegido={renglonEditando.producto}
          precioTicket={renglonEditando.precioTicket}
          onElegir={(p) => elegirProducto(renglonEditando.id, p)}
          onCerrar={() => setEditandoProducto(null)}
        />
      )}
    </>
  )
}
