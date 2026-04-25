import { useState } from 'react'
import { useClients, useUpsertClient } from '../../hooks/useReproduction'
import { BottomSheet, Field, GranateButton } from '../ui'
import { useAuth } from '../../hooks/useAuth'

export interface ClientBasic {
  id: string; name: string; phone?: string | null
  instagram?: string | null; city?: string | null; stable_name?: string | null
}

interface ClientPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (client: ClientBasic) => void
  title?: string
}

export function ClientPicker({ open, onClose, onSelect, title = 'Seleccionar cliente' }: ClientPickerProps) {
  const { user }          = useAuth()
  const { data: clients = [] } = useClients()
  const upsert            = useUpsertClient()

  const [mode, setMode]       = useState<'search' | 'new'>('search')
  const [search, setSearch]   = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  const [form, setForm] = useState({
    name: '', phone: '', instagram: '', city: '', stable_name: '',
  })
  const setF = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q) ||
      (c.instagram ?? '').toLowerCase().includes(q)
  })

  const pick = (c: ClientBasic) => { onSelect(c); onClose(); setSearch('') }

  const saveNew = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.phone.trim() && !form.instagram.trim()) {
      setError('Introduce al menos teléfono o Instagram'); return
    }
    setSaving(true); setError(null)
    try {
      const data = await upsert.mutateAsync({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        instagram: form.instagram.trim().replace('@', '') || undefined,
        city: form.city.trim() || undefined,
        stable_name: form.stable_name.trim() || undefined,
        owner_id: user!.id,
      })
      onSelect(data as ClientBasic)
      onClose()
      setForm({ name: '', phone: '', instagram: '', city: '', stable_name: '' })
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'duplicate') {
        setError('Teléfono o Instagram ya registrado para otro cliente')
      } else {
        setError('Error al guardar')
      }
    }
    setSaving(false)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex gap-2 mb-4">
        {[{ id: 'search', label: 'Buscar cliente' }, { id: 'new', label: 'Nuevo cliente' }].map(o => (
          <button key={o.id} onClick={() => setMode(o.id as 'search' | 'new')}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
                  style={{
                    background: mode === o.id ? '#7B1F3A' : '#F7F3EE',
                    color: mode === o.id ? '#fff' : '#6B5555',
                    border: `1.5px solid ${mode === o.id ? '#7B1F3A' : 'rgba(123,31,58,0.22)'}`,
                  }}>{o.label}</button>
        ))}
      </div>

      {mode === 'search' ? (
        <>
          <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-3"
               style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)' }}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#A08888" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
                   placeholder="Nombre, teléfono o @Instagram..."
                   className="flex-1 bg-transparent text-[14px] outline-none" style={{ color: '#1C1010' }} />
          </div>
          {clients.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-[13px]" style={{ color: '#A08888' }}>Sin clientes aún</p>
              <button onClick={() => setMode('new')} className="mt-2 text-[13px] font-bold" style={{ color: '#7B1F3A' }}>
                + Crear nuevo cliente
              </button>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(123,31,58,0.11)' }}>
              {filtered.slice(0, 10).map((c, i) => (
                <button key={c.id} onClick={() => pick(c as ClientBasic)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left bg-white active:bg-[#F5E8EC]"
                        style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-[14px]"
                       style={{ background: '#E8F0F8', color: '#1A4F7A' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold truncate" style={{ color: '#1C1010' }}>{c.name}</p>
                    <p className="text-[11px] truncate" style={{ color: '#6B5555' }}>
                      {[c.stable_name, c.city].filter(Boolean).join(' · ')}
                    </p>
                    {c.instagram && (
                      <p className="text-[10px]" style={{ color: '#833AB4' }}>@{c.instagram}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          <Field label="Nombre *">
            <input value={form.name} onChange={e => setF('name', e.target.value)}
                   placeholder="Nombre completo"
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Teléfono *" hint="Teléfono o Instagram son obligatorios (uno de los dos)">
            <input type="tel" value={form.phone} onChange={e => setF('phone', e.target.value)}
                   placeholder="600 000 000"
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Instagram">
            <div className="flex items-center gap-1 rounded-xl overflow-hidden"
                 style={{ border: '1.5px solid rgba(123,31,58,0.22)' }}>
              <span className="pl-3 text-[14px]" style={{ color: '#833AB4' }}>@</span>
              <input value={form.instagram} onChange={e => setF('instagram', e.target.value)}
                     placeholder="usuario"
                     className="flex-1 px-2 py-2.5 text-[14px] outline-none"
                     style={{ background: '#F7F3EE', color: '#1C1010' }} />
            </div>
          </Field>
          <div className="flex gap-2">
            <Field label="Ciudad">
              <input value={form.city} onChange={e => setF('city', e.target.value)}
                     placeholder="Ciudad"
                     className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                     style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
            </Field>
            <Field label="Yeguada">
              <input value={form.stable_name} onChange={e => setF('stable_name', e.target.value)}
                     placeholder="Nombre yeguada"
                     className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                     style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
            </Field>
          </div>
          {error && <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>{error}</p>}
          <GranateButton onClick={saveNew} disabled={saving} fullWidth>
            {saving ? 'Guardando...' : 'Crear cliente y seleccionar'}
          </GranateButton>
        </div>
      )}
    </BottomSheet>
  )
}
