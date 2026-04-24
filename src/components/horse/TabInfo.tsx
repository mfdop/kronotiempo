import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, InfoRow } from '../ui'
import { useUpdateAnimal } from '../../hooks/useAnimals'
import type { Animal } from '../../types'
import { format, parseISO, differenceInYears, differenceInMonths } from 'date-fns'
import { es } from 'date-fns/locale'

function ageStr(birth: string | undefined) {
  if (!birth) return undefined
  const d = parseISO(birth)
  const y = differenceInYears(new Date(), d)
  if (y >= 2) return `${y} años · ${format(d, "d MMM yyyy", { locale: es })}`
  return `${differenceInMonths(new Date(), d)} meses · ${format(d, "d MMM yyyy", { locale: es })}`
}


export default function TabInfo({ animal }: { animal: Animal }) {
  const navigate     = useNavigate()
  const updateAnimal = useUpdateAnimal()
  const [editing, setEditing]   = useState(false)
  const [appraisal, setAppraisal] = useState(animal.appraisal_value?.toString() ?? '')
  const [notes, setNotes]       = useState(animal.private_notes ?? '')
  const [iosAlbum, setIosAlbum] = useState(animal.ios_album ?? '')

  const save = () => {
    updateAnimal.mutate({
      id: animal.id,
      appraisal_value: appraisal ? parseFloat(appraisal) : undefined,
      private_notes: notes,
      ios_album: iosAlbum,
    })
    setEditing(false)
  }

  return (
    <div className="p-3 space-y-2.5 pb-8">

      {/* IDENTIFICATION */}
      <Card>
        <CardHeader title="Identificación" action={editing ? { label: 'Guardar', onClick: save } : { label: 'Editar', onClick: () => setEditing(true) }} />
        <InfoRow first label="Nombre"     value={animal.name} />
        <InfoRow label="Apodo"            value={animal.alias} />
        <InfoRow label="Sexo"             value={animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1)} />
        <InfoRow label="Raza"             value={animal.breed} />
        <InfoRow label="Fecha nacimiento" value={ageStr(animal.birth_date)} />
        <InfoRow label="Nº registro"      value={animal.registry_number} />
        <InfoRow label="Chip"             value={animal.chip} />
        <InfoRow label="Estado"           value={
          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#EAF3EC', color: '#2E6B3E' }}>
            {animal.status === 'custodia' ? 'En custodia' : animal.status.charAt(0).toUpperCase() + animal.status.slice(1)}
          </span>
        } />
      </Card>

      {/* LOCATION */}
      <Card>
        <CardHeader title="Ubicación" />
        <InfoRow first label="Pradera actual"
          value={
            <button onClick={() => {/* meadow selector — Sesión 7 */}}
                    className="text-[12px] font-semibold flex items-center gap-1"
                    style={{ color: '#2E6B3E' }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#2E6B3E' }} />
              {animal.meadow_id ? 'Ver pradera' : 'Sin asignar'}
              <span style={{ color: '#A08888' }}>⌄</span>
            </button>
          }
        />
        <InfoRow label="Historial de praderas"
          value={<span style={{ color: '#7B1F3A' }}>Ver movimientos ›</span>} />
      </Card>

      {/* GENEALOGY QUICK */}
      <Card>
        <CardHeader title="Genealogía" action={{ label: 'Ver árbol', onClick: () => {} }} />
        <InfoRow first label="Padre (sire)"
          value={
            animal.sire_id
              ? <button onClick={() => navigate(`/animales/${animal.sire_id}`)}
                        className="text-[13px] font-semibold" style={{ color: '#7B1F3A' }}>
                  Ver ficha ›
                </button>
              : (animal.sire_external_name ?? undefined)
          }
        />
        <InfoRow label="Madre (dam)"
          value={
            animal.dam_id
              ? <button onClick={() => navigate(`/animales/${animal.dam_id}`)}
                        className="text-[13px] font-semibold" style={{ color: '#7B1F3A' }}>
                  Ver ficha ›
                </button>
              : (animal.dam_external_name ?? undefined)
          }
        />
      </Card>

      {/* ECONOMICS */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="grid grid-cols-2"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <div className="p-4" style={{ borderRight: '1px solid rgba(123,31,58,0.11)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Coste</p>
            <p className="text-[20px] font-bold" style={{ color: '#1C1010' }}>
              {animal.purchase_price ? `${animal.purchase_price.toLocaleString('es-ES')} €` : '—'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: '#6B5555' }}>
              {animal.purchase_date ? format(parseISO(animal.purchase_date), "MMM yyyy", { locale: es }) : 'Crianza propia'}
            </p>
          </div>
          <div className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Tasación</p>
            {editing ? (
              <input
                value={appraisal}
                onChange={e => setAppraisal(e.target.value)}
                type="number"
                placeholder="0"
                className="w-full rounded-lg px-2 py-1 text-[16px] font-bold outline-none"
                style={{ border: '1.5px solid #7B1F3A', color: '#2E6B3E' }}
              />
            ) : (
              <p className="text-[20px] font-bold" style={{ color: '#2E6B3E' }}>
                {animal.appraisal_value ? `${animal.appraisal_value.toLocaleString('es-ES')} €` : '—'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* IOS ALBUM */}
      <Card>
        <CardHeader title="Álbum de fotos iOS" />
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: '#E8F0F8' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                 stroke="#1A4F7A" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px]" style={{ color: '#A08888' }}>Nombre del álbum en el carrete</p>
            {editing ? (
              <input value={iosAlbum} onChange={e => setIosAlbum(e.target.value)}
                     placeholder="Ej: Relámpago 2024"
                     className="w-full text-[13px] font-semibold outline-none mt-0.5"
                     style={{ color: '#1A4F7A', background: 'transparent', border: 'none' }} />
            ) : (
              <p className="text-[13px] font-semibold mt-0.5"
                 style={{ color: iosAlbum ? '#1A4F7A' : '#A08888', fontStyle: iosAlbum ? 'normal' : 'italic' }}>
                {iosAlbum || 'Sin álbum asignado'}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* PRIVATE NOTES */}
      <div className="rounded-2xl p-4" style={{ background: '#FAF0EA', border: '1px solid rgba(196,112,74,0.2)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#C4704A' }}>
          Notas privadas
        </p>
        {editing ? (
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={3} placeholder="Solo visibles para ti..."
                    className="w-full bg-transparent text-[13px] outline-none resize-none"
                    style={{ color: '#1C1010', lineHeight: 1.6 }} />
        ) : (
          <p className="text-[13px]" style={{ color: notes ? '#1C1010' : '#A08888', fontStyle: notes ? 'normal' : 'italic', lineHeight: 1.6 }}>
            {notes || 'Sin notas'}
          </p>
        )}
      </div>

    </div>
  )
}
