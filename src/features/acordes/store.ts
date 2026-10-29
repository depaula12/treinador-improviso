import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FormKind } from '../../core/voicings'
import { grade, type CardStat, type Grade } from './leitner'

export type QuizMode = 'cifra-desenho' | 'desenho-cifra' | 'cifra-notas' | 'cronometrado'

interface AcordesState {
  qualities: string[]
  forms: FormKind[]
  mode: QuizMode
  stats: Record<string, CardStat>
  set: (patch: Partial<Pick<AcordesState, 'qualities' | 'forms' | 'mode'>>) => void
  record: (key: string, g: Grade) => void
  resetStats: () => void
}

// Guardado no localStorage. Quando a área Progresso (Fase 1b) entrar, migra para o IndexedDB.
export const useAcordes = create<AcordesState>()(
  persist(
    (set) => ({
      qualities: ['maj', 'm', '7', 'm7'],
      forms: ['6', '5', 'aberto'],
      mode: 'cifra-desenho',
      stats: {},
      set: (patch) => set(patch),
      record: (key, g) => set((s) => ({ stats: { ...s.stats, [key]: grade(s.stats[key], g) } })),
      resetStats: () => set({ stats: {} }),
    }),
    { name: 'acordes-v1' },
  ),
)
