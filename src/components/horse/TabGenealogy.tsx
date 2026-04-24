import { useNavigate } from 'react-router-dom'
import { useAnimals } from '../../hooks/useAnimals'
import { Azulejo } from './Azulejo'
import { Card, EmptyState } from '../ui'
import type { Animal } from '../../types'
import { differenceInYears, parseISO } from 'date-fns'

function ageStr(b?: string) {
  if (!b) return ''
  const y = differenceInYears(new Date(), parseISO(b))
  return y >= 1 ? `${y} años` : ''
}

// ─── TREE NODE ───────────────────────────────────────────────
function TreeNode({
  label, animal, externalName, isSubject = false, onClick,
}: {
  label: string
  animal?: Animal
  externalName?: string
  isSubject?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex-1 rounded-2xl p-3 text-left transition-colors"
      style={{
        background: isSubject ? '#F5E8EC' : '#fff',
        border: `${isSubject ? 2 : 1}px solid ${isSubject ? '#7B1F3A' : 'rgba(123,31,58,0.15)'}`,
        minWidth: 0,
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1"
         style={{ color: isSubject ? '#7B1F3A' : '#A08888' }}>
        {label}
      </p>
      {animal ? (
        <>
          <p className="text-[12px] font-bold truncate"
             style={{ color: isSubject ? '#7B1F3A' : '#1C1010' }}>
            {animal.name}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: '#6B5555' }}>
            {[animal.breed, ageStr(animal.birth_date)].filter(Boolean).join(' · ')}
          </p>
          {onClick && <p className="text-[10px] mt-1 font-semibold" style={{ color: '#7B1F3A' }}>Ver ficha ›</p>}
        </>
      ) : externalName ? (
        <p className="text-[12px] font-bold truncate" style={{ color: '#1C1010' }}>{externalName}</p>
      ) : (
        <p className="text-[11px] italic" style={{ color: '#A08888' }}>Desconocido</p>
      )}
    </button>
  )
}

// ─── CONNECTOR LINE ──────────────────────────────────────────
function Connector({ split = false }: { split?: boolean }) {
  if (!split) {
    return (
      <div className="flex justify-center h-5">
        <div className="w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
      </div>
    )
  }
  return (
    <div className="relative h-5 mx-6">
      <div className="absolute inset-x-1/4 top-1/2 h-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
      <div className="absolute left-1/4 top-0 bottom-1/2 w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
      <div className="absolute right-1/4 top-0 bottom-1/2 w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
      <div className="absolute left-1/2 top-1/2 bottom-0 w-px" style={{ background: '#7B1F3A' }} />
    </div>
  )
}

// ─── OFFSPRING CELL ──────────────────────────────────────────
function OffspringCell({ animal, isLast, onClick }: { animal: Animal; isLast: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-[#F5E8EC]"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(123,31,58,0.11)' }}
    >
      <Azulejo animal={animal} size={40} borderRadius={10} custody={animal.status === 'custodia'} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold truncate" style={{ color: '#1C1010' }}>{animal.name}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#6B5555' }}>
          {[animal.breed, ageStr(animal.birth_date), animal.sex].filter(Boolean).join(' · ')}
        </p>
      </div>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#A08888" strokeWidth="2" strokeLinecap="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function TabGenealogy({ animal }: { animal: Animal }) {
  const navigate          = useNavigate()
  const { data: all = [] } = useAnimals()

  const find = (id?: string) => id ? all.find(a => a.id === id) : undefined

  const sire         = find(animal.sire_id)
  const dam          = find(animal.dam_id)
  const sireGrandSire = find(sire?.sire_id)
  const sireGrandDam  = find(sire?.dam_id)
  const damGrandSire  = find(dam?.sire_id)
  const damGrandDam   = find(dam?.dam_id)

  // Offspring: animals where sire_id or dam_id = this animal
  const offspring = all.filter(a => a.sire_id === animal.id || a.dam_id === animal.id)

  const goTo = (id?: string) => id ? () => navigate(`/animales/${id}`) : undefined

  return (
    <div className="p-3 space-y-2.5 pb-8">

      {/* TREE */}
      <Card>
        <div className="px-3 py-3 space-y-0">

          {/* Generation 3 — bisabuelos */}
          <div className="flex gap-2">
            <TreeNode label="Bis.P. (padre)" animal={sireGrandSire}
                      externalName={sire?.sire_external_name}
                      onClick={goTo(sireGrandSire?.id)} />
            <TreeNode label="Bis.M. (padre)" animal={sireGrandDam}
                      externalName={sire?.dam_external_name}
                      onClick={goTo(sireGrandDam?.id)} />
            <TreeNode label="Bis.P. (madre)" animal={damGrandSire}
                      externalName={dam?.sire_external_name}
                      onClick={goTo(damGrandSire?.id)} />
            <TreeNode label="Bis.M. (madre)" animal={damGrandDam}
                      externalName={dam?.dam_external_name}
                      onClick={goTo(damGrandDam?.id)} />
          </div>

          {/* Connector: 4 → 2 */}
          <div className="relative h-5 mx-2">
            <div className="absolute left-[12.5%] right-[75%] top-1/2 h-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
            <div className="absolute left-[12.5%] top-0 bottom-1/2 w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
            <div className="absolute left-[25%] top-1/2 bottom-0 w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
            <div className="absolute left-[75%] right-[12.5%] top-1/2 h-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
            <div className="absolute right-[12.5%] top-0 bottom-1/2 w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
            <div className="absolute right-[25%] top-1/2 bottom-0 w-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
          </div>

          {/* Generation 2 — abuelos */}
          <div className="flex gap-2">
            <TreeNode label="Padre (sire)" animal={sire}
                      externalName={animal.sire_external_name}
                      onClick={goTo(sire?.id)} />
            <TreeNode label="Madre (dam)" animal={dam}
                      externalName={animal.dam_external_name}
                      onClick={goTo(dam?.id)} />
          </div>

          <Connector split />

          {/* Subject */}
          <div className="flex px-8">
            <TreeNode label="Este animal" animal={animal} isSubject />
          </div>
        </div>
      </Card>

      {/* OFFSPRING */}
      {offspring.length > 0 ? (
        <Card>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
              Crías registradas · {offspring.length}
            </p>
          </div>
          {offspring.map((o, i) => (
            <OffspringCell
              key={o.id} animal={o} isLast={i === offspring.length - 1}
              onClick={() => navigate(`/animales/${o.id}`)}
            />
          ))}
        </Card>
      ) : (
        <EmptyState icon="🐴" title="Sin crías registradas"
                    subtitle="Las crías aparecerán aquí cuando se añadan y se vincule la genealogía" />
      )}
    </div>
  )
}
