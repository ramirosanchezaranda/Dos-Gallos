import type { ReactNode } from 'react'

/**
 * Panel que sube desde abajo para los formularios.
 *
 * Tres partes que no se pisan: encabezado fijo, cuerpo que scrollea y
 * acciones ancladas al pie. Las acciones se ven siempre, sin tener que
 * scrollear el formulario entero para encontrar el botón de guardar.
 *
 * Va por encima de la barra de navegación (`z-60` contra su `z-50`): con el
 * mismo z-index ganaba la barra por estar después en el DOM y se comía tanto
 * los botones como los toques sobre ellos.
 */

interface Props {
  titulo: string
  onCerrar: () => void
  children: ReactNode
  /** Botones del pie. Quedan anclados y siempre visibles. */
  acciones?: ReactNode
}

export function HojaInferior({ titulo, onCerrar, children, acciones }: Props) {
  return (
    <div className="fixed inset-0 z-60 bg-black/40 flex items-end" onClick={onCerrar}>
      <div
        // `dvh` y no `vh`: en el navegador del celular la barra de direcciones
        // entra y sale, y `vh` mide siempre el alto máximo, así que el panel
        // terminaba más alto que la pantalla visible.
        className="bg-hueso w-full max-w-lg mx-auto rounded-t-3xl max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-3 pb-2">
          <div className="w-10 h-1 bg-verde-200 rounded-full mx-auto mb-3" />
          <h2 className="font-bold text-verde-900">{titulo}</h2>
        </div>

        {/* `min-h-0` es lo que permite encoger a un hijo flex; sin eso el
            cuerpo crece con el contenido y nunca llega a scrollear. */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-3 space-y-3">{children}</div>

        {acciones && (
          <div className="shrink-0 border-t border-verde-100 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
            {acciones}
          </div>
        )}
      </div>
    </div>
  )
}
