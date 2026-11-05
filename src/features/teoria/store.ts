import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { review, type ReviewItem } from '../../core/licoes'
import { dateKey } from '../../core/plano'

export interface LessonResult {
  /** acertos na última vez que respondeu as perguntas */
  score: number
  total: number
  date: string
}

interface TeoriaState {
  done: Record<string, LessonResult>
  /** perguntas erradas que voltam (chave "s1-0#2") */
  rev: Record<string, ReviewItem>
  /** lição aberta; 'revisao' = sessão de revisão; null = lista */
  open: string | null
  set: (patch: Partial<Pick<TeoriaState, 'open'>>) => void
  answer: (key: string, ok: boolean) => void
  finish: (lessonId: string, score: number, total: number) => void
}

export const useTeoria = create<TeoriaState>()(
  persist(
    (set) => ({
      done: {},
      rev: {},
      open: null,
      set: (patch) => set(patch),
      answer: (key, ok) =>
        set((s) => {
          const next = review(s.rev[key], ok, dateKey(new Date()))
          const rev = { ...s.rev }
          if (next) rev[key] = next
          else delete rev[key]
          return { rev }
        }),
      finish: (id, score, total) => set((s) => ({ done: { ...s.done, [id]: { score, total, date: dateKey(new Date()) } } })),
    }),
    { name: 'teoria-v1' },
  ),
)
