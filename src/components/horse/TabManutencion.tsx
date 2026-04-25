import { useState, useEffect } from 'react'
import { format, startOfMonth, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  useMaintenanceFees,
  useCreateMaintenanceFee,
  useMaintenanceEntries,
  useCreateMaintenanceEntry,
  useUpdateMaintenanceEntry,
} from '../../hooks/useReproduction'
import { BottomSheet } from '../ui'
import type { Animal, MaintenanceEntry } from '../../types'

function fmt(amount: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' €'
}

function monthLabel(isoDate: string) {
  return format(parseISO(isoDate), 'MMMM yyyy', { locale: es })
}

// ─── EDIT FEE SHEET ───────────────────────────────────────────────────────────

function EditFeeSheet({
  open, onClose, animalId, currentAmount,
}: {
  open: boolean; onClose: () => void; animalId: string; currentAmount: number
}) {
  const createFee = useCreateMaintenanceFee()
  const [amount, setAmount] = useState(String(currentAmount))

  useEffect(() => { if (open) setAmount(String(currentAmount)) }, [open, currentAmount])

  const handleSave = () => {
    const val = parseFloat(amount)
    if (!val || val <= 0) return
    createFee.mutate(
      {
        animal_id: animalId,
        monthly_amount: val,
        effective_from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      },
      { onSuccess: onClose }
    )
  }

  const inputStyle = { background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)', color: '#1C1010', borderRadius: 12, padding: '10px 14px', fontSize: 16, width: '100%', outline: 'none' }

  return (
    <BottomSheet open={open} onClose={onClose} title="Mensualidad">
      <div className="space-y-4">
        <div>
          <p className="text-[12px] mb-1.5" style={{ color: '#6B5555' }}>Importe mensual (€)</p>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0" min="0" style={inputStyle} />
        </div>
        <p className="text-[12px]" style={{ color: '#A08888' }}>
          El nuevo importe se aplica desde el mes actual. Los meses anteriores conservan su tarifa.
        </p>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-[14px] font-semibold" style={{ background: '#F7F3EE', color: '#6B5555' }}>Cancelar</button>
          <button onClick={handleSave} disabled={createFee.isPending} className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-white" style={{ background: '#7B1F3A' }}>
            {createFee.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── ENTRY ROW ────────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: MaintenanceEntry }) {
  const update = useUpdateMaintenanceEntry()
  const [local, setLocal] = useState(entry.payment_status)

  useEffect(() => { setLocal(entry.payment_status) }, [entry.payment_status])

  const toggle = () => {
    const next = local === 'pagado' ? 'pendiente' : 'pagado'
    setLocal(next)
    update.mutate({
      id: entry.id,
      payment_status: next,
      paid_date: next === 'pagado' ? format(new Date(), 'yyyy-MM-dd') : undefined,
    })
  }

  const isPagado = local === 'pagado'

  return (
    <div className="flex items-center justify-between py-3 px-1" style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
      <div>
        <p className="text-[14px] font-medium capitalize" style={{ color: '#1C1010' }}>{monthLabel(entry.month)}</p>
        <p className="text-[12px]" style={{ color: '#A08888' }}>{fmt(entry.amount)}</p>
      </div>
      <button onClick={toggle} disabled={update.isPending}
        className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
        style={{
          background: isPagado ? '#EAF3EC' : '#FDF3DC',
          color: isPagado ? '#2E6B3E' : '#9C6A00',
          border: `1.5px solid ${isPagado ? '#2E6B3E' : '#9C6A00'}44`,
        }}>
        {isPagado ? 'Pagado ✓' : 'Pendiente'}
      </button>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function TabManutencion({ animal }: { animal: Animal }) {
  const { data: fees } = useMaintenanceFees(animal.id)
  const { data: entries } = useMaintenanceEntries(animal.id)
  const createEntry = useCreateMaintenanceEntry()
  const [editFeeOpen, setEditFeeOpen] = useState(false)
  const [autoCreated, setAutoCreated] = useState(false)

  const currentFee = fees?.[0]
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  // Auto-create current month entry if missing
  useEffect(() => {
    if (!currentFee || !entries || autoCreated) return
    const hasCurrentMonth = entries.some(e => e.month === currentMonth)
    if (!hasCurrentMonth) {
      setAutoCreated(true)
      createEntry.mutate({
        animal_id: animal.id,
        fee_id: currentFee.id,
        month: currentMonth,
        amount: currentFee.monthly_amount,
        payment_status: 'pendiente',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFee, entries])

  const totalPagado = (entries ?? []).filter(e => e.payment_status === 'pagado').reduce((s, e) => s + e.amount, 0)
  const totalPendiente = (entries ?? []).filter(e => e.payment_status === 'pendiente').reduce((s, e) => s + e.amount, 0)
  const cardStyle = { background: '#fff', border: '1px solid rgba(123,31,58,0.11)', borderRadius: 16 }

  return (
    <div className="p-4 space-y-4 pb-8">

      {/* FEE CONFIG */}
      <div className="p-4" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Mensualidad actual</p>
            <p className="text-[28px] font-bold mt-1" style={{ color: '#1C1010' }}>
              {currentFee ? fmt(currentFee.monthly_amount) : '—'}
            </p>
            {currentFee && (
              <p className="text-[11px] mt-0.5" style={{ color: '#A08888' }}>
                desde {format(parseISO(currentFee.effective_from), "MMM yyyy", { locale: es })}
              </p>
            )}
          </div>
          <button onClick={() => setEditFeeOpen(true)}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold"
            style={{ background: '#F5E8EC', color: '#7B1F3A', border: '1.5px solid rgba(123,31,58,0.3)' }}>
            {currentFee ? 'Editar' : 'Configurar'}
          </button>
        </div>

        {animal.custody_owner_name && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(123,31,58,0.09)' }}>
            <p className="text-[12px]" style={{ color: '#6B5555' }}>Propietario: <span style={{ color: '#1C1010' }}>{animal.custody_owner_name}</span></p>
            {animal.custody_owner_phone && (
              <p className="text-[12px] mt-0.5" style={{ color: '#6B5555' }}>Tel: <a href={`tel:${animal.custody_owner_phone}`} style={{ color: '#7B1F3A' }}>{animal.custody_owner_phone}</a></p>
            )}
          </div>
        )}
      </div>

      {/* SUMMARY */}
      {entries && entries.length > 0 && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#EAF3EC', border: '1px solid #2E6B3E33' }}>
            <p className="text-[11px] font-semibold" style={{ color: '#2E6B3E' }}>Total cobrado</p>
            <p className="text-[18px] font-bold mt-0.5" style={{ color: '#1C1010' }}>{fmt(totalPagado)}</p>
          </div>
          {totalPendiente > 0 && (
            <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#FDF3DC', border: '1px solid #9C6A0033' }}>
              <p className="text-[11px] font-semibold" style={{ color: '#9C6A00' }}>Pendiente</p>
              <p className="text-[18px] font-bold mt-0.5" style={{ color: '#1C1010' }}>{fmt(totalPendiente)}</p>
            </div>
          )}
        </div>
      )}

      {/* ENTRIES LIST */}
      <div className="p-4" style={cardStyle}>
        <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: '#A08888' }}>Historial mensual</p>

        {!currentFee && (
          <p className="text-[13px] text-center py-4" style={{ color: '#A08888' }}>
            Configura la mensualidad para comenzar a registrar pagos.
          </p>
        )}

        {(entries ?? []).length === 0 && currentFee && (
          <p className="text-[13px] text-center py-4" style={{ color: '#A08888' }}>Sin entradas aún.</p>
        )}

        {(entries ?? []).map(entry => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </div>

      <EditFeeSheet
        open={editFeeOpen}
        onClose={() => setEditFeeOpen(false)}
        animalId={animal.id}
        currentAmount={currentFee?.monthly_amount ?? 0}
      />
    </div>
  )
}
