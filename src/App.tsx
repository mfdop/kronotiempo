import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import AnimalesPage from './pages/AnimalesPage'
import AnimalDetailPage from './pages/AnimalDetailPage'
import NuevoAnimalPage from './pages/NuevoAnimalPage'
import ParcelasPage from './pages/ParcelasPage'
import ClientesPage from './pages/ClientesPage'
import AgendaPage from './pages/AgendaPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
                    justifyContent:'center', background:'#5C1629' }}>
        <div style={{ fontSize:48 }}>🐴</div>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
              <Route index element={<Navigate to="/animales" replace />} />
              <Route path="animales"          element={<AnimalesPage />} />
              <Route path="animales/nuevo"    element={<NuevoAnimalPage />} />
              <Route path="animales/:id"      element={<AnimalDetailPage />} />
              <Route path="parcelas"          element={<ParcelasPage />} />
              <Route path="clientes"          element={<ClientesPage />} />
              <Route path="agenda"            element={<AgendaPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
