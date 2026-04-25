import { useState } from 'react'
import {
  usePregnancies, useCreatePregnancy, useUpdatePregnancy,
  usePregnancyInterested, useCreatePregnancyInterested,
  usePregnancySale, useUpsertPregnancySale,
} from '../../hooks/useReproduction'
import { useAnimals } from '../../hooks/useAnimals'
import { ClientPicker } from '../ui/ClientPicker'
import type { ClientBasic } from '../ui/ClientPicker'
import { BottomSheet, EmptyState, LoadingScreen, Field, GranateButton, GhostButton } from '../ui'
import type { Animal, Pregnancy, PregnancyResult } from '../../types'
import { format, parseISO, addDays, differenceInDays, differenceInWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { PREGNANCY_DAYS } from '../../lib/constants'

// ─── HELPERS ─────────────────────────────────────────────────
const RESULT_LABELS: Record<PregnancyResult, string> = {
  gestante:   'Gestante',
  cria_viva:  'Cría viva',
  aborto:     'Aborto',
  gemelar:    'Gemelar',
  mortinato:  'Mortinato',
  no_prenada: 'No preñada',
}
const RESULT_COLORS: Record<PregnancyResult, { bg: string; color: string }> = {
  gestante:   { bg: '#E8F0F8', color: '#1A4F7A' },
  cria_viva:  { bg: '#EAF3EC', color: '#2E6B3E' },
  aborto:     { bg: '#FCEAEA', color: '#8C1F1F' },
  gemelar:    { bg: '#EAF3EC', color: '#2E6B3E' },
  mortinato:  { bg: '#FCEAEA', color: '#8C1F1F' },
  no_prenada: { bg: '#FDF3DC', color: '#9C6A00' },
}

function daysToBirth(expected?: string | null) {
  if (!expected) return null
  return differenceInDays(parseISO(expected), new Date())
}

function paymentLabel(status: string) {
  if (status === 'completo')   return { label: 'Pago completo',   bg: '#EAF3EC', color: '#2E6B3E' }
  if (status === 'reserva')    return { label: 'Reserva pagada',  bg: '#FDF3DC', color: '#9C6A00' }
  return                              { label: 'Sin reserva',      bg: '#FCEAEA', color: '#8C1F1F' }
}

// ─── ADD PREGNANCY FORM ───────────────────────────────────────
function AddPregnancySheet({ open, onClose, mareId, onSaved }: {
  open: boolean; onClose: () => void; mareId: string; onSaved: () => void
}) {
  const { data: all = [] }  = useAnimals()
  const create              = useCreatePregnancy()
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [form, setForm]     = useState({
    monta_type: 'natural' as 'natural' | 'ia',
    vet_name: '',
    covered_date: '',
    confirmed_date: '',
    sire_id: '',
    sire_external_name: '',
    notes: '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const stallions = all.filter(a => a.sex === 'semental')

  const handleSave = async () => {
    if (!form.covered_date) { setError('La fecha de cubrición es obligatoria'); return }
    setSaving(true); setError(null)
    try {
      const expected = format(addDays(parseISO(form.covered_date), PREGNANCY_DAYS), 'yyyy-MM-dd')
      await create.mutateAsync({
        mare_id: mareId,
        monta_type: form.monta_type,
        vet_name: form.monta_type === 'ia' ? (form.vet_name || null) : null,
        covered_date: form.covered_date,
        confirmed_date: form.confirmed_date || null,
        expected_birth_date: expected,
        sire_id: form.sire_id || null,
        sire_external_name: form.sire_id ? null : (form.sire_external_name || null),
        result: 'gestante',
        notes: form.notes || null,
      } as Omit<Pregnancy, 'id' | 'created_at'>)
      onSaved(); onClose()
      setForm({ monta_type: 'natural', vet_name: '', covered_date: '', confirmed_date: '', sire_id: '', sire_external_name: '', notes: '' })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Registrar monta">
      <div className="space-y-3">
        {/* Tipo */}
        <Field label="Tipo de monta">
          <div className="flex gap-2">
            {([['natural','Monta natural'],['ia','Inseminación (IA)']] as const).map(([v,l]) => (
              <button key={v} onClick={() => set('monta_type', v)}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                      style={{
                        background: form.monta_type === v ? '#7B1F3A' : '#F7F3EE',
                        color: form.monta_type === v ? '#fff' : '#6B5555',
                        border: `1.5px solid ${form.monta_type === v ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                      }}>{l}</button>
            ))}
          </div>
        </Field>

        {form.monta_type === 'ia' && (
          <Field label="Veterinario (IA)">
            <input value={form.vet_name} onChange={e => set('vet_name', e.target.value)}
                   placeholder="Nombre del veterinario..."
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        )}

        <Field label="Padre (semental)">
          <select value={form.sire_id} onChange={e => set('sire_id', e.target.value)}
                  className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none appearance-none"
                  style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }}>
            <option value="">Externo (introducir nombre)</option>
            {stallions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>

        {!form.sire_id && (
          <Field label="Nombre del semental externo">
            <input value={form.sire_external_name} onChange={e => set('sire_external_name', e.target.value)}
                   placeholder="Nombre del semental..."
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        )}

        <Field label="Fecha de cubrición *">
          <input type="date" value={form.covered_date} onChange={e => set('covered_date', e.target.value)}
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <Field label="Confirmación ecografía" hint="Opcional — fecha de confirmación de preñez">
          <input type="date" value={form.confirmed_date} onChange={e => set('confirmed_date', e.target.value)}
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <Field label="Notas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    rows={2} placeholder="Observaciones..."
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        {error && <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{error}</p>}
        <GranateButton onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar monta'}
        </GranateButton>
        <GhostButton onClick={onClose} fullWidth>Cancelar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── PREGNANCY DETAIL SHEET ───────────────────────────────────
function PregnancyDetailSheet({ open, onClose, pregnancy }: {
  open: boolean; onClose: () => void; pregnancy: Pregnancy
}) {
  const update                  = useUpdatePregnancy()
  const { data: interested = [] } = usePregnancyInterested(pregnancy.id)
  const { data: sale }          = usePregnancySale(pregnancy.id)
  const createInterested        = useCreatePregnancyInterested()
  const upsertSale              = useUpsertPregnancySale()
  const [tab, setTab]           = useState<'info' | 'interested' | 'buyer'>('info')
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [buyerPickerOpen,  setBuyerPickerOpen]  = useState(false)

  const days = daysToBirth(pregnancy.expected_birth_date)

  const RESULTS: PregnancyResult[] = ['gestante','cria_viva','aborto','gemelar','mortinato','no_prenada']

  const setResult = (r: PregnancyResult) => {
    update.mutate({ id: pregnancy.id, result: r })
  }

  const addInterested = (client: ClientBasic) => {
    createInterested.mutate({ pregnancy_id: pregnancy.id, client_id: client.id })
  }

  const importAsBuyer = (client: ClientBasic) => {
    setBuyerPickerOpen(false)
    upsertSale.mutate({
      pregnancy_id: pregnancy.id,
      client_id: client.id,
      agreed_price: 0,
      payment_status: 'sin_reserva',
    })
    setTab('buyer')
  }

  const updatePayment = (status: string) => {
    if (!sale) return
    upsertSale.mutate({ ...(sale as Parameters<typeof upsertSale.mutate>[0]), id: (sale as { id?: string }).id, payment_status: status as 'sin_reserva' | 'reserva' | 'completo' })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Monta · ${format(parseISO(pregnancy.covered_date), 'd MMM yyyy', { locale: es })}`}>
      {/* Resultado */}
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A08888' }}>Resultado</p>
        <div className="flex gap-1.5 flex-wrap">
          {RESULTS.map(r => {
            const c = RESULT_COLORS[r]
            const isActive = pregnancy.result === r
            return (
              <button key={r} onClick={() => setResult(r)}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                      style={{
                        background: isActive ? c.color : '#F7F3EE',
                        color: isActive ? '#fff' : '#6B5555',
                        border: `1.5px solid ${isActive ? c.color : 'rgba(123,31,58,0.22)'}`,
                      }}>
                {RESULT_LABELS[r]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b mb-4" style={{ borderColor: 'rgba(123,31,58,0.11)' }}>
        {([['info','Info'],['interested','Interesados'],['buyer','Comprador']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
                  className="flex-1 py-2.5 text-[12px] font-medium"
                  style={{
                    color: tab === id ? '#7B1F3A' : '#A08888',
                    borderBottom: tab === id ? '2px solid #7B1F3A' : '2px solid transparent',
                    fontWeight: tab === id ? 700 : 500,
                  }}>{label}</button>
        ))}
      </div>

      {/* INFO TAB */}
      {tab === 'info' && (
        <div className="space-y-2.5">
          {pregnancy.result === 'gestante' && days !== null && (
            <div className="rounded-xl p-3" style={{ background: days <= 14 ? '#FDF3DC' : '#EAF3EC', border: `1px solid ${days <= 14 ? 'rgba(156,106,0,0.2)' : 'rgba(46,107,62,0.2)'}` }}>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: days <= 14 ? '#9C6A00' : '#2E6B3E' }}>
                Parto estimado
              </p>
              <p className="text-[18px] font-bold mt-1" style={{ color: '#1C1010' }}>
                {format(parseISO(pregnancy.expected_birth_date!), 'd MMM yyyy', { locale: es })}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: '#6B5555' }}>
                {days > 0 ? `en ${days} días · ${differenceInWeeks(parseISO(pregnancy.expected_birth_date!), new Date())} semanas` : days === 0 ? 'Hoy' : `hace ${Math.abs(days)} días`}
              </p>
            </div>
          )}
          <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
            {[
              ['Tipo de monta', pregnancy.monta_type === 'ia' ? 'Inseminación artificial' : 'Monta natural'],
              pregnancy.vet_name ? ['Veterinario', pregnancy.vet_name] : null,
              ['Fecha de cubrición', format(parseISO(pregnancy.covered_date), 'd MMM yyyy', { locale: es })],
              pregnancy.confirmed_date ? ['Confirmación ecografía', format(parseISO(pregnancy.confirmed_date), 'd MMM yyyy', { locale: es })] : null,
              pregnancy.actual_birth_date ? ['Fecha real de parto', format(parseISO(pregnancy.actual_birth_date), 'd MMM yyyy', { locale: es })] : null,
              pregnancy.notes ? ['Notas', pregnancy.notes] : null,
            ].filter(Boolean).map((row, i) => {
              const [label, value] = row as [string, string]
              return (
              <div key={i} className="flex justify-between px-4 py-2.5"
                   style={{ borderTop: i > 0 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                <span className="text-[13px]" style={{ color: '#6B5555' }}>{label}</span>
                <span className="text-[13px] font-semibold text-right max-w-[55%]" style={{ color: '#1C1010' }}>{value}</span>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* INTERESTED TAB */}
      {tab === 'interested' && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
              {interested.length} interesados
            </p>
            <button onClick={() => setClientPickerOpen(true)}
                    className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
              + Añadir
            </button>
          </div>
          {interested.length === 0 ? (
            <p className="text-center py-6 text-[13px] italic" style={{ color: '#A08888' }}>Sin interesados aún</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(123,31,58,0.11)' }}>
              {(interested as Array<{ id: string; notes?: string | null; clients: { id: string; name: string; phone?: string | null; instagram?: string | null; city?: string | null; stable_name?: string | null } }>).map((item, i, arr) => (
                <div key={item.id} className="px-4 py-3 bg-white"
                     style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-semibold" style={{ color: '#1C1010' }}>{item.clients.name}</p>
                    <button onClick={() => {
                      upsertSale.mutate({ pregnancy_id: pregnancy.id, client_id: item.clients.id, agreed_price: 0, payment_status: 'sin_reserva' })
                      setTab('buyer')
                    }} className="text-[11px] font-bold" style={{ color: '#7B1F3A' }}>
                      → Comprador
                    </button>
                  </div>
                  {item.clients.stable_name && <p className="text-[12px]" style={{ color: '#6B5555' }}>{item.clients.stable_name}</p>}
                  {item.clients.phone && <p className="text-[12px]" style={{ color: '#6B5555' }}>{item.clients.phone}</p>}
                  {item.clients.instagram && <p className="text-[11px]" style={{ color: '#833AB4' }}>@{item.clients.instagram}</p>}
                  {item.notes && <p className="text-[12px] mt-1 italic" style={{ color: '#A08888' }}>{item.notes}</p>}
                </div>
              ))}
            </div>
          )}
          <ClientPicker open={clientPickerOpen} onClose={() => setClientPickerOpen(false)}
                        onSelect={addInterested} title="Añadir interesado" />
        </div>
      )}

      {/* BUYER TAB */}
      {tab === 'buyer' && (
        <div className="space-y-3">
          {!sale ? (
            <>
              <p className="text-[13px] text-center py-4 italic" style={{ color: '#A08888' }}>Sin comprador definitivo</p>
              <GranateButton onClick={() => setBuyerPickerOpen(true)} fullWidth>
                Seleccionar comprador
              </GranateButton>
            </>
          ) : (
            <>
              {/* Price */}
              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Estado del pago</p>
                </div>
                {/* Progress bar */}
                <div className="px-4 pt-3">
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F7F3EE' }}>
                    <div className="h-full rounded-full transition-all"
                         style={{
                           width: sale.payment_status === 'completo' ? '100%' : sale.payment_status === 'reserva' ? '30%' : '0%',
                           background: sale.payment_status === 'completo' ? '#2E6B3E' : '#9C6A00',
                         }} />
                  </div>
                </div>
                <div className="flex gap-2 px-4 py-3">
                  {(['sin_reserva','reserva','completo'] as const).map(s => {
                    const p = paymentLabel(s)
                    return (
                      <button key={s} onClick={() => updatePayment(s)}
                              className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
                              style={{
                                background: sale.payment_status === s ? p.color : '#F7F3EE',
                                color: sale.payment_status === s ? '#fff' : '#6B5555',
                                border: `1.5px solid ${sale.payment_status === s ? p.color : 'rgba(123,31,58,0.22)'}`,
                              }}>{p.label}</button>
                    )
                  })}
                </div>
                {/* Amounts */}
                <div className="flex px-4 pb-3 gap-3">
                  <div className="flex-1">
                    <p className="text-[10px]" style={{ color: '#A08888' }}>Reserva</p>
                    <p className="text-[16px] font-bold" style={{ color: '#9C6A00' }}>
                      {sale.deposit_amount ? `${sale.deposit_amount.toLocaleString('es-ES')} €` : '—'}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px]" style={{ color: '#A08888' }}>Total acordado</p>
                    <p className="text-[16px] font-bold" style={{ color: '#1C1010' }}>
                      {sale.agreed_price ? `${sale.agreed_price.toLocaleString('es-ES')} €` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Venta tag visible en header */}
              <div className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                   style={{ background: '#EAF3EC', border: '1px solid rgba(46,107,62,0.2)' }}>
                <span className="text-[12px] font-bold" style={{ color: '#2E6B3E' }}>
                  Vendido · {sale.agreed_price ? `${sale.agreed_price.toLocaleString('es-ES')} €` : 'Precio pendiente'}
                </span>
              </div>
            </>
          )}
          <ClientPicker open={buyerPickerOpen} onClose={() => setBuyerPickerOpen(false)}
                        onSelect={importAsBuyer} title="Seleccionar comprador definitivo" />
        </div>
      )}
    </BottomSheet>
  )
}

// ─── MAIN TAB ─────────────────────────────────────────────────
export default function TabVientre({ animal }: { animal: Animal }) {
  const { data: pregnancies = [], isLoading } = usePregnancies(animal.id)
  const [addOpen, setAddOpen]           = useState(false)
  const [selected, setSelected]         = useState<Pregnancy | null>(null)

  if (isLoading) return <LoadingScreen />

  // Stats
  const total   = pregnancies.length
  const partos  = pregnancies.filter(p => ['cria_viva','gemelar'].includes(p.result)).length
  const pct     = total > 0 ? Math.round((partos / total) * 100) : 0

  return (
    <div className="p-3 pb-8 space-y-2.5">

      {/* STATS */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {[['Montas', total, '#1C1010'], ['Partos', partos, '#2E6B3E'], ['Éxito', `${pct}%`, '#2E6B3E']].map(([l, v, c]) => (
            <div key={l as string} className="rounded-2xl p-3 text-center"
                 style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
              <p className="text-[20px] font-bold" style={{ color: c as string }}>{v}</p>
              <p className="text-[10px] mt-0.5" style={{ color: '#A08888' }}>{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* LIST */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Historial de montas
          </p>
          <button onClick={() => setAddOpen(true)}
                  className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
            + Añadir
          </button>
        </div>

        {pregnancies.length === 0 ? (
          <EmptyState icon="🐎" title="Sin montas registradas"
                      subtitle="Registra la primera monta de esta yegua" />
        ) : pregnancies.map((p, i) => {
          const rc = RESULT_COLORS[p.result]
          const days = daysToBirth(p.expected_birth_date)
          return (
            <button key={p.id} onClick={() => setSelected(p)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-[#F5E8EC]"
                    style={{ borderBottom: i < pregnancies.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[16px]"
                   style={{ background: rc.bg }}>
                {p.result === 'gestante' ? '🤰' : ['cria_viva','gemelar'].includes(p.result) ? '✓' : '✗'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
                    {p.monta_type === 'ia' ? 'IA' : 'Monta natural'} · {format(parseISO(p.covered_date), 'd MMM yyyy', { locale: es })}
                  </p>
                </div>
                {p.expected_birth_date && p.result === 'gestante' && (
                  <p className="text-[11px] mt-0.5" style={{ color: '#1A4F7A' }}>
                    Parto est. {format(parseISO(p.expected_birth_date), 'd MMM yyyy', { locale: es })}
                    {days !== null && ` · en ${days} días`}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0"
                    style={{ background: rc.bg, color: rc.color }}>
                {RESULT_LABELS[p.result]}
              </span>
            </button>
          )
        })}
      </div>

      <AddPregnancySheet open={addOpen} onClose={() => setAddOpen(false)}
                         mareId={animal.id} onSaved={() => {}} />

      {selected && (
        <PregnancyDetailSheet open={!!selected} onClose={() => setSelected(null)}
                              pregnancy={selected} />
      )}
    </div>
  )
}
