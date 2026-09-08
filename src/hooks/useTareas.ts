import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Tarea } from '../types/db'

export function useTareas() {
  return useQuery({
    queryKey: ['tareas'],
    queryFn: async (): Promise<Tarea[]> => {
      const { data, error } = await supabase
        .from('tareas')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Tarea[]
    },
  })
}

type NuevaTarea = Omit<Tarea, 'id' | 'created_at'>

export function useGuardarTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...t }: Partial<NuevaTarea> & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from('tareas').update(t).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tareas').insert(t as NuevaTarea)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  })
}

export function useBorrarTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tareas').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tareas'] }),
  })
}
