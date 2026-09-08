import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus } from '../components/Icons'
import { useTareas, useGuardarTarea, useBorrarTarea } from '../hooks/useTareas'
import type { Tarea, Prioridad } from '../types/db'
import { fechaCorta } from '../lib/formato'

const BADGE: Record<Prioridad, string> = {
  alta: 'badge-red',
  media: 'badge-amber',
  baja: 'badge-green',
}
const LABEL: Record<Prioridad, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const PRIORIDADES: Prioridad[] = ['alta', 'media', 'baja']

export default function Pendientes() {
  const { data: tareas = [], isLoading } = useTareas()
  const guardar = useGuardarTarea()
  const borrar = useBorrarTarea()

  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Tarea | null>(null)
  const [titulo, setTitulo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [prioridad, setPrioridad] = useState<Prioridad>('media')
  const [vence, setVence] = useState('')

  const { pendientes, hechas } = useMemo(() => {
    const orden = { alta: 0, media: 1, baja: 2 }
    const p = tareas
      .filter((t) => t.estado !== 'hecho')
      .sort((a, b) => {
        // Primero por prioridad; a igual prioridad, lo que vence antes.
        if (orden[a.prioridad] !== orden[b.prioridad])
          return orden[a.prioridad] - orden[b.prioridad]
        if (a.vence_el && b.vence_el) return a.vence_el.localeCompare(b.vence_el)
        if (a.vence_el) return -1
        if (b.vence_el) return 1
        return 0
      })
    return { pendientes: p, hechas: tareas.filter((t) => t.estado === 'hecho') }
  }, [tareas])

  const abrirNueva = () => {
    setEditando(null)
    setTitulo('')
    setDetalle('')
    setPrioridad('media')
    setVence('')
    setAbierto(true)
  }

  const abrirEditar = (t: Tarea) => {
    setEditando(t)
    setTitulo(t.titulo)
    setDetalle(t.detalle ?? '')
    setPrioridad(t.prioridad)
    setVence(t.vence_el ?? '')
    setAbierto(true)
  }

  const cerrar = () => {
    setAbierto(false)
    setEditando(null)
  }

  const enviar = async () => {
    if (!titulo.trim()) return
    await guardar.mutateAsync({
      id: editando?.id,
      titulo: titulo.trim(),
      detalle: detalle.trim() || null,
      prioridad,
      estado: editando?.estado ?? 'pendiente',
      vence_el: vence || null,
    })
    cerrar()
  }

  const alternar = (t: Tarea) =>
    guardar.mutate({ id: t.id, estado: t.estado === 'hecho' ? 'pendiente' : 'hecho' })

  const eliminar = async (t: Tarea) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await borrar.mutateAsync(t.id)
    cerrar()
  }

  const vencida = (t: Tarea) => t.vence_el && t.vence_el < new Date().toISOString().slice(0, 10)

  return (
    <>
      <PageHeader
        title="Pendientes"
        action={
          <button
            onClick={abrirNueva}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
            aria-label="Nueva tarea"
          >
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-3">
        {isLoading && <p className="text-center text-verde-700 py-8 text-sm">Cargando…</p>}

        {pendientes.map((t) => (
          <div key={t.id} className="card flex items-start gap-3">
            <button
              onClick={() => alternar(t)}
              className="w-6 h-6 rounded-full border-2 border-verde-700 shrink-0 mt-0.5"
              aria-label="Marcar como hecha"
            />
            <button onClick={() => abrirEditar(t)} className="flex-1 min-w-0 text-left">
              <p className="font-medium">{t.titulo}</p>
              {t.detalle && <p className="text-xs text-verde-700 mt-0.5">{t.detalle}</p>}
              {t.vence_el && (
                <p className={`text-xs mt-0.5 ${vencida(t) ? 'text-alerta font-semibold' : 'text-verde-700/60'}`}>
                  {vencida(t) ? 'Venció el' : 'Vence'} {fechaCorta(t.vence_el)}
                </p>
              )}
            </button>
            <span className={`${BADGE[t.prioridad]} shrink-0`}>{LABEL[t.prioridad]}</span>
          </div>
        ))}

        {!isLoading && pendientes.length === 0 && (
          <div className="card text-center text-verde-700 text-sm py-8">
            No hay pendientes. 👌
          </div>
        )}

        {hechas.length > 0 && (
          <>
            <p className="text-xs font-semibold text-verde-700/60 uppercase tracking-wide pt-3">
              Completadas ({hechas.length})
            </p>
            {hechas.map((t) => (
              <div key={t.id} className="card flex items-start gap-3 opacity-50">
                <button
                  onClick={() => alternar(t)}
                  className="w-6 h-6 rounded-full bg-verde-700 shrink-0 mt-0.5 flex items-center justify-center text-white text-xs"
                >
                  ✓
                </button>
                <button onClick={() => abrirEditar(t)} className="flex-1 text-left">
                  <p className="line-through text-sm">{t.titulo}</p>
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ─── Formulario ─── */}
      {abierto && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={cerrar}>
          <div
            className="bg-hueso w-full max-w-lg mx-auto rounded-t-3xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-verde-200 rounded-full mx-auto" />
            <h2 className="font-bold text-verde-900">
              {editando ? 'Editar tarea' : 'Nueva tarea'}
            </h2>

            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void enviar()}
              placeholder="¿Qué hay que hacer?"
              className="w-full border border-verde-200 rounded-lg px-3 py-2.5 text-base"
            />

            <input
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Detalle (opcional)"
              className="w-full border border-verde-200 rounded-lg px-3 py-2 text-base"
            />

            <div>
              <span className="text-xs text-verde-700 font-medium">Prioridad</span>
              <div className="flex gap-2 mt-1">
                {PRIORIDADES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrioridad(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize ${
                      prioridad === p ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'
                    }`}
                  >
                    {LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs text-verde-700 font-medium">Vence (opcional)</span>
              <input
                type="date"
                value={vence}
                onChange={(e) => setVence(e.target.value)}
                className="w-full mt-1 border border-verde-200 rounded-lg px-3 py-2 text-base"
              />
            </label>

            <div className="flex gap-2 pt-1">
              <button className="btn-ghost flex-1" onClick={cerrar}>
                Cancelar
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => void enviar()}
                disabled={!titulo.trim() || guardar.isPending}
              >
                Guardar
              </button>
            </div>

            {editando && (
              <button
                className="w-full text-alerta text-sm font-medium py-2"
                onClick={() => void eliminar(editando)}
              >
                Eliminar tarea
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
