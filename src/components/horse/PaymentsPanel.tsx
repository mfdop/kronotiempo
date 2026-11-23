import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { BottomSheet, Field, GranateButton, GhostButton } from '../ui'
import { useCreatePayment, useDeletePayment } from '../../hooks/useReproduction'
import { errMsg } from '../../lib/errors'
import {
  PAYMENT_METHODS, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL, summarizePayments,
} from '../../lib/payments'
import type { Payment } from '../../types'

function fmtEur(n: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) + ' €'
}
function fmtDate(iso: string) {
  try { return format(parseISO(iso), 'd MMM yyyy', { locale: es }) } catch { return iso }
}

const inputStyle = { background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }

// ─── ADD PAYMENT SHEET ───────────────────────────────────────
function AddPaymentSheet({ open, onClose, kind, saleId, pending }: {
  open: boolean; onClose: () => void
  kind: 'pregnancy' | 'semen'; saleId: string; pending: number
}) {
  const create = useCreatePayment()
  const today  = format(new Date(), 'yyyy-MM-dd')
  const [amount, setAmount] = useState('')
  const [date,   setDate]   = useState(today)
  const [method, setMethod] = useState('')
  const [notes,  setNotes]  = useState('')
  const [error,  setError]  = useState<string | null>(null)

  const save = async () => {
    const n = parseFloat(amount.replace(',', '.'))
    if (!n || n <= 0) { setError('Introduce un importe mayor que 0'); return }
    setError(null)
    try {
      await create.mutateAsync({
        ...(kind === 'pregnancy' ? { pregnancy_sale_id: saleId } : { semen_sale_id: saleId }),
        amount: n,
        paid_date: date || today,
        method: method.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      setAmount(''); setDate(today); setMethod(''); setNotes('')
      onClose()
    } catch (e) {
      setError(errMsg(e))
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Añadir pago">
      <div className="space-y-1">
        <Field label="Importe (€) *" hint={pending > 0 ? `Pendiente: ${fmtEur(pending)}` : undefined}>
          <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                 placeholder="0" className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={inputStyle} />
        </Field>
        <Field label="Fecha">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inputStyle} />
        </Field>
        <Field label="Método (opcional)">
          <div className="flex gap-1.5 flex-wrap mb-2">
            {PAYMENT_METHODS.map(m => (
              <button key={m} type="button" onClick={() => setMethod(method === m ? '' : m)}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-semibold capitalize"
                      style={{
                        background: method === m ? '#7B1F3A' : '#F7F3EE',
                        color: method === m ? '#fff' : '#6B5555',
                        border: `1.5px solid ${method === m ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                      }}>{m}</button>
            ))}
          </div>
          <input value={method} onChange={e => setMethod(e.target.value)} placeholder="Otro método..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inputStyle} />
        </Field>
        <Field label="Nota (opcional)">
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: reserva, segundo plazo..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none" style={inputStyle} />
        </Field>
        {error && <p className="text-[13px] rounded-xl px-4 py-2.5 mb-3" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{error}</p>}
        <GranateButton onClick={save} disabled={create.isPending} fullWidth>
          {create.isPending ? 'Guardando...' : 'Guardar pago'}
        </GranateButton>
        <GhostButton onClick={onClose} fullWidth>Cancelar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── PAYMENTS PANEL ──────────────────────────────────────────
export default function PaymentsPanel({ kind, saleId, agreedPrice, payments }: {
  kind: 'pregnancy' | 'semen'
  saleId: string
  agreedPrice: number
  payments?: Payment[] | null
}) {
  const del = useDeletePayment()
  const [addOpen, setAddOpen]       = useState(false)
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)

  const list = [...(payments ?? [])].sort((a, b) =>
    b.paid_date.localeCompare(a.paid_date) || b.created_at.localeCompare(a.created_at))
  const sum = summarizePayments(agreedPrice, list)
  const st  = PAYMENT_STATUS_COLOR[sum.status]

  const remove = async (id: string) => {
    setError(null)
    try { await del.mutateAsync(id); setConfirmId(null) }
    catch (e) { setError(errMsg(e)) }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Pagos</p>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={st}>
          {PAYMENT_STATUS_LABEL[sum.status]}
        </span>
      </div>

      <div className="px-4 pt-3">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#F7F3EE' }}>
          <div className="h-full rounded-full transition-all"
               style={{ width: `${sum.pct}%`, background: sum.status === 'completo' ? '#2E6B3E' : '#9C6A00' }} />
        </div>
        <div className="flex justify-between pt-2.5 pb-3">
          <div>
            <p className="text-[10px]" style={{ color: '#A08888' }}>Pagado</p>
            <p className="text-[15px] font-bold" style={{ color: '#2E6B3E' }}>{fmtEur(sum.paid)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px]" style={{ color: '#A08888' }}>Pendiente</p>
            <p className="text-[15px] font-bold" style={{ color: sum.pending > 0 ? '#9C6A00' : '#A08888' }}>{fmtEur(sum.pending)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: '#A08888' }}>Acordado · {sum.pct}%</p>
            <p className="text-[15px] font-bold" style={{ color: '#1C1010' }}>{fmtEur(agreedPrice)}</p>
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-center py-3 text-[13px] italic" style={{ color: '#A08888', borderTop: '1px solid rgba(123,31,58,0.08)' }}>
          Sin pagos registrados
        </p>
      ) : list.map(p => (
        <div key={p.id} className="px-4 py-2.5" style={{ borderTop: '1px solid rgba(123,31,58,0.08)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>
                {fmtDate(p.paid_date)}{p.method ? <span className="font-normal capitalize" style={{ color: '#6B5555' }}> · {p.method}</span> : null}
              </p>
              {p.notes && <p className="text-[11px] italic" style={{ color: '#A08888' }}>{p.notes}</p>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[14px] font-bold" style={{ color: '#2E6B3E' }}>{fmtEur(Number(p.amount))}</span>
              <button onClick={() => setConfirmId(confirmId === p.id ? null : p.id)}
                      className="text-[14px] leading-none" style={{ color: '#A08888' }} aria-label="Eliminar pago">🗑</button>
            </div>
          </div>
          {confirmId === p.id && (
            <div className="flex items-center gap-2 mt-2 rounded-xl px-3 py-2" style={{ background: '#FCEAEA' }}>
              <p className="flex-1 text-[12px] font-semibold" style={{ color: '#8C1F1F' }}>¿Eliminar este pago?</p>
              <button onClick={() => setConfirmId(null)} className="text-[12px] font-semibold px-2" style={{ color: '#6B5555' }}>Cancelar</button>
              <button onClick={() => remove(p.id)} disabled={del.isPending}
                      className="text-[12px] font-bold px-3 py-1 rounded-lg text-white"
                      style={{ background: '#8C1F1F', opacity: del.isPending ? 0.6 : 1 }}>Eliminar</button>
            </div>
          )}
        </div>
      ))}
      {error && <p className="text-[12px] px-4 py-2" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{error}</p>}

      <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(123,31,58,0.08)' }}>
        <button onClick={() => setAddOpen(true)} className="text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
          + Añadir pago
        </button>
      </div>

      <AddPaymentSheet open={addOpen} onClose={() => setAddOpen(false)}
                       kind={kind} saleId={saleId} pending={sum.pending} />
    </div>
  )
}
