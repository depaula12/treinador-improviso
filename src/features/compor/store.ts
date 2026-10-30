import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../../core/compose'
import { fromV1, newSection, type CompSection } from '../../core/compose-doc'

interface ComposeState {
  root: number
  minor: boolean
  sections: CompSection[]
  /** seção em que as opções entram */
  cur: number
  bpm: number
  /** estilo da base (bateria, baixo, piano) */
  styleId: string
  /** linguagem das sugestões (pop/rock, blues, bossa/jazz) */
  lang: Lang
  set: (patch: Partial<Omit<ComposeState, 'set'>>) => void
}

// rascunho da composição, guardado no aparelho (sobrevive a recarregar a página)
export const useCompose = create<ComposeState>()(
  persist(
    (set) => ({
      root: 9,
      minor: true,
      sections: [newSection('Verso')],
      cur: 0,
      bpm: 90,
      styleId: 'ballad',
      lang: 'pop',
      set: (patch) => set(patch),
    }),
    {
      name: 'compor-v1',
      version: 2,
      // v1: cada seção era uma lista de cifras, um compasso cada
      migrate: (old, version) => {
        const s = (old ?? {}) as Record<string, unknown>
        if (version < 2 && Array.isArray(s.sections)) s.sections = fromV1(s.sections as { name: string; chords: string[] }[])
        return s as unknown as ComposeState
      },
    },
  ),
)
