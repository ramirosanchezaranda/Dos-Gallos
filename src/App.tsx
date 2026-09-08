import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import Panel from './pages/Panel'
import Venta from './pages/Venta'
import Productos from './pages/Productos'
import Gastos from './pages/Gastos'
import Facturas from './pages/Facturas'
import Pendientes from './pages/Pendientes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Panel />} />
          <Route path="venta" element={<Venta />} />
          <Route path="productos" element={<Productos />} />
          <Route path="gastos" element={<Gastos />} />
          <Route path="facturas" element={<Facturas />} />
          <Route path="pendientes" element={<Pendientes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
