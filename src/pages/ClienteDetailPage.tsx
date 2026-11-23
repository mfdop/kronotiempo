import { errMsg } from '../lib/errors'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useClientById, useClientTransactions, useDeleteClient, useUpsertClient } from '../hooks/useReproduction'
import { useAuth } from '../hooks/useAuth'
import { LoadingScreen, EmptyState, DeleteZone } from '../components/ui'
import { summarizePayments, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_COLOR } from '../lib/payments'
import type { ClientTagType, SemenSale, PregnancySale } from '../types'

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
  vendedor:   { label: 'Vendedor',   bg: 'rgba(140,31,31,0.8)',     color: '#fff' },
}

// ─── UNIFIED TRANSACTION ──────────────────────────────────────────────────────

type TxItem = {
  id: string
  type: 'cubricion' | 'vientre'
  icon: string
  iconBg: string
  title: string
  meta: string
  amount?: number
  amountColor: string
  paymentStatus?: string
  date: string
  animalId?: string   // for navigation
  animalTab?: string  // which tab to pre-select
}

function buildTimeline(
  semSales: SemenSale[],
  pregSales: PregnancySale[]
): TxItem[] {
  const items: TxItem[] = []

  semSales.forEach(s => {
    const ps = summarizePayments(s.agreed_price, s.payments)
    items.push({
      id: s.id,
      type: 'cubricion',
      icon: '💉',
      iconBg: '#E8F0F8',
      title: 'Cubrición',
      meta: `${s.mare_name ? `Yegua: ${s.mare_name}` : `Año ${s.year}`} · Pagado ${fmt(ps.paid)} · Pendiente ${fmt(ps.pending)}`,
      amount: s.agreed_price,                                 // always show agreed price
      amountColor: ps.status === 'completo' ? '#2E6B3E' : ps.status === 'parcial' ? '#9C6A00' : '#A08888',
      paymentStatus: ps.status,
      date: s.created_at,
      animalId: s.stallion_id,
      animalTab: 'Cubriciones',
    })
  })

  pregSales.forEach(s => {
    const ps = summarizePayments(s.agreed_price, s.payments)
    const mareId = (s as unknown as { pregnancies?: { mare_id: string } }).pregnancies?.mare_id
    items.push({
      id: s.id,
      type: 'vientre',
      icon: '🐴',
      iconBg: '#EAF3EC',
      title: 'Venta de vientre',
      meta: `Pagado ${fmt(ps.paid)} · Pendiente ${fmt(ps.pending)}`,
      amount: s.agreed_price,                                 // always show agreed price
      amountColor: ps.status === 'completo' ? '#2E6B3E' : ps.status === 'parcial' ? '#9C6A00' : '#A08888',
      paymentStatus: ps.status,
      date: s.created_at,
      animalId: mareId,
      animalTab: 'Vientre',
    })
  })

  return items.sort((a, b) => b.date.localeCompare(a.date))
}


// ─── TX ROW ───────────────────────────────────────────────────────────────────

function TxRow({ item, onNavigate }: { item: TxItem; onNavigate?: () => void }) {
  const paySt = item.paymentStatus
  const payColor = paySt ? (PAYMENT_STATUS_COLOR[paySt as keyof typeof PAYMENT_STATUS_COLOR] ?? PAYMENT_STATUS_COLOR.sin_pagos) : null

  const inner = (
    <>
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
            {PAYMENT_STATUS_LABEL[paySt as keyof typeof PAYMENT_STATUS_LABEL] ?? paySt}
          </span>
        )}
        <div className="flex items-center gap-1">
          <span className="text-[10px]" style={{ color: '#A08888' }}>{fmtDate(item.date)}</span>
          {onNavigate && (
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="#A08888" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          )}
        </div>
      </div>
    </>
  )

  if (onNavigate) {
    return (
      <button onClick={onNavigate}
              className="w-full flex items-start gap-3 px-3.5 py-3 text-left active:bg-[#F5E8EC]"
              style={{ borderTop: '1px solid rgba(123,31,58,0.07)' }}>
        {inner}
      </button>
    )
  }

  return (
    <div className="flex items-start gap-3 px-3.5 py-3"
         style={{ borderTop: '1px solid rgba(123,31,58,0.07)' }}>
      {inner}
    </div>
  )
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export default function ClienteDetailPage() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const { user }                       = useAuth()
  const { data: client, isLoading }    = useClientById(id)
  const { data: transactions }         = useClientTransactions(id)
  const deleteClient                   = useDeleteClient()
  const upsertClient                   = useUpsertClient()

  // Edit contact form state — hooks must be before conditional returns
  const [editMode, setEditMode]   = useState(false)
  const [saving,   setSaving]     = useState(false)
  const [editErr,  setEditErr]    = useState<string | null>(null)
  const [editForm, setEditForm]   = useState({
    name: '', phone: '', instagram: '', dni: '', city: '', stable_name: '', notes: '',
  })

  const openEdit = () => {
    if (!client) return
    setEditForm({
      name:        client.name        ?? '',
      phone:       client.phone       ?? '',
      instagram:   client.instagram   ?? '',
      dni:         client.dni         ?? '',
      city:        client.city        ?? '',
      stable_name: client.stable_name ?? '',
      notes:       client.notes       ?? '',
    })
    setEditErr(null)
    setEditMode(true)
  }

  const saveEdit = async () => {
    if (!client || !user) return
    if (!editForm.name.trim()) { setEditErr('El nombre es obligatorio'); return }
    setSaving(true); setEditErr(null)
    try {
      await upsertClient.mutateAsync({
        id:          client.id,
        name:        editForm.name.trim(),
        phone:       editForm.phone       || undefined,
        instagram:   editForm.instagram   || undefined,
        dni:         editForm.dni         || undefined,
        city:        editForm.city        || undefined,
        stable_name: editForm.stable_name || undefined,
        notes:       editForm.notes       || undefined,
        owner_id:    user.id,
      })
      setEditMode(false)
    } catch (e: unknown) {
      setEditErr(errMsg(e))
    }
    setSaving(false)
  }

  if (isLoading) return <LoadingScreen />
  if (!client)   return (
    <EmptyState title="Cliente no encontrado"
                action={{ label: '‹ Volver', onClick: () => navigate(-1) }} />
  )

  const { semSales = [], pregSales = [] } = transactions ?? {}
  const timeline = buildTimeline(semSales, pregSales)

  const sums = [...semSales, ...pregSales].map(t => summarizePayments(t.agreed_price, t.payments))
  const totalPaid    = sums.reduce((s, x) => s + x.paid, 0)
  const totalPending = sums.reduce((s, x) => s + x.pending, 0)

  // Compute tags from transactions
  const tags: ClientTagType[] = []
  if (semSales.length > 0) tags.push('cubricion')
  if (pregSales.length > 0) tags.push('vientre')

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
          <div className="flex items-center justify-between px-4 py-3"
               style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Contacto</p>
            {editMode ? (
              <div className="flex gap-2">
                <button onClick={() => setEditMode(false)}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                        style={{ border: '1.5px solid rgba(123,31,58,0.22)', color: '#6B5555' }}>
                  Cancelar
                </button>
                <button onClick={saveEdit} disabled={saving}
                        className="px-3 py-1.5 rounded-xl text-[12px] font-bold text-white"
                        style={{ background: '#7B1F3A', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            ) : (
              <button onClick={openEdit}
                      className="px-3 py-1.5 rounded-xl text-[12px] font-bold"
                      style={{ background: '#F5E8EC', color: '#7B1F3A' }}>
                Editar
              </button>
            )}
          </div>

          {editErr && (
            <p className="text-[13px] px-4 py-2.5"
               style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{editErr}</p>
          )}

          {editMode ? (
            /* ─── EDIT FORM ─── */
            <div className="p-4 space-y-3">
              {[
                { key: 'name',        label: 'Nombre *',  type: 'text'  },
                { key: 'phone',       label: 'Teléfono',  type: 'tel'   },
                { key: 'instagram',   label: 'Instagram', type: 'text'  },
                { key: 'dni',         label: 'DNI',       type: 'text'  },
                { key: 'city',        label: 'Ciudad',    type: 'text'  },
                { key: 'stable_name', label: 'Yeguada',   type: 'text'  },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1"
                     style={{ color: '#A08888' }}>{label}</p>
                  <input
                    type={type}
                    value={editForm[key as keyof typeof editForm]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none"
                    style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }}
                  />
                </div>
              ))}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1"
                   style={{ color: '#A08888' }}>Notas</p>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                  style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }}
                />
              </div>
            </div>
          ) : (
            /* ─── READ VIEW ─── */
            <>
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
              {client.dni && (
                <div className="flex items-center justify-between px-4 py-2.5"
                     style={{ borderBottom: '1px solid rgba(123,31,58,0.07)' }}>
                  <span className="text-[13px]" style={{ color: '#6B5555' }}>DNI</span>
                  <span className="text-[13px] font-semibold" style={{ color: '#1C1010' }}>{client.dni}</span>
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
              {!client.phone && !client.instagram && !client.dni && !client.city && !client.stable_name && !client.notes && (
                <p className="text-[13px] px-4 py-3 text-center" style={{ color: '#A08888' }}>
                  Sin datos de contacto · pulsa Editar para añadir
                </p>
              )}
            </>
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
            timeline.map(item => (
              <TxRow
                key={`${item.type}-${item.id}`}
                item={item}
                onNavigate={item.animalId ? () => navigate(`/animales/${item.animalId}${item.animalTab ? `?tab=${encodeURIComponent(item.animalTab)}` : ''}`) : undefined}
              />
            ))
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
