import { errMsg } from '../lib/errors'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateAnimal } from '../hooks/useAnimals'
import { useAuth } from '../hooks/useAuth'
import { Field, GranateButton, GhostButton, inputStyle } from '../components/ui'
import { Azulejo, AzulejoCustomizer } from '../components/horse/Azulejo'
import type { Animal } from '../types'

const BREEDS = ['Appaloosa','PRE','PRD','Anglo-Árabe','Árabe','Quarter Horse','Paint Horse','Lusitano','Hannoveriano','Otra']
const SEXES  = [
  { value: 'semental', label: 'Semental' },
  { value: 'yegua',    label: 'Yegua' },
  { value: 'potro',    label: 'Potro' },
  { value: 'potra',    label: 'Potra' },
  { value: 'castrado', label: 'Castrado' },
]

const DEFAULT_AZULEJO: {
  azulejo_ink: string
  azulejo_bg: string
  azulejo_spot_ink: string
  coat_pattern: 'lisa' | 'pio' | 'appaloosa'
  coat_careto: boolean
  coat_cuatroalbo: boolean
} = {
  azulejo_ink:      '#4A2810',
  azulejo_bg:       '#F0E4D4',
  azulejo_spot_ink: '#1A100C',
  coat_pattern:     'lisa',
  coat_careto:      false,
  coat_cuatroalbo:  false,
}

export default function NuevoAnimalPage() {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const { mutateAsync, isPending } = useCreateAnimal()

  const [form, setForm] = useState({
    name: '',
    alias: '',
    sex: 'yegua',
    breed: 'Appaloosa',
    birth_date: '',
    registry_number: '',
    chip: '',
    status: 'activo',
    // custodia
    custody_owner_name: '',
    custody_owner_phone: '',
    // economics
    purchase_price: '',
    purchase_date: '',
    purchase_origin: '',
    // notes
    ios_album: '',
    description: '',
    private_notes: '',
  })

  const [azulejo, setAzulejo] = useState(DEFAULT_AZULEJO)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const [isCustodia, setIsCustodia] = useState(false)
  const [isComprado, setIsComprado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.sex)         { setError('El sexo es obligatorio'); return }
    setError(null)
    try {
      const payload = {
        ...form,
        ...azulejo,
        status: isCustodia ? 'custodia' : 'activo',
        owner_id: user!.id,
        birth_date: form.birth_date || null,
        purchase_price: isComprado && form.purchase_price ? parseFloat(form.purchase_price) : undefined,
        purchase_date: isComprado ? (form.purchase_date || null) : undefined,
        alias: form.alias || undefined,
        registry_number: form.registry_number || undefined,
        chip: form.chip || undefined,
        custody_owner_name: isCustodia ? (form.custody_owner_name || undefined) : undefined,
        custody_owner_phone: isCustodia ? (form.custody_owner_phone || undefined) : undefined,
        ios_album: form.ios_album || undefined,
        description: form.description || undefined,
        private_notes: form.private_notes || undefined,
        purchase_origin: isComprado ? (form.purchase_origin || undefined) : undefined,
      } as Omit<Animal, 'id' | 'created_at' | 'updated_at'>
      const animal = await mutateAsync(payload)
      navigate(`/animales/${animal.id}`, { replace: true })
    } catch (e: unknown) {
      setError(errMsg(e))
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* NAV */}
      <div className="shrink-0" style={{ background: '#7B1F3A' }}>
        <div className="safe-top" />
        <div className="flex items-center gap-3 px-4 py-2.5 pb-3.5">
          <button onClick={() => navigate(-1)} className="text-white/80 text-[13px] font-medium">‹ Atrás</button>
          <h1 className="text-[18px] font-bold text-white">Nuevo animal</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4" style={{ background: '#F7F3EE' }}>

        {/* AZULEJO preview */}
        <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <Azulejo animal={{ ...azulejo, status: isCustodia ? 'custodia' : 'activo' } as Animal}
                   size={72} borderRadius={18} custody={isCustodia}
                   onClick={() => setCustomizerOpen(true)} />
          <div>
            <p className="text-[14px] font-bold" style={{ color: '#1C1010' }}>
              {form.name || 'Nombre del animal'}
            </p>
            <button onClick={() => setCustomizerOpen(true)}
                    className="text-[12px] font-semibold mt-1"
                    style={{ color: '#7B1F3A' }}>
              Personalizar icono ›
            </button>
          </div>
        </div>

        {/* TIPO */}
        <div className="p-4 rounded-2xl space-y-1" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#A08888' }}>Tipo de animal</p>
          <div className="flex gap-2">
            {[
              { id: false, label: 'Propio / Crianza' },
              { id: true,  label: 'En custodia' },
            ].map(opt => (
              <button key={String(opt.id)} onClick={() => setIsCustodia(opt.id)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                      style={{
                        background: isCustodia === opt.id ? '#7B1F3A' : '#F7F3EE',
                        color: isCustodia === opt.id ? '#fff' : '#6B5555',
                        border: `1.5px solid ${isCustodia === opt.id ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                      }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* BASIC INFO */}
        <div className="p-4 rounded-2xl space-y-3" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Información básica</p>

          <Field label="Nombre *">
            <input value={form.name} onChange={e => set('name', e.target.value)}
                   placeholder="Nombre del animal" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>

          <Field label="Apodo / alias">
            <input value={form.alias} onChange={e => set('alias', e.target.value)}
                   placeholder="Opcional" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>

          <Field label="Sexo *">
            <div className="flex gap-2 flex-wrap">
              {SEXES.map(s => (
                <button key={s.value} onClick={() => set('sex', s.value)}
                        className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                        style={{
                          background: form.sex === s.value ? '#7B1F3A' : '#F7F3EE',
                          color: form.sex === s.value ? '#fff' : '#6B5555',
                          border: `1.5px solid ${form.sex === s.value ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                        }}>
                  {s.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Raza">
            <select value={form.breed} onChange={e => set('breed', e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none appearance-none"
                    style={{ ...inputStyle, background: '#F7F3EE' }}>
              {BREEDS.map(b => <option key={b}>{b}</option>)}
            </select>
          </Field>

          <Field label="Fecha de nacimiento">
            <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)}
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>

          <Field label="Nº registro / pasaporte">
            <input value={form.registry_number} onChange={e => set('registry_number', e.target.value)}
                   placeholder="ESP-APP-2020-00001" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>

          <Field label="Chip (microchip)">
            <input value={form.chip} onChange={e => set('chip', e.target.value)}
                   placeholder="724 0000 0000000" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>
        </div>

        {/* CUSTODIA FIELDS */}
        {isCustodia && (
          <div className="p-4 rounded-2xl space-y-3" style={{ background: '#E8F0F8', border: '1px solid rgba(26,79,122,0.2)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#1A4F7A' }}>Propietario (custodia)</p>
            <Field label="Nombre del propietario">
              <input value={form.custody_owner_name} onChange={e => set('custody_owner_name', e.target.value)}
                     placeholder="Nombre..." className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                     style={{ ...inputStyle, background: '#fff' }} />
            </Field>
            <Field label="Teléfono del propietario">
              <input type="tel" value={form.custody_owner_phone} onChange={e => set('custody_owner_phone', e.target.value)}
                     placeholder="600 000 000" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                     style={{ ...inputStyle, background: '#fff' }} />
            </Field>
          </div>
        )}

        {/* COMPRA */}
        {!isCustodia && (
          <div className="p-4 rounded-2xl space-y-3" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Adquisición</p>
              <div className="flex gap-2">
                {[{ id: false, label: 'Crianza propia' }, { id: true, label: 'Comprado' }].map(opt => (
                  <button key={String(opt.id)} onClick={() => setIsComprado(opt.id)}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                          style={{
                            background: isComprado === opt.id ? '#7B1F3A' : '#F7F3EE',
                            color: isComprado === opt.id ? '#fff' : '#6B5555',
                            border: `1.5px solid ${isComprado === opt.id ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                          }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {isComprado && (
              <>
                <Field label="Precio de compra (€)">
                  <input type="number" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)}
                         placeholder="0" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                         style={{ ...inputStyle, background: '#F7F3EE' }} />
                </Field>
                <Field label="Fecha de compra">
                  <input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)}
                         className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                         style={{ ...inputStyle, background: '#F7F3EE' }} />
                </Field>
                <Field label="Origen / vendedor">
                  <input value={form.purchase_origin} onChange={e => set('purchase_origin', e.target.value)}
                         placeholder="Yeguada o nombre del vendedor" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                         style={{ ...inputStyle, background: '#F7F3EE' }} />
                </Field>
              </>
            )}
          </div>
        )}

        {/* MISC */}
        <div className="p-4 rounded-2xl space-y-3" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Otros</p>
          <Field label="Álbum iOS (nombre del álbum de fotos)">
            <input value={form.ios_album} onChange={e => set('ios_album', e.target.value)}
                   placeholder="Ej: Relámpago 2024" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>
          <Field label="Descripción">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
                      rows={3} placeholder="Descripción libre..."
                      className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                      style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>
          <Field label="Notas privadas">
            <textarea value={form.private_notes} onChange={e => set('private_notes', e.target.value)}
                      rows={2} placeholder="Solo visibles para ti..."
                      className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                      style={{ ...inputStyle, background: '#F7F3EE' }} />
          </Field>
        </div>

        {error && (
          <p className="text-[13px] rounded-xl px-4 py-3" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{error}</p>
        )}

        <div className="space-y-2 pb-6">
          <GranateButton onClick={handleSubmit} disabled={isPending} fullWidth>
            {isPending ? 'Guardando...' : 'Guardar animal'}
          </GranateButton>
          <GhostButton onClick={() => navigate(-1)} fullWidth>Cancelar</GhostButton>
        </div>
      </div>

      <AzulejoCustomizer
        open={customizerOpen}
        onClose={() => setCustomizerOpen(false)}
        values={azulejo}
        onChange={vals => setAzulejo(prev => ({ ...prev, ...vals, coat_pattern: vals.coat_pattern as 'lisa' | 'pio' | 'appaloosa' }))}
        animalName={form.name || 'Animal'}
      />
    </div>
  )
}
