import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { format, addDays, differenceInDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { createAutoTask } from './useReproduction'
import type { Task, DailyNote, TaskOrigin } from '../types'

// ─── TASKS ───────────────────────────────────────────────────────────────────

export function useTasks() {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['tasks', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('owner_id', session!.user.id)
        .order('due_date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data as Task[]
    },
    enabled: !!session,
  })
}

export function useCreateTask() {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      values: Omit<Task, 'id' | 'owner_id' | 'created_at' | 'status'> & { origin?: TaskOrigin }
    ) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...values,
          owner_id: session!.user.id,
          status: 'pendiente',
          origin: values.origin ?? 'manual',
        })
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'completada', completed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ─── DAILY NOTE ──────────────────────────────────────────────────────────────

export function useDailyNote(date: string) {
  const { session } = useAuth()
  return useQuery({
    queryKey: ['daily_note', date, session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_notes')
        .select('*')
        .eq('owner_id', session!.user.id)
        .eq('date', date)
        .maybeSingle()
      if (error) throw error
      return data as DailyNote | null
    },
    enabled: !!session,
  })
}

export function useUpsertDailyNote() {
  const { session } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, content }: { date: string; content: string }) => {
      const { error } = await supabase
        .from('daily_notes')
        .upsert(
          { owner_id: session!.user.id, date, content },
          { onConflict: 'owner_id,date' }
        )
      if (error) throw error
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['daily_note', vars.date] })
    },
  })
}

// ─── AUTO TASKS ──────────────────────────────────────────────────────────────
// Runs once per session. Checks:
//   1. Pregnancies with expected_birth_date ≤ 14 days away
//   2. Shoeing records with overdue next_estimated_date
//   3. Vaccines with overdue next_date
// Skips if a pending auto-task already exists for the same origin+animal.

export function useAutoTasks() {
  const { session } = useAuth()
  const qc = useQueryClient()
  const firedRef = useRef(false)

  useEffect(() => {
    if (!session || firedRef.current) return
    firedRef.current = true

    const run = async () => {
      const ownerId = session.user.id
      const today = format(new Date(), 'yyyy-MM-dd')
      const in14  = format(addDays(new Date(), 14), 'yyyy-MM-dd')

      // Existing pending auto-tasks → skip duplicates
      const { data: existing } = await supabase
        .from('tasks')
        .select('origin, animal_id')
        .eq('owner_id', ownerId)
        .eq('status', 'pendiente')
        .in('origin', ['auto_parto', 'auto_herrado', 'auto_vacuna'])

      const existingSet = new Set<string>(
        (existing ?? []).map(t => `${t.origin}|${t.animal_id ?? ''}`)
      )

      // Owner's animal ids (to scope shoeing + vaccine queries)
      const { data: myAnimals } = await supabase
        .from('animals')
        .select('id')
        .eq('owner_id', ownerId)
      const myIds = (myAnimals ?? []).map(a => a.id)
      if (myIds.length === 0) return

      // 1. Pregnancies close to birth
      const { data: pregnancies } = await supabase
        .from('pregnancies')
        .select('id, mare_id, expected_birth_date')
        .eq('result', 'gestante')
        .gte('expected_birth_date', today)
        .lte('expected_birth_date', in14)
        .in('mare_id', myIds)

      for (const p of pregnancies ?? []) {
        if (!p.expected_birth_date) continue
        const key = `auto_parto|${p.mare_id}`
        if (existingSet.has(key)) continue
        const days = differenceInDays(parseISO(p.expected_birth_date), new Date())
        await createAutoTask({
          owner_id: ownerId,
          origin: 'auto_parto',
          animal_id: p.mare_id,
          title: `Parto estimado en ${days} día${days === 1 ? '' : 's'}`,
          description: `Fecha estimada de parto: ${p.expected_birth_date}`,
          due_date: p.expected_birth_date,
        })
        existingSet.add(key)
      }

      // 2. Overdue shoeings
      const { data: shoeings } = await supabase
        .from('shoeing_records')
        .select('id, animal_id, next_estimated_date')
        .in('animal_id', myIds)
        .lte('next_estimated_date', today)
        .not('next_estimated_date', 'is', null)

      for (const s of shoeings ?? []) {
        const key = `auto_herrado|${s.animal_id}`
        if (existingSet.has(key)) continue
        await createAutoTask({
          owner_id: ownerId,
          origin: 'auto_herrado',
          animal_id: s.animal_id,
          title: 'Herrado pendiente',
          due_date: s.next_estimated_date!,
        })
        existingSet.add(key)
      }

      // 3. Overdue vaccines
      const { data: vaccines } = await supabase
        .from('vaccines')
        .select('id, animal_id, next_date, type, custom_name')
        .in('animal_id', myIds)
        .lte('next_date', today)
        .not('next_date', 'is', null)

      for (const v of vaccines ?? []) {
        const key = `auto_vacuna|${v.animal_id}`
        if (existingSet.has(key)) continue
        const name = v.custom_name ?? v.type ?? 'vacuna'
        await createAutoTask({
          owner_id: ownerId,
          origin: 'auto_vacuna',
          animal_id: v.animal_id,
          title: `Vacuna pendiente: ${name}`,
          due_date: v.next_date!,
        })
        existingSet.add(key)
      }

      qc.invalidateQueries({ queryKey: ['tasks'] })
    }

    run().catch(err => console.error('[useAutoTasks]', err))
  }, [session, qc])
}
