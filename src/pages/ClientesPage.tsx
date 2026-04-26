import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClientSummaries } from '../hooks/useReproduction'
import { LoadingScreen, EmptyState } from '../components/ui'
import type { ClientSummary, ClientTagType } from '../types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €'
}

const TAG_LABELS: Record<ClientTagType, string> = {
  cubricion:  'Cubrición',
  vientre:    'Vientre',
  interesado: 'Interesado',
  vendedor:   'Vendedor',
}
const TAG_COLORS: Record<ClientTagType, { bg: string; color: string }> = {
  cubricion:  { bg: '#E8F0F8', color: '#1A4F7A' },
  vientre:    { bg: '#EAF3EC', color: '#2E6B3E' },
  interesado: { bg: '#F5E8EC', color: '#7B1F3A' },
  vendedor:   { bg: '#FCEAEA', color: '#8C1F1F' },
}

const FILTERS = [
  { key: 'todos',      label: 'Todos' },
  { key: 'cubricion',  label: 'Cubriciones' },
  { key: 'vientre',    label: 'Vientres' },
  { key: 'interesado', label: 'Interesados' },
  { key: 'deuda',      label: 'Con deuda' },
] as const

type FilterKey = typeof FILTERS[number]['key']

// ─── CLIENT CARD ─────────────────────────────────────────────────────────────

function ClientCard({ client, onClick }: { client: ClientSummary; onClick: () => void }) {
  const initial = client.name.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="mx-3 mb-2.5 rounded-[18px] overflow-hidden cursor-pointer"
         style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}
         onClick={onClick}>
      {/* Top */}
      <div className="flex items-center gap-3 px-3.5 py-3"
           style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center text-[16px] font-bold shrink-0"
             style={{ background: '#E8F0F8', color: '#1A4F7A' }}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold truncate" style={{ color: '#1C1010' }}>{client.name}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: '#6B5555' }}>
            {[client.stable_name, client.city, client.instagram ? `@${client.instagram}` : null].filter(Boolean).join(' · ')}
          </p>
          {/* Tags */}
          {client.tags.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {client.tags.map(tag => (
                <span key={tag}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={TAG_COLORS[tag]}>
                  {TAG_LABELS[tag]}
                </span>
              ))}
            </div>
          )}
        </div>
        <span style={{ color: '#A08888', fontSize: 16, flexShrink: 0 }}>›</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3">
        <div className="flex flex-col items-center py-2.5"
             style={{ borderRight: '1px solid rgba(123,31,58,0.07)' }}>
          <span className="text-[16px] font-bold" style={{ color: '#1C1010' }}>{client.total_operations}</span>
          <span className="text-[10px] mt-0.5" style={{ color: '#6B5555' }}>Operaciones</span>
        </div>
        <div className="flex flex-col items-center py-2.5"
             style={{ borderRight: '1px solid rgba(123,31,58,0.07)' }}>
          <span className="text-[16px] font-bold" style={{ color: '#2E6B3E' }}>{fmt(client.total_paid)}</span>
          <span className="text-[10px] mt-0.5" style={{ color: '#6B5555' }}>Pagado</span>
        </div>
        <div className="flex flex-col items-center py-2.5">
          <span className="text-[16px] font-bold"
                style={{ color: client.total_pending > 0 ? '#9C6A00' : '#A08888' }}>
            {client.total_pending > 0 ? fmt(client.total_pending) : '—'}
          </span>
          <span className="text-[10px] mt-0.5" style={{ color: '#6B5555' }}>Pendiente</span>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const navigate = useNavigate()
  const { data: clients, isLoading } = useClientSummaries()
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<FilterKey>('todos')

  const filtered = (clients ?? []).filter(c => {
    // Tag / debt filter
    if (filter === 'deuda')     { if (c.total_pending <= 0) return false }
    else if (filter !== 'todos') {
      if (!c.tags.includes(filter as ClientTagType)) return false
    }
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.instagram ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  if (isLoading) return <LoadingScreen />

  return (
    <div className="flex flex-col h-full">
      {/* Header + search */}
      <div className="shrink-0" style={{ background: '#7B1F3A' }}>
        <div className="safe-top" />
        <div className="px-4 pt-2.5 pb-2">
          <h1 className="text-[20px] font-bold text-white tracking-tight">Clientes</h1>
        </div>
        {/* Search box */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
               style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16 }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Nombre, teléfono, @instagram…"
              className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-white/50"
            />
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide shrink-0"
           style={{ background: '#fff', borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap shrink-0"
            style={filter === f.key
              ? { background: '#7B1F3A', color: '#fff', border: '1px solid #7B1F3A' }
              : { background: '#fff', color: '#6B5555', border: '1px solid rgba(123,31,58,0.22)' }
            }>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-3 pb-4" style={{ background: '#F7F3EE' }}>
        {filtered.length === 0 ? (
          clients && clients.length === 0 ? (
            <EmptyState icon="👤" title="Sin clientes aún"
                        subtitle="Los clientes se crean automáticamente al registrar cubriciones o ventas de vientre" />
          ) : (
            <EmptyState icon="🔍" title="Sin resultados"
                        subtitle="Prueba con otro filtro o búsqueda" />
          )
        ) : (
          filtered.map(c => (
            <ClientCard
              key={c.id}
              client={c}
              onClick={() => navigate(`/clientes/${c.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}
