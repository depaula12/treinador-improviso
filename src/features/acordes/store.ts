import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ShapeKind } from '../../core/chord-bank'
import { grade, type CardStat, type Grade } from './leitner'
import { LEVELS, type QuestionType, type QuizMode } from './quiz-model'

export type { QuizMode } from './quiz-model'

interface AcordesState {
  qualities: string[]
  kinds: ShapeKind[]
  /** nível pronto escolhido (1–4); 0 = escolha personalizada de tipos e formas */
  level: 0 | 1 | 2 | 3 | 4
  mode: QuizMode
  /** tipos de pergunta que entram no modo "misturado" */
  mixTypes: QuestionType[]
  /** perguntas por sessão (0 = sem fim) */
  sessionLen: 0 | 10 | 20 | 50
  /** treinar só os acordes desta música (área Músicas); null = tipos escolhidos */
  songId: string | null
  stats: Record<string, CardStat>
  set: (patch: Partial<Omit<AcordesState, 'set' | 'record' | 'resetStats' | 'stats'>>) => void
  record: (key: string, g: Grade) => void
  resetStats: () => void
}

// Guardado no localStorage. Quando a área Progresso entrar, migra para o IndexedDB.
export const useAcordes = create<AcordesState>()(
  persist(
    (set) => ({
      qualities: LEVELS[2].qualities,
      kinds: LEVELS[2].kinds,
      level: 2,
      mode: 'misturado',
      mixTypes: ['cifra-desenho', 'desenho-cifra', 'grau-no-desenho', 'nota-do-grau', 'comparar'],
      sessionLen: 20,
      songId: null,
      stats: {},
      set: (patch) => set(patch),
      record: (key, g) => set((s) => ({ stats: { ...s.stats, [key]: grade(s.stats[key], g) } })),
      resetStats: () => set({ stats: {} }),
    }),
    {
      name: 'acordes-v1',
      version: 2,
      // v1 tinha "forms" (6ª/5ª/aberta) e só 4 modos: começa no nível 2, mantendo o progresso
      migrate: (old) => {
        const o = (old ?? {}) as Record<string, unknown>
        delete o.forms
        // os tipos que a pessoa tinha escolhido continuam: vira uma escolha personalizada
        if (Array.isArray(o.qualities)) o.level = 0
        return o as unknown as AcordesState
      },
    },
  ),
)
