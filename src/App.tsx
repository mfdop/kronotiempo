import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useAutoTasks } from './hooks/useTasks'
import AppLayout from './components/layout/AppLayout'
import { LoadingScreen } from './components/ui'

// ── Eager (critical path) ──────────────────────────────────────────────────
import LoginPage    from './pages/LoginPage'
import AnimalesPage from './pages/AnimalesPage'

// ── Lazy (code-split) ──────────────────────────────────────────────────────
const AnimalDetailPage   = lazy(() => import('./pages/AnimalDetailPage'))
const NuevoAnimalPage    = lazy(() => import('./pages/NuevoAnimalPage'))
const ParcelasPage       = lazy(() => import('./pages/ParcelasPage'))
const ParcelasDetailPage = lazy(() => import('./pages/ParcelasDetailPage'))
const ClientesPage       = lazy(() => import('./pages/ClientesPage'))
const ClienteDetailPage  = lazy(() => import('./pages/ClienteDetailPage'))
const AgendaPage         = lazy(() => import('./pages/AgendaPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

// Runs auto-alert checks once per session as soon as the user is authenticated,
// regardless of which page they visit first.
function AutoAlerts() {
  useAutoTasks()
  return null
}

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
  return (
    <>
      <AutoAlerts />
      {children}
    </>
  )
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
              <Route path="animales"     element={<AnimalesPage />} />
              <Route path="animales/nuevo" element={
                <Suspense fallback={<LoadingScreen />}><NuevoAnimalPage /></Suspense>
              } />
              <Route path="animales/:id" element={
                <Suspense fallback={<LoadingScreen />}><AnimalDetailPage /></Suspense>
              } />
              <Route path="parcelas"     element={
                <Suspense fallback={<LoadingScreen />}><ParcelasPage /></Suspense>
              } />
              <Route path="parcelas/:id" element={
                <Suspense fallback={<LoadingScreen />}><ParcelasDetailPage /></Suspense>
              } />
              <Route path="clientes"     element={
                <Suspense fallback={<LoadingScreen />}><ClientesPage /></Suspense>
              } />
              <Route path="clientes/:id" element={
                <Suspense fallback={<LoadingScreen />}><ClienteDetailPage /></Suspense>
              } />
              <Route path="agenda"       element={
                <Suspense fallback={<LoadingScreen />}><AgendaPage /></Suspense>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
