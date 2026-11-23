import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Pregnancy, SemenSale, SemenShipping, PregnancyInterested, PregnancySale, ShoeingRecord, HealthEpisode, Vaccine, AnimalDocument, AnimalGenetics, MaintenanceFee, MaintenanceEntry, Client, ClientSummary, ClientTagType } from '../types'

// ─── PREGNANCIES ─────────────────────────────────────────────
export function usePregnancies(mareId: string | undefined) {
  return useQuery({
    queryKey: ['pregnancies', mareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pregnancies')
        .select('*')
        .eq('mare_id', mareId)
        .order('covered_date', { ascending: false })
      if (error) throw error
      return data as Pregnancy[]
    },
    enabled: !!mareId,
  })
}

export function useCreatePregnancy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Pregnancy, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('pregnancies')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as Pregnancy
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pregnancies', data.mare_id] })
    },
  })
}

export function useUpdatePregnancy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Pregnancy> & { id: string }) => {
      const { data, error } = await supabase
        .from('pregnancies')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Pregnancy
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pregnancies', data.mare_id] })
    },
  })
}

// ─── PREGNANCY INTERESTED ────────────────────────────────────
export function usePregnancyInterested(pregnancyId: string | undefined) {
  return useQuery({
    queryKey: ['preg-interested', pregnancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pregnancy_interested')
        .select('*, clients(*)')
        .eq('pregnancy_id', pregnancyId)
        .order('created_at')
      if (error) throw error
      return data
    },
    enabled: !!pregnancyId,
  })
}

export function useCreatePregnancyInterested() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<PregnancyInterested, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('pregnancy_interested')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preg-interested', vars.pregnancy_id] })
    },
  })
}

// ─── PREGNANCY SALE (vientre) ─────────────────────────────────
export function usePregnancySale(pregnancyId: string | undefined) {
  return useQuery({
    queryKey: ['preg-sale', pregnancyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pregnancy_sales')
        .select('*, clients(*)')
        .eq('pregnancy_id', pregnancyId)
        .maybeSingle()
      if (error) throw error
      return data as (PregnancySale & { clients: unknown }) | null
    },
    enabled: !!pregnancyId,
  })
}

export function useUpsertPregnancySale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<PregnancySale, 'id' | 'created_at'> & { id?: string }) => {
      const { data, error } = values.id
        ? await supabase.from('pregnancy_sales').update(values).eq('id', values.id).select().single()
        : await supabase.from('pregnancy_sales').insert(values).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['preg-sale', vars.pregnancy_id] })
    },
  })
}

// ─── SEMEN SALES ─────────────────────────────────────────────
export function useSemenSales(stallionId: string | undefined, year?: number) {
  return useQuery({
    queryKey: ['semen-sales', stallionId, year],
    queryFn: async () => {
      let q = supabase
        .from('semen_sales')
        .select('*, clients(*), semen_shippings(*)')
        .eq('stallion_id', stallionId)
        .order('created_at', { ascending: false })
      if (year) q = q.eq('year', year)
      const { data, error } = await q
      if (error) throw error
      return data as (SemenSale & { clients: unknown; semen_shippings: SemenShipping[] })[]
    },
    enabled: !!stallionId,
  })
}

export function useCreateSemenSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<SemenSale, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('semen_sales')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as SemenSale
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['semen-sales', data.stallion_id] })
    },
  })
}

export function useUpdateSemenSale() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<SemenSale> & { id: string }) => {
      const { data, error } = await supabase
        .from('semen_sales')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as SemenSale
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['semen-sales', data.stallion_id] })
    },
  })
}

export function useUpsertSemenShipping() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<SemenShipping, 'id' | 'created_at'> & { id?: string }) => {
      // Upsert on the natural key so a stale/missing `id` can never cause a
      // unique-violation. Undefined fields are dropped from the JSON payload,
      // so existing columns (dates/result) are not overwritten.
      const { id: _id, ...rest } = values
      void _id
      const { data, error } = await supabase
        .from('semen_shippings')
        .upsert(rest, { onConflict: 'semen_sale_id,attempt_number' })
        .select()
        .single()
      if (error) throw error
      return data as SemenShipping
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['semen-sales'] })
      qc.invalidateQueries({ queryKey: ['shipping', data.semen_sale_id] })
    },
  })
}

// ─── CLIENTS SEARCH (for pickers) ─────────────────────────────
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')
      if (error) throw error
      return data
    },
  })
}

export function useUpsertClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: {
      id?: string; name: string; phone?: string; instagram?: string; dni?: string
      city?: string; stable_name?: string; notes?: string; owner_id: string
    }) => {
      const { data, error } = values.id
        ? await supabase.from('clients').update(values).eq('id', values.id).select().single()
        : await supabase.from('clients').insert(values).select().single()
      if (error) {
        // Duplicate phone/instagram
        if (error.code === '23505') throw new Error('duplicate')
        throw error
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}

// ─── SHOEING RECORDS ──────────────────────────────────────────
export function useShoeingRecords(animalId: string | undefined) {
  return useQuery({
    queryKey: ['shoeing', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shoeing_records')
        .select('*')
        .eq('animal_id', animalId)
        .order('date', { ascending: false })
      if (error) throw error
      return data as ShoeingRecord[]
    },
    enabled: !!animalId,
  })
}

export function useCreateShoeingRecord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<ShoeingRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('shoeing_records')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as ShoeingRecord
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['shoeing', data.animal_id] })
    },
  })
}

// ─── HEALTH EPISODES ──────────────────────────────────────────
export function useHealthEpisodes(animalId: string | undefined) {
  return useQuery({
    queryKey: ['health-episodes', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_episodes')
        .select('*')
        .eq('animal_id', animalId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data as HealthEpisode[]
    },
    enabled: !!animalId,
  })
}

export function useCreateHealthEpisode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<HealthEpisode, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('health_episodes')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as HealthEpisode
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['health-episodes', data.animal_id] })
    },
  })
}

export function useUpdateHealthEpisode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<HealthEpisode> & { id: string }) => {
      const { data, error } = await supabase
        .from('health_episodes')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as HealthEpisode
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['health-episodes', data.animal_id] })
    },
  })
}

// ─── VACCINES ─────────────────────────────────────────────────
export function useVaccines(animalId: string | undefined) {
  return useQuery({
    queryKey: ['vaccines', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vaccines')
        .select('*')
        .eq('animal_id', animalId)
        .order('date_applied', { ascending: false })
      if (error) throw error
      return data as Vaccine[]
    },
    enabled: !!animalId,
  })
}

export function useCreateVaccine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Vaccine, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('vaccines')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as Vaccine
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vaccines', data.animal_id] })
    },
  })
}

// ─── ANIMAL DOCUMENTS ─────────────────────────────────────────
export function useAnimalDocs(animalId: string | undefined) {
  return useQuery({
    queryKey: ['animal-docs', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animal_documents')
        .select('*')
        .eq('animal_id', animalId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as AnimalDocument[]
    },
    enabled: !!animalId,
  })
}

export function useCreateAnimalDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<AnimalDocument, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('animal_documents')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as AnimalDocument
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['animal-docs', data.animal_id] })
    },
  })
}

export function useDeleteAnimalDoc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, animal_id, storage_path }: { id: string; animal_id: string; storage_path: string }) => {
      await supabase.storage.from('animal-docs').remove([storage_path])
      const { error } = await supabase.from('animal_documents').delete().eq('id', id)
      if (error) throw error
      return { id, animal_id }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['animal-docs', data.animal_id] })
    },
  })
}

// ─── ANIMAL GENETICS ──────────────────────────────────────────
export function useAnimalGenetics(animalId: string | undefined) {
  return useQuery({
    queryKey: ['genetics', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animal_genetics')
        .select('*')
        .eq('animal_id', animalId)
        .maybeSingle()
      if (error) throw error
      return data as AnimalGenetics | null
    },
    enabled: !!animalId,
  })
}

export function useUpsertAnimalGenetics() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<AnimalGenetics, 'id' | 'updated_at'> & { id?: string }) => {
      const payload = { ...values, updated_at: new Date().toISOString() }
      const { data, error } = values.id
        ? await supabase.from('animal_genetics').update(payload).eq('id', values.id).select().single()
        : await supabase.from('animal_genetics').insert(payload).select().single()
      if (error) throw error
      return data as AnimalGenetics
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['genetics', data.animal_id] })
    },
  })
}

// ─── PREGNANCY SALES FOR MARE (balance) ───────────────────────
export function usePregnancySalesForMare(mareId: string | undefined) {
  return useQuery({
    queryKey: ['preg-sales-mare', mareId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pregnancy_sales')
        .select('*, pregnancies!inner(id, mare_id, covered_date, result, actual_birth_date), clients(*)')
        .eq('pregnancies.mare_id', mareId)
      if (error) throw error
      return data as (PregnancySale & { pregnancies: { id: string; mare_id: string; covered_date: string; result: string; actual_birth_date?: string }; clients: unknown })[]
    },
    enabled: !!mareId,
  })
}

// ─── MAINTENANCE FEES ─────────────────────────────────────────
export function useMaintenanceFees(animalId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-fees', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_fees')
        .select('*')
        .eq('animal_id', animalId)
        .order('effective_from', { ascending: false })
      if (error) throw error
      return data as MaintenanceFee[]
    },
    enabled: !!animalId,
  })
}

export function useCreateMaintenanceFee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<MaintenanceFee, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('maintenance_fees')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as MaintenanceFee
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['maintenance-fees', data.animal_id] })
    },
  })
}

// ─── MAINTENANCE ENTRIES ──────────────────────────────────────
export function useMaintenanceEntries(animalId: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-entries', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_entries')
        .select('*')
        .eq('animal_id', animalId)
        .order('month', { ascending: false })
      if (error) throw error
      return data as MaintenanceEntry[]
    },
    enabled: !!animalId,
  })
}

export function useCreateMaintenanceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<MaintenanceEntry, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('maintenance_entries')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data as MaintenanceEntry
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['maintenance-entries', data.animal_id] })
    },
  })
}

export function useUpdateMaintenanceEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<MaintenanceEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenance_entries')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as MaintenanceEntry
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['maintenance-entries', data.animal_id] })
    },
  })
}

// ─── CLIENT SUMMARIES (for list page) ────────────────────────
export function useClientSummaries() {
  return useQuery({
    queryKey: ['client-summaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          semen_sales(id, agreed_price, deposit_amount, final_amount, payment_status),
          pregnancy_sales(id, agreed_price, deposit_amount, final_amount, payment_status),
          pregnancy_interested(id)
        `)
        .order('name')
      if (error) throw error

      type RawSale = { id: string; agreed_price: number; deposit_amount?: number; final_amount?: number; payment_status: string }

      return (data ?? []).map(client => {
        const semenSales: RawSale[] = (client.semen_sales ?? []) as RawSale[]
        const pregSales:  RawSale[] = (client.pregnancy_sales ?? []) as RawSale[]
        const interested: { id: string }[] = (client.pregnancy_interested ?? []) as { id: string }[]

        const tags: ClientTagType[] = []
        if (semenSales.length > 0) tags.push('cubricion')
        if (pregSales.length > 0)  tags.push('vientre')
        if (interested.length > 0) tags.push('interesado')

        const allT = [...semenSales, ...pregSales]
        const total_operations = allT.length
        const total_paid    = allT.reduce((s, t) => s + (t.deposit_amount ?? 0) + (t.final_amount ?? 0), 0)
        const total_pending = allT.reduce((s, t) => {
          if (t.payment_status === 'completo') return s
          const paid = (t.deposit_amount ?? 0) + (t.final_amount ?? 0)
          return s + Math.max(0, t.agreed_price - paid)
        }, 0)

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { semen_sales: _s, pregnancy_sales: _p, pregnancy_interested: _i, ...clientData } = client
        return { ...clientData, tags, total_operations, total_paid, total_pending } as ClientSummary
      })
    },
  })
}

// ─── SINGLE CLIENT ────────────────────────────────────────────
export function useClientById(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single()
      if (error) throw error
      return data as Client
    },
    enabled: !!clientId,
  })
}

// ─── CLIENT TRANSACTIONS ──────────────────────────────────────
export function useClientTransactions(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-transactions', clientId],
    queryFn: async () => {
      const [{ data: semSales }, { data: pregSales }, { data: interested }] = await Promise.all([
        supabase.from('semen_sales').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('pregnancy_sales').select('*, pregnancies!inner(id, mare_id)').eq('client_id', clientId).order('created_at', { ascending: false }),
        supabase.from('pregnancy_interested').select('*, pregnancies!inner(id, mare_id)').eq('client_id', clientId).order('created_at', { ascending: false }),
      ])
      return {
        semSales:   (semSales   ?? []) as SemenSale[],
        pregSales:  (pregSales  ?? []) as PregnancySale[],
        interested: (interested ?? []) as PregnancyInterested[],
      }
    },
    enabled: !!clientId,
  })
}

// ─── DELETE HOOKS ─────────────────────────────────────────────

export function useDeletePregnancy(mareId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pregnancies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pregnancies', mareId] })
    },
  })
}

export function useDeleteSemenSale(stallionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('semen_sales').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['semen-sales', stallionId] })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['client-summaries'] })
    },
  })
}

// ─── AUTO-TASK CREATOR (fire-and-forget) ─────────────────────
export async function createAutoTask(values: {
  owner_id: string
  title: string
  description?: string
  due_date?: string
  animal_id?: string
  origin: 'auto_herrado' | 'auto_vacuna' | 'auto_parto'
}) {
  const { error } = await supabase.from('tasks').insert({
    ...values,
    status: 'pendiente',
    priority: 'media',
  })
  if (error) console.error('[auto-task]', error.message)
}
