import { create } from 'zustand'

/**
 * O player fixo embaixo controla a base do Improviso. Uma área com transporte próprio
 * (exercícios de Escalas) toma o lugar dele enquanto está aberta.
 */
export interface PlayerSlot {
  title: string
  sub: string
  art: string
  bpm: number
  playing: boolean
  onToggle: () => void
  onBpm: (delta: number) => void
}

interface SlotState {
  slot: PlayerSlot | null
  /** algo na tela usa a barra de espaço (marcar tempos): o player não toca/para com ela */
  spaceTaken: boolean
  set: (patch: Partial<Omit<SlotState, 'set'>>) => void
}

export const usePlayerSlot = create<SlotState>((set) => ({
  slot: null,
  spaceTaken: false,
  set: (patch) => set(patch),
}))
