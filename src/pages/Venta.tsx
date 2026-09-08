import { useState, useRef } from 'react'
import { PageHeader } from '../components/PageHeader'
import { IconCamera, IconPlus } from '../components/Icons'

type Step = 'capture' | 'review' | 'confirm'

export default function Venta() {
  const [step, setStep] = useState<Step>('capture')
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <PageHeader title="Nueva venta" />
      <div className="p-4 space-y-4">
        {step === 'capture' && (
          <div className="space-y-4">
            <p className="text-verde-700 text-sm">Fotografiá el ticket de la balanza o de la caja</p>

            {/* Área de captura */}
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
              onChange={() => setStep('review')}
            />

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-verde-200" />
              <span className="text-xs text-verde-700/60">o</span>
              <div className="flex-1 h-px bg-verde-200" />
            </div>

            <button
              onClick={() => setStep('review')}
              className="w-full card flex items-center gap-3 text-verde-700 font-medium"
            >
              <IconPlus className="w-5 h-5 text-verde-700" />
              Cargar venta manual
            </button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              Revisá y corregí los productos antes de confirmar
            </div>
            {/* Tarjetas de ítems — se poblarán con el parser OCR */}
            <div className="card border-verde-200 space-y-3">
              <p className="text-xs font-semibold text-verde-700 uppercase tracking-wide">Ítem 1 (editar)</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><p className="text-verde-700/60 text-xs">Producto</p><p className="font-medium">—</p></div>
                <div><p className="text-verde-700/60 text-xs">Peso (kg)</p><p className="font-medium">—</p></div>
                <div><p className="text-verde-700/60 text-xs">Subtotal</p><p className="font-medium">—</p></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1" onClick={() => setStep('capture')}>Volver</button>
              <button className="btn-primary flex-1" onClick={() => setStep('confirm')}>Confirmar venta</button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="text-center space-y-4 py-12">
            <div className="w-16 h-16 rounded-full bg-verde-100 flex items-center justify-center mx-auto text-3xl">✓</div>
            <h2 className="text-xl font-bold text-verde-900">¡Venta registrada!</h2>
            <p className="text-verde-700 text-sm">El stock fue actualizado automáticamente</p>
            <button className="btn-primary" onClick={() => setStep('capture')}>Nueva venta</button>
          </div>
        )}
      </div>
    </>
  )
}
