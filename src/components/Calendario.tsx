import { useState } from 'react'
import { pesos } from '../lib/formato'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const clave = (d: Date) => d.toLocaleDateString('en-CA')

/** Lunes = 0, para que la semana arranque donde arranca acá. */
const columnaDe = (d: Date) => (d.getDay() + 6) % 7

interface Props {
  /** Total vendido por día, con clave YYYY-MM-DD. */
  totales: Map<string, number>
  seleccionado: string | null
  onSeleccionar: (dia: string) => void
}

export function Calendario({ totales, seleccionado, onSeleccionar }: Props) {
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const hoy = clave(new Date())
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const relleno = columnaDe(primero)

  const maximo = Math.max(...[...totales.values()], 0)

  const mover = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1))

  const esFuturo = mes > new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => mover(-1)}
          aria-label="Mes anterior"
          className="w-8 h-8 rounded-lg text-verde-700 text-lg leading-none"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-verde-900 first-letter:uppercase">
          {mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </p>
        <button
          onClick={() => mover(1)}
          disabled={esFuturo}
          aria-label="Mes siguiente"
          className="w-8 h-8 rounded-lg text-verde-700 text-lg leading-none disabled:opacity-25"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-verde-700/50 font-medium pb-1">
            {d}
          </div>
        ))}

        {Array.from({ length: relleno }, (_, i) => <div key={`v${i}`} />)}

        {Array.from({ length: diasEnMes }, (_, i) => {
          const fecha = new Date(mes.getFullYear(), mes.getMonth(), i + 1)
          const k = clave(fecha)
          const total = totales.get(k) ?? 0
          const activo = seleccionado === k
          // La intensidad da el mapa de calor; el número sigue estando abajo.
          const intensidad = maximo > 0 && total > 0 ? 0.15 + (total / maximo) * 0.85 : 0
          // Sobre el verde fuerte el número se pierde: a partir de ahí va claro.
          const numeroClaro = intensidad > 0.5

          return (
            <button
              key={k}
              onClick={() => onSeleccionar(k)}
              aria-label={`${i + 1}: ${total > 0 ? pesos(total) : 'sin ventas'}`}
              className={`aspect-square rounded-lg text-xs flex flex-col items-center justify-center transition-colors ${
                activo ? 'ring-2 ring-verde-700' : ''
              } ${
                total > 0
                  ? `font-semibold ${numeroClaro ? 'text-white' : 'text-verde-900'}`
                  : 'text-verde-700/40'
              } ${k === hoy && !activo ? 'ring-1 ring-verde-300' : ''}`}
              style={
                total > 0
                  ? { backgroundColor: `color-mix(in srgb, var(--color-verde-600) ${intensidad * 100}%, transparent)` }
                  : undefined
              }
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
