import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAnimal } from '../hooks/useAnimals'
import { Azulejo, AzulejoCustomizer } from '../components/horse/Azulejo'
import { useUpdateAnimal } from '../hooks/useAnimals'
import { InnerTabs, LoadingScreen, EmptyState } from '../components/ui'
import TabInfo from '../components/horse/TabInfo'
import TabGenealogy from '../components/horse/TabGenealogy'
import TabVientre from '../components/horse/TabVientre'
import TabCubriciones from '../components/horse/TabCubriciones'
import TabHerrado from '../components/horse/TabHerrado'
import TabSalud from '../components/horse/TabSalud'
import TabDocs from '../components/horse/TabDocs'
import TabGenetica from '../components/horse/TabGenetica'
import TabBalance from '../components/horse/TabBalance'
import TabManutencion from '../components/horse/TabManutencion'
import type { Animal } from '../types'

// Tabs differ by sex
function getTabs(animal: Animal): string[] {
  const base = ['Info', 'Genealogía']
  const isFemale = animal.sex === 'yegua' || animal.sex === 'potra'
  const isMale   = animal.sex === 'semental'
  if (isFemale) base.push('Vientre')
  if (isMale)   base.push('Cubriciones')
  base.push('Herrado', 'Salud', 'Genética', 'Docs', 'Balance')
  if (animal.status === 'custodia') base.push('Manutención')
  return base
}

export default function AnimalDetailPage() {
  const { id }      = useParams<{ id: string }>()
  const navigate    = useNavigate()
  const { data: animal, isLoading } = useAnimal(id)
  const updateAnimal = useUpdateAnimal()
  const [activeTab, setActiveTab] = useState(0)
  const [customizerOpen, setCustomizerOpen] = useState(false)

  if (isLoading) return <LoadingScreen />
  if (!animal)   return (
    <EmptyState title="Animal no encontrado"
                action={{ label: '‹ Volver', onClick: () => navigate(-1) }} />
  )

  const tabs = getTabs(animal)

  const handleAzulejoSave = (vals: {
    azulejo_ink: string; azulejo_bg: string
    coat_pattern: string; coat_careto: boolean; coat_cuatroalbo: boolean
  }) => {
    updateAnimal.mutate({
      id: animal.id,
      azulejo_ink: vals.azulejo_ink,
      azulejo_bg: vals.azulejo_bg,
      coat_careto: vals.coat_careto,
      coat_cuatroalbo: vals.coat_cuatroalbo,
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* HERO */}
      <div className="shrink-0"
           style={{ background: 'linear-gradient(165deg, #5C1629 0%, #7B1F3A 100%)' }}>
        <div className="safe-top" />
        <button onClick={() => navigate(-1)}
                className="px-4 pt-2 text-[13px] font-medium block"
                style={{ color: 'rgba(255,255,255,0.8)' }}>
          ‹ Animales
        </button>
        <div className="flex items-end gap-3.5 px-4 pb-0">
          <div className="mb-[-20px] relative z-10">
            <Azulejo
              animal={animal} size={72} borderRadius={20}
              custody={animal.status === 'custodia'}
              onClick={() => setCustomizerOpen(true)}
            />
          </div>
          <div className="pb-5">
            <h1 className="text-[22px] font-bold text-white tracking-tight">{animal.name}</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {[animal.breed, animal.sex].filter(Boolean).join(' · ')}
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
                {animal.status === 'custodia' ? 'En custodia' : 'Activo'}
              </span>
              {animal.status === 'custodia' && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl"
                      style={{ background: 'rgba(26,79,122,0.7)', color: '#fff' }}>
                  Custodia
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* INNER TABS */}
      <InnerTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ background: '#F7F3EE' }}>
        {tabs[activeTab] === 'Info'         && <TabInfo animal={animal} />}
        {tabs[activeTab] === 'Genealogía'   && <TabGenealogy animal={animal} />}
        {tabs[activeTab] === 'Vientre'      && <TabVientre animal={animal} />}
        {tabs[activeTab] === 'Cubriciones'  && <TabCubriciones animal={animal} />}
        {tabs[activeTab] === 'Herrado'      && <TabHerrado animal={animal} />}
        {tabs[activeTab] === 'Salud'        && <TabSalud animal={animal} />}
        {tabs[activeTab] === 'Docs'         && <TabDocs animal={animal} />}
        {tabs[activeTab] === 'Genética'     && <TabGenetica animal={animal} />}
        {tabs[activeTab] === 'Balance'      && <TabBalance animal={animal} />}
        {tabs[activeTab] === 'Manutención'  && <TabManutencion animal={animal} />}
        {!['Info','Genealogía','Vientre','Cubriciones','Herrado','Salud','Docs','Genética','Balance','Manutención'].includes(tabs[activeTab]) && (
          <EmptyState
            icon="🔧"
            title={`${tabs[activeTab]} — próximamente`}
            subtitle="Este módulo se desarrollará en la siguiente sesión"
          />
        )}
      </div>

      <AzulejoCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        values={{
          azulejo_ink:    animal.azulejo_ink    ?? '#4A2810',
          azulejo_bg:     animal.azulejo_bg     ?? '#F0E4D4',
          coat_pattern:   animal.coat_pattern   ?? 'lisa',
          coat_careto:    animal.coat_careto     ?? false,
          coat_cuatroalbo: animal.coat_cuatroalbo ?? false,
        }}
        onChange={handleAzulejoSave}
        animalName={animal.name}
      />
    </div>
  )
}
