import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { getWaterFoodStatus } from '../lib/constants'
import { useAuth } from './useAuth'
import type { Meadow, MeadowWaterLog, MeadowFoodLog } from '../types'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type MeadowWithLogs = Meadow & {
  meadow_water_logs: Pick<MeadowWaterLog, 'id' | 'logged_at'>[]
  meadow_food_logs:  Pick<MeadowFoodLog,  'id' | 'logged_at'>[]
  animals: { id: string }[]
}

export type WaterFoodStatus = {
  status: 'ok' | 'warn' | 'due' | 'neutral'
  daysSince: number | null
  average: number
  /** Set while the food interval is still being learned (neutral colours). */
  learning?: { count: number; needed: number }
}

export const FOOD_LEARN_MIN_LOGS = 5
const FOOD_MAX_INTERVALS = 5

// ─── HELPERS ──────────────────────────────────────────────────────────────────

export function computeWaterFoodStatus(
  logs: { logged_at: string }[],
  defaultAvg = 30
): WaterFoodStatus {
  if (!logs || logs.length === 0) return { status: 'due', daysSince: null, average: defaultAvg }

  const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const last = sorted[sorted.length - 1]
  const daysSince = differenceInDays(new Date(), parseISO(last.logged_at))

  let average = defaultAvg
  if (sorted.length >= 2) {
    const spans: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const diff = differenceInDays(parseISO(sorted[i].logged_at), parseISO(sorted[i - 1].logged_at))
      if (diff > 0) spans.push(diff)
    }
    if (spans.length > 0) average = Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10
  }

  return { status: getWaterFoodStatus(daysSince, Math.max(average, 1)), daysSince, average }
}

/**
 * Food status. Neutral (no colours) until FOOD_LEARN_MIN_LOGS logs exist; after
 * that the expected refill interval is the average of the most recent intervals
 * (up to the last FOOD_MAX_INTERVALS) between logs.
 */
export function computeFoodStatus(logs: { logged_at: string }[], defaultAvg = 30): WaterFoodStatus {
  const sorted = [...(logs ?? [])].sort((a, b) => a.logged_at.localeCompare(b.logged_at))
  const daysSince = sorted.length > 0
    ? differenceInDays(new Date(), parseISO(sorted[sorted.length - 1].logged_at))
    : null

  if (sorted.length < FOOD_LEARN_MIN_LOGS) {
    return {
      status: 'neutral', daysSince, average: defaultAvg,
      learning: { count: sorted.length, needed: FOOD_LEARN_MIN_LOGS },
    }
  }

  const recent = sorted.slice(-(FOOD_MAX_INTERVALS + 1))
  const spans: number[] = []
  for (let i = 1; i < recent.length; i++) {
    const diff = differenceInDays(parseISO(recent[i].logged_at), parseISO(recent[i - 1].logged_at))
    if (diff > 0) spans.push(diff)
  }
  const average = spans.length > 0
    ? Math.round((spans.reduce((a, b) => a + b, 0) / spans.length) * 10) / 10
    : defaultAvg

  return { status: getWaterFoodStatus(daysSince ?? 0, Math.max(average, 1)), daysSince, average }
}

export function statusTextColor(s: 'ok' | 'warn' | 'due' | 'neutral') {
  if (s === 'neutral') return '#A08888'
  if (s === 'due')  return '#8C1F1F'
  if (s === 'warn') return '#9C6A00'
  return '#2E6B3E'
}

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export function useMeadows() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['meadows', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meadows')
        .select('*, meadow_water_logs(id,logged_at), meadow_food_logs(id,logged_at), animals(id)')
        .eq('owner_id', user!.id)
        .order('name')
      if (error) throw error
      return data as MeadowWithLogs[]
    },
    enabled: !!user,
  })
}

export function useMeadow(id: string | undefined) {
  return useQuery({
    queryKey: ['meadow', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meadows')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Meadow
    },
    enabled: !!id,
  })
}

// ─── ANIMAL MEADOW HISTORY ────────────────────────────────────────────────────

export type MeadowHistoryEntry = {
  id: string
  animal_id: string
  meadow_id: string
  entered_at: string
  left_at: string | null
  meadows: { name: string; icon_emoji: string | null } | null
}

export function useAnimalMeadowHistory(animalId: string | undefined) {
  return useQuery({
    queryKey: ['animal-meadow-history', animalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('animal_meadow_history')
        .select('*, meadows(name, icon_emoji)')
        .eq('animal_id', animalId)
        .order('entered_at', { ascending: false })
      if (error) throw error
      return data as MeadowHistoryEntry[]
    },
    enabled: !!animalId,
  })
}

export function useMeadowWaterLogs(meadowId: string | undefined) {
  return useQuery({
    queryKey: ['meadow-water-logs', meadowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meadow_water_logs')
        .select('*')
        .eq('meadow_id', meadowId)
        .order('logged_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as MeadowWaterLog[]
    },
    enabled: !!meadowId,
  })
}

export function useMeadowFoodLogs(meadowId: string | undefined) {
  return useQuery({
    queryKey: ['meadow-food-logs', meadowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meadow_food_logs')
        .select('*')
        .eq('meadow_id', meadowId)
        .order('logged_at', { ascending: false })
        .limit(30)
      if (error) throw error
      return data as MeadowFoodLog[]
    },
    enabled: !!meadowId,
  })
}

// ─── MUTATIONS ────────────────────────────────────────────────────────────────

export function useCreateMeadow() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Meadow, 'id' | 'owner_id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('meadows')
        .insert({ ...values, owner_id: user!.id })
        .select()
        .single()
      if (error) throw error
      return data as Meadow
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meadows'] }),
  })
}

export function useUpdateMeadow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Meadow> & { id: string }) => {
      const { data, error } = await supabase
        .from('meadows')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Meadow
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meadows'] })
      qc.invalidateQueries({ queryKey: ['meadow', data.id] })
    },
  })
}

export function useLogWater() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (meadow_id: string) => {
      const { data, error } = await supabase
        .from('meadow_water_logs')
        .insert({ meadow_id, logged_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data as MeadowWaterLog
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meadows'] })
      qc.invalidateQueries({ queryKey: ['meadow-water-logs', data.meadow_id] })
    },
  })
}

export function useDeleteMeadow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meadows').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meadows'] }),
  })
}

export function useLogFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (meadow_id: string) => {
      const { data, error } = await supabase
        .from('meadow_food_logs')
        .insert({ meadow_id, logged_at: new Date().toISOString() })
        .select()
        .single()
      if (error) throw error
      return data as MeadowFoodLog
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meadows'] })
      qc.invalidateQueries({ queryKey: ['meadow-food-logs', data.meadow_id] })
    },
  })
}
