import { errMsg } from '../../lib/errors'
import { useState, useEffect, Fragment } from 'react'
import {
  useSemenSales, useCreateSemenSale, useUpdateSemenSale, useUpsertSemenShipping, useCreatePayment,
  useDeleteSemenSale,
} from '../../hooks/useReproduction'
import { ClientPicker } from '../ui/ClientPicker'
import type { ClientBasic } from '../ui/ClientPicker'
import PaymentsPanel from './PaymentsPanel'
import { summarizePayments, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL } from '../../lib/payments'
import type { Payment } from '../../types'
import { BottomSheet, EmptyState, LoadingScreen, Field, GranateButton, GhostButton, DeleteZone } from '../ui'
import type { Animal, SemenSale, SemenShipping, ShippingResult } from '../../types'
import { format, parseISO } from 'date-fns'
import { MAX_SHIPPING_ATTEMPTS, SHIPPING_ORDINALS } from '../../lib/constants'
import { es } from 'date-fns/locale'

// ─── TYPES ───────────────────────────────────────────────────
type ClientRow = {
  id: string; name: string; phone?: string | null
  instagram?: string | null; city?: string | null; stable_name?: string | null
}
type SaleWithData = SemenSale & { clients: ClientRow; semen_shippings: SemenShipping[]; payments: Payment[] }

// ─── HELPERS ─────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function getShipping(shippings: SemenShipping[], n: 1 | 2 | 3 | 4 | 5) {
  return shippings.find(s => s.attempt_number === n)
}

function isUnlocked(shippings: SemenShipping[], n: 1 | 2 | 3 | 4 | 5) {
  if (n === 1) return true
  const prev = getShipping(shippings, (n - 1) as 1 | 2 | 3 | 4 | 5)
  return prev?.result === 'sin_prenez'
}

function hasPrenez(shippings: SemenShipping[]) {
  return shippings.some(s => s.result === 'prenez')
}

// ─── SHIPPING DOT ─────────────────────────────────────────────
function ShipDot({ n, shipping, unlocked }: {
  n: 1 | 2 | 3 | 4 | 5
  shipping?: SemenShipping
  unlocked: boolean
}) {
  const base = 'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0'
  if (!unlocked) {
    return (
      <div className={base}
           style={{ border: '1.5px dashed rgba(123,31,58,0.2)', color: '#A08888', background: '#F7F3EE' }}>
        {n}
      </div>
    )
  }
  if (!shipping) {
    return (
      <div className={base} style={{ background: '#E8F0F8', color: '#1A4F7A', border: '1.5px solid #1A4F7A' }}>
        {n}
      </div>
    )
  }
  if (shipping.result === 'prenez') {
    return (
      <div className={base} style={{ background: '#EAF3EC', color: '#2E6B3E', border: '1.5px solid #2E6B3E' }}>
        {n}
      </div>
    )
  }
  if (shipping.result === 'sin_prenez') {
    return (
      <div className={base} style={{ background: '#FCEAEA', color: '#8C1F1F', border: '1.5px solid #8C1F1F' }}>
        {n}
      </div>
    )
  }
  // espera
  return (
    <div className={base} style={{ background: '#FDF3DC', color: '#9C6A00', border: '1.5px solid #9C6A00' }}>
      {n}
    </div>
  )
}

// ─── SHIPPING STATUS LABEL ────────────────────────────────────
function ShipLabel({ shippings }: { shippings: SemenShipping[] }) {
  const prenezShip = shippings.find(s => s.result === 'prenez')
  if (prenezShip) {
    const ord = SHIPPING_ORDINALS[prenezShip.attempt_number - 1]
    return <span style={{ color: '#2E6B3E', fontWeight: 600 }}>Preñez · {ord} envío</span>
  }
  const espera = shippings.find(s => s.result === 'espera')
  if (espera) {
    const dateStr = espera.actual_date
      ? format(parseISO(espera.actual_date), 'd MMM', { locale: es })
      : espera.estimated_date
      ? format(parseISO(espera.estimated_date), 'd MMM', { locale: es })
      : null
    return (
      <span style={{ color: '#9C6A00', fontWeight: 600 }}>
        A la espera{dateStr ? ` · env. ${dateStr}` : ''}
      </span>
    )
  }
  // Next available shipping
  for (const n of [1, 2, 3, 4, 5] as const) {
    const s = getShipping(shippings, n)
    if (!s && isUnlocked(shippings, n)) {
      if (shippings.length === 0) return <span style={{ color: '#A08888' }}>Pendiente de envío</span>
      // previous had sin_prenez → next is ready
      return <span style={{ color: '#1A4F7A', fontWeight: 600 }}>Envío {SHIPPING_ORDINALS[n - 1]} disponible</span>
    }
  }
  // All attempts sin_prenez
  return <span style={{ color: '#8C1F1F', fontWeight: 600 }}>Sin preñez · {MAX_SHIPPING_ATTEMPTS} intentos</span>
}

// ─── ADD SALE SHEET ───────────────────────────────────────────
function AddSaleSheet({ open, onClose, stallionId, onSaved }: {
  open: boolean; onClose: () => void; stallionId: string; onSaved: () => void
}) {
  const create          = useCreateSemenSale()
  const upsertShipping  = useUpsertSemenShipping()
  const createPayment   = useCreatePayment()
  const [client, setClient]   = useState<ClientBasic | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [form, setForm] = useState({
    mare_name:       '',
    mare_birth_date: '',
    mare_chip:       '',
    mare_ueln:       '',
    agreed_price:    '',
    initial_payment: '',
    estimated_date:  '',
    notes:           '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    if (!client) { setError('Selecciona un comprador'); return }
    if (!form.agreed_price || isNaN(+form.agreed_price)) {
      setError('El precio acordado es obligatorio')
      return
    }
    setSaving(true); setError(null)
    try {
      const sale = await create.mutateAsync({
        stallion_id:    stallionId,
        client_id:      client.id,
        mare_name:      form.mare_name || undefined,
        mare_birth_date: form.mare_birth_date || undefined,
        mare_chip:      form.mare_chip || undefined,
        mare_ueln:      form.mare_ueln || undefined,
        agreed_price:   +form.agreed_price,
        year:           new Date().getFullYear(),
        notes:          form.notes || undefined,
      } as Omit<SemenSale, 'id' | 'created_at'>)

      if (form.initial_payment && +form.initial_payment > 0) {
        await createPayment.mutateAsync({
          semen_sale_id: sale.id,
          amount:        +form.initial_payment,
          paid_date:     format(new Date(), 'yyyy-MM-dd'),
          notes:         'Pago inicial',
        })
      }

      if (form.estimated_date) {
        await upsertShipping.mutateAsync({
          semen_sale_id:  sale.id,
          attempt_number: 1,
          estimated_date: form.estimated_date,
          result:         'espera',
        })
      }
      onSaved(); onClose()
      setClient(null)
      setForm({ mare_name: '', mare_birth_date: '', mare_chip: '', mare_ueln: '', agreed_price: '', initial_payment: '', estimated_date: '', notes: '' })
    } catch (e: unknown) {
      setError(errMsg(e))
    }
    setSaving(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Nueva venta de semen">
      <div className="space-y-3">

        {/* Comprador */}
        <Field label="Comprador *">
          {client ? (
            <div className="flex items-center gap-3 rounded-xl px-4 py-2.5"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)' }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
                   style={{ background: '#E8F0F8', color: '#1A4F7A' }}>
                {initials(client.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: '#1C1010' }}>{client.name}</p>
                {client.city && (
                  <p className="text-[11px] truncate" style={{ color: '#6B5555' }}>{client.city}</p>
                )}
              </div>
              <button onClick={() => setPickerOpen(true)}
                      className="text-[12px] font-bold shrink-0" style={{ color: '#7B1F3A' }}>
                Cambiar
              </button>
            </div>
          ) : (
            <button onClick={() => setPickerOpen(true)}
                    className="w-full rounded-xl px-4 py-2.5 text-left text-[14px]"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#A08888' }}>
              Seleccionar comprador...
            </button>
          )}
        </Field>

        <Field label="Yegua receptora">
          <input value={form.mare_name} onChange={e => set('mare_name', e.target.value)}
                 placeholder="Nombre de la yegua"
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <div className="flex gap-2">
          <Field label="Nacimiento yegua">
            <input type="date" value={form.mare_birth_date} onChange={e => set('mare_birth_date', e.target.value)}
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Chip yegua">
            <input value={form.mare_chip} onChange={e => set('mare_chip', e.target.value)}
                   placeholder="Nº de chip"
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        </div>

        <Field label="UELN yegua">
          <input value={form.mare_ueln} onChange={e => set('mare_ueln', e.target.value)}
                 placeholder="Nº UELN"
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <div className="flex gap-2">
          <Field label="Precio acordado *">
            <input type="number" inputMode="numeric" value={form.agreed_price}
                   onChange={e => set('agreed_price', e.target.value)}
                   placeholder="0"
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Pago inicial">
            <input type="number" inputMode="numeric" value={form.initial_payment}
                   onChange={e => set('initial_payment', e.target.value)}
                   placeholder="0"
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        </div>

        <Field label="Fecha estimada primer envío" hint="Opcional">
          <input type="date" value={form.estimated_date} onChange={e => set('estimated_date', e.target.value)}
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <Field label="Notas">
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    rows={2} placeholder="Observaciones..."
                    className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none resize-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        {error && (
          <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
            {error}
          </p>
        )}
        <GranateButton onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar venta'}
        </GranateButton>
        <GhostButton onClick={onClose} fullWidth>Cancelar</GhostButton>
      </div>

      <ClientPicker open={pickerOpen} onClose={() => setPickerOpen(false)}
                    onSelect={(c: ClientBasic) => { setClient(c); setPickerOpen(false) }}
                    title="Seleccionar comprador" />
    </BottomSheet>
  )
}

// ─── SHIPPING CARD (inside detail sheet) ─────────────────────
function ShippingCard({ n, shipping, unlocked, saleId, localResult, onResultChange }: {
  n: 1 | 2 | 3 | 4 | 5
  shipping?: SemenShipping
  unlocked: boolean
  saleId: string
  localResult?: ShippingResult
  onResultChange: (result: ShippingResult) => void
}) {
  const upsert = useUpsertSemenShipping()
  const [dateInput, setDateInput] = useState(shipping?.estimated_date ?? '')
  const [editDate, setEditDate]   = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // keep the input in sync with the persisted value
  useEffect(() => {
    if (!editDate) setDateInput(shipping?.estimated_date ?? '')
  }, [shipping?.estimated_date, editDate])

  const ordinal = SHIPPING_ORDINALS[n - 1]

  const RESULTS: { v: ShippingResult; label: string; color: string }[] = [
    { v: 'prenez',    label: 'Preñez',      color: '#2E6B3E' },
    { v: 'espera',    label: 'A la espera', color: '#9C6A00' },
    { v: 'sin_prenez', label: 'Sin preñez', color: '#8C1F1F' },
  ]

  const activeResult = localResult ?? shipping?.result

  const setResult = (result: ShippingResult) => {
    onResultChange(result)
    setSaveError(null)
    upsert.mutate({
      semen_sale_id:  saleId,
      attempt_number: n,
      result,
    }, { onError: e => setSaveError(errMsg(e)) })
  }

  const saveDate = () => {
    if (!dateInput) return
    setSaveError(null)
    upsert.mutate({
      semen_sale_id:  saleId,
      attempt_number: n,
      result:         activeResult ?? 'espera',
      estimated_date: dateInput,
    }, {
      onSuccess: () => setEditDate(false),
      onError:   e => setSaveError(errMsg(e)),
    })
  }

  const fakeShipping = activeResult !== undefined
    ? { ...shipping, result: activeResult } as SemenShipping
    : shipping

  return (
    <div className="rounded-2xl overflow-hidden"
         style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)', opacity: unlocked ? 1 : 0.4 }}>
      <div className="flex items-center gap-3 px-4 py-3"
           style={{ borderBottom: unlocked ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
        <ShipDot n={n} shipping={fakeShipping} unlocked={unlocked} />
        <div className="flex-1">
          <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{ordinal} envío</span>
          {shipping?.estimated_date && (
            <span className="text-[12px] ml-2" style={{ color: '#6B5555' }}>
              · {format(parseISO(shipping.estimated_date), 'd MMM yyyy', { locale: es })}
            </span>
          )}
          {!unlocked && (
            <p className="text-[11px]" style={{ color: '#A08888' }}>disponible si sin preñez</p>
          )}
        </div>
        {unlocked && !shipping?.estimated_date && !editDate && (
          <button onClick={() => setEditDate(true)}
                  className="text-[12px] font-bold shrink-0" style={{ color: '#7B1F3A' }}>
            + Fecha
          </button>
        )}
      </div>

      {unlocked && (
        <>
          {editDate && (
            <div className="flex gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
              <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)}
                     className="flex-1 rounded-xl px-3 py-2 text-[13px] outline-none"
                     style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
              <button onClick={saveDate}
                      className="px-4 py-2 rounded-xl text-[13px] font-bold"
                      style={{ background: '#7B1F3A', color: '#fff' }}>
                OK
              </button>
            </div>
          )}
          {saveError && (
            <p className="text-[12px] px-4 py-2" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{saveError}</p>
          )}
          <div className="flex gap-2 px-4 py-2.5">
            {RESULTS.map(({ v, label, color }) => {
              const isActive = activeResult === v
              return (
                <button key={v} onClick={() => setResult(v)}
                        className="flex-1 py-2 rounded-xl text-[11px] font-semibold"
                        style={{
                          background: isActive ? color : '#F7F3EE',
                          color: isActive ? '#fff' : '#6B5555',
                          border: `1.5px solid ${isActive ? color : 'rgba(123,31,58,0.22)'}`,
                        }}>
                  {label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── MARE DATA CARD (editable, inside detail sheet) ───────────
function MareDataCard({ sale }: { sale: SaleWithData }) {
  const update = useUpdateSemenSale()
  const [editing, setEditing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [f, setF] = useState({ mare_name: '', mare_birth_date: '', mare_chip: '', mare_ueln: '' })

  const open = () => {
    setF({
      mare_name:       sale.mare_name       ?? '',
      mare_birth_date: sale.mare_birth_date ?? '',
      mare_chip:       sale.mare_chip       ?? '',
      mare_ueln:       sale.mare_ueln       ?? '',
    })
    setErr(null); setEditing(true)
  }
  const save = () => {
    setErr(null)
    update.mutate({
      id: sale.id,
      mare_name:       f.mare_name.trim()  || null,
      mare_birth_date: f.mare_birth_date   || null,
      mare_chip:       f.mare_chip.trim()  || null,
      mare_ueln:       f.mare_ueln.trim()  || null,
    } as unknown as Partial<SemenSale> & { id: string }, {
      onSuccess: () => setEditing(false),
      onError:   e => setErr(errMsg(e)),
    })
  }

  const inp = { background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }
  const birth = (() => {
    try { return sale.mare_birth_date ? format(parseISO(sale.mare_birth_date), 'd MMM yyyy', { locale: es }) : '' } catch { return '' }
  })()
  const rows: [string, string][] = ([
    ['Nombre', sale.mare_name ?? ''],
    ['Nacimiento', birth],
    ['Chip', sale.mare_chip ?? ''],
    ['UELN', sale.mare_ueln ?? ''],
  ] as [string, string][])

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5 px-1">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Datos de la yegua</p>
        {!editing && (
          <button onClick={open} className="text-[12px] font-bold" style={{ color: '#7B1F3A' }}>Editar</button>
        )}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        {editing ? (
          <div className="p-4 space-y-3">
            <Field label="Nombre">
              <input value={f.mare_name} onChange={e => setF(p => ({ ...p, mare_name: e.target.value }))}
                     className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inp} />
            </Field>
            <Field label="Fecha de nacimiento">
              <input type="date" value={f.mare_birth_date} onChange={e => setF(p => ({ ...p, mare_birth_date: e.target.value }))}
                     className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inp} />
            </Field>
            <Field label="Chip">
              <input value={f.mare_chip} onChange={e => setF(p => ({ ...p, mare_chip: e.target.value }))}
                     className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inp} />
            </Field>
            <Field label="UELN">
              <input value={f.mare_ueln} onChange={e => setF(p => ({ ...p, mare_ueln: e.target.value }))}
                     className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inp} />
            </Field>
            {err && (
              <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{err}</p>
            )}
            <GranateButton onClick={save} disabled={update.isPending} fullWidth>
              {update.isPending ? 'Guardando...' : 'Guardar'}
            </GranateButton>
            <GhostButton onClick={() => setEditing(false)} fullWidth>Cancelar</GhostButton>
          </div>
        ) : (
          rows.map(([label, value], i) => (
            <div key={label} className="flex justify-between px-4 py-2.5"
                 style={{ borderTop: i > 0 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
              <span className="text-[13px]" style={{ color: '#6B5555' }}>{label}</span>
              <span className="text-[13px] font-semibold text-right max-w-[60%] break-all"
                    style={{ color: value ? '#1C1010' : '#A08888', fontWeight: value ? 600 : 400 }}>
                {value || '—'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── SALE DETAIL SHEET ────────────────────────────────────────
function SaleDetailSheet({ open, onClose, sale, stallionId }: {
  open: boolean; onClose: () => void; sale: SaleWithData; stallionId: string
}) {
  const deleteSale   = useDeleteSemenSale(stallionId)
  const c = sale.clients
  const [localResults, setLocalResults] = useState<Partial<Record<1|2|3|4|5, ShippingResult>>>({})

  const getEffectiveResult = (n: 1|2|3|4|5): ShippingResult | undefined =>
    localResults[n] ?? getShipping(sale.semen_shippings, n)?.result

  const isLocallyUnlocked = (n: 1|2|3|4|5): boolean => {
    if (n === 1) return true
    return getEffectiveResult((n - 1) as 1|2|3|4|5) === 'sin_prenez'
  }

  const saleDate = (() => {
    try { return format(parseISO(sale.created_at), 'd MMM yyyy', { locale: es }) } catch { return '' }
  })()

  return (
    <BottomSheet open={open} onClose={onClose}
                 title={`${c.name} · ${saleDate}`}>
      <div className="space-y-4">

        {/* PAYMENT */}
        <PaymentsPanel kind="semen" saleId={sale.id} agreedPrice={sale.agreed_price} payments={sale.payments} />

        {/* SHIPPINGS */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5 px-1"
             style={{ color: '#A08888' }}>
            Envíos
          </p>
          <div className="space-y-2">
            {([1, 2, 3, 4, 5] as const).map(n => (
              <ShippingCard key={n} n={n}
                            shipping={getShipping(sale.semen_shippings, n)}
                            unlocked={isLocallyUnlocked(n)}
                            saleId={sale.id}
                            localResult={localResults[n]}
                            onResultChange={result => setLocalResults(prev => ({ ...prev, [n]: result }))} />
            ))}
          </div>
        </div>

        <MareDataCard sale={sale} />

        {/* CLIENT DATA */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5 px-1"
             style={{ color: '#A08888' }}>
            Datos del comprador
          </p>
          <div className="rounded-2xl overflow-hidden"
               style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
            {([
              ['Nombre', c.name, false],
              c.stable_name ? ['Yeguada', c.stable_name, false] : null,
              c.city        ? ['Ciudad', c.city, false]         : null,
              c.phone       ? ['Teléfono', c.phone, false]      : null,
              c.instagram   ? ['Instagram', `@${c.instagram}`, true] : null,
              ['Precio acordado', `${sale.agreed_price.toLocaleString('es-ES')} €`, false],
              ['Fecha venta', saleDate, false],
              sale.notes ? ['Notas', sale.notes, false] : null,
            ] as ([string, string, boolean] | null)[]).filter(Boolean).map((row, i) => {
              const [label, value, isIg] = row as [string, string, boolean]
              return (
                <div key={i} className="flex justify-between px-4 py-2.5"
                     style={{ borderTop: i > 0 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                  <span className="text-[13px]" style={{ color: '#6B5555' }}>{label}</span>
                  <span className="text-[13px] font-semibold text-right max-w-[55%]"
                        style={{ color: isIg ? '#833AB4' : '#1C1010' }}>
                    {value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ELIMINAR CUBRICIÓN */}
        <div className="pt-2" style={{ borderTop: '1px solid rgba(123,31,58,0.09)' }}>
          <DeleteZone
            label={`venta · ${c.name}`}
            onDelete={() => deleteSale.mutate(sale.id, { onSuccess: onClose })}
            isPending={deleteSale.isPending}
          />
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── MAIN TAB ─────────────────────────────────────────────────
export default function TabCubriciones({ animal }: { animal: Animal }) {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [pendingOnly, setPendingOnly]   = useState(false)
  const [addOpen, setAddOpen]           = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  const { data: allSales = [], isLoading } = useSemenSales(animal.id)

  if (isLoading) return <LoadingScreen />

  const sales = allSales as SaleWithData[]
  // derive from fresh query data so the detail sheet never holds a stale snapshot
  const selected = selectedId ? sales.find(s => s.id === selectedId) ?? null : null

  // Available years in the data (always show current year as option)
  const years = [...new Set([currentYear, ...sales.map(s => s.year)])].sort((a, b) => b - a)

  const yearSales   = sales.filter(s => s.year === selectedYear)
  const filtered    = pendingOnly ? yearSales.filter(s => !hasPrenez(s.semen_shippings)) : yearSales

  // Financial stats for selected year
  const cobrado = yearSales.reduce((acc, s) => acc + summarizePayments(s.agreed_price, s.payments).paid, 0)
  const estimado    = yearSales.reduce((acc, s) => acc + s.agreed_price, 0)
  const totalEnvios = yearSales.reduce((acc, s) => acc + s.semen_shippings.length, 0)
  const exitoPct    = yearSales.length > 0
    ? Math.round((yearSales.filter(s => hasPrenez(s.semen_shippings)).length / yearSales.length) * 100)
    : 0

  return (
    <div className="p-3 pb-8 space-y-2.5">

      {/* FILTERS */}
      <div className="flex gap-2">
        <select value={selectedYear}
                onChange={e => setSelectedYear(+e.target.value)}
                className="flex-1 rounded-xl px-3 py-2.5 text-[13px] font-semibold outline-none appearance-none"
                style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)', color: '#1C1010' }}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button onClick={() => setPendingOnly(p => !p)}
                className="rounded-xl px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap"
                style={{
                  background: pendingOnly ? '#7B1F3A' : '#fff',
                  color:      pendingOnly ? '#fff'    : '#6B5555',
                  border:     `1px solid ${pendingOnly ? '#7B1F3A' : 'rgba(123,31,58,0.11)'}`,
                }}>
          Solo pendientes
        </button>
      </div>

      {/* FINANCIAL SUMMARY */}
      {yearSales.length > 0 && (
        <div className="rounded-2xl overflow-hidden"
             style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <div className="px-4 py-4" style={{ background: '#7B1F3A' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider"
               style={{ color: 'rgba(255,255,255,0.65)' }}>
              Cobrado · {selectedYear}
            </p>
            <p className="text-[28px] font-bold mt-1" style={{ color: '#fff' }}>
              {cobrado.toLocaleString('es-ES')} €
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
              De {yearSales.length} {yearSales.length === 1 ? 'venta' : 'ventas'} · {totalEnvios} envíos realizados
            </p>
          </div>
          {estimado > cobrado && (
            <div className="flex items-center justify-between px-4 py-2.5"
                 style={{ background: '#FDF3DC', borderBottom: '1px solid rgba(156,106,0,0.15)' }}>
              <span className="text-[11px]" style={{ color: '#9C6A00' }}>
                Pendiente de cobrar
              </span>
              <span className="text-[14px] font-bold" style={{ color: '#9C6A00' }}>
                {(estimado - cobrado).toLocaleString('es-ES')} €
              </span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 p-3">
            {[
              [`${yearSales.length}`, 'Ventas',        '#1C1010'],
              [`${totalEnvios}`,      'Envíos totales', '#1C1010'],
              [`${exitoPct}%`,        'Con preñez',     '#2E6B3E'],
            ].map(([v, l, c]) => (
              <div key={l} className="text-center rounded-xl py-2" style={{ background: '#F7F3EE' }}>
                <p className="text-[16px] font-bold" style={{ color: c }}>{v}</p>
                <p className="text-[10px]" style={{ color: '#A08888' }}>{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SALES LIST */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Ventas · {filtered.length}
          </p>
          <button onClick={() => setAddOpen(true)}
                  className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
            + Nueva venta
          </button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="💉"
            title={pendingOnly ? 'Sin ventas pendientes' : 'Sin ventas registradas'}
            subtitle={pendingOnly
              ? 'No hay ventas pendientes de preñez este año'
              : 'Registra la primera venta de semen'}
          />
        ) : (
          filtered.map((sale, i) => {
            const ships = sale.semen_shippings
            const ps    = summarizePayments(sale.agreed_price, sale.payments)
            const pl    = PAYMENT_STATUS_COLOR[ps.status]
            const barW  = `${ps.pct}%`

            return (
              <button key={sale.id}
                      onClick={() => setSelectedId(sale.id)}
                      className="w-full text-left px-4 py-3 active:bg-[#F5E8EC]"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                {/* Top: avatar + name + price + date */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0"
                       style={{ background: '#E8F0F8', color: '#1A4F7A' }}>
                    {initials(sale.clients.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate" style={{ color: '#1C1010' }}>
                      {sale.clients.name}
                    </p>
                    <p className="text-[11px] truncate" style={{ color: '#6B5555' }}>
                      {[
                        sale.clients.city,
                        sale.mare_name ? `Yegua: ${sale.mare_name}` : null,
                        sale.clients.stable_name,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold" style={{ color: '#1C1010' }}>
                      {sale.agreed_price.toLocaleString('es-ES')} €
                    </p>
                    <p className="text-[10px]" style={{ color: '#A08888' }}>
                      {(() => { try { return format(parseISO(sale.created_at), 'd MMM yyyy', { locale: es }) } catch { return '' } })()}
                    </p>
                  </div>
                </div>

                {/* Payment bar */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F7F3EE' }}>
                    <div className="h-full rounded-full" style={{ width: barW, background: pl.color }} />
                  </div>
                  <span className="text-[10px] font-semibold shrink-0" style={{ color: pl.color }}>
                    {PAYMENT_STATUS_LABEL[ps.status]}{ps.status === 'parcial' ? ` · ${ps.paid.toLocaleString('es-ES')} €` : ''}
                  </span>
                </div>

                {/* Shipping dots */}
                <div className="flex items-center gap-0.5">
                  {([1, 2, 3, 4, 5] as const).map((n, idx) => (
                    <Fragment key={n}>
                      <ShipDot n={n}
                               shipping={getShipping(ships, n)}
                               unlocked={isUnlocked(ships, n)} />
                      {idx < 4 && (
                        <div className="w-2 h-px shrink-0"
                             style={{ background: 'rgba(123,31,58,0.15)' }} />
                      )}
                    </Fragment>
                  ))}
                  <span className="ml-2 text-[11px]">
                    <ShipLabel shippings={ships} />
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>

      <AddSaleSheet open={addOpen} onClose={() => setAddOpen(false)}
                    stallionId={animal.id} onSaved={() => {}} />

      {selected && (
        <SaleDetailSheet open={!!selected} onClose={() => setSelectedId(null)}
                         sale={selected} stallionId={animal.id} />
      )}
    </div>
  )
}
