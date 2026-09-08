import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'

type Prioridad = 'alta' | 'media' | 'baja'
type Estado = 'pendiente' | 'en_curso' | 'hecho'

interface Tarea { id: string; titulo: string; detalle?: string; prioridad: Prioridad; estado: Estado; vence?: string }

const inicial: Tarea[] = [
  { id: '1', titulo: 'Pedir supremas al proveedor', prioridad: 'alta', estado: 'pendiente', vence: '2026-09-09' },
  { id: '2', titulo: 'Pagar factura AySA', prioridad: 'media', estado: 'pendiente', vence: '2026-09-15' },
  { id: '3', titulo: 'Limpiar cámara frigorífica', prioridad: 'baja', estado: 'en_curso' },
]

const priColor: Record<Prioridad, string> = { alta: 'badge-red', media: 'badge-amber', baja: 'badge-green' }
const priLabel: Record<Prioridad, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }

export default function Pendientes() {
  const [tareas, setTareas] = useState<Tarea[]>(inicial)
  const [showForm, setShowForm] = useState(false)
  const [titulo, setTitulo] = useState('')

  const toggle = (id: string) => setTareas(ts => ts.map(t =>
    t.id === id ? { ...t, estado: t.estado === 'hecho' ? 'pendiente' : 'hecho' } : t
  ))

  const agregar = () => {
    if (!titulo.trim()) return
    setTareas(ts => [...ts, { id: Date.now().toString(), titulo: titulo.trim(), prioridad: 'media', estado: 'pendiente' }])
    setTitulo(''); setShowForm(false)
  }

  const pendientes = tareas.filter(t => t.estado !== 'hecho')
  const hechas    = tareas.filter(t => t.estado === 'hecho')

  return (
    <>
      <PageHeader
        title="Pendientes"
        action={
          <button onClick={() => setShowForm(true)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />
      <div className="p-4 space-y-3">
        {showForm && (
          <div className="card border-verde-300 space-y-2">
            <input
              autoFocus
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && agregar()}
              className="w-full border border-verde-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Nueva tarea..."
            />
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary flex-1 text-sm" onClick={agregar}>Agregar</button>
            </div>
          </div>
        )}

        {pendientes.map(t => (
          <div key={t.id} className="card flex items-start gap-3">
            <button onClick={() => toggle(t.id)} className="w-6 h-6 rounded-full border-2 border-verde-700 shrink-0 mt-0.5 flex items-center justify-center" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t.titulo}</p>
              {t.vence && <p className="text-xs text-verde-700/60">Vence {new Date(t.vence+'T12:00').toLocaleDateString('es-AR')}</p>}
            </div>
            <span className={priColor[t.prioridad]}>{priLabel[t.prioridad]}</span>
          </div>
        ))}

        {hechas.length > 0 && (
          <>
            <p className="text-xs font-semibold text-verde-700/60 uppercase tracking-wide pt-2">Completadas</p>
            {hechas.map(t => (
              <div key={t.id} className="card flex items-start gap-3 opacity-50">
                <button onClick={() => toggle(t.id)} className="w-6 h-6 rounded-full bg-verde-700 shrink-0 mt-0.5 flex items-center justify-center text-white text-xs">✓</button>
                <p className="flex-1 line-through text-sm">{t.titulo}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  )
}
