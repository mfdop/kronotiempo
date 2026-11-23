import { errMsg } from '../../lib/errors'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnimals, useUpdateAnimal } from '../../hooks/useAnimals'
import { Azulejo } from './Azulejo'
import { HorseFigure } from './HorseFigure'
import type { HorseCoat } from './horseCoat'
import { BottomSheet, EmptyState } from '../ui'
import type { Animal } from '../../types'
import { differenceInYears, parseISO } from 'date-fns'

function ageStr(b?: string) {
  if (!b) return ''
  const y = differenceInYears(new Date(), parseISO(b))
  return y >= 1 ? `${y} años` : ''
}

type PickerTarget = 'sire' | 'dam' | 'sire_gs' | 'sire_gd' | 'dam_gs' | 'dam_gd'

// Great-grandparents: grandparent key + which of its parents (s = padre, d = madre)
type GKey = 'sire_gs' | 'sire_gd' | 'dam_gs' | 'dam_gd'
type GgpTarget = { g: GKey; side: 's' | 'd' }
type GgpField = 'sire_gs_external_name' | 'sire_gd_external_name' | 'dam_gs_external_name' | 'dam_gd_external_name'
const G_KEYS: GKey[] = ['sire_gs', 'sire_gd', 'dam_gs', 'dam_gd']
const G_LABELS: Record<GKey, string> = {
  sire_gs: 'abuelo paterno', sire_gd: 'abuela paterna',
  dam_gs:  'abuelo materno', dam_gd:  'abuela materna',
}
const MALE: Animal['sex'][]   = ['semental', 'potro', 'castrado']
const FEMALE: Animal['sex'][] = ['yegua', 'potra']
const ggpField = (role: 'sire' | 'dam', side: 's' | 'd') =>
  `${role}_${side === 's' ? 'gs' : 'gd'}_external_name` as GgpField

// Sex filters per picker target
const SEX_FILTER: Record<PickerTarget, Animal['sex'][]> = {
  sire:    ['semental', 'potro', 'castrado'],
  sire_gs: ['semental', 'potro', 'castrado'],
  dam_gs:  ['semental', 'potro', 'castrado'],
  dam:     ['yegua', 'potra'],
  sire_gd: ['yegua', 'potra'],
  dam_gd:  ['yegua', 'potra'],
}

const PICKER_TITLES: Record<PickerTarget, string> = {
  sire:    'Seleccionar padre',
  dam:     'Seleccionar madre',
  sire_gs: 'Abuelo paterno',
  sire_gd: 'Abuela paterna',
  dam_gs:  'Abuelo materno',
  dam_gd:  'Abuela materna',
}

function AnimalPicker({ open, onClose, onSelect, excludeId, title, sexFilter }: {
  open: boolean; onClose: () => void
  onSelect: (animal: Animal | null, externalName: string) => void
  excludeId: string; title: string
  sexFilter?: Animal['sex'][]
}) {
  const { data: all = [] } = useAnimals()
  const [search, setSearch] = useState('')
  const [extName, setExtName] = useState('')
  const [mode, setMode] = useState<'app' | 'ext'>('app')

  const filtered = all
    .filter(a => a.id !== excludeId)
    .filter(a => !sexFilter || sexFilter.includes(a.sex))
    .filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()))

  const pick = (a: Animal) => { onSelect(a, ''); onClose(); setSearch('') }
  const saveExt = () => { if (extName.trim()) { onSelect(null, extName.trim()); onClose(); setExtName('') } }
  const clear = () => { onSelect(null, ''); onClose() }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex gap-2 mb-4">
        {[{ id: 'app', label: 'Animal en la app' }, { id: 'ext', label: 'Nombre externo' }].map(o => (
          <button key={o.id} onClick={() => setMode(o.id as 'app' | 'ext')}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{
                    background: mode === o.id ? '#7B1F3A' : '#F7F3EE',
                    color: mode === o.id ? '#fff' : '#6B5555',
                    border: `1.5px solid ${mode === o.id ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                  }}>{o.label}</button>
        ))}
      </div>

      {mode === 'app' ? (
        <>
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3"
               style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)' }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#A08888" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Buscar animal..." className="flex-1 bg-transparent text-[14px] outline-none"
                   style={{ color: '#1C1010' }} />
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(123,31,58,0.11)' }}>
            {filtered.length === 0
              ? <p className="text-[13px] text-center py-6" style={{ color: '#A08888' }}>Sin resultados</p>
              : filtered.slice(0, 10).map((a, i) => (
                <button key={a.id} onClick={() => pick(a)}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left bg-white active:bg-[#F5E8EC]"
                        style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                  <Azulejo animal={a} size={40} borderRadius={10} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: '#1C1010' }}>{a.name}</p>
                    <p className="text-[11px]" style={{ color: '#6B5555' }}>
                      {[a.breed, ageStr(a.birth_date)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </button>
              ))
            }
          </div>
          <button onClick={clear} className="w-full mt-3 py-2.5 rounded-xl text-[13px] font-medium"
                  style={{ border: '1.5px solid rgba(123,31,58,0.22)', color: '#A08888' }}>
            Quitar vínculo
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <input value={extName} onChange={e => setExtName(e.target.value)}
                 placeholder="Nombre del animal externo..." className="w-full rounded-xl px-4 py-3 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          <p className="text-[11px] italic" style={{ color: '#A08888' }}>Puedes incluir raza, yeguada u otros detalles</p>
          <button onClick={saveExt} disabled={!extName.trim()}
                  className="w-full py-3.5 rounded-xl text-white text-[14px] font-bold"
                  style={{ background: '#7B1F3A', opacity: extName.trim() ? 1 : 0.4 }}>
            Guardar
          </button>
          <button onClick={clear} className="w-full py-2.5 rounded-xl text-[13px] font-medium"
                  style={{ border: '1.5px solid rgba(123,31,58,0.22)', color: '#A08888' }}>
            Quitar vínculo
          </button>
        </div>
      )}
    </BottomSheet>
  )
}

const GREY_COAT: HorseCoat = { ink: '#C9C2BC', spotInk: '#A9A29C', maneInk: '#A9A29C', pattern: 'lisa', careto: false, cuatroalbo: false }

/** Neutral placeholder for relatives that are only a name (not in the app). */
function ExternalTile({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), background: '#F3F0EC', flexShrink: 0,
                  border: '2px dashed rgba(123,31,58,0.22)', position: 'relative', overflow: 'hidden' }}>
      <HorseFigure coat={GREY_COAT} icon ground="none" viewBox="-6 14 236 286"
                   style={{ position: 'absolute', inset: '6%', width: '88%', height: '88%', opacity: 0.6 }} />
    </div>
  )
}

function TreeNode({ label, animal, extName, isSubject = false, onEdit, onNav, iconSize = 40 }: {
  label: string; animal?: Animal; extName?: string
  isSubject?: boolean; onEdit?: () => void; onNav?: () => void; iconSize?: number
}) {
  const onClick = isSubject ? undefined : (onNav ?? onEdit)
  return (
    <button onClick={onClick} disabled={!onClick}
            className="flex-1 rounded-2xl p-2 text-center min-w-0 flex flex-col items-center"
            style={{
              background: isSubject ? '#F5E8EC' : '#fff',
              border: `${isSubject ? 2 : 1}px solid ${isSubject ? '#7B1F3A' : 'rgba(123,31,58,0.15)'}`,
            }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1 truncate"
         style={{ color: isSubject ? '#7B1F3A' : '#A08888' }}>{label}</p>
      {animal ? (
        <>
          <Azulejo animal={animal} size={iconSize} borderRadius={Math.round(iconSize * 0.25)} custody={animal.status === 'custodia'} />
          <p className="text-[11px] font-bold truncate w-full mt-1" style={{ color: isSubject ? '#7B1F3A' : '#1C1010' }}>{animal.name}</p>
          <p className="text-[9px] truncate" style={{ color: '#6B5555' }}>{[animal.breed, ageStr(animal.birth_date)].filter(Boolean).join(' · ')}</p>
          {onNav && <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#7B1F3A' }}>Ver ›</p>}
        </>
      ) : extName ? (
        <>
          <ExternalTile size={iconSize} />
          <p className="text-[11px] font-bold truncate w-full mt-1" style={{ color: '#1C1010' }}>{extName}</p>
          <p className="text-[9px]" style={{ color: '#A08888' }}>Externo</p>
          {onEdit && <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#7B1F3A' }}>Cambiar ›</p>}
        </>
      ) : (
        <>
          <p className="text-[11px] italic" style={{ color: '#A08888' }}>Desconocido</p>
          {onEdit && <p className="text-[9px] font-semibold mt-0.5" style={{ color: '#7B1F3A' }}>Añadir ›</p>}
        </>
      )}
    </button>
  )
}

export default function TabGenealogy({ animal }: { animal: Animal }) {
  const navigate           = useNavigate()
  const { data: all = [] } = useAnimals()
  const updateAnimal       = useUpdateAnimal()
  const [picker, setPicker] = useState<PickerTarget | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const find = (id?: string | null) => id ? all.find(a => a.id === id) : undefined
  const sire = find(animal.sire_id)
  const dam  = find(animal.dam_id)

  // Grandparents — from registered animals if parent is in app, otherwise from external name fields
  const sireGS = find(sire?.sire_id)
  const sireGD = find(sire?.dam_id)
  const damGS  = find(dam?.sire_id)
  const damGD  = find(dam?.dam_id)

  // External grandparent names — used when parent is external (no sire_id/dam_id)
  const sireGSExt = sire ? (sire.sire_external_name ?? undefined) : (animal.sire_gs_external_name ?? undefined)
  const sireGDExt = sire ? (sire.dam_external_name  ?? undefined) : (animal.sire_gd_external_name ?? undefined)
  const damGSExt  = dam  ? (dam.sire_external_name  ?? undefined) : (animal.dam_gs_external_name  ?? undefined)
  const damGDExt  = dam  ? (dam.dam_external_name   ?? undefined) : (animal.dam_gd_external_name  ?? undefined)

  // Grandparent slots are editable whenever the parent is not an in-app animal
  const sireParentIsExternal = !sire
  const damParentIsExternal  = !dam

  // ── Great-grandparents ──
  // Resolution per slot (grandparent g, side s/d):
  //  1. grandparent is an animal in the app -> its sire/dam (read-only here, edited on its own page)
  //  2. parent is in the app (grandparent external) -> parent's own grandparent fields (edits the parent)
  //  3. parent external -> stored on this animal in ggp_external_names
  const grand: Record<GKey, { animal?: Animal; ext?: string; parent?: Animal; role: 'sire' | 'dam' }> = {
    sire_gs: { animal: sireGS, ext: sireGSExt, parent: sire, role: 'sire' },
    sire_gd: { animal: sireGD, ext: sireGDExt, parent: sire, role: 'dam' },
    dam_gs:  { animal: damGS,  ext: damGSExt,  parent: dam,  role: 'sire' },
    dam_gd:  { animal: damGD,  ext: damGDExt,  parent: dam,  role: 'dam' },
  }

  const resolveGgp = (g: GKey, side: 's' | 'd'): { animal?: Animal; ext?: string; editable: boolean } => {
    const gp = grand[g]
    if (gp.animal) {
      const id  = side === 's' ? gp.animal.sire_id : gp.animal.dam_id
      const ext = side === 's' ? gp.animal.sire_external_name : gp.animal.dam_external_name
      return { animal: find(id), ext: ext ?? undefined, editable: false }
    }
    if (gp.parent) return { ext: gp.parent[ggpField(gp.role, side)] ?? undefined, editable: true }
    return { ext: animal.ggp_external_names?.[`${g}_${side}`] ?? undefined, editable: true }
  }

  const [ggpOpen, setGgpOpen]     = useState(false)
  const [ggpPicker, setGgpPicker] = useState<GgpTarget | null>(null)
  const ggpKnown = G_KEYS
    .flatMap(g => (['s', 'd'] as const).map(side => resolveGgp(g, side)))
    .filter(x => x.animal || x.ext).length

  const handleGgpSelect = (selected: Animal | null, extName: string) => {
    if (!ggpPicker) return
    const { g, side } = ggpPicker
    const name = selected?.name || extName || null
    const gp = grand[g]
    let update: Partial<Animal> & { id: string }
    if (gp.parent) {
      update = { id: gp.parent.id, [ggpField(gp.role, side)]: name } as Partial<Animal> & { id: string }
    } else {
      const next = { ...(animal.ggp_external_names ?? {}) }
      if (name) next[`${g}_${side}`] = name
      else delete next[`${g}_${side}`]
      update = { id: animal.id, ggp_external_names: next }
    }
    setSaveError(null)
    updateAnimal.mutate(update, { onError: (e) => setSaveError(errMsg(e)) })
    setGgpPicker(null)
  }

  const offspring = all.filter(a => a.sire_id === animal.id || a.dam_id === animal.id)

  const handleSelect = (selected: Animal | null, extName: string) => {
    if (!picker) return
    const update: Partial<Animal> & { id: string } = { id: animal.id }

    if (picker === 'sire') {
      update.sire_id = selected?.id ?? undefined
      update.sire_external_name = selected ? undefined : (extName || undefined)
    } else if (picker === 'dam') {
      update.dam_id = selected?.id ?? undefined
      update.dam_external_name = selected ? undefined : (extName || undefined)
    } else if (picker === 'sire_gs') {
      update.sire_gs_external_name = selected?.name || extName || undefined
    } else if (picker === 'sire_gd') {
      update.sire_gd_external_name = selected?.name || extName || undefined
    } else if (picker === 'dam_gs') {
      update.dam_gs_external_name = selected?.name || extName || undefined
    } else if (picker === 'dam_gd') {
      update.dam_gd_external_name = selected?.name || extName || undefined
    }

    setSaveError(null)
    updateAnimal.mutate(update as Partial<Animal> & { id: string }, {
      onError: (e) => setSaveError(errMsg(e)),
    })
    setPicker(null)
  }

  return (
    <div className="p-3 pb-8 space-y-2.5">
      <p className="text-[11px] px-1" style={{ color: '#A08888' }}>
        Pulsa "Añadir" o "Cambiar" para editar · Los abuelos se muestran automáticamente si el padre/madre está en la app
      </p>
      {saveError && (
        <p className="text-[13px] rounded-xl px-4 py-2.5"
           style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{saveError}</p>
      )}

      {/* TREE */}
      <div className="rounded-2xl p-3 space-y-0"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>

        {/* Abuelos row */}
        <div className="flex gap-1.5">
          <TreeNode label="Abuelo pat."
                    animal={sireGS} extName={sireGSExt}
                    onEdit={sireParentIsExternal ? () => setPicker('sire_gs') : undefined} />
          <TreeNode label="Abuela pat."
                    animal={sireGD} extName={sireGDExt}
                    onEdit={sireParentIsExternal ? () => setPicker('sire_gd') : undefined} />
          <TreeNode label="Abuelo mat."
                    animal={damGS} extName={damGSExt}
                    onEdit={damParentIsExternal ? () => setPicker('dam_gs') : undefined} />
          <TreeNode label="Abuela mat."
                    animal={damGD} extName={damGDExt}
                    onEdit={damParentIsExternal ? () => setPicker('dam_gd') : undefined} />
        </div>

        {/* Connector 4→2 */}
        <div className="relative h-5 mx-1">
          <div className="absolute left-[12.5%] right-[75%] top-1/2 h-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
          <div className="absolute left-[12.5%] top-0 bottom-1/2 w-px"   style={{ background: 'rgba(123,31,58,0.22)' }} />
          <div className="absolute left-[25%] top-1/2 bottom-0 w-px"     style={{ background: 'rgba(123,31,58,0.22)' }} />
          <div className="absolute left-[75%] right-[12.5%] top-1/2 h-px" style={{ background: 'rgba(123,31,58,0.22)' }} />
          <div className="absolute right-[12.5%] top-0 bottom-1/2 w-px"  style={{ background: 'rgba(123,31,58,0.22)' }} />
          <div className="absolute right-[25%] top-1/2 bottom-0 w-px"    style={{ background: 'rgba(123,31,58,0.22)' }} />
        </div>

        {/* Parents */}
        <div className="flex gap-2">
          <TreeNode label="Padre (sire)" animal={sire} iconSize={52}
                    extName={animal.sire_external_name ?? undefined}
                    onEdit={() => setPicker('sire')}
                    onNav={sire ? () => navigate(`/animales/${sire.id}`) : undefined} />
          <TreeNode label="Madre (dam)"  animal={dam} iconSize={52}
                    extName={animal.dam_external_name ?? undefined}
                    onEdit={() => setPicker('dam')}
                    onNav={dam ? () => navigate(`/animales/${dam.id}`) : undefined} />
        </div>

        {/* Edit buttons */}
        <div className="flex gap-2 mt-2">
          <button onClick={() => setPicker('sire')} className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
                  style={{ background: '#F5E8EC', color: '#7B1F3A' }}>
            {sire || animal.sire_external_name ? 'Cambiar padre' : '+ Añadir padre'}
          </button>
          <button onClick={() => setPicker('dam')} className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
                  style={{ background: '#F5E8EC', color: '#7B1F3A' }}>
            {dam || animal.dam_external_name ? 'Cambiar madre' : '+ Añadir madre'}
          </button>
        </div>

        {/* Connector to subject */}
        <div className="flex justify-center h-4 mt-0">
          <div className="w-px" style={{ background: '#7B1F3A' }} />
        </div>
        <div className="flex px-8">
          <TreeNode label="Este animal" animal={animal} isSubject iconSize={56} />
        </div>
      </div>

      {/* GREAT-GRANDPARENTS (collapsible) */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <button onClick={() => setGgpOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left">
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Bisabuelos · {ggpKnown}/8
          </p>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#A08888" strokeWidth="2" strokeLinecap="round"
               style={{ transform: ggpOpen ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
        {ggpOpen && (
          <div style={{ borderTop: '1px solid rgba(123,31,58,0.11)' }}>
            {G_KEYS.map((g, gi) => {
              const gp = grand[g]
              const gName = gp.animal?.name ?? gp.ext
              return (
                <div key={g} className="px-3.5 py-2.5"
                     style={{ borderBottom: gi < G_KEYS.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#7B1F3A' }}>
                    Padres de {G_LABELS[g]}{gName ? ` · ${gName}` : ''}
                  </p>
                  {(['s', 'd'] as const).map(side => {
                    const ggp = resolveGgp(g, side)
                    const name = ggp.animal?.name ?? ggp.ext
                    const target = ggp.animal
                    const onClick = target
                      ? () => navigate(`/animales/${target.id}`)
                      : ggp.editable ? () => setGgpPicker({ g, side }) : undefined
                    return (
                      <button key={side} onClick={onClick} disabled={!onClick}
                              className="w-full flex items-center gap-2 py-1.5 text-left">
                        {ggp.animal
                          ? <Azulejo animal={ggp.animal} size={36} borderRadius={9} />
                          : name ? <ExternalTile size={36} /> : null}
                        <span className="text-[11px] w-[62px] shrink-0" style={{ color: '#A08888' }}>
                          {side === 's' ? 'Bisabuelo' : 'Bisabuela'}
                        </span>
                        <span className="flex-1 min-w-0 text-[13px] truncate"
                              style={{
                                color: name ? '#1C1010' : '#A08888',
                                fontWeight: name ? 600 : 400,
                                fontStyle: name ? 'normal' : 'italic',
                              }}>
                          {name ?? 'Desconocido'}
                        </span>
                        <span className="text-[11px] font-semibold shrink-0" style={{ color: '#7B1F3A' }}>
                          {target ? 'Ver ›' : ggp.editable ? (name ? 'Cambiar ›' : 'Añadir ›') : ''}
                        </span>
                      </button>
                    )
                  })}
                  {gp.animal && (
                    <p className="text-[10px] italic mt-0.5" style={{ color: '#A08888' }}>
                      Se editan en la genealogía de {gp.animal.name}
                    </p>
                  )}
                  {!gp.animal && gp.parent && (
                    <p className="text-[10px] italic mt-0.5" style={{ color: '#A08888' }}>
                      Se guardan también en la ficha de {gp.parent.name}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* OFFSPRING */}
      {offspring.length > 0 ? (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
              Crías registradas · {offspring.length}
            </p>
          </div>
          {offspring.map((o, i) => (
            <button key={o.id} onClick={() => navigate(`/animales/${o.id}`)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-[#F5E8EC]"
                    style={{ borderBottom: i < offspring.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
              <Azulejo animal={o} size={40} borderRadius={10} custody={o.status === 'custodia'} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate" style={{ color: '#1C1010' }}>{o.name}</p>
                <p className="text-[11px]" style={{ color: '#6B5555' }}>
                  {[o.breed, ageStr(o.birth_date), o.sex].filter(Boolean).join(' · ')}
                </p>
              </div>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#A08888" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState icon="🐴" title="Sin crías registradas"
                    subtitle="Las crías aparecerán al vincular la genealogía" />
      )}

      {ggpPicker !== null && (
        <AnimalPicker
          open
          onClose={() => setGgpPicker(null)}
          onSelect={handleGgpSelect}
          excludeId={animal.id}
          title={`${ggpPicker.side === 's' ? 'Bisabuelo' : 'Bisabuela'} · padres de ${G_LABELS[ggpPicker.g]}`}
          sexFilter={ggpPicker.side === 's' ? MALE : FEMALE}
        />
      )}

      {picker !== null && (
        <AnimalPicker
          open
          onClose={() => setPicker(null)}
          onSelect={handleSelect}
          excludeId={animal.id}
          title={PICKER_TITLES[picker]}
          sexFilter={SEX_FILTER[picker]}
        />
      )}
    </div>
  )
}
