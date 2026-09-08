import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'

const placeholder = [
  { id: '1', tipo: 'A', numero: '0001-00001234', proveedor: 'Frigorífico Norte', emision: '2026-08-20', vencimiento: '2026-09-20', total: 185000, estado: 'pendiente' },
  { id: '2', tipo: 'B', numero: '0001-00000089', proveedor: 'AySA', emision: '2026-08-15', vencimiento: '2026-09-15', total: 12400, estado: 'pagada' },
]

const estadoBadge: Record<string, string> = {
  pendiente: 'badge-amber',
  pagada:    'badge-green',
  vencida:   'badge-red',
}
const estadoLabel: Record<string, string> = { pendiente: 'Pendiente', pagada: 'Pagada', vencida: 'Vencida' }

const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export default function Facturas() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <PageHeader
        title="Facturas"
        action={
          <button onClick={() => setShowForm(true)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />
      <div className="p-4 space-y-3">
        {/* Tabs estado */}
        <div className="flex gap-2">
          {['Todas','Pendientes','Vencidas','Pagadas'].map(t => (
            <button key={t} className="px-3 py-1 rounded-full text-xs font-medium bg-verde-100 text-verde-800 first:bg-verde-700 first:text-white">
              {t}
            </button>
          ))}
        </div>

        {placeholder.map(f => (
          <div key={f.id} className="card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{f.proveedor}</p>
                <p className="text-xs text-verde-700">Tipo {f.tipo} · {f.numero}</p>
              </div>
              <span className={estadoBadge[f.estado]}>{estadoLabel[f.estado]}</span>
            </div>
            <div className="grid grid-cols-3 text-xs gap-2">
              <div><p className="text-verde-700/60">Emisión</p><p>{new Date(f.emision+'T12:00').toLocaleDateString('es-AR')}</p></div>
              <div><p className="text-verde-700/60">Vencimiento</p><p>{new Date(f.vencimiento+'T12:00').toLocaleDateString('es-AR')}</p></div>
              <div><p className="text-verde-700/60">Total</p><p className="font-bold">{fmt(f.total)}</p></div>
            </div>
          </div>
        ))}

        {showForm && (
          <div className="card border-verde-300 space-y-3">
            <h3 className="font-semibold text-verde-900">Nueva factura</h3>
            {['Proveedor','Tipo (A/B/C)','Número','Fecha emisión','Vencimiento','Neto','IVA','Total'].map(field => (
              <div key={field}>
                <label className="text-xs text-verde-700 font-medium">{field}</label>
                <input className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-sm" placeholder={field} />
              </div>
            ))}
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary flex-1">Guardar</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
