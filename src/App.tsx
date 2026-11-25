import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useAutoTasks } from './hooks/useTasks'
import AppLayout from './components/layout/AppLayout'
import { LoadingScreen } from './components/ui'
import { HorseRunner } from './components/horse/HorseRunner'
import ErrorBoundary from './components/ErrorBoundary'
import ConnectionBanner, { reportQueryError, reportQueryOk } from './components/ConnectionBanner'

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
  queryCache: new QueryCache({ onError: reportQueryError, onSuccess: reportQueryOk }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
    },
  },
})

// Each route gets its own error boundary (reset on navigation) + Suspense, so a
// failing page or chunk never blanks the whole app.
function Page({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary key={pathname} compact>
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

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
        <HorseRunner size={96} light />
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return (
    <>
      <AutoAlerts />
      <ConnectionBanner />
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
              <Route path="animales"     element={<Page><AnimalesPage /></Page>} />
              <Route path="animales/nuevo" element={
                <Page><NuevoAnimalPage /></Page>
              } />
              <Route path="animales/:id" element={
                <Page><AnimalDetailPage /></Page>
              } />
              <Route path="parcelas"     element={
                <Page><ParcelasPage /></Page>
              } />
              <Route path="parcelas/:id" element={
                <Page><ParcelasDetailPage /></Page>
              } />
              <Route path="clientes"     element={
                <Page><ClientesPage /></Page>
              } />
              <Route path="clientes/:id" element={
                <Page><ClienteDetailPage /></Page>
              } />
              <Route path="agenda"       element={
                <Page><AgendaPage /></Page>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
