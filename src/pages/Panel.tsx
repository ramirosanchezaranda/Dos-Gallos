import { PageHeader } from '../components/PageHeader'
import { IconTrend, IconBox, IconCash } from '../components/Icons'

const stats = [
  { label: 'Ventas hoy',      value: '$0',   icon: IconTrend, color: 'text-verde-700' },
  { label: 'Ítems con stock bajo', value: '0', icon: IconBox,   color: 'text-amber-600' },
  { label: 'Facturas vencidas',    value: '0', icon: IconCash,  color: 'text-alerta' },
]

export default function Panel() {
  return (
    <>
      <PageHeader title="Dos Gallos" />
      <div className="p-4 space-y-4">
        {/* Logo + saludo */}
        <div className="flex items-center gap-3 py-2">
          <div className="w-12 h-12 rounded-full bg-verde-800 flex items-center justify-center text-white font-bold text-lg">DG</div>
          <div>
            <p className="font-semibold text-verde-900">¡Buen día!</p>
            <p className="text-sm text-verde-700">Hoy es {new Date().toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex flex-col items-center text-center gap-1">
              <Icon className={`w-6 h-6 ${color}`} />
              <p className="text-xl font-bold text-verde-900">{value}</p>
              <p className="text-[10px] text-verde-700 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Acceso rápido venta */}
        <a href="/venta" className="card flex items-center gap-4 bg-verde-800 text-white border-none">
          <span className="text-3xl">📷</span>
          <div>
            <p className="font-bold">Nueva venta</p>
            <p className="text-sm text-verde-200">Fotografiá el ticket y listo</p>
          </div>
        </a>

        {/* Últimas ventas (placeholder) */}
        <div>
          <h2 className="font-semibold text-verde-900 mb-2">Últimas ventas</h2>
          <div className="card text-center text-verde-700 text-sm py-8">
            Todavía no hay ventas registradas
          </div>
        </div>
      </div>
    </>
  )
}
