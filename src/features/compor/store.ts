import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ComposeSection {
  name: string
  /** um acorde por compasso */
  chords: string[]
}

interface ComposeState {
  root: number
  minor: boolean
  sections: ComposeSection[]
  /** seção em que as opções entram */
  cur: number
  set: (patch: Partial<Omit<ComposeState, 'set'>>) => void
}

// rascunho da composição, guardado no aparelho (sobrevive a recarregar a página)
export const useCompose = create<ComposeState>()(
  persist(
    (set) => ({
      root: 9,
      minor: true,
      sections: [{ name: 'Verso', chords: [] }],
      cur: 0,
      set: (patch) => set(patch),
    }),
    { name: 'compor-v1' },
  ),
)
