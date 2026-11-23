import { useState, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnimals } from '../hooks/useAnimals'
import { HorseFigure } from '../components/horse/HorseFigure'
import { coatFromAnimal } from '../components/horse/horseCoat'
import { EmptyState, LoadingScreen } from '../components/ui'
import type { Animal } from '../types'
import { differenceInMonths, parseISO } from 'date-fns'

const FILTER_OPTIONS = [
  { id: 'all',      label: 'Todos' },
  { id: 'semental', label: 'Sementales' },
  { id: 'yegua',    label: 'Yeguas' },
  { id: 'young',    label: 'Potros <2a' },
] as const
type FilterId = typeof FILTER_OPTIONS[number]['id']

export default function AnimalesPage() {
  const navigate = useNavigate()
  const { data: animals = [], isLoading } = useAnimals()
  const [filter, setFilter]           = useState<FilterId>('all')
  const [search, setSearch]           = useState('')
  const [breedFilter, setBreedFilter] = useState('')

  const breeds = useMemo(() => {
    const set = new Set(animals.map(a => a.breed).filter(Boolean))
    return Array.from(set).sort() as string[]
  }, [animals])

  const filtered = useMemo(() => {
    let list = animals.filter(a => a.status !== 'fallecido')
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        (a.alias ?? '').toLowerCase().includes(q) ||
        (a.registry_number ?? '').toLowerCase().includes(q)
      )
    }
    if (breedFilter) list = list.filter(a => a.breed === breedFilter)
    if (filter === 'semental') list = list.filter(a => a.sex === 'semental')
    else if (filter === 'yegua') list = list.filter(a => a.sex === 'yegua')
    else if (filter === 'young') {
      list = list.filter(a => {
        if (!a.birth_date) return false
        return differenceInMonths(new Date(), parseISO(a.birth_date)) < 24
      })
    }
    return list
  }, [animals, filter, search, breedFilter])

  const grouped = useMemo(() => ({
    sementales: filtered.filter(a => a.sex === 'semental'),
    yeguas:     filtered.filter(a => a.sex === 'yegua'),
    jovenes:    filtered.filter(a => a.sex === 'potro' || a.sex === 'potra'),
    otros:      filtered.filter(a => a.sex === 'castrado'),
  }), [filtered])

  if (isLoading) return <LoadingScreen />

  return (
    <div className="flex flex-col h-full">
      {/* NAV */}
      <div className="shrink-0" style={{ background: '#7B1F3A' }}>
        <div className="safe-top" />
        <div className="flex items-center justify-between px-4 pt-2.5 pb-3">
          <div>
            <h1 className="text-[20px] font-bold text-white tracking-tight">El Tiempo</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {animals.length} animales
            </p>
          </div>
          <button
            onClick={() => navigate('/animales/nuevo')}
            className="text-[13px] font-medium rounded-2xl px-3.5 py-1.5"
            style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
          >
            + Añadir
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
               style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"
                 stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o chip..."
              className="flex-1 bg-transparent text-[14px] outline-none text-white"
              style={{ '::placeholder': { color: 'rgba(255,255,255,0.4)' } } as React.CSSProperties}
            />
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="shrink-0 flex gap-2 overflow-x-auto scrollbar-hide px-3 py-2.5"
           style={{ background: '#fff', borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => setFilter(opt.id)}
                  className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{
                    background: filter === opt.id ? '#7B1F3A' : '#fff',
                    color: filter === opt.id ? '#fff' : '#6B5555',
                    border: `1px solid ${filter === opt.id ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                  }}>
            {opt.label}
          </button>
        ))}
        {breeds.map(breed => (
          <button key={breed} onClick={() => setBreedFilter(breedFilter === breed ? '' : breed)}
                  className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium"
                  style={{
                    background: breedFilter === breed ? '#7B1F3A' : '#fff',
                    color: breedFilter === breed ? '#fff' : '#6B5555',
                    border: `1px solid ${breedFilter === breed ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                  }}>
            {breed}
          </button>
        ))}
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ background: '#F7F3EE' }}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No hay animales"
            subtitle={search ? 'Prueba con otro término' : 'Añade tu primer animal'}
            action={!search ? { label: '+ Añadir animal', onClick: () => navigate('/animales/nuevo') } : undefined}
          />
        ) : (
          <>
            <Group title={`Sementales · ${grouped.sementales.length}`} animals={grouped.sementales} onPress={id => navigate(`/animales/${id}`)} />
            <Group title={`Yeguas · ${grouped.yeguas.length}`} animals={grouped.yeguas} onPress={id => navigate(`/animales/${id}`)} />
            <Group title={`Potros y potras · ${grouped.jovenes.length}`} animals={grouped.jovenes} onPress={id => navigate(`/animales/${id}`)} />
            <Group title={`Otros · ${grouped.otros.length}`} animals={grouped.otros} onPress={id => navigate(`/animales/${id}`)} />
          </>
        )}
        <div className="h-4" />
      </div>
    </div>
  )
}

function Group({ title, animals, onPress }: { title: string; animals: Animal[]; onPress: (id: string) => void }) {
  if (animals.length === 0) return null
  return (
    <>
      <p className="text-[11px] font-bold uppercase tracking-wider px-4 pt-3.5 pb-1.5" style={{ color: '#A08888' }}>
        {title}
      </p>
      <div className="px-3 grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
        {animals.map(a => (
          <AnimalCard key={a.id} animal={a} onPress={() => onPress(a.id)} />
        ))}
      </div>
    </>
  )
}

// HorseFigure with live=false (default) runs no rAF clock and no SMIL idle loops.
// content-visibility lets the browser skip layout/paint of off-screen cards.
const AnimalCard = memo(function AnimalCard({ animal, onPress }: { animal: Animal; onPress: () => void }) {
  const bg = animal.azulejo_bg ?? '#F0E4D4'
  const coat = useMemo(() => coatFromAnimal(animal), [animal])
  const custody = animal.status === 'custodia'
  const sold = animal.status === 'vendido'
  return (
    <button
      onClick={onPress}
      className="text-left active:scale-[0.97] transition-transform"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 190px' } as React.CSSProperties}
    >
      <div className="relative rounded-2xl overflow-hidden"
           style={{
             background: `radial-gradient(90% 70% at 50% 40%, rgba(255,255,255,0.35), rgba(255,255,255,0) 70%), ${bg}`,
             border: custody ? '1.5px dashed rgba(123,31,58,0.55)' : '1px solid rgba(123,31,58,0.12)',
             aspectRatio: '1 / 0.9',
           }}>
        <HorseFigure
          coat={coat}
          ground="shadow"
          viewBox="-14 14 248 292"
          style={{ position: 'absolute', inset: '8% 6% 6%', width: '88%', height: '86%' }}
        />
        {(custody || sold) && (
          <span className="absolute right-1.5 top-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.88)', color: custody ? '#1A4F7A' : '#6B5555' }}>
            {custody ? 'Custodia' : 'Vendido'}
          </span>
        )}
      </div>
      <p className="text-[14px] font-semibold truncate text-center mt-1.5 px-1" style={{ color: '#1C1010' }}>{animal.name}</p>
    </button>
  )
})
