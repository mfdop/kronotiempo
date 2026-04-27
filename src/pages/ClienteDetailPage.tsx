import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useClientById, useClientTransactions, useDeleteClient } from '../hooks/useReproduction'
import { LoadingScreen, EmptyState, DeleteZone } from '../components/ui'
import type { ClientTagType, SemenSale, PregnancySale, PregnancyInterested } from '../types'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n) + ' €'
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), "d MMM yyyy", { locale: es }) }
  catch { return iso.slice(0, 10) }
}

const TAG_CONFIG: Record<ClientTagType, { label: string; bg: string; color: string }> = {
  cubricion:  { label: 'Cubrición',  bg: 'rgba(26,79,122,0.8)',    color: '#fff' },
  vientre:    { label: 'Vientre',    bg: 'rgba(46,107,62,0.8)',     color: '#fff' },
  interesado: { label: 'Interesado', bg: 'rgba(123,31,58,0.8)',     color: '#fff' },
  vendedor:   { label: 'Vendedor',   bg: 'rgba(140,31,31,0.8)',     color: '#fff' },
}

// ─── UNIFIED TRANSACTION ──────────────────────────────────────────────────────

type TxItem = {
  id: string
  type: 'cubricion' | 'vientre' | 'interesado'
  icon: string
  iconBg: string
  title: string
  meta: string
  amount?: number
  amountColor: string
  paymentStatus?: string
  date: string
}

function buildTimeline(
  semSales: SemenSale[],
  pregSales: PregnancySale[],
  interested: PregnancyInterested[]
): TxItem[] {
  const items: TxItem[] = []

  semSales.forEach(s => {
    const paid = (s.deposit_amount ?? 0) + (s.final_amount ?? 0)
    items.push({
      id: s.id,
      type: 'cubricion',
      icon: '💉',
      iconBg: '#E8F0F8',
      title: 'Cubrición',
      meta: s.mare_name ? `Yegua: ${s.mare_name}` : `Año ${s.year}`,
      amount: paid || s.agreed_price,
      amountColor: paid > 0 ? '#2E6B3E' : '#9C6A00',
      paymentStatus: s.payment_status,
      date: s.created_at,
    })
  })

  pregSales.forEach(s => {
    const paid = (s.deposit_amount ?? 0) + (s.final_amount ?? 0)
    items.push({
      id: s.id,
      type: 'vientre',
      icon: '🐴',
      iconBg: '#EAF3EC',
      title: 'Venta de vientre',
      meta: `Precio acordado: ${fmt(s.agreed_price)}`,
      amount: paid || s.agreed_price,
      amountColor: paid > 0 ? '#2E6B3E' : '#9C6A00',
      paymentStatus: s.payment_status,
      date: s.created_at,
    })
  })

  interested.forEach(i => {
    items.push({
      id: i.id,
      type: 'interesado',
      icon: '⭐',
      iconBg: '#F5E8EC',
      title: 'Interesado en cría',
      meta: `Registrado ${fmtDate(i.created_at)}`,
      amountColor: '#A08888',
      date: i.created_at,
    })
  })

  return items.sort((a, b) => b.date.localeCompare(a.date))
}

const PAY_STATUS_LABELS: Record<string, string> = {
  sin_reserva: 'Sin reserva',
  reserva:     'Con reserva',
  completo:    'Completo',
}
const PAY_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  sin_reserva: { bg: '#F7F3EE', color: '#A08888' },
  reserva:     { bg: '#FDF3DC', color: '#9C6A00' },
  completo:    { bg: '#EAF3EC', color: '#2E6B3E' },
}

// ─── TX ROW ───────────────────────────────────────────────────────────────────

function TxRow({ item }: { item: TxItem }) {
  const paySt = item.paymentStatus
  const payColor = paySt ? (PAY_STATUS_COLORS[paySt] ?? PAY_STATUS_COLORS.sin_reserva) : null

  return (
    <div className="flex items-start gap-3 px-3.5 py-3"
         style={{ borderTop: '1px solid rgba(123,31,58,0.07)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] shrink-0"
           style={{ background: item.iconBg }}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{item.title}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#6B5555' }}>{item.meta}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {item.amount !== undefined && (
          <span className="text-[13px] font-bold" style={{ color: item.amountColor }}>
            {fmt(item.amount)}
          </span>
        )}
        {payColor && paySt && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={payColor}>
            {PAY_STATUS_LABELS[paySt] ?? paySt}
          </span>
        )}
        <span className="text-[10px]" style={{ color: '#A08888' }}>{fmtDate(item.date)}</span>
      </div>
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ClienteDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const { data: client, isLoading }    = useClientById(id)
  const { data: transactions }         = useClientTransactions(id)
  const deleteClient                   = useDeleteClient()

  if (isLoading) return <LoadingScreen />
  if (!client)   return (
    <EmptyState title="Cliente no encontrado"
                action={{ label: '‹ Volver', onClick: () => navigate(-1) }} />
  )

  const { semSales = [], pregSales = [], interested = [] } = transactions ?? {}
  const timeline = buildTimeline(semSales, pregSales, interested)

  const totalPaid = [...semSales, ...pregSales].reduce((s, t) => {
    return s + (t.deposit_amount ?? 0) + (t.final_amount ?? 0)
  }, 0)
  const totalPending = [...semSales, ...pregSales].reduce((s, t) => {
    if (t.payment_status === 'completo') return s
    const paid = (t.deposit_amount ?? 0) + (t.final_amount ?? 0)
    return s + Math.max(0, t.agreed_price - paid)
  }, 0)

  // Compute tags from transactions
  const tags: ClientTagType[] = []
  if (semSales.length > 0) tags.push('cubricion')
  if (pregSales.length > 0) tags.push('vientre')
  if (interested.length > 0) tags.push('interesado')

  const initial = client.name.trim()[0]?.toUpperCase() ?? '?'

  return (
    <div className="flex flex-col h-full">
      {/* HERO */}
      <div className="shrink-0" style={{ background: 'linear-gradient(165deg, #5C1629 0%, #7B1F3A 100%)' }}>
        <div className="safe-top" />
        <button onClick={() => navigate(-1)}
          className="px-4 pt-2 text-[13px] font-medium block"
          style={{ color: 'rgba(255,255,255,0.8)' }}>
          ‹ Clientes
        </button>
        <div className="flex items-center gap-3.5 px-4 pb-5 pt-2">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-[22px] font-bold shrink-0"
               style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.35)', color: '#fff' }}>
            {initial}
          </div>
          <div className="flex-1">
            <h1 className="text-[20px] font-bold text-white tracking-tight">{client.name}</h1>
            <p className="text-[12px] mt-0.5" style={{ color: 'rgba(255,255,255,0.72)' }}>
              {[client.stable_name, client.city].filter(Boolean).join(' · ') || 'Sin datos de yeguada'}
            </p>
            {/* Chips */}
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {tags.map(tag => (
                <span key={tag} className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl"
                      style={TAG_CONFIG[tag]}>
                  {TAG_CONFIG[tag].label}
                </span>
              ))}
              {totalPaid > 0 && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl"
                      style={{ background: 'rgba(46,107,62,0.8)', color: '#fff' }}>
                  {fmt(totalPaid)} cobrado
                </span>
              )}
              {totalPending > 0 && (
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-xl"
                      style={{ background: 'rgba(156,106,0,0.8)', color: '#fff' }}>
                  {fmt(totalPending)} pendiente
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4 pb-8"
           style={{ background: '#F7F3EE' }}>

        {/* Contact card */}
        <div className="rounded-2xl overflow-hidden"
             style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Contacto</p>
          </div>
          {client.phone && (
            <a href={`tel:${client.phone}`}
               className="flex items-center justify-between px-4 py-2.5"
               style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
              <span className="text-[13px]" style={{ color: '#6B5555' }}>Teléfono</span>
              <span className="text-[13px] font-semibold" style={{ color: '#7B1F3A' }}>📞 {client.phone}</span>
            </a>
          )}
          {client.instagram && (
            <div className="flex items-center justify-between px-4 py-2.5"
                 style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
              <span className="text-[13px]" style={{ color: '#6B5555' }}>Instagram</span>
              <span className="text-[13px] font-semibold" style={{ color: '#833AB4' }}>@{client.instagram}</span>
            </div>
          )}
          {client.city && (
            <div className="flex items-center justify-between px-4 py-2.5"
                 style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
              <span className="text-[13px]" style={{ color: '#6B5555' }}>Ciudad</span>
              <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{client.city}</span>
            </div>
          )}
          {client.stable_name && (
            <div className="flex items-center justify-between px-4 py-2.5"
                 style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
              <span className="text-[13px]" style={{ color: '#6B5555' }}>Yeguada</span>
              <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{client.stable_name}</span>
            </div>
          )}
          {client.notes && (
            <div className="px-4 py-2.5">
              <span className="text-[13px]" style={{ color: '#6B5555' }}>Notas: </span>
              <span className="text-[13px]" style={{ color: '#1C1010' }}>{client.notes}</span>
            </div>
          )}
          {!client.phone && !client.instagram && !client.city && !client.stable_name && !client.notes && (
            <p className="text-[13px] px-4 py-3 text-center" style={{ color: '#A08888' }}>Sin datos de contacto</p>
          )}
        </div>

        {/* Transaction history */}
        <div className="rounded-2xl overflow-hidden"
             style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
              Historial de transacciones
            </p>
          </div>

          {timeline.length === 0 ? (
            <p className="text-[13px] text-center py-6" style={{ color: '#A08888' }}>
              Sin transacciones registradas
            </p>
          ) : (
            timeline.map(item => <TxRow key={`${item.type}-${item.id}`} item={item} />)
          )}
        </div>

        {/* ELIMINAR CLIENTE */}
        <DeleteZone
          label={client.name}
          onDelete={() => deleteClient.mutate(client.id, { onSuccess: () => navigate('/clientes') })}
          isPending={deleteClient.isPending}
        />
      </div>
    </div>
  )
}
