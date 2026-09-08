import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { AppLayout } from './components/AppLayout'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Venta from './pages/Venta'
import Productos from './pages/Productos'
import Gastos from './pages/Gastos'
import Facturas from './pages/Facturas'
import Pendientes from './pages/Pendientes'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

function Rutas() {
  const { session, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen bg-verde-800 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-verde-200 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
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
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Rutas />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
