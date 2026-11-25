import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isChunkLoadError, reloadOnce } from '../lib/chunkReload'

interface Props { children: ReactNode; /** compact = inside the layout (keeps the tab bar) */ compact?: boolean }
interface State { error: Error | null }

/** Friendly fallback instead of a blank screen when a render (or a lazy chunk) fails. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State { return { error } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    // stale chunk after a deploy: a fresh index.html fixes it
    if (isChunkLoadError(error)) reloadOnce()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="flex flex-col items-center justify-center text-center gap-3 px-8"
           style={{ minHeight: this.props.compact ? '60vh' : '100vh', background: this.props.compact ? undefined : '#F7F3EE' }}>
        <p className="text-[17px] font-bold" style={{ color: '#7B1F3A' }}>Algo ha fallado</p>
        <p className="text-[13px]" style={{ color: '#6B5555' }}>
          Es posible que haya una versión nueva de la aplicación. Recarga para continuar.
        </p>
        <button onClick={() => window.location.reload()}
                className="rounded-2xl px-5 py-2.5 text-[14px] font-semibold text-white"
                style={{ background: '#7B1F3A' }}>
          Recargar
        </button>
      </div>
    )
  }
}
