import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconPlus, IconChevronRight } from '../components/Icons'

const CATEGORIAS = ['Pollo', 'Cerdo', 'Embutidos', 'Congelados', 'Huevos', 'Otros']

const placeholder = [
  { id: '1', nombre: 'Supremas de pollo', categoria: 'Pollo', unidad: 'kg', precio: 4500, stock: 12.5, minimo: 5, activo: true },
  { id: '2', nombre: 'Pata muslo', categoria: 'Pollo', unidad: 'kg', precio: 3200, stock: 8.2, minimo: 5, activo: true },
  { id: '3', nombre: 'Alitas', categoria: 'Pollo', unidad: 'kg', precio: 2800, stock: 3.1, minimo: 5, activo: true },
  { id: '4', nombre: 'Pechito de cerdo', categoria: 'Cerdo', unidad: 'kg', precio: 3800, stock: 6.0, minimo: 3, activo: true },
]

export default function Productos() {
  const [catActiva, setCatActiva] = useState<string | null>(null)
  const filtered = catActiva ? placeholder.filter(p => p.categoria === catActiva) : placeholder

  return (
    <>
      <PageHeader
        title="Productos & Stock"
        action={
          <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
            <IconPlus className="w-5 h-5" />
          </button>
        }
      />
      <div className="p-4 space-y-3">
        {/* Filtro categorías */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setCatActiva(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${!catActiva ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'}`}
          >Todos</button>
          {CATEGORIAS.map(c => (
            <button
              key={c}
              onClick={() => setCatActiva(c === catActiva ? null : c)}
              className={`shrink-0 px-3 py-1 rounded-full text-sm font-medium transition-colors
                ${catActiva === c ? 'bg-verde-700 text-white' : 'bg-verde-100 text-verde-800'}`}
            >{c}</button>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {filtered.map(p => {
            const bajo = p.stock < p.minimo
            return (
              <div key={p.id} className="card flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{p.nombre}</p>
                  <p className="text-xs text-verde-700">{p.categoria} · ${p.precio.toLocaleString('es-AR')}/{p.unidad}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-bold ${bajo ? 'text-alerta' : 'text-verde-700'}`}>
                    {p.stock} {p.unidad}
                  </p>
                  {bajo && <span className="badge-red">Stock bajo</span>}
                </div>
                <IconChevronRight className="w-4 h-4 text-verde-200 shrink-0" />
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="card text-center text-verde-700 text-sm py-8">
            No hay productos en esta categoría
          </div>
        )}
      </div>
    </>
  )
}
