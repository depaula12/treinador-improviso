import { create } from 'zustand'
import type { Instrument, MixState, Position } from '../../audio/engine'
import type { LabelMode } from '../../ui/Fretboard'

interface ImprovisoState {
  progId: string
  /** progressão digitada (progId === 'custom') */
  customText: string
  key: string
  styleId: string
  scaleId: string
  restrictionId: string
  labels: LabelMode
  maxFret: number
  onlyChord: boolean
  /** desenho em foco no braço (1–5); 0 = braço inteiro */
  focusBox: number
  bpm: number
  loop: boolean
  countIn: boolean
  fillEvery: 4 | 8
  humanize: boolean
  mix: MixState
  status: 'idle' | 'loading' | 'playing'
  pos: Position | null
  set: (patch: Partial<Omit<ImprovisoState, 'set' | 'setChannel'>>) => void
  setChannel: (inst: Instrument, patch: Partial<MixState[Instrument]>) => void
}

export const useImproviso = create<ImprovisoState>((set) => ({
  progId: 'blues12',
  customText: 'Am*2 G F E7',
  key: 'A',
  styleId: 'shuffle',
  scaleId: 'pentMin',
  restrictionId: 'nenhuma',
  labels: 'graus',
  maxFret: 15,
  onlyChord: false,
  focusBox: 1,
  bpm: 90,
  loop: true,
  countIn: true,
  fillEvery: 4,
  humanize: true,
  mix: {
    drums: { on: true, volume: -2 },
    bass: { on: true, volume: 2 },
    piano: { on: true, volume: -8 },
    guitar: { on: false, volume: -4 },
  },
  status: 'idle',
  pos: null,
  set: (patch) => set(patch),
  setChannel: (inst, patch) => set((s) => ({ mix: { ...s.mix, [inst]: { ...s.mix[inst], ...patch } } })),
}))
