import { useAnimals } from '../../hooks/useAnimals'
import {
  useSemenSales,
  usePregnancySalesForMare,
  useMaintenanceEntries,
} from '../../hooks/useReproduction'
import type { Animal } from '../../types'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount) + ' €'
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: color + '22', border: `1px solid ${color}44` }}>
      <p className="text-[11px] font-semibold" style={{ color }}>{label}</p>
      <p className="text-[18px] font-bold mt-0.5" style={{ color: '#1C1010' }}>{fmt(value)}</p>
    </div>
  )
}

type TimelineItem = {
  date: string
  label: string
  amount: number
  sign: '+' | '-'
  color: string
}

function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) return (
    <p className="text-[13px] text-center py-4" style={{ color: '#A08888' }}>Sin movimientos registrados</p>
  )
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 px-1" style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
          <div>
            <p className="text-[13px] font-medium" style={{ color: '#1C1010' }}>{item.label}</p>
            <p className="text-[11px]" style={{ color: '#A08888' }}>{item.date}</p>
          </div>
          <span className="text-[15px] font-bold" style={{ color: item.color }}>
            {item.sign}{fmt(item.amount)}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── SEMENTAL BALANCE ─────────────────────────────────────────────────────────

// Stallions only count cubriciones (semen sales); foal sales belong to the dam.
function SementalBalance({ animal }: { animal: Animal }) {
  const { data: sales } = useSemenSales(animal.id)

  const totalCobrado = (sales ?? []).reduce((s, sale) => {
    return s + (sale.deposit_amount ?? 0) + (sale.final_amount ?? 0)
  }, 0)
  const totalPendiente = (sales ?? []).reduce((s, sale) => {
    if (sale.payment_status === 'completo') return s
    const cobrado = (sale.deposit_amount ?? 0) + (sale.final_amount ?? 0)
    return s + Math.max(0, sale.agreed_price - cobrado)
  }, 0)
  const acquisition = animal.purchase_price ?? 0

  const net = totalCobrado - acquisition

  const items: TimelineItem[] = [
    ...(acquisition > 0 ? [{ date: animal.purchase_date ?? '—', label: 'Adquisición', amount: acquisition, sign: '-' as const, color: '#8C1F1F' }] : []),
    ...(sales ?? []).map(s => ({
      date: s.created_at.slice(0, 10),
      label: `Cubrición${s.mare_name ? ` · ${s.mare_name}` : ''}`,
      amount: (s.deposit_amount ?? 0) + (s.final_amount ?? 0),
      sign: '+' as const,
      color: '#2E6B3E',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div className="flex gap-3">
        <SummaryCard label="Cobrado" value={totalCobrado} color="#2E6B3E" />
        {totalPendiente > 0 && <SummaryCard label="Pendiente" value={totalPendiente} color="#9C6A00" />}
        {acquisition > 0 && <SummaryCard label="Inversión" value={acquisition} color="#8C1F1F" />}
      </div>
      <div className="rounded-2xl px-4 py-3 text-center" style={{ background: net >= 0 ? '#EAF3EC' : '#FCEAEA', border: `1px solid ${net >= 0 ? '#2E6B3E' : '#8C1F1F'}33` }}>
        <p className="text-[11px] font-semibold" style={{ color: net >= 0 ? '#2E6B3E' : '#8C1F1F' }}>Balance neto</p>
        <p className="text-[24px] font-bold" style={{ color: net >= 0 ? '#2E6B3E' : '#8C1F1F' }}>
          {net >= 0 ? '+' : ''}{fmt(net)}
        </p>
      </div>
      <Timeline items={items} />
    </>
  )
}

// ─── YEGUA BALANCE ────────────────────────────────────────────────────────────

function YeguaBalance({ animal, foals }: { animal: Animal; foals: Animal[] }) {
  const { data: pregSales } = usePregnancySalesForMare(animal.id)

  const totalCobrado = (pregSales ?? []).reduce((s, sale) => {
    return s + (sale.deposit_amount ?? 0) + (sale.final_amount ?? 0)
  }, 0)
  const totalPendiente = (pregSales ?? []).reduce((s, sale) => {
    if (sale.payment_status === 'completo') return s
    const cobrado = (sale.deposit_amount ?? 0) + (sale.final_amount ?? 0)
    return s + Math.max(0, sale.agreed_price - cobrado)
  }, 0)
  const foalIncome = foals.filter(f => f.sold_price).reduce((s, f) => s + (f.sold_price ?? 0), 0)
  const acquisition = animal.purchase_price ?? 0
  const net = totalCobrado + foalIncome - acquisition

  const items: TimelineItem[] = [
    ...(acquisition > 0 ? [{ date: animal.purchase_date ?? '—', label: 'Adquisición', amount: acquisition, sign: '-' as const, color: '#8C1F1F' }] : []),
    ...(pregSales ?? []).map(s => ({
      date: (s as { pregnancies?: { actual_birth_date?: string } }).pregnancies?.actual_birth_date ?? s.created_at.slice(0, 10),
      label: `Venta de vientre`,
      amount: (s.deposit_amount ?? 0) + (s.final_amount ?? 0),
      sign: '+' as const,
      color: '#2E6B3E',
    })),
    ...foals.filter(f => f.sold_price).map(f => ({
      date: f.sold_date ?? '—',
      label: `Cría vendida · ${f.name}`,
      amount: f.sold_price ?? 0,
      sign: '+' as const,
      color: '#2E6B3E',
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div className="flex gap-3">
        <SummaryCard label="Cobrado" value={totalCobrado + foalIncome} color="#2E6B3E" />
        {totalPendiente > 0 && <SummaryCard label="Pendiente" value={totalPendiente} color="#9C6A00" />}
        {acquisition > 0 && <SummaryCard label="Inversión" value={acquisition} color="#8C1F1F" />}
      </div>
      <div className="rounded-2xl px-4 py-3 text-center" style={{ background: net >= 0 ? '#EAF3EC' : '#FCEAEA', border: `1px solid ${net >= 0 ? '#2E6B3E' : '#8C1F1F'}33` }}>
        <p className="text-[11px] font-semibold" style={{ color: net >= 0 ? '#2E6B3E' : '#8C1F1F' }}>Balance neto</p>
        <p className="text-[24px] font-bold" style={{ color: net >= 0 ? '#2E6B3E' : '#8C1F1F' }}>
          {net >= 0 ? '+' : ''}{fmt(net)}
        </p>
      </div>
      <Timeline items={items} />
    </>
  )
}

// ─── CUSTODIA BALANCE ─────────────────────────────────────────────────────────

function CustodiaBalance({ animal }: { animal: Animal }) {
  const { data: entries } = useMaintenanceEntries(animal.id)

  const totalPagado = (entries ?? []).filter(e => e.payment_status === 'pagado').reduce((s, e) => s + e.amount, 0)
  const totalPendiente = (entries ?? []).filter(e => e.payment_status === 'pendiente').reduce((s, e) => s + e.amount, 0)

  const items: TimelineItem[] = (entries ?? [])
    .filter(e => e.payment_status === 'pagado')
    .map(e => ({
      date: e.month,
      label: `Manutención · ${e.month.slice(0, 7)}`,
      amount: e.amount,
      sign: '+' as const,
      color: '#2E6B3E',
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <div className="flex gap-3">
        <SummaryCard label="Cobrado" value={totalPagado} color="#2E6B3E" />
        {totalPendiente > 0 && <SummaryCard label="Pendiente" value={totalPendiente} color="#9C6A00" />}
      </div>
      <Timeline items={items} />
    </>
  )
}

// ─── DEFAULT (potro/potra/castrado) ──────────────────────────────────────────

function DefaultBalance({ animal }: { animal: Animal }) {
  const acquisition = animal.purchase_price ?? 0
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
      {acquisition > 0 ? (
        <>
          <p className="text-[12px] font-semibold mb-1" style={{ color: '#6B5555' }}>Coste de adquisición</p>
          <p className="text-[24px] font-bold" style={{ color: '#8C1F1F' }}>{fmt(acquisition)}</p>
          <p className="text-[11px] mt-1" style={{ color: '#A08888' }}>La venta aparece en el balance de la madre</p>
        </>
      ) : (
        <p className="text-[13px]" style={{ color: '#A08888' }}>Sin movimientos económicos directos</p>
      )}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function TabBalance({ animal }: { animal: Animal }) {
  const { data: animals } = useAnimals()
  const foals = (animals ?? []).filter(a => a.dam_id === animal.id && a.sold_price)

  const isMale   = animal.sex === 'semental'
  const isFemale = animal.sex === 'yegua' || animal.sex === 'potra'
  const isCustodia = animal.status === 'custodia'

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="p-4 rounded-2xl space-y-4" style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
          Resumen económico
        </p>

        {isCustodia && <CustodiaBalance animal={animal} />}
        {!isCustodia && isMale && <SementalBalance animal={animal} />}
        {!isCustodia && isFemale && <YeguaBalance animal={animal} foals={foals} />}
        {!isCustodia && !isMale && !isFemale && <DefaultBalance animal={animal} />}
      </div>
    </div>
  )
}
