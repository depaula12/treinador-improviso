import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EarPreset } from '../../core/plano'

interface OuvidoState {
  preset: EarPreset
  /** toca a próxima pergunta sozinho depois de responder */
  autoNext: boolean
  /** dia em que o conjunto foi escolhido à mão (senão o app abre no do plano) */
  pickedOn: string
  set: (patch: Partial<Omit<OuvidoState, 'set'>>) => void
}

export const useOuvido = create<OuvidoState>()(
  persist(
    (set) => ({
      preset: { m: 'int', set: ['3m', '3M', '5J', '8J'], dir: 'asc' },
      autoNext: true,
      pickedOn: '',
      set: (patch) => set(patch),
    }),
    { name: 'ouvido-v1' },
  ),
)
