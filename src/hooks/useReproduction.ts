import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Pregnancy, SemenSale, SemenShipping, PregnancyInterested, PregnancySale, ShoeingRecord, HealthEpisode, Vaccine, AnimalDocument } from '../types'

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
      const { data, error } = values.id
        ? await supabase.from('semen_shippings').update(values).eq('id', values.id).select().single()
        : await supabase.from('semen_shippings').insert(values).select().single()
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
      id?: string; name: string; phone?: string; instagram?: string
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

// ─── AUTO-TASK CREATOR (fire-and-forget) ─────────────────────
export async function createAutoTask(values: {
  owner_id: string
  title: string
  description?: string
  due_date?: string
  animal_id?: string
  origin: 'auto_herrado' | 'auto_vacuna' | 'auto_parto' | 'auto_agua' | 'auto_comida'
}) {
  const { error } = await supabase.from('tasks').insert({
    ...values,
    status: 'pendiente',
    priority: 'media',
  })
  if (error) console.error('[auto-task]', error.message)
}
