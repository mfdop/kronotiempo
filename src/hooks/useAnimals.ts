import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Animal } from '../types'
import { useAuth } from './useAuth'

// ─── FETCH ALL ANIMALS ───────────────────────────────────────────────────────
export function useAnimals() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['animals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('owner_id', user!.id)
        .order('name')
      if (error) throw error
      return data as Animal[]
    },
    enabled: !!user,
  })
}

// ─── FETCH SINGLE ANIMAL ─────────────────────────────────────────────────────
export function useAnimal(id: string | undefined) {
  return useQuery({
    queryKey: ['animal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Animal
    },
    enabled: !!id,
  })
}

// ─── CREATE ANIMAL ────────────────────────────────────────────────────────────
export function useCreateAnimal() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Animal, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('animals')
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Animal
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] })
    },
  })
}

// ─── UPDATE ANIMAL ────────────────────────────────────────────────────────────
export function useUpdateAnimal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Animal> & { id: string }) => {
      const { data, error } = await supabase
        .from('animals')
        .update({ ...values, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Animal
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['animals'] })
      qc.invalidateQueries({ queryKey: ['animal', data.id] })
      qc.invalidateQueries({ queryKey: ['animals-meadow'] })
    },
  })
}

// ─── DELETE ANIMAL ────────────────────────────────────────────────────────────
export function useDeleteAnimal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('animals').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['animals'] })
    },
  })
}

// ─── ANIMALS BY MEADOW (for parcelas) ────────────────────────────────────────
export function useAnimalsByMeadow(meadowId: string | undefined) {
  return useQuery({
    queryKey: ['animals-meadow', meadowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animals')
        .select('id, name, sex, breed, status, azulejo_ink, azulejo_bg, azulejo_spot_ink, coat_pattern, coat_careto, coat_cuatroalbo')
        .eq('meadow_id', meadowId)
        .eq('status', 'activo')
        .order('name')
      if (error) throw error
      return data as Partial<Animal>[]
    },
    enabled: !!meadowId,
  })
}
