import { useState, useRef } from 'react'
import { useAnimalDocs, useCreateAnimalDoc, useDeleteAnimalDoc } from '../../hooks/useReproduction'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { BottomSheet, EmptyState, LoadingScreen, Field, GranateButton, GhostButton } from '../ui'
import type { Animal, DocType, AnimalDocument } from '../../types'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// ─── CONSTANTS ────────────────────────────────────────────────
const DOC_CONFIG: Record<DocType, { label: string; color: string; bg: string; icon: string }> = {
  veterinario: { label: 'Veterinario', color: '#1A4F7A', bg: '#E8F0F8', icon: '🩺' },
  genetica:    { label: 'Genética',    color: '#5A1E82', bg: '#F3E8F8', icon: '🧬' },
  certificado: { label: 'Certificado', color: '#2E6B3E', bg: '#EAF3EC', icon: '📋' },
  otro:        { label: 'Otro',        color: '#6B5555', bg: '#F7F3EE', icon: '📄' },
}

const FILTER_OPTIONS: Array<{ key: DocType | 'todos'; label: string }> = [
  { key: 'todos',       label: 'Todos'      },
  { key: 'veterinario', label: 'Veterinario'},
  { key: 'genetica',    label: 'Genética'   },
  { key: 'certificado', label: 'Certificado'},
  { key: 'otro',        label: 'Otro'       },
]

function fileSizeLabel(kb: number | undefined) {
  if (!kb) return ''
  if (kb < 1024) return `${kb} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

// ─── ADD DOC SHEET ────────────────────────────────────────────
function AddDocSheet({ open, onClose, animalId, userId }: {
  open: boolean; onClose: () => void; animalId: string; userId: string
}) {
  const create   = useCreateAnimalDoc()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [file,       setFile]       = useState<File | null>(null)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [form, setForm] = useState({
    name:        '',
    type:        'veterinario' as DocType,
    issuer:      '',
    issued_date: '',
    notes:       '',
  })
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !form.name) {
      // Pre-fill name from filename (strip extension)
      const baseName = f.name.replace(/\.[^/.]+$/, '')
      setForm(p => ({ ...p, name: baseName }))
    }
  }

  const handleSave = async () => {
    if (!form.name) { setError('El nombre es obligatorio'); return }
    if (!file)      { setError('Selecciona un archivo'); return }
    setSaving(true); setError(null)
    try {
      const ext      = file.name.split('.').pop() ?? 'bin'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path     = `${userId}/${animalId}/${Date.now()}_${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('animal-docs')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw new Error(`Error al subir: ${uploadError.message}`)

      await create.mutateAsync({
        animal_id:    animalId,
        name:         form.name,
        type:         form.type,
        storage_path: path,
        file_size_kb: Math.round(file.size / 1024),
        issuer:       form.issuer      || undefined,
        issued_date:  form.issued_date || undefined,
        notes:        form.notes       || undefined,
      })

      onClose()
      setFile(null)
      setForm({ name: '', type: 'veterinario', issuer: '', issued_date: '', notes: '' })
      if (fileRef.current) fileRef.current.value = ''
      void ext // suppress unused var warning
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    }
    setSaving(false)
  }

  const handleClose = () => {
    setFile(null)
    setError(null)
    setForm({ name: '', type: 'veterinario', issuer: '', issued_date: '', notes: '' })
    if (fileRef.current) fileRef.current.value = ''
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Añadir documento">
      <div className="space-y-3">

        {/* File picker */}
        <Field label="Archivo *">
          <button onClick={() => fileRef.current?.click()}
                  className="w-full rounded-xl px-4 py-3 flex items-center gap-3"
                  style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)' }}>
            <span className="text-xl">📎</span>
            <div className="flex-1 text-left min-w-0">
              {file ? (
                <>
                  <p className="text-[13px] font-semibold truncate" style={{ color: '#1C1010' }}>{file.name}</p>
                  <p className="text-[11px]" style={{ color: '#A08888' }}>{fileSizeLabel(Math.round(file.size / 1024))}</p>
                </>
              ) : (
                <>
                  <p className="text-[14px]" style={{ color: '#A08888' }}>Seleccionar archivo...</p>
                  <p className="text-[11px]" style={{ color: '#A08888' }}>PDF o imagen</p>
                </>
              )}
            </div>
            {file && (
              <span className="text-[12px] font-bold shrink-0" style={{ color: '#7B1F3A' }}>Cambiar</span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="application/pdf,image/*"
                 className="hidden" onChange={handleFileChange} />
        </Field>

        <Field label="Nombre del documento *">
          <input value={form.name} onChange={e => set('name', e.target.value)}
                 placeholder="Informe revisión anual..."
                 className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                 style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
        </Field>

        <Field label="Categoría">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(DOC_CONFIG) as [DocType, typeof DOC_CONFIG[DocType]][]).map(([v, cfg]) => (
              <button key={v} onClick={() => set('type', v)}
                      className="py-2.5 rounded-xl text-[12px] font-semibold"
                      style={{
                        background: form.type === v ? cfg.color : '#F7F3EE',
                        color:      form.type === v ? '#fff'    : '#6B5555',
                        border:     `1.5px solid ${form.type === v ? cfg.color : 'rgba(123,31,58,0.22)'}`,
                      }}>
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="flex gap-2">
          <Field label="Emisor">
            <input value={form.issuer} onChange={e => set('issuer', e.target.value)}
                   placeholder="Veterinario, laboratorio..."
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
          <Field label="Fecha emisión">
            <input type="date" value={form.issued_date} onChange={e => set('issued_date', e.target.value)}
                   className="w-full rounded-xl px-4 py-2.5 text-[14px] outline-none"
                   style={{ background: '#F7F3EE', border: '1.5px solid rgba(123,31,58,0.22)', color: '#1C1010' }} />
          </Field>
        </div>

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
        {saving && (
          <p className="text-[13px] text-center" style={{ color: '#A08888' }}>Subiendo archivo...</p>
        )}
        <GranateButton onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Guardando...' : 'Guardar documento'}
        </GranateButton>
        <GhostButton onClick={handleClose} fullWidth>Cancelar</GhostButton>
      </div>
    </BottomSheet>
  )
}

// ─── DOC ROW ──────────────────────────────────────────────────
function DocRow({ doc, onDelete }: { doc: AnimalDocument; onDelete: () => void }) {
  const cfg     = DOC_CONFIG[doc.type] ?? DOC_CONFIG.otro
  const [opening, setOpening] = useState(false)

  const handleOpen = async () => {
    setOpening(true)
    const { data } = await supabase.storage
      .from('animal-docs')
      .createSignedUrl(doc.storage_path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    setOpening(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={handleOpen} disabled={opening}
              className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[18px]"
             style={{ background: cfg.bg }}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold truncate" style={{ color: opening ? '#A08888' : '#1C1010' }}>
            {doc.name}
          </p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: '#6B5555' }}>
            {[
              doc.issuer,
              doc.issued_date ? format(parseISO(doc.issued_date), 'd MMM yyyy', { locale: es }) : null,
              fileSizeLabel(doc.file_size_kb),
            ].filter(Boolean).join(' · ')}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
        <button onClick={onDelete}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[14px]"
                style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── MAIN TAB ─────────────────────────────────────────────────
export default function TabDocs({ animal }: { animal: Animal }) {
  const { user }                          = useAuth()
  const { data: docs = [], isLoading }    = useAnimalDocs(animal.id)
  const deleteDoc                         = useDeleteAnimalDoc()
  const [filter, setFilter]               = useState<DocType | 'todos'>('todos')
  const [addOpen, setAddOpen]             = useState(false)

  if (isLoading) return <LoadingScreen />

  const filtered = filter === 'todos' ? docs : docs.filter(d => d.type === filter)

  const handleDelete = (doc: AnimalDocument) => {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return
    deleteDoc.mutate({ id: doc.id, animal_id: doc.animal_id, storage_path: doc.storage_path })
  }

  return (
    <div className="p-3 pb-8 space-y-2.5">

      {/* FILTER CHIPS */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className="rounded-xl px-3 py-2 text-[12px] font-semibold whitespace-nowrap shrink-0"
                  style={{
                    background: filter === opt.key ? '#7B1F3A' : '#fff',
                    color:      filter === opt.key ? '#fff'    : '#6B5555',
                    border:     `1px solid ${filter === opt.key ? '#7B1F3A' : 'rgba(123,31,58,0.11)'}`,
                  }}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* UPLOAD ZONE */}
      <button onClick={() => setAddOpen(true)}
              className="w-full rounded-2xl py-5 flex flex-col items-center gap-1.5"
              style={{ background: '#fff', border: '1.5px dashed rgba(123,31,58,0.25)' }}>
        <span className="text-2xl">📎</span>
        <p className="text-[13px] font-semibold" style={{ color: '#7B1F3A' }}>Añadir documento</p>
        <p className="text-[11px]" style={{ color: '#A08888' }}>
          PDF o imagen desde el móvil · iCloud · Archivos
        </p>
      </button>

      {/* DOCUMENT LIST */}
      <div className="rounded-2xl overflow-hidden"
           style={{ background: '#fff', border: '1px solid rgba(123,31,58,0.11)' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(123,31,58,0.11)' }}>
          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
            Documentos · {filtered.length}
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="📁"
                      title={filter === 'todos' ? 'Sin documentos' : `Sin documentos de tipo ${DOC_CONFIG[filter as DocType]?.label ?? filter}`}
                      subtitle="Pulsa el área de arriba para añadir el primero" />
        ) : (
          filtered.map((doc, i) => (
            <div key={doc.id}
                 style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(123,31,58,0.11)' : 'none' }}>
              <DocRow doc={doc} onDelete={() => handleDelete(doc)} />
            </div>
          ))
        )}
      </div>

      <AddDocSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        animalId={animal.id}
        userId={user?.id ?? ''}
      />
    </div>
  )
}
