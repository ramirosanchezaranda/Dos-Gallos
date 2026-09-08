import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'



const placeholder = [
  { id: '1', fecha: '2026-09-05', categoria: 'Insumos', proveedor: 'Frigorífico Norte', monto: 85000, metodo: 'Transferencia' },
  { id: '2', fecha: '2026-09-03', categoria: 'Servicios', proveedor: 'AySA', monto: 12400, metodo: 'Débito' },
]

const fmt = (n: number) => n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export default function Gastos() {
  const [showForm, setShowForm] = useState(false)

  return (
    <>
      <PageHeader
        title="Gastos"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />
      <div className="p-4 space-y-3">
        {/* Resumen mes */}
        <div className="card bg-verde-800 text-white border-none">
          <p className="text-sm text-verde-200">Total gastos — septiembre</p>
          <p className="text-2xl font-bold">{fmt(97400)}</p>
        </div>

        {/* Lista */}
        {placeholder.map(g => (
          <div key={g.id} className="card flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-verde-100 flex items-center justify-center shrink-0 text-lg">
              {g.categoria === 'Insumos' ? '🥩' : g.categoria === 'Servicios' ? '💧' : '📦'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{g.proveedor}</p>
              <p className="text-xs text-verde-700">{g.categoria} · {g.metodo} · {new Date(g.fecha+'T12:00').toLocaleDateString('es-AR')}</p>
            </div>
            <p className="font-bold text-alerta shrink-0">{fmt(g.monto)}</p>
          </div>
        ))}

        {showForm && (
          <div className="card border-verde-300 space-y-3">
            <h3 className="font-semibold text-verde-900">Nuevo gasto</h3>
            {['Fecha','Proveedor','Categoría','Monto','Método de pago'].map(f => (
              <div key={f}>
                <label className="text-xs text-verde-700 font-medium">{f}</label>
                <input className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-sm" placeholder={f} />
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
