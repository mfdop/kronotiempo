import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUpdateAnimal, useDeleteAnimal } from '../../hooks/useAnimals'
import { useMeadow, useAnimalMeadowHistory } from '../../hooks/useMeadows'
import { DeleteZone, BottomSheet } from '../ui'
import type { Animal } from '../../types'
import { format, parseISO, differenceInYears, differenceInMonths } from 'date-fns'
import { es } from 'date-fns/locale'

const BREEDS = ['Appaloosa','PRE','PRD','Anglo-Árabe','Árabe','Quarter Horse','Paint Horse','Lusitano','Hannoveriano','Otra']
const SEXES  = [
  { value: 'semental', label: 'Semental' },
  { value: 'yegua',    label: 'Yegua' },
  { value: 'potro',    label: 'Potro' },
  { value: 'potra',    label: 'Potra' },
  { value: 'castrado', label: 'Castrado' },
]
const STATUS_OPTS = [
  { value: 'activo',    label: 'Activo' },
  { value: 'vendido',   label: 'Vendido' },
  { value: 'fallecido', label: 'Fallecido' },
  { value: 'cedido',    label: 'Cedido' },
]

function ageStr(birth: string | undefined) {
  if (!birth) return undefined
  const d = parseISO(birth)
  const y = differenceInYears(new Date(), d)
  if (y >= 2) return `${y} años · ${format(d, "d MMM yyyy", { locale: es })}`
  const m = differenceInMonths(new Date(), d)
  return `${m} meses · ${format(d, "d MMM yyyy", { locale: es })}`
}

const inp = {
  className: "w-full rounded-xl px-3 py-2.5 text-[13px] outline-none",
  style: {
    background: '#F7F3EE',
    border: '1.5px solid rgba(123,31,58,0.22)',
    color: '#1C1010',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  } as React.CSSProperties,
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
       style={{ color: '#A08888' }}>{children}</p>
  )
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      <div className="flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>{title}</p>
        {action}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  )
}

export default function TabInfo({ animal }: { animal: Animal }) {
  const navigate = useNavigate()
  const updateAnimal = useUpdateAnimal()
  const deleteAnimal = useDeleteAnimal()
  const { data: meadow }   = useMeadow(animal.meadow_id ?? undefined)
  const { data: history = [] } = useAnimalMeadowHistory(animal.id)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Local editable state — mirror all fields
  const [f, setF] = useState({
    name:            animal.name            ?? '',
    alias:           animal.alias           ?? '',
    sex:             animal.sex             ?? 'yegua',
    breed:           animal.breed           ?? '',
    birth_date:      animal.birth_date      ?? '',
    registry_number: animal.registry_number ?? '',
    chip:            animal.chip            ?? '',
    status:          animal.status          ?? 'activo',
    appraisal_value: animal.appraisal_value?.toString() ?? '',
    purchase_price:  animal.purchase_price?.toString()  ?? '',
    purchase_date:   animal.purchase_date   ?? '',
    purchase_origin: animal.purchase_origin ?? '',
    ios_album:       animal.ios_album       ?? '',
    description:     animal.description     ?? '',
    private_notes:   animal.private_notes   ?? '',
    custody_owner_name:  animal.custody_owner_name  ?? '',
    custody_owner_phone: animal.custody_owner_phone ?? '',
  })
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true); setError(null)
    try {
      await updateAnimal.mutateAsync({
        id: animal.id,
        name:            f.name.trim(),
        alias:           f.alias    || null,
        sex:             f.sex as Animal['sex'],
        breed:           f.breed    || null,
        birth_date:      f.birth_date   || null,
        registry_number: f.registry_number || null,
        chip:            f.chip     || null,
        status:          f.status as Animal['status'],
        appraisal_value: f.appraisal_value ? parseFloat(f.appraisal_value) : null,
        purchase_price:  f.purchase_price  ? parseFloat(f.purchase_price)  : null,
        purchase_date:   f.purchase_date   || null,
        purchase_origin: f.purchase_origin || null,
        ios_album:       f.ios_album       || null,
        description:     f.description     || null,
        private_notes:   f.private_notes   || null,
        custody_owner_name:  f.custody_owner_name  || null,
        custody_owner_phone: f.custody_owner_phone || null,
      } as Partial<Animal> & { id: string })
      setEditing(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  const isCustodia = animal.status === 'custodia'

  const editAction = editing ? (
    <div className="flex gap-2">
      <button onClick={() => { setEditing(false); setError(null) }}
              className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ border: '1.5px solid rgba(123,31,58,0.22)', color: '#6B5555' }}>
        Cancelar
      </button>
      <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-xl text-[12px] font-bold text-white"
              style={{ background: '#7B1F3A', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  ) : (
    <button onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
            style={{ background: '#F5E8EC', color: '#7B1F3A' }}>
      Editar
    </button>
  )

  return (
    <>
    <div className="p-3 pb-8 space-y-3">

      {error && (
        <p className="text-[13px] rounded-xl px-4 py-2.5"
           style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{error}</p>
      )}

      {/* IDENTIFICACIÓN — edit button in header */}
      <Section title="Identificación" action={editAction}>
        <div>
          <Label>Nombre *</Label>
          {editing
            ? <input value={f.name} onChange={e => set('name', e.target.value)} {...inp} />
            : <p className="text-[14px] font-semibold" style={{ color: '#1C1010' }}>{animal.name}</p>}
        </div>
        <div>
          <Label>Apodo / alias</Label>
          {editing
            ? <input value={f.alias} onChange={e => set('alias', e.target.value)} placeholder="Opcional" {...inp} />
            : <p className="text-[13px]" style={{ color: animal.alias ? '#1C1010' : '#A08888', fontStyle: animal.alias ? 'normal' : 'italic' }}>{animal.alias || 'Sin apodo'}</p>}
        </div>
        <div>
          <Label>Sexo</Label>
          {editing ? (
            <div className="flex gap-2 flex-wrap">
              {SEXES.map(s => (
                <button key={s.value} onClick={() => set('sex', s.value)}
                        className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                        style={{
                          background: f.sex === s.value ? '#7B1F3A' : '#F7F3EE',
                          color: f.sex === s.value ? '#fff' : '#6B5555',
                          border: `1.5px solid ${f.sex === s.value ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                        }}>{s.label}</button>
              ))}
            </div>
          ) : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{SEXES.find(s => s.value === animal.sex)?.label ?? animal.sex}</p>}
        </div>
        <div>
          <Label>Raza</Label>
          {editing
            ? <select value={f.breed} onChange={e => set('breed', e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none appearance-none"
                      style={inp.style}>{BREEDS.map(b => <option key={b}>{b}</option>)}</select>
            : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{animal.breed || '—'}</p>}
        </div>
        <div>
          <Label>Fecha de nacimiento</Label>
          {editing
            ? <input type="date" value={f.birth_date} onChange={e => set('birth_date', e.target.value)} {...inp} />
            : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{ageStr(animal.birth_date) ?? '—'}</p>}
        </div>
        <div>
          <Label>Nº registro / pasaporte</Label>
          {editing
            ? <input value={f.registry_number} onChange={e => set('registry_number', e.target.value)} placeholder="ESP-APP-2020-00001" {...inp} />
            : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{animal.registry_number || '—'}</p>}
        </div>
        <div>
          <Label>Chip (microchip)</Label>
          {editing
            ? <input value={f.chip} onChange={e => set('chip', e.target.value)} placeholder="724 0000 0000000" {...inp} />
            : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{animal.chip || '—'}</p>}
        </div>
        <div>
          <Label>Estado</Label>
          {editing ? (
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTS.map(s => (
                <button key={s.value} onClick={() => set('status', s.value)}
                        className="px-3 py-2 rounded-xl text-[12px] font-semibold"
                        style={{
                          background: f.status === s.value ? '#7B1F3A' : '#F7F3EE',
                          color: f.status === s.value ? '#fff' : '#6B5555',
                          border: `1.5px solid ${f.status === s.value ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                        }}>{s.label}</button>
              ))}
            </div>
          ) : (
            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full inline-block"
                  style={{ background: '#EAF3EC', color: '#2E6B3E' }}>
              {isCustodia ? 'En custodia' : (STATUS_OPTS.find(s => s.value === animal.status)?.label ?? animal.status)}
            </span>
          )}
        </div>
      </Section>

      {/* CUSTODIA */}
      {isCustodia && (
        <Section title="Propietario (custodia)">
          <div>
            <Label>Nombre del propietario</Label>
            {editing
              ? <input value={f.custody_owner_name} onChange={e => set('custody_owner_name', e.target.value)} {...inp} />
              : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{animal.custody_owner_name || '—'}</p>}
          </div>
          <div>
            <Label>Teléfono del propietario</Label>
            {editing
              ? <input type="tel" value={f.custody_owner_phone} onChange={e => set('custody_owner_phone', e.target.value)} {...inp} />
              : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{animal.custody_owner_phone || '—'}</p>}
          </div>
        </Section>
      )}

      {/* UBICACIÓN */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Ubicación</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px]" style={{ color: '#6B5555' }}>Pradera actual</span>
          <span className="text-[12px] font-semibold flex items-center gap-1.5"
                style={{ color: animal.meadow_id ? '#2E6B3E' : '#A08888' }}>
            {animal.meadow_id && <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#2E6B3E' }} />}
            {animal.meadow_id ? (meadow?.name ?? '…') : 'Sin asignar'}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderTop: '1px solid rgba(123,31,58,0.11)' }}>
          <span className="text-[13px]" style={{ color: '#6B5555' }}>Ver en parcela</span>
          {animal.meadow_id ? (
            <button onClick={() => navigate(`/parcelas/${animal.meadow_id}`)}
                    className="text-[13px] font-semibold"
                    style={{ color: '#7B1F3A' }}>Ver ›</button>
          ) : (
            <span className="text-[13px]" style={{ color: '#A08888' }}>—</span>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderTop: '1px solid rgba(123,31,58,0.11)' }}>
          <span className="text-[13px]" style={{ color: '#6B5555' }}>Historial de praderas</span>
          <button onClick={() => setHistoryOpen(true)}
                  className="text-[13px] font-semibold"
                  style={{ color: '#7B1F3A' }}>
            {history.length > 0 ? `Ver (${history.length}) ›` : 'Ver ›'}
          </button>
        </div>
      </div>

      {/* ECONOMÍA */}
      <Section title="Economía">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: '#F7F3EE' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Coste compra</p>
            {editing
              ? <input type="number" value={f.purchase_price} onChange={e => set('purchase_price', e.target.value)}
                       placeholder="0" className="w-full bg-transparent text-[16px] font-bold outline-none"
                       style={{ color: '#1C1010' }} />
              : <p className="text-[16px] font-bold" style={{ color: '#1C1010' }}>
                  {animal.purchase_price ? `${animal.purchase_price.toLocaleString('es-ES')} €` : '—'}
                </p>}
          </div>
          <div className="rounded-xl p-3" style={{ background: '#EAF3EC' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: '#A08888' }}>Tasación actual</p>
            {editing
              ? <input type="number" value={f.appraisal_value} onChange={e => set('appraisal_value', e.target.value)}
                       placeholder="0" className="w-full bg-transparent text-[16px] font-bold outline-none"
                       style={{ color: '#2E6B3E' }} />
              : <p className="text-[16px] font-bold" style={{ color: '#2E6B3E' }}>
                  {animal.appraisal_value ? `${animal.appraisal_value.toLocaleString('es-ES')} €` : '—'}
                </p>}
          </div>
        </div>
        {(editing || animal.purchase_origin || animal.purchase_date) && (
          <>
            <div>
              <Label>Origen / vendedor</Label>
              {editing
                ? <input value={f.purchase_origin} onChange={e => set('purchase_origin', e.target.value)}
                         placeholder="Yeguada o nombre del vendedor" {...inp} />
                : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{animal.purchase_origin || '—'}</p>}
            </div>
            <div>
              <Label>Fecha de compra</Label>
              {editing
                ? <input type="date" value={f.purchase_date} onChange={e => set('purchase_date', e.target.value)} {...inp} />
                : <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
                    {animal.purchase_date ? format(parseISO(animal.purchase_date), "d MMM yyyy", { locale: es }) : '—'}
                  </p>}
            </div>
          </>
        )}
      </Section>

      {/* ÁLBUM IOS */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F0F8' }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1A4F7A" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[11px]" style={{ color: '#A08888' }}>Álbum de fotos en iOS</p>
            {editing
              ? <input value={f.ios_album} onChange={e => set('ios_album', e.target.value)}
                       placeholder="Ej: Relámpago 2024"
                       className="w-full text-[13px] font-semibold outline-none mt-0.5 bg-transparent"
                       style={{ color: '#1A4F7A', border: 'none' }} />
              : <p className="text-[13px] font-semibold mt-0.5"
                   style={{ color: f.ios_album ? '#1A4F7A' : '#A08888', fontStyle: f.ios_album ? 'normal' : 'italic' }}>
                  {animal.ios_album || 'Sin álbum asignado'}
                </p>}
          </div>
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      <Section title="Descripción">
        {editing
          ? <textarea value={f.description} onChange={e => set('description', e.target.value)}
                      rows={3} placeholder="Descripción del animal..."
                      className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                      style={inp.style} />
          : <p className="text-[13px]" style={{ color: animal.description ? '#1C1010' : '#A08888',
                fontStyle: animal.description ? 'normal' : 'italic', lineHeight: 1.6 }}>
              {animal.description || 'Sin descripción'}
            </p>}
      </Section>

      {/* NOTAS PRIVADAS */}
      <div className="rounded-2xl p-4" style={{ background: '#FAF0EA', border: '1px solid rgba(196,112,74,0.2)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#C4704A' }}>Notas privadas</p>
        {editing
          ? <textarea value={f.private_notes} onChange={e => set('private_notes', e.target.value)}
                      rows={3} placeholder="Solo visibles para ti..."
                      className="w-full bg-transparent text-[13px] outline-none resize-none"
                      style={{ color: '#1C1010', lineHeight: 1.6 }} />
          : <p className="text-[13px]" style={{ color: animal.private_notes ? '#1C1010' : '#A08888',
                fontStyle: animal.private_notes ? 'normal' : 'italic', lineHeight: 1.6 }}>
              {animal.private_notes || 'Sin notas'}
            </p>}
      </div>

      {/* ZONA DE PELIGRO */}
      <div className="pt-2">
        <DeleteZone
          label={animal.name}
          onDelete={() => deleteAnimal.mutate(animal.id, { onSuccess: () => navigate('/animales') })}
          isPending={deleteAnimal.isPending}
        />
      </div>

    </div>

    {/* HISTORIAL DE PRADERAS — popup */}

    <BottomSheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Historial de praderas">
      {history.length === 0 ? (
        <p className="text-[13px] text-center py-8 italic" style={{ color: '#A08888' }}>
          Sin movimientos registrados
        </p>
      ) : (
        <div className="space-y-2 pb-4">
          {history.map((entry, i) => {
            const meadowName  = entry.meadows?.name        ?? 'Parcela desconocida'
            const meadowEmoji = entry.meadows?.icon_emoji  ?? '🌿'
            const enteredFmt  = format(parseISO(entry.entered_at), "d MMM yyyy", { locale: es })
            const leftFmt     = entry.left_at
              ? format(parseISO(entry.left_at), "d MMM yyyy", { locale: es })
              : null
            const isCurrent   = !entry.left_at && i === 0

            return (
              <div key={entry.id}
                   className="flex items-start gap-3 rounded-2xl px-4 py-3"
                   style={{
                     background: isCurrent ? '#EAF3EC' : '#fff',
                     border: `1px solid ${isCurrent ? 'rgba(46,107,62,0.2)' : 'rgba(123,31,58,0.11)'}`,
                   }}>
                <span className="text-[20px] shrink-0 mt-0.5">{meadowEmoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-semibold" style={{ color: '#1C1010' }}>{meadowName}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: '#2E6B3E', color: '#fff' }}>Actual</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[11px]" style={{ color: '#6B5555' }}>
                      Entrada: <span className="font-semibold">{enteredFmt}</span>
                    </span>
                    {leftFmt && (
                      <>
                        <span style={{ color: '#A08888', fontSize: 10 }}>→</span>
                        <span className="text-[11px]" style={{ color: '#6B5555' }}>
                          Salida: <span className="font-semibold">{leftFmt}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </BottomSheet>
    </>
  )
}
