import { useState } from 'react'
import { BarrasHorizontales } from './Grafico'
import { useRotacion, useGuardarVidaUtil, VENTANA_ROTACION } from '../hooks/useRotacion'
import { useCategorias } from '../hooks/useProductos'
import {
  porMerma,
  porPlata,
  baseDeLista,
  valorSegun,
  type FilaRotacion,
  type Riesgo,
} from '../lib/rotacion'
import { pesos, cantidad as fmtCantidad } from '../lib/formato'

type Mirada = 'merma' | 'plata' | 'historial'

const MIRADAS: { id: Mirada; label: string }[] = [
  { id: 'merma', label: 'Merma' },
  { id: 'plata', label: 'Plata/día' },
  { id: 'historial', label: 'Historial' },
]

/** El texto lleva el significado; el color solo lo refuerza. */
const RIESGO: Record<Riesgo, { texto: string; clase: string }> = {
  alto: { texto: 'Se vence', clase: 'bg-red-100 text-red-700' },
  medio: { texto: 'Al filo', clase: 'bg-amber-100 text-amber-700' },
  bajo: { texto: 'Rota bien', clase: 'bg-verde-100 text-verde-700' },
  'sin-datos': { texto: 'Sin ventas', clase: 'bg-verde-50 text-verde-700/60' },
}

const unidadDe = (u: string) => (u === 'unidad' ? 'unidad' : 'kg') as 'kg' | 'unidad'

export function CardRotacion() {
  const [mirada, setMirada] = useState<Mirada>('merma')
  const [editando, setEditando] = useState(false)
  const { filas, historial, diasReales, partidasSeguidas, isLoading } = useRotacion()

  if (isLoading) {
    return (
      <div className="card">
        <h2 className="font-semibold text-verde-900 text-sm">Rotación</h2>
        <p className="text-sm text-verde-700/60 py-4 text-center">Cargando…</p>
      </div>
    )
  }

  const conVentas = filas.filter((f) => f.diasDeStock !== null)

  return (
    <div className="card">
      <h2 className="font-semibold text-verde-900 text-sm mb-0.5">Rotación</h2>
      <p className="text-xs text-verde-700/60 mb-3">
        Qué se mueve lento, qué te deja plata y cuánto tarda en venderse
      </p>

      {/* Selector de mirada */}
      <div className="flex gap-1 bg-verde-50 rounded-xl p-1 mb-3">
        {MIRADAS.map((m) => (
          <button
            key={m.id}
            onClick={() => setMirada(m.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mirada === m.id ? 'bg-white text-verde-900 shadow-sm' : 'text-verde-700/70'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mirada === 'merma' && (
        <VistaMerma
          filas={filas}
          editando={editando}
          onEditar={() => setEditando((v) => !v)}
        />
      )}

      {mirada === 'plata' && <VistaPlata filas={conVentas} />}

      {mirada === 'historial' && (
        <VistaHistorial historial={historial} partidas={partidasSeguidas} />
      )}

      <AvisoDatos dias={diasReales} />
    </div>
  )
}

// ─── Merma ────────────────────────────────────────────────────

function VistaMerma({
  filas,
  editando,
  onEditar,
}: {
  filas: FilaRotacion[]
  editando: boolean
  onEditar: () => void
}) {
  const ordenadas = porMerma(filas)
  const enRiesgo = ordenadas.filter((f) => f.riesgo === 'alto' || f.riesgo === 'medio')
  const quietos = ordenadas.filter((f) => f.riesgo === 'sin-datos')
  const mostrar = enRiesgo.length > 0 ? enRiesgo : ordenadas.slice(0, 5)

  return (
    <div className="space-y-3">
      {enRiesgo.length === 0 && (
        <p className="text-xs text-verde-700 bg-verde-50 rounded-lg px-3 py-2">
          Nada se está por echar a perder. Todo rota dentro de su vida útil.
        </p>
      )}

      <div className="space-y-2">
        {mostrar.map((f) => (
          <div key={f.producto_id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-verde-900 truncate">{f.nombre}</p>
              <p className="text-[11px] text-verde-700/60">
                {fmtCantidad(f.stock, unidadDe(f.unidad))}
                {f.diasDeStock !== null
                  ? ` · ${f.diasDeStock}d para venderse · aguanta ${f.vidaUtilDias}d`
                  : ` · aguanta ${f.vidaUtilDias}d`}
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                RIESGO[f.riesgo].clase
              }`}
            >
              {RIESGO[f.riesgo].texto}
            </span>
          </div>
        ))}
      </div>

      {quietos.length > 0 && enRiesgo.length > 0 && (
        <p className="text-[11px] text-verde-700/50">
          {quietos.length} producto{quietos.length === 1 ? '' : 's'} sin ventas en la ventana.
        </p>
      )}

      <button onClick={onEditar} className="text-[11px] text-verde-700 font-medium">
        {editando ? 'Cerrar' : 'Ajustar vida útil por categoría'}
      </button>

      {editando && <EditorVidaUtil />}
    </div>
  )
}

function EditorVidaUtil() {
  const { data: categorias = [] } = useCategorias()
  const guardar = useGuardarVidaUtil()

  return (
    <div className="rounded-xl border border-verde-200 bg-verde-50/50 p-3 space-y-2">
      <p className="text-[11px] text-verde-700/70">
        Cuántos días aguanta cada categoría antes de perderse.
      </p>
      {categorias.map((c) => (
        <div key={c.id} className="flex items-center gap-2">
          <span className="text-xs flex-1 min-w-0 truncate">
            {c.emoji} {c.nombre}
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={c.vida_util_dias}
            onBlur={(e) => {
              const dias = parseInt(e.target.value, 10)
              if (dias > 0 && dias !== c.vida_util_dias) {
                void guardar.mutateAsync({ id: c.id, dias })
              }
            }}
            className="w-14 border border-verde-200 rounded-lg px-2 py-1 text-xs text-right bg-white"
          />
          <span className="text-[11px] text-verde-700/60 shrink-0">días</span>
        </div>
      ))}
    </div>
  )
}

// ─── Plata por día ────────────────────────────────────────────

function VistaPlata({ filas }: { filas: FilaRotacion[] }) {
  if (filas.length === 0) {
    return (
      <p className="text-sm text-verde-700/60 py-4 text-center">
        Todavía no hay ventas para medir cuánto deja cada producto.
      </p>
    )
  }

  // Una sola vara para todos: con un costo sin cargar, comparar el margen de
  // uno contra la facturación de otro pondría arriba al que tiene más datos.
  const base = baseDeLista(filas)
  const top = porPlata(filas, base).slice(0, 8)
  const sinCosto = filas.filter((f) => f.margenDia === null).length

  return (
    <div className="space-y-3">
      <BarrasHorizontales
        datos={top.map((f) => ({
          etiqueta: f.nombre,
          valor: valorSegun(f, base),
          valorTexto: `${pesos(valorSegun(f, base))}/día`,
          detalle: `${fmtCantidad(f.velocidad, unidadDe(f.unidad))}/día`,
        }))}
      />
      <p className="text-[11px] text-verde-700/60 border-t border-verde-100 pt-2">
        {base === 'margen' ? (
          'Ganancia real por día, con el costo cargado en los pedidos recibidos.'
        ) : sinCosto === filas.length ? (
          <>
            Es facturación, no ganancia. Cargá el costo al recibir un pedido y esto pasa a
            mostrar el margen.
          </>
        ) : (
          <>
            Es facturación, no ganancia: faltan {sinCosto} producto
            {sinCosto === 1 ? '' : 's'} con el costo cargado. Hasta entonces se compara todo con
            la misma vara.
          </>
        )}
      </p>
    </div>
  )
}

// ─── Historial ────────────────────────────────────────────────

function VistaHistorial({
  historial,
  partidas,
}: {
  historial: { producto_id: string; nombre: string; dias: number; cantidad: number; unidad: string }[]
  partidas: number
}) {
  if (historial.length === 0) {
    return (
      <div className="space-y-2 py-2">
        <p className="text-sm text-verde-700">
          Acá vas a ver cuánto tardó en venderse cada partida que entró.
        </p>
        <p className="text-xs text-verde-700/60">
          {partidas === 0
            ? 'Se llena solo: cargá un pedido y marcá la llegada. Cuando se venda todo lo que entró, aparece acá con los días que tardó.'
            : `${partidas} partida${partidas === 1 ? '' : 's'} en seguimiento. Todavía queda mercadería de ${partidas === 1 ? 'esa entrada' : 'esas entradas'}, por eso no hay número final.`}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {historial.map((h, i) => (
        <div key={`${h.producto_id}-${i}`} className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-verde-900 truncate">{h.nombre}</p>
            <p className="text-[11px] text-verde-700/60">
              Entraron {fmtCantidad(h.cantidad, unidadDe(h.unidad))}
            </p>
          </div>
          <span className="text-xs font-bold text-verde-800 shrink-0 bg-verde-100 px-2 py-0.5 rounded-full">
            {h.dias === 0 ? 'mismo día' : `${h.dias}d`}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Aviso de confianza ───────────────────────────────────────

function AvisoDatos({ dias }: { dias: number }) {
  if (dias >= VENTANA_ROTACION) return null

  return (
    <p className="text-[11px] text-verde-700/50 mt-3 pt-2 border-t border-verde-100">
      {dias === 0
        ? 'Estimado sin ventas cargadas todavía: los números se afinan a medida que vendés.'
        : `Estimado con ${dias} día${dias === 1 ? '' : 's'} de ventas. Se afina solo hasta llegar a ${VENTANA_ROTACION}.`}
    </p>
  )
}
