import { NavLink } from 'react-router-dom'
import { IconCash, IconReceipt, IconTrend } from './Icons'

/**
 * Tres secciones nomás.
 *
 * Stock, Facturas y Pedidos quedan en pausa: las pantallas siguen en el
 * código y sus rutas andan, pero no se ofrecen. Lo que importa ahora es
 * cargar la venta rápido, y cada ícono de más es una cosa menos clara.
 */
const links = [
  { to: '/', icon: IconReceipt, label: 'Ventas' },
  { to: '/gastos', icon: IconCash, label: 'Gastos' },
  { to: '/estadisticas', icon: IconTrend, label: 'Estadísticas' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-verde-800 safe-area-inset-bottom z-50">
      <div className="flex items-stretch max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-3 gap-1 text-xs font-medium
               transition-colors ${isActive ? 'text-white' : 'text-verde-200/70'}`
            }
          >
            <Icon className="w-6 h-6" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
