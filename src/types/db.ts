/**
 * Tipos del dominio, espejo del esquema en Supabase.
 *
 * Se escriben a mano porque son pocos y así quedan legibles. Para regenerar
 * los tipos completos desde la base:
 *   npx supabase gen types typescript --project-id hhyjbaibzyaopxbmywcg > src/types/database.types.ts
 */

export type Unidad = 'kg' | 'unidad'
export type TipoMovimiento = 'ingreso' | 'venta' | 'ajuste' | 'merma'
export type MetodoPago = 'efectivo' | 'debito' | 'credito' | 'transferencia' | 'qr'
export type OrigenVenta = 'ocr' | 'manual' | 'voz'
export type TipoFactura = 'A' | 'B' | 'C' | 'X' | 'M'
export type EstadoFactura = 'pendiente' | 'pagada' | 'vencida' | 'anulada'
export type Prioridad = 'alta' | 'media' | 'baja'
export type EstadoTarea = 'pendiente' | 'en_curso' | 'hecho'

export interface Categoria {
  id: string
  nombre: string
  emoji: string | null
  orden: number
  /** Días que aguanta el producto antes de perderse. */
  vida_util_dias: number
}

export interface Producto {
  id: string
  nombre: string
  categoria_id: string | null
  /** Cómo se cobra: $/kg o $/unidad. */
  unidad: Unidad
  /** Cómo se cuenta el stock. Puede no coincidir con `unidad`. */
  unidad_stock: Unidad
  /** Kilos que pesa una pieza. Obligatorio si `unidad` y `unidad_stock` difieren. */
  peso_unidad: number | null
  /** $/kg o $/unidad. Es la clave con la que se identifica el producto en el ticket. */
  precio: number
  /** Precio unitario cuando se cumple la oferta. `null` si el producto no tiene. */
  precio_oferta: number | null
  /** Condición de la oferta, tal como se le dice al cliente: "Llevando 2". */
  oferta_detalle: string | null
  /** Código PLU de la balanza, si algún día se programan los productos. */
  plu: number | null
  stock_actual: number
  stock_minimo: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Proveedor {
  id: string
  nombre: string
  cuit: string | null
  telefono: string | null
  email: string | null
  notas: string | null
  created_at: string
}

export interface Venta {
  id: string
  fecha: string
  total: number
  metodo_pago: MetodoPago | null
  origen: OrigenVenta
  ticket_nro: string | null
  ticket_url: string | null
  ocr_raw: string | null
  created_at: string
}

export interface VentaItem {
  id: string
  venta_id: string
  producto_id: string | null
  descripcion: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface MovimientoStock {
  id: string
  producto_id: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  venta_id: string | null
  created_at: string
}

export interface Gasto {
  id: string
  fecha: string
  categoria: string
  proveedor_id: string | null
  descripcion: string | null
  monto: number
  metodo_pago: string | null
  comprobante_url: string | null
  created_at: string
}

export interface Factura {
  id: string
  tipo: TipoFactura
  numero: string
  proveedor_id: string | null
  fecha_emision: string
  fecha_vencimiento: string | null
  neto: number | null
  iva: number | null
  total: number
  estado: EstadoFactura
  archivo_url: string | null
  created_at: string
}

export interface Tarea {
  id: string
  titulo: string
  detalle: string | null
  prioridad: Prioridad
  estado: EstadoTarea
  vence_el: string | null
  created_at: string
}

/** Payload de un ítem para la función `registrar_venta`. */
export interface ItemVentaRPC {
  producto_id: string | null
  descripcion: string | null
  cantidad: number
  precio_unitario: number
}

export type EstadoPedido = 'pendiente' | 'parcial' | 'recibido'

export interface Pedido {
  id: string
  proveedor: string | null
  fecha: string
  estado: EstadoPedido
  costo_total: number | null
  notas: string | null
  created_at: string
}

export interface PedidoItem {
  id: string
  pedido_id: string
  producto_id: string | null
  descripcion: string
  cantidad_pedida: number
  unidad: string
  cantidad_estimada_kg: number | null
  cantidad_recibida: number | null
  created_at: string
}

/** PedidoItem con el nombre del producto resuelto (join). */
export interface PedidoItemConProducto extends PedidoItem {
  producto_nombre: string | null
}
