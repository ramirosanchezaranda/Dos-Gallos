import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto relative overflow-x-clip">
      {/* El colchón de abajo despeja la barra fija: su alto más la franja del
          gesto de inicio, que en los celulares que la tienen la hace más alta. */}
      <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
