import { errMsg } from '../../lib/errors'
import { useState, useEffect, useMemo } from 'react'
import {
  usePregnancies, useCreatePregnancy, useUpdatePregnancy,
  usePregnancySale, useUpsertPregnancySale, useCreatePayment,
  useDeletePregnancy, usePregnancySalesForMare,
  useAnimalGenetics,
} from '../../hooks/useReproduction'
import { useAnimals } from '../../hooks/useAnimals'
import { ClientPicker } from '../ui/ClientPicker'
import type { ClientBasic } from '../ui/ClientPicker'
import PaymentsPanel from './PaymentsPanel'
import { summarizePayments, PAYMENT_STATUS_COLOR } from '../../lib/payments'
import { BottomSheet, EmptyState, LoadingScreen, Field, GranateButton, GhostButton, DeleteZone } from '../ui'
import type { Animal, AnimalGenetics, Payment, PaymentStatus, Pregnancy, PregnancyResult, PregnancySale } from '../../types'
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

type ClientRow = { id: string; name: string; phone?: string|null; instagram?: string|null; city?: string|null; stable_name?: string|null }
type SaleWithClient = PregnancySale & { clients: (ClientRow & { dni?: string | null }) | null; id: string; payments: Payment[] }

function daysToBirth(expected?: string | null) {
  if (!expected) return null
  return differenceInDays(parseISO(expected), new Date())
}

// ─── GENETICS MATH (cross prediction) ────────────────────────

function _parseAlleles(locus: string | undefined): string[] {
  if (!locus) return []
  if (locus.includes('/')) return locus.split('/')
  if (locus.length === 2) return [locus[0], locus[1]]
  return []
}

function _crossDist(a: string[], b: string[]): Record<string, number> {
  if (!a.length || !b.length) return {}
  const counts: Record<string, number> = {}
  const total = a.length * b.length
  for (const x of a) {
    for (const y of b) {
      const key = [x, y].sort().join('/')
      counts[key] = (counts[key] ?? 0) + 1 / total
    }
  }
  return counts
}

function _coatBase(ext: string[], agt: string[]): 'alazan' | 'negro' | 'castano' {
  const hasE = ext.some(a => a === 'E')
  const hasA = agt.some(a => a === 'A')
  if (!hasE) return 'alazan'
  return hasA ? 'castano' : 'negro'
}

function predictCross(g1: AnimalGenetics, g2: AnimalGenetics) {
  const grey1 = _parseAlleles(g1.grey);   const grey2 = _parseAlleles(g2.grey)
  const ext1  = _parseAlleles(g1.extension); const ext2  = _parseAlleles(g2.extension)
  const agt1  = _parseAlleles(g1.agouti); const agt2  = _parseAlleles(g2.agouti)
  const lp1   = _parseAlleles(g1.appaloosa); const lp2   = _parseAlleles(g2.appaloosa)
  const pt1   = _parseAlleles(g1.patn1);     const pt2   = _parseAlleles(g2.patn1)

  let greyP = 0
  if (grey1.length && grey2.length) {
    const gd = _crossDist(grey1, grey2)
    greyP = Object.entries(gd).filter(([k]) => k.includes('G')).reduce((s, [, v]) => s + v, 0)
  }
  const nonGreyP = 1 - greyP
  let alazan = 0, castano = 0, negro = 0
  if (ext1.length && ext2.length && agt1.length && agt2.length) {
    const ed = _crossDist(ext1, ext2); const ad = _crossDist(agt1, agt2)
    for (const [ek, ep] of Object.entries(ed)) {
      for (const [ak, ap] of Object.entries(ad)) {
        const base = _coatBase(ek.split('/'), ak.split('/'))
        const p = ep * ap * nonGreyP
        if (base === 'alazan') alazan += p
        else if (base === 'castano') castano += p
        else negro += p
      }
    }
  }
  let appaloosa = 0
  if (lp1.length && lp2.length) {
    const ld = _crossDist(lp1, lp2)
    appaloosa = Object.entries(ld).filter(([k]) => k.includes('LP')).reduce((s, [, v]) => s + v, 0)
  }
  let patn1 = 0
  if (pt1.length && pt2.length) {
    const pd = _crossDist(pt1, pt2)
    patn1 = Object.entries(pd).filter(([k]) => k.split('/').includes('PATN1')).reduce((s, [, v]) => s + v, 0)
  }
  const leopard = lp1.length && lp2.length && pt1.length && pt2.length ? appaloosa * patn1 : null
  return { greyP, alazan, castano, negro, appaloosa, patn1, leopard }
}

function PctBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  if (pct === 0) return null
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 text-[12px] shrink-0" style={{ color: '#6B5555' }}>{label}</div>
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(123,31,58,0.10)' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-8 text-right text-[12px] font-bold" style={{ color: '#1C1010' }}>{pct}%</div>
    </div>
  )
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
      setError(errMsg(e))
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
  const update                    = useUpdatePregnancy()
  const deletePregnancy           = useDeletePregnancy(pregnancy.mare_id)
  const { data: saleRaw }         = usePregnancySale(pregnancy.id)
  const sale                      = saleRaw as SaleWithClient | null
  const createPayment             = useCreatePayment()
  const upsertSale                = useUpsertPregnancySale()
  const { data: allAnimals = [] } = useAnimals()
  const { data: mareGenetics }    = useAnimalGenetics(pregnancy.mare_id)
  const { data: sireGenetics }    = useAnimalGenetics(pregnancy.sire_id ?? undefined)
  const [tab, setTab]             = useState<'info' | 'buyer'>('info')
  const [buyerPickerOpen,  setBuyerPickerOpen]  = useState(false)

  // Optimistic local state for result pills
  const [localResult, setLocalResultState] = useState<PregnancyResult>(pregnancy.result)

  // ── Edit mode (info tab) ───────────────────────────────────
  const [editMode,  setEditMode]  = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editForm,  setEditForm]  = useState({
    monta_type:          pregnancy.monta_type,
    vet_name:            pregnancy.vet_name            ?? '',
    sire_id:             pregnancy.sire_id             ?? '',
    sire_external_name:  pregnancy.sire_external_name  ?? '',
    covered_date:        pregnancy.covered_date,
    confirmed_date:      pregnancy.confirmed_date      ?? '',
    expected_birth_date: pregnancy.expected_birth_date ?? '',
    actual_birth_date:   pregnancy.actual_birth_date   ?? '',
    notes:               pregnancy.notes               ?? '',
  })

  // Sync form when pregnancy prop refreshes (after successful update)
  useEffect(() => {
    setEditForm({
      monta_type:          pregnancy.monta_type,
      vet_name:            pregnancy.vet_name            ?? '',
      sire_id:             pregnancy.sire_id             ?? '',
      sire_external_name:  pregnancy.sire_external_name  ?? '',
      covered_date:        pregnancy.covered_date,
      confirmed_date:      pregnancy.confirmed_date      ?? '',
      expected_birth_date: pregnancy.expected_birth_date ?? '',
      actual_birth_date:   pregnancy.actual_birth_date   ?? '',
      notes:               pregnancy.notes               ?? '',
    })
    setEditMode(false)
    setEditError(null)
    setLocalResultState(pregnancy.result)
  }, [pregnancy.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k: string, v: string) =>
    setEditForm(prev => {
      const next = { ...prev, [k]: v }
      // Auto-recalculate expected birth date when covered_date changes
      if (k === 'covered_date' && v) {
        try { next.expected_birth_date = format(addDays(parseISO(v), PREGNANCY_DAYS), 'yyyy-MM-dd') } catch {}
      }
      return next
    })

  const handleSaveEdit = async () => {
    if (!editForm.covered_date) { setEditError('La fecha de cubrición es obligatoria'); return }
    setEditError(null)
    try {
      await update.mutateAsync({
        id:                  pregnancy.id,
        monta_type:          editForm.monta_type,
        vet_name:            editForm.monta_type === 'ia' ? (editForm.vet_name || undefined) : undefined,
        sire_id:             editForm.sire_id || undefined,
        sire_external_name:  editForm.sire_id ? undefined : (editForm.sire_external_name || undefined),
        covered_date:        editForm.covered_date,
        confirmed_date:      editForm.confirmed_date      || undefined,
        expected_birth_date: editForm.expected_birth_date || undefined,
        actual_birth_date:   editForm.actual_birth_date   || undefined,
        notes:               editForm.notes               || undefined,
      })
      setEditMode(false)
    } catch (e: unknown) {
      setEditError(errMsg(e))
    }
  }

  const stallions = allAnimals.filter(a => a.sex === 'semental')

  // Buyer tab local state
  const [localPrice,   setLocalPrice]     = useState('')
  const [pendingBuyer, setPendingBuyer]   = useState<ClientBasic | null>(null)
  const [newPrice,     setNewPrice]       = useState('')
  const [newInitial,   setNewInitial]     = useState('')
  const [buyerError,   setBuyerError]     = useState<string | null>(null)

  useEffect(() => {
    if (sale) setLocalPrice(sale.agreed_price > 0 ? String(sale.agreed_price) : '')
  }, [sale?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const days = daysToBirth(pregnancy.expected_birth_date)

  const RESULTS: PregnancyResult[] = ['gestante','cria_viva','aborto','gemelar','mortinato','no_prenada']

  const setResult = (r: PregnancyResult) => {
    setLocalResultState(r)
    update.mutate({ id: pregnancy.id, result: r })
  }

  const confirmBuyer = async () => {
    if (!pendingBuyer) return
    setBuyerError(null)
    try {
      const created = await upsertSale.mutateAsync({
        pregnancy_id: pregnancy.id,
        client_id:    pendingBuyer.id,
        agreed_price: parseFloat(newPrice) || 0,
      })
      const initial = parseFloat(newInitial)
      if (initial > 0) {
        await createPayment.mutateAsync({
          pregnancy_sale_id: (created as { id: string }).id,
          amount:    initial,
          paid_date: format(new Date(), 'yyyy-MM-dd'),
          notes:     'Pago inicial',
        })
      }
      setPendingBuyer(null); setNewPrice(''); setNewInitial('')
    } catch (e) {
      setBuyerError(errMsg(e))
    }
  }

  const savePrice = () => {
    if (!sale) return
    const price = parseFloat(localPrice) || 0
    if (price === sale.agreed_price) return
    upsertSale.mutate({ pregnancy_id: sale.pregnancy_id, client_id: sale.client_id, agreed_price: price, id: sale.id })
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={`Monta · ${format(parseISO(pregnancy.covered_date), 'd MMM yyyy', { locale: es })}`}>
      {/* Resultado */}
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#A08888' }}>Resultado</p>
        <div className="flex gap-1.5 flex-wrap">
          {RESULTS.map(r => {
            const c = RESULT_COLORS[r]
            const isActive = localResult === r
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
        {([['info','Info'],['buyer','Comprador']] as const).map(([id, label]) => (
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

          {/* ── VIEW MODE ─────────────────────────────────────── */}
          {!editMode && (
            <>
              {/* Parto estimado banner */}
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

              {/* Info card */}
              {(() => {
                const sireName = pregnancy.sire_id
                  ? (allAnimals.find(a => a.id === pregnancy.sire_id)?.name ?? null)
                  : (pregnancy.sire_external_name ?? null)
                const rows: [string, string][] = [
                  ['Tipo de monta', pregnancy.monta_type === 'ia' ? 'Inseminación artificial' : 'Monta natural'],
                  ...(pregnancy.vet_name ? [['Veterinario', pregnancy.vet_name] as [string,string]] : []),
                  ['Fecha de cubrición', format(parseISO(pregnancy.covered_date), 'd MMM yyyy', { locale: es })],
                  ...(pregnancy.confirmed_date ? [['Confirmación ecografía', format(parseISO(pregnancy.confirmed_date), 'd MMM yyyy', { locale: es })] as [string,string]] : []),
                  ...(pregnancy.actual_birth_date ? [['Fecha real de parto', format(parseISO(pregnancy.actual_birth_date), 'd MMM yyyy', { locale: es })] as [string,string]] : []),
                  ...(sireName ? [['Padre', sireName] as [string,string]] : []),
                  ...(pregnancy.notes ? [['Notas', pregnancy.notes] as [string,string]] : []),
                ]
                return (
                  <div className="rounded-xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                    {rows.map(([label, value], i) => (
                      <div key={i} className="flex justify-between px-4 py-2.5"
                           style={{ borderTop: i > 0 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                        <span className="text-[13px]" style={{ color: '#6B5555' }}>{label}</span>
                        <span className="text-[13px] font-semibold text-right max-w-[55%]" style={{ color: '#1C1010' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Genetic cross prediction */}
              {(() => {
                const hasSireId     = !!pregnancy.sire_id
                const hasMareGen    = !!mareGenetics
                const hasSireGen    = hasSireId && !!sireGenetics
                const canPredict    = hasMareGen && hasSireGen
                const missingGen    = !canPredict && hasSireId   // sire is internal but genetics missing
                const externalSire  = !hasSireId                 // sire is external → no genetics possible

                if (!hasSireId && !pregnancy.sire_external_name) return null // no father at all

                const prediction = canPredict ? predictCross(mareGenetics as AnimalGenetics, sireGenetics as AnimalGenetics) : null

                return (
                  <div className="rounded-xl p-3.5 space-y-3"
                       style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
                      Predicción genética de la cría
                    </p>

                    {(externalSire || missingGen || !hasMareGen) ? (
                      <p className="text-[13px]" style={{ color: '#A08888' }}>
                        Falta información genética de uno de los padres
                      </p>
                    ) : prediction ? (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <p className="text-[12px] font-semibold" style={{ color: '#1C1010' }}>Color base esperado</p>
                          <PctBar label="Gris"    value={prediction.greyP}   color="#A09898" />
                          <PctBar label="Castaño" value={prediction.castano} color="#6B3A18" />
                          <PctBar label="Alazán"  value={prediction.alazan}  color="#C07030" />
                          <PctBar label="Negro"   value={prediction.negro}   color="#1A1208" />
                          {prediction.greyP === 0 && prediction.castano === 0 && prediction.alazan === 0 && prediction.negro === 0 && (
                            <p className="text-[12px]" style={{ color: '#A08888' }}>Faltan loci Extension / Agouti.</p>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[12px] font-semibold" style={{ color: '#1C1010' }}>Patrón Appaloosa</p>
                          <PctBar label="Con LP"    value={prediction.appaloosa}       color="#7B1F3A" />
                          <PctBar label="Sin patrón" value={1 - prediction.appaloosa}  color="#D0C4C0" />
                          {prediction.leopard !== null && (<>
                            <PctBar label="Con PATN1" value={prediction.patn1} color="#6B25A8" />
                            <PctBar label="LP + PATN1 (leopardo)" value={prediction.leopard} color="#8E5CC4" />
                          </>)}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })()}

              {/* Edit button */}
              <button onClick={() => setEditMode(true)}
                      className="w-full py-2.5 rounded-xl text-[13px] font-semibold"
                      style={{ background: '#F7F3EE', color: '#7B1F3A', border: '1.5px solid rgba(123,31,58,0.22)' }}>
                ✏️ Editar información
              </button>
            </>
          )}

          {/* ── EDIT MODE ─────────────────────────────────────── */}
          {editMode && (
            <div className="space-y-3">

              {/* Tipo de monta */}
              <Field label="Tipo de monta">
                <div className="flex gap-2">
                  {([['natural','Monta natural'],['ia','Inseminación (IA)']] as const).map(([v, l]) => (
                    <button key={v} onClick={() => setField('monta_type', v)}
                            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                            style={{
                              background: editForm.monta_type === v ? '#7B1F3A' : '#F7F3EE',
                              color:      editForm.monta_type === v ? '#fff'     : '#6B5555',
                              border: `1.5px solid ${editForm.monta_type === v ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                            }}>{l}</button>
                  ))}
                </div>
              </Field>

              {/* Veterinario (solo IA) */}
              {editForm.monta_type === 'ia' && (
                <Field label="Veterinario (IA)">
                  <input value={editForm.vet_name}
                         onChange={e => setField('vet_name', e.target.value)}
                         placeholder="Nombre del veterinario..."
                         className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                         style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
                </Field>
              )}

              {/* Padre */}
              <Field label="Padre (semental)">
                <select value={editForm.sire_id}
                        onChange={e => setField('sire_id', e.target.value)}
                        className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none appearance-none"
                        style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }}>
                  <option value="">Externo (introducir nombre)</option>
                  {stallions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>

              {!editForm.sire_id && (
                <Field label="Nombre del semental externo">
                  <input value={editForm.sire_external_name}
                         onChange={e => setField('sire_external_name', e.target.value)}
                         placeholder="Nombre del semental..."
                         className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                         style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
                </Field>
              )}

              {/* Fecha cubrición */}
              <Field label="Fecha de cubrición *">
                <input type="date" value={editForm.covered_date}
                       onChange={e => setField('covered_date', e.target.value)}
                       className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                       style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              </Field>

              {/* Confirmación ecografía */}
              <Field label="Confirmación ecografía" hint="Fecha en que se confirmó la preñez">
                <input type="date" value={editForm.confirmed_date}
                       onChange={e => setField('confirmed_date', e.target.value)}
                       className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                       style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              </Field>

              {/* Parto estimado */}
              <Field label="Parto estimado" hint="Se calcula automáticamente (cubrición + 340 días)">
                <input type="date" value={editForm.expected_birth_date}
                       onChange={e => setField('expected_birth_date', e.target.value)}
                       className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                       style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              </Field>

              {/* Fecha real de parto */}
              <Field label="Fecha real de parto" hint="Rellenar cuando ocurra el parto">
                <input type="date" value={editForm.actual_birth_date}
                       onChange={e => setField('actual_birth_date', e.target.value)}
                       className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                       style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              </Field>

              {/* Notas */}
              <Field label="Notas">
                <textarea value={editForm.notes}
                          onChange={e => setField('notes', e.target.value)}
                          rows={3} placeholder="Observaciones..."
                          className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                          style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              </Field>

              {editError && (
                <p className="text-[13px] rounded-xl px-4 py-2.5"
                   style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{editError}</p>
              )}

              <GranateButton onClick={handleSaveEdit} disabled={update.isPending} fullWidth>
                {update.isPending ? 'Guardando...' : 'Guardar cambios'}
              </GranateButton>
              <GhostButton onClick={() => { setEditMode(false); setEditError(null) }} fullWidth>
                Cancelar
              </GhostButton>
            </div>
          )}
        </div>
      )}

      {/* BUYER TAB */}
      {tab === 'buyer' && (
        <div className="space-y-3">
          {!sale ? (
            pendingBuyer ? (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Comprador</p>
                    <p className="text-[14px] font-semibold truncate" style={{ color: '#1C1010' }}>{pendingBuyer.name}</p>
                  </div>
                  <button onClick={() => setBuyerPickerOpen(true)} className="text-[12px] font-bold" style={{ color: '#7B1F3A' }}>Cambiar</button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className="text-[10px] mb-1" style={{ color: '#A08888' }}>Precio acordado (€)</p>
                    <input type="number" inputMode="numeric" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                           placeholder="0" className="w-full rounded-xl px-3 py-2 text-[14px] font-bold outline-none"
                           style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] mb-1" style={{ color: '#A08888' }}>Pago inicial (€, opcional)</p>
                    <input type="number" inputMode="numeric" value={newInitial} onChange={e => setNewInitial(e.target.value)}
                           placeholder="0" className="w-full rounded-xl px-3 py-2 text-[14px] font-bold outline-none"
                           style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#9C6A00' }} />
                  </div>
                </div>
                {buyerError && <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{buyerError}</p>}
                <GranateButton onClick={confirmBuyer} disabled={upsertSale.isPending || createPayment.isPending} fullWidth>
                  {upsertSale.isPending || createPayment.isPending ? 'Guardando...' : 'Guardar comprador'}
                </GranateButton>
                <GhostButton onClick={() => { setPendingBuyer(null); setBuyerError(null) }} fullWidth>Cancelar</GhostButton>
              </div>
            ) : (
              <>
                <p className="text-[13px] text-center py-4 italic" style={{ color: '#A08888' }}>Sin comprador definitivo</p>
                <GranateButton onClick={() => setBuyerPickerOpen(true)} fullWidth>
                  Seleccionar o crear comprador
                </GranateButton>
              </>
            )
          ) : (
            <>
              {/* Client info */}
              {sale.clients && (
                <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
                    <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Comprador</p>
                  </div>
                  {[
                    ['Nombre', sale.clients.name],
                    sale.clients.stable_name ? ['Yeguada',  sale.clients.stable_name]       : null,
                    sale.clients.city        ? ['Ciudad',   sale.clients.city]               : null,
                    sale.clients.phone       ? ['Teléfono', sale.clients.phone]              : null,
                    sale.clients.instagram   ? ['Instagram',`@${sale.clients.instagram}`]   : null,
                    sale.clients.dni         ? ['DNI',      sale.clients.dni]                : null,
                  ].filter(Boolean).map((row, i) => {
                    const [label, value] = row as [string, string]
                    return (
                      <div key={i} className="flex justify-between px-4 py-2.5"
                           style={{ borderTop: i > 0 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                        <span className="text-[13px]" style={{ color: '#6B5555' }}>{label}</span>
                        <span className="text-[13px] font-semibold"
                              style={{ color: label === 'Instagram' ? '#833AB4' : '#1C1010' }}>
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Agreed price */}
              <div className="rounded-2xl px-4 py-3" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
                <p className="text-[10px] mb-1" style={{ color: '#A08888' }}>Total acordado (€)</p>
                <input type="number" inputMode="numeric"
                       value={localPrice} onChange={e => setLocalPrice(e.target.value)}
                       onBlur={savePrice} placeholder="0"
                       className="w-full rounded-xl px-3 py-2 text-[14px] font-bold outline-none"
                       style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              </div>

              {/* Payments */}
              <PaymentsPanel kind="pregnancy" saleId={sale.id}
                             agreedPrice={parseFloat(localPrice) || sale.agreed_price}
                             payments={sale.payments} />
            </>
          )}
          <ClientPicker open={buyerPickerOpen} onClose={() => setBuyerPickerOpen(false)}
                        onSelect={c => { setBuyerPickerOpen(false); setPendingBuyer(c); setBuyerError(null) }}
                        title="Comprador del vientre" />
        </div>
      )}

      {/* ELIMINAR MONTA */}
      <div className="pt-2 mt-2" style={{ borderTop: '1px solid rgba(123,31,58,0.09)' }}>
        <DeleteZone
          label={`monta · ${format(parseISO(pregnancy.covered_date), 'd MMM yyyy', { locale: es })}`}
          onDelete={() => deletePregnancy.mutate(pregnancy.id, { onSuccess: onClose })}
          isPending={deletePregnancy.isPending}
        />
      </div>
    </BottomSheet>
  )
}

// ─── HELPERS ─────────────────────────────────────────────────
function fmtEur(n: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €'
}

// ─── MAIN TAB ─────────────────────────────────────────────────
export default function TabVientre({ animal }: { animal: Animal }) {
  const { data: pregnancies = [], isLoading } = usePregnancies(animal.id)
  const { data: allSales = [] }               = usePregnancySalesForMare(animal.id)
  const [addOpen, setAddOpen]                 = useState(false)
  const [selected, setSelected]               = useState<Pregnancy | null>(null)

  // Keep selected in sync after edits (query refetch updates the pregnancy data)
  useEffect(() => {
    if (selected) {
      const updated = pregnancies.find(p => p.id === selected.id)
      if (updated) setSelected(updated)
    }
  }, [pregnancies]) // eslint-disable-line react-hooks/exhaustive-deps

  // Map pregnancy_id → sale info for per-row badge
  // MUST be before conditional return (Rules of Hooks)
  const saleByPregnancy = useMemo(() => {
    const map: Record<string, { price: number; status: PaymentStatus }> = {}
    for (const sale of allSales) {
      const pregId = (sale as { pregnancies?: { id: string } }).pregnancies?.id
      if (pregId) map[pregId] = { price: sale.agreed_price, status: summarizePayments(sale.agreed_price, sale.payments).status }
    }
    return map
  }, [allSales])

  if (isLoading) return <LoadingScreen />

  // Stats
  const total   = pregnancies.length
  const partos  = pregnancies.filter(p => ['cria_viva','gemelar'].includes(p.result)).length
  const pct     = total > 0 ? Math.round((partos / total) * 100) : 0

  // Financial summary from pregnancy sales
  const cobrado = allSales.reduce((s, sale) => s + summarizePayments(sale.agreed_price, sale.payments).paid, 0)
  const estimado = allSales.reduce((s, sale) => s + sale.agreed_price, 0)
  const pendiente = allSales.reduce((s, sale) => s + summarizePayments(sale.agreed_price, sale.payments).pending, 0)

  return (
    <div className="p-3 pb-8 space-y-2.5">

      {/* FINANCIAL SUMMARY */}
      {allSales.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <div className="px-4 py-4" style={{ background: '#7B1F3A' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider"
               style={{ color: 'rgba(255,255,255,0.65)' }}>Cobrado en ventas de vientre</p>
            <p className="text-[28px] font-bold mt-1" style={{ color: '#fff' }}>
              {fmtEur(cobrado)}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {allSales.length} {allSales.length === 1 ? 'venta' : 'ventas'} · precio total acordado {fmtEur(estimado)}
            </p>
          </div>
          {pendiente > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5"
                 style={{ background: '#FDF3DC' }}>
              <span className="text-[11px]" style={{ color: '#9C6A00' }}>Pendiente de cobrar</span>
              <span className="text-[14px] font-bold" style={{ color: '#9C6A00' }}>{fmtEur(pendiente)}</span>
            </div>
          )}
        </div>
      )}

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
          const rc   = RESULT_COLORS[p.result]
          const days = daysToBirth(p.expected_birth_date)
          const sale = saleByPregnancy[p.id]
          return (
            <button key={p.id} onClick={() => setSelected(p)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left active:bg-[#F5E8EC]"
                    style={{ borderBottom: i < pregnancies.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[16px]"
                   style={{ background: rc.bg }}>
                {p.result === 'gestante' ? '🤰' : ['cria_viva','gemelar'].includes(p.result) ? '✓' : '✗'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
                    {p.monta_type === 'ia' ? 'IA' : 'Monta natural'} · {format(parseISO(p.covered_date), 'd MMM yyyy', { locale: es })}
                  </p>
                  {sale && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: PAYMENT_STATUS_COLOR[sale.status].bg,
                            color:      PAYMENT_STATUS_COLOR[sale.status].color,
                          }}>
                      {fmtEur(sale.price)}
                    </span>
                  )}
                </div>
                {p.actual_birth_date && (() => {
                  const g = differenceInDays(parseISO(p.actual_birth_date), parseISO(p.covered_date))
                  return g > 0 ? (
                    <p className="text-[11px] mt-0.5" style={{ color: '#6B5555' }}>
                      Gestación real: {g} días
                    </p>
                  ) : null
                })()}
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
