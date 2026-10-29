import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STABILITY, TRACKER_DEFAULTS, type Stability, type TrackerOptions } from '../core/chroma'

interface InputSettings {
  stability: Stability
  /** segundos mínimos entre duas trocas de acorde */
  minHoldSec: number
  set: (patch: Partial<Pick<InputSettings, 'stability' | 'minHoldSec'>>) => void
}

/** Ajustes da leitura de acordes, compartilhados pelo Afinador e pela Jam livre. */
export const useInputSettings = create<InputSettings>()(
  persist(
    (set) => ({
      stability: 'equilibrada',
      minHoldSec: TRACKER_DEFAULTS.minHoldMs / 1000,
      set: (patch) => set(patch),
    }),
    { name: 'entrada-v1' },
  ),
)

export function trackerOptions(s: Pick<InputSettings, 'stability' | 'minHoldSec'>): TrackerOptions {
  return { ...TRACKER_DEFAULTS, ...STABILITY[s.stability], minHoldMs: s.minHoldSec * 1000 }
}
