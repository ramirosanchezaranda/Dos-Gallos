import { NavLink } from 'react-router-dom'
import { IconHome, IconCamera, IconBox, IconCash, IconReceipt, IconTruck } from './Icons'

const links = [
  { to: '/',          icon: IconHome,    label: 'Panel' },
  { to: '/venta',     icon: IconCamera,  label: 'Venta' },
  { to: '/productos', icon: IconBox,     label: 'Stock' },
  { to: '/gastos',    icon: IconCash,    label: 'Gastos' },
  { to: '/facturas',  icon: IconReceipt, label: 'Facturas' },
  { to: '/pedidos',   icon: IconTruck,   label: 'Pedidos' },
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
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors
              ${isActive ? 'text-verde-100' : 'text-verde-200/60'}`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
