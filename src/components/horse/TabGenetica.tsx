import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAnimals } from '../../hooks/useAnimals'
import { useAnimalGenetics, useUpsertAnimalGenetics } from '../../hooks/useReproduction'
import { supabase } from '../../lib/supabase'
import { LOCI_PRIMARY, LOCI_SECONDARY } from '../../lib/constants'
import { BottomSheet } from '../ui'
import type { Animal, AnimalGenetics } from '../../types'

// ─── GENETICS MATH ────────────────────────────────────────────────────────────

function parseAlleles(locus: string | undefined): string[] {
  if (!locus) return []
  if (locus.includes('/')) return locus.split('/')
  if (locus.length === 2) return [locus[0], locus[1]]
  return []
}

function crossDist(a: string[], b: string[]): Record<string, number> {
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

function coatBaseFromAlleles(ext: string[], agt: string[]): 'alazan' | 'negro' | 'castano' {
  const hasE = ext.some(a => a === 'E')
  const hasA = agt.some(a => a === 'A')
  if (!hasE) return 'alazan'
  return hasA ? 'castano' : 'negro'
}

function predictCross(g1: AnimalGenetics | null, g2: AnimalGenetics | null) {
  if (!g1 || !g2) return null

  const grey1 = parseAlleles(g1.grey)
  const grey2 = parseAlleles(g2.grey)
  const ext1  = parseAlleles(g1.extension)
  const ext2  = parseAlleles(g2.extension)
  const agt1  = parseAlleles(g1.agouti)
  const agt2  = parseAlleles(g2.agouti)
  const lp1   = parseAlleles(g1.appaloosa)
  const lp2   = parseAlleles(g2.appaloosa)

  // Grey probability
  let greyP = 0
  if (grey1.length && grey2.length) {
    const gd = crossDist(grey1, grey2)
    greyP = Object.entries(gd).filter(([k]) => k.includes('G')).reduce((s, [, v]) => s + v, 0)
  }

  // Coat base (non-grey)
  const nonGreyP = 1 - greyP
  let alazan = 0, castano = 0, negro = 0
  if (ext1.length && ext2.length && agt1.length && agt2.length) {
    const ed = crossDist(ext1, ext2)
    const ad = crossDist(agt1, agt2)
    for (const [ek, ep] of Object.entries(ed)) {
      for (const [ak, ap] of Object.entries(ad)) {
        const base = coatBaseFromAlleles(ek.split('/'), ak.split('/'))
        const p = ep * ap * nonGreyP
        if (base === 'alazan') alazan += p
        else if (base === 'castano') castano += p
        else negro += p
      }
    }
  }

  // Appaloosa
  let appaloosa = 0
  if (lp1.length && lp2.length) {
    const ld = crossDist(lp1, lp2)
    appaloosa = Object.entries(ld).filter(([k]) => k.includes('LP')).reduce((s, [, v]) => s + v, 0)
  }

  return { greyP, alazan, castano, negro, appaloosa }
}

// ─── LOCI BADGE ───────────────────────────────────────────────────────────────

type BadgeType = 'dom' | 'het' | 'rec' | 'neu' | 'pur'

const BADGE_STYLE: Record<BadgeType, { bg: string; color: string }> = {
  dom: { bg: '#EAF3EC', color: '#2E6B3E' },
  het: { bg: '#FDF3DC', color: '#9C6A00' },
  rec: { bg: '#FCEAEA', color: '#8C1F1F' },
  neu: { bg: '#F7F3EE', color: '#A08888' },
  pur: { bg: '#EDE4F8', color: '#6B25A8' },
}

const LOCI_INTERP: Record<string, Record<string, { type: BadgeType; text: string }>> = {
  grey: {
    'GG': { type: 'dom', text: 'Tordo homocigoto · todos los hijos tordos' },
    'Gg': { type: 'het', text: 'Tordo heterocigoto · puede dar no tordos' },
    'gg': { type: 'rec', text: 'No tordo · sin gen gris' },
  },
  extension: {
    'EE': { type: 'dom', text: 'No puede producir alazanes' },
    'Ee': { type: 'het', text: 'Portador alelo rojo · puede dar alazanes' },
    'ee': { type: 'rec', text: 'Alazán · sin pigmento negro' },
  },
  agouti: {
    'AA': { type: 'dom', text: 'Restricción a cabos · no da negros uniformes' },
    'Aa': { type: 'het', text: 'Portador negro uniforme' },
    'aa': { type: 'rec', text: 'Negro uniforme · sin restricción a cabos' },
  },
  cream: {
    'N/N': { type: 'neu', text: 'Sin dilución cream' },
    'N/Cr': { type: 'het', text: 'Portador cream · bayo o palomino posible' },
    'Cr/Cr': { type: 'dom', text: 'Doble cream · isabela / cremello' },
  },
  pearl: {
    'N/N': { type: 'neu', text: 'Sin dilución pearl' },
    'N/Prl': { type: 'het', text: 'Portador pearl' },
    'Prl/Prl': { type: 'dom', text: 'Doble pearl · dilución extrema' },
  },
  appaloosa: {
    'N/N': { type: 'neu', text: 'Sin patrón appaloosa' },
    'N/LP': { type: 'pur', text: 'Portador patrón appaloosa' },
    'LP/LP': { type: 'pur', text: 'Appaloosa homocigoto · patrón máximo' },
  },
  dun: {
    'N/N': { type: 'neu', text: 'Sin raya de mulo' },
    'N/D': { type: 'het', text: 'Dun · raya dorsal y rayas en patas' },
    'D/D': { type: 'dom', text: 'Dun homocigoto' },
  },
  silver: {
    'N/N': { type: 'neu', text: 'Sin efecto plateado' },
    'N/Z': { type: 'het', text: 'Silver · crines plateadas en negros' },
    'Z/Z': { type: 'dom', text: 'Silver homocigoto' },
  },
  roan: {
    'N/N': { type: 'neu', text: 'Sin ruano' },
    'N/Rn': { type: 'het', text: 'Ruano · mezcla de pelos blancos' },
  },
  tobiano: {
    'N/N': { type: 'neu', text: 'Sin patrón tobiano' },
    'N/TO': { type: 'het', text: 'Tobiano · manchas blancas en cuerpo' },
    'TO/TO': { type: 'dom', text: 'Tobiano homocigoto' },
  },
  overo: {
    'N/N': { type: 'neu', text: 'Sin patrón overo' },
    'N/O': { type: 'het', text: 'Overo · manchas irregulares' },
  },
  sabino: {
    'N/N': { type: 'neu', text: 'Sin sabino' },
    'N/SB1': { type: 'het', text: 'Sabino · marcas blancas extensas' },
  },
}

function locusInterp(key: string, val: string | undefined): { type: BadgeType; text: string } {
  if (!val) return { type: 'neu', text: 'Sin datos' }
  return LOCI_INTERP[key]?.[val] ?? { type: 'neu', text: val }
}

function LociRow({ label, val, locusKey }: { label: string; val: string | undefined; locusKey: string }) {
  const interp = locusInterp(locusKey, val)
  const bst = BADGE_STYLE[interp.type]
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5"
      style={{ borderTop: '1px solid rgba(123,31,58,0.07)' }}
    >
      <span
        className="text-[11px] font-bold shrink-0"
        style={{ color: '#1C1010', fontFamily: 'monospace', width: 84 }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-bold shrink-0"
        style={{ color: val ? '#1C1010' : '#A08888', fontFamily: 'monospace', width: 40 }}
      >
        {val ?? '—'}
      </span>
      {val && (
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-1 min-w-0"
          style={{ background: bst.bg, color: bst.color }}
        >
          {interp.text}
        </span>
      )}
    </div>
  )
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function PctBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100)
  if (pct === 0) return null
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 text-[12px] shrink-0" style={{ color: '#6B5555' }}>{label}</div>
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(123,31,58,0.1)' }}>
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-8 text-right text-[12px] font-bold" style={{ color: '#1C1010' }}>{pct}%</div>
    </div>
  )
}

// ─── EDIT LOCI SHEET ──────────────────────────────────────────────────────────

function EditLociSheet({
  open, onClose, genetics, animalId,
}: {
  open: boolean; onClose: () => void
  genetics: AnimalGenetics | null; animalId: string
}) {
  const upsert = useUpsertAnimalGenetics()
  const [local, setLocal] = useState<Record<string, string>>({})
  const [showSecondary, setShowSecondary] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const allLoci = [...LOCI_PRIMARY, ...LOCI_SECONDARY]

  useEffect(() => {
    if (!open) return
    const vals: Record<string, string> = {}
    for (const locus of allLoci) {
      vals[locus.key] = (genetics as Record<string, string> | null)?.[locus.key] ?? ''
    }
    setLocal(vals)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, genetics])

  const handleSave = async () => {
    setSaveError(null)
    const locusValues: Record<string, string | undefined> = {}
    for (const locus of allLoci) {
      locusValues[locus.key] = local[locus.key] || undefined
    }
    try {
      await upsert.mutateAsync({
        animal_id: animalId,
        id: genetics?.id,
        // Preserve existing lab fields — do not spread all of genetics to avoid
        // accidentally sending system columns (created_at etc.) in the payload
        lab_pdf_path:    genetics?.lab_pdf_path    ?? undefined,
        lab_date:        genetics?.lab_date         ?? undefined,
        lab_institution: genetics?.lab_institution  ?? undefined,
        notes:           genetics?.notes            ?? undefined,
        ...locusValues,
      } as Parameters<typeof upsert.mutateAsync>[0])
      onClose()
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Error al guardar el genotipo'
      setSaveError(msg)
    }
  }

  const inputStyle = { background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)', color: '#1C1010', borderRadius: 10, padding: '8px 12px', fontSize: 13, width: '100%', outline: 'none', appearance: 'none' as const }

  return (
    <BottomSheet open={open} onClose={onClose} title="Editar genotipo">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>Loci primarios</p>
        {LOCI_PRIMARY.map(locus => (
          <div key={locus.key} className="flex items-center justify-between gap-2">
            <span className="text-[13px] shrink-0" style={{ color: '#1C1010', width: 140 }}>{locus.label}</span>
            <select value={local[locus.key] ?? ''} onChange={e => setLocal(p => ({ ...p, [locus.key]: e.target.value }))} style={inputStyle}>
              <option value="">—</option>
              {locus.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        {!showSecondary ? (
          <button onClick={() => setShowSecondary(true)} className="text-[13px] font-semibold py-2" style={{ color: '#7B1F3A' }}>
            Ver {LOCI_SECONDARY.length} loci más ›
          </button>
        ) : (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider pt-2" style={{ color: '#A08888' }}>Loci secundarios</p>
            {LOCI_SECONDARY.map(locus => (
              <div key={locus.key} className="flex items-center justify-between gap-2">
                <span className="text-[13px] shrink-0" style={{ color: '#1C1010', width: 140 }}>{locus.label}</span>
                <select value={local[locus.key] ?? ''} onChange={e => setLocal(p => ({ ...p, [locus.key]: e.target.value }))} style={inputStyle}>
                  <option value="">—</option>
                  {locus.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </>
        )}

        {saveError && (
          <p className="text-[13px] rounded-xl px-4 py-2.5" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
            {saveError}
          </p>
        )}
        <div className="flex gap-2 pt-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-[14px] font-semibold" style={{ background: '#F7F3EE', color: '#6B5555' }}>Cancelar</button>
          <button onClick={handleSave} disabled={upsert.isPending} className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-white" style={{ background: '#7B1F3A' }}>
            {upsert.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function TabGenetica({ animal }: { animal: Animal }) {
  const { user } = useAuth()
  const { data: animals } = useAnimals()
  const { data: genetics } = useAnimalGenetics(animal.id)
  const [editLociOpen, setEditLociOpen] = useState(false)
  const [showSecLoci, setShowSecLoci]   = useState(false)
  const [partnerId, setPartnerId] = useState<string>('')
  const { data: partnerGenetics } = useAnimalGenetics(partnerId || undefined)
  const [uploading, setUploading]     = useState(false)
  const [labSaveError, setLabSaveError] = useState<string | null>(null)
  const [labInstitution, setLabInstitution] = useState('')
  const [labDate, setLabDate] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const upsert = useUpsertAnimalGenetics()

  useEffect(() => {
    setLabInstitution(genetics?.lab_institution ?? '')
    setLabDate(genetics?.lab_date ?? '')
  }, [genetics])

  const prediction = predictCross(genetics ?? null, partnerGenetics ?? null)
  const isFemale = animal.sex === 'yegua' || animal.sex === 'potra'
  const partners = (animals ?? []).filter(a => a.id !== animal.id && (isFemale ? a.sex === 'semental' : (a.sex === 'yegua' || a.sex === 'potra')))

  // Build a clean genetics payload — only known columns, no system fields
  const buildLabPayload = (overrides: Record<string, string | undefined | null>) => ({
    animal_id:       animal.id,
    id:              genetics?.id,
    lab_pdf_path:    genetics?.lab_pdf_path    ?? undefined,
    lab_date:        labDate || undefined,
    lab_institution: labInstitution || undefined,
    notes:           genetics?.notes           ?? undefined,
    // Preserve existing loci
    grey:      genetics?.grey      ?? undefined,
    extension: genetics?.extension ?? undefined,
    agouti:    genetics?.agouti    ?? undefined,
    cream:     genetics?.cream     ?? undefined,
    pearl:     genetics?.pearl     ?? undefined,
    appaloosa: genetics?.appaloosa ?? undefined,
    dun:       genetics?.dun       ?? undefined,
    silver:    genetics?.silver    ?? undefined,
    roan:      genetics?.roan      ?? undefined,
    tobiano:   genetics?.tobiano   ?? undefined,
    overo:     genetics?.overo     ?? undefined,
    sabino:    genetics?.sabino    ?? undefined,
    ...overrides,
  })

  const handleLabSave = async () => {
    setLabSaveError(null)
    try {
      await upsert.mutateAsync(buildLabPayload({}) as Parameters<typeof upsert.mutateAsync>[0])
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'message' in e
          ? String((e as { message: unknown }).message)
          : 'Error al guardar'
      setLabSaveError(msg)
    }
  }

  const handleLabUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setLabSaveError(null)
    try {
      const path = `${user.id}/${animal.id}/genetics_${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage.from('genetics-docs').upload(path, file)
      if (upErr) throw upErr
      await upsert.mutateAsync(
        buildLabPayload({ lab_pdf_path: path }) as Parameters<typeof upsert.mutateAsync>[0]
      )
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al subir'
      setLabSaveError(msg)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleViewPdf = async () => {
    if (!genetics?.lab_pdf_path) return
    const { data } = await supabase.storage.from('genetics-docs').createSignedUrl(genetics.lab_pdf_path, 120)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const cardStyle = { background: '#fff', border: '1px solid rgba(123,31,58,0.11)', borderRadius: 16 }
  const sectionTitle = { color: '#A08888', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const }

  const gRec = genetics as Record<string, string> | null | undefined

  return (
    <div className="p-4 space-y-4 pb-8">

      {/* ── GENOTIPO ── */}
      <div className="overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-4 py-3"
             style={{ borderBottom: '1px solid rgba(123,31,58,0.09)' }}>
          <p style={sectionTitle}>Genotipo</p>
          <button onClick={() => setEditLociOpen(true)}
                  className="text-[12px] font-semibold" style={{ color: '#7B1F3A' }}>
            Editar ›
          </button>
        </div>

        {/* Primary loci — always visible */}
        {LOCI_PRIMARY.map(locus => (
          <LociRow
            key={locus.key}
            locusKey={locus.key}
            label={locus.label}
            val={gRec?.[locus.key]}
          />
        ))}

        {/* Secondary loci toggle */}
        {!showSecLoci ? (
          <button
            onClick={() => setShowSecLoci(true)}
            className="w-full px-3.5 py-2.5 text-left text-[12px] font-semibold"
            style={{ color: '#7B1F3A', borderTop: '1px solid rgba(123,31,58,0.07)' }}
          >
            Ver {LOCI_SECONDARY.length} loci adicionales ›
          </button>
        ) : (
          <>
            <div className="px-3.5 py-1.5" style={{ borderTop: '1px solid rgba(123,31,58,0.09)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#A08888' }}>
                Loci adicionales
              </p>
            </div>
            {LOCI_SECONDARY.map(locus => (
              <LociRow
                key={locus.key}
                locusKey={locus.key}
                label={locus.label}
                val={gRec?.[locus.key]}
              />
            ))}
            <button
              onClick={() => setShowSecLoci(false)}
              className="w-full px-3.5 py-2 text-left text-[11px] font-semibold"
              style={{ color: '#A08888', borderTop: '1px solid rgba(123,31,58,0.07)' }}
            >
              Ocultar ›
            </button>
          </>
        )}
      </div>

      {/* PDF LAB */}
      <div className="p-4 space-y-3" style={cardStyle}>
        <p style={sectionTitle}>Informe de laboratorio</p>

        <div className="flex gap-2">
          <div className="flex-1">
            <p className="text-[11px] mb-1" style={{ color: '#6B5555' }}>Fecha del informe</p>
            <input type="date" value={labDate} onChange={e => setLabDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)', color: '#1C1010' }} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] mb-1" style={{ color: '#6B5555' }}>Laboratorio</p>
            <input value={labInstitution} onChange={e => setLabInstitution(e.target.value)}
              placeholder="Nombre…" className="w-full rounded-xl px-3 py-2 text-[13px] outline-none"
              style={{ background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)', color: '#1C1010' }} />
          </div>
        </div>

        {labSaveError && (
          <p className="text-[12px] rounded-xl px-3 py-2" style={{ background: '#FCEAEA', color: '#8C1F1F' }}>
            {labSaveError}
          </p>
        )}
        <div className="flex gap-2">
          {genetics?.lab_pdf_path && (
            <button onClick={handleViewPdf}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{ background: '#F5E8EC', color: '#7B1F3A', border: '1.5px solid rgba(123,31,58,0.3)' }}>
              Ver PDF
            </button>
          )}
          <button
            onClick={handleLabSave}
            disabled={upsert.isPending}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: '#F7F3EE', color: '#6B5555', border: '1.5px solid rgba(123,31,58,0.22)' }}>
            {upsert.isPending ? 'Guardando…' : 'Guardar datos'}
          </button>
          <button onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
            style={{ background: '#7B1F3A', color: '#fff' }}>
            {uploading ? 'Subiendo…' : (genetics?.lab_pdf_path ? 'Reemplazar PDF' : 'Subir PDF')}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={handleLabUpload} />
      </div>

      {/* PREDICCIÓN DE CRUCE */}
      <div className="p-4 space-y-4" style={cardStyle}>
        <p style={sectionTitle}>Predicción de cruce</p>

        <div>
          <p className="text-[11px] mb-1.5" style={{ color: '#6B5555' }}>
            {isFemale ? 'Selecciona el semental' : 'Selecciona la yegua'}
          </p>
          <select value={partnerId} onChange={e => setPartnerId(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none appearance-none"
            style={{ background: '#F7F3EE', border: '1px solid rgba(123,31,58,0.18)', color: '#1C1010' }}>
            <option value="">— Seleccionar —</option>
            {partners.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {partnerId && !partnerGenetics && (
          <p className="text-[13px] py-2 text-center" style={{ color: '#A08888' }}>
            Este animal no tiene datos genéticos registrados.
          </p>
        )}

        {partnerId && partnerGenetics && !prediction && (
          <p className="text-[13px] py-2 text-center" style={{ color: '#A08888' }}>
            Faltan datos genéticos en uno o ambos animales.
          </p>
        )}

        {prediction && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[12px] font-semibold" style={{ color: '#1C1010' }}>Color base esperado</p>
              <PctBar label="Gris" value={prediction.greyP} color="#A09898" />
              <PctBar label="Castaño" value={prediction.castano} color="#6B3A18" />
              <PctBar label="Alazán" value={prediction.alazan} color="#C07030" />
              <PctBar label="Negro" value={prediction.negro} color="#1A1208" />
              {prediction.greyP === 0 && prediction.castano === 0 && prediction.alazan === 0 && prediction.negro === 0 && (
                <p className="text-[12px]" style={{ color: '#A08888' }}>Faltan loci Extension / Agouti para predecir el color.</p>
              )}
            </div>

            {(prediction.appaloosa > 0 || true) && (
              <div className="space-y-2">
                <p className="text-[12px] font-semibold" style={{ color: '#1C1010' }}>Patrón Appaloosa</p>
                <PctBar label="Appaloosa" value={prediction.appaloosa} color="#7B1F3A" />
                <PctBar label="Sin patrón" value={1 - prediction.appaloosa} color="#D0C4C0" />
                {!partnerGenetics?.appaloosa && !genetics?.appaloosa && (
                  <p className="text-[12px]" style={{ color: '#A08888' }}>Sin datos del locus LP.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <EditLociSheet
        open={editLociOpen}
        onClose={() => setEditLociOpen(false)}
        genetics={genetics ?? null}
        animalId={animal.id}
      />
    </div>
  )
}
