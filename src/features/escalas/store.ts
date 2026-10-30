import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExerciseId } from '../../core/exercises'
import { grade, type CardStat, type Grade } from '../acordes/leitner'

export type Display = 'tudo' | 'fundamentais' | 'esconder'
/** no metrônomo (o app confere o tempo) ou esperando você acertar cada nota */
export type Pace = 'metronomo' | 'espera'

/** O que define um treino; é o que vai para as predefinições. */
export interface TrainConfig {
  scaleId: string
  key: string
  boxes: number[]
  exercise: ExerciseId
  perBeat: 1 | 2 | 3 | 4
  display: Display
  bpm: number
  sound: boolean
}

export interface Preset {
  id: string
  name: string
  config: TrainConfig
}

interface EscalasState extends TrainConfig {
  countIn: boolean
  pace: Pace
  /** speed trainer: sobe o bpm depois de uma volta com 90% ou mais (desce abaixo de 70%) */
  autoBpm: boolean
  presets: Preset[]
  /** quiz "onde está a nota" */
  quizStats: Record<string, CardStat>
  onlyScaleNotes: boolean
  set: (patch: Partial<TrainConfig & { countIn: boolean; onlyScaleNotes: boolean; pace: Pace; autoBpm: boolean }>) => void
  savePreset: (name: string) => void
  loadPreset: (id: string) => void
  deletePreset: (id: string) => void
  recordQuiz: (key: string, g: Grade) => void
}

const pickConfig = (s: TrainConfig): TrainConfig => ({
  scaleId: s.scaleId,
  key: s.key,
  boxes: s.boxes,
  exercise: s.exercise,
  perBeat: s.perBeat,
  display: s.display,
  bpm: s.bpm,
  sound: s.sound,
})

export const useEscalas = create<EscalasState>()(
  persist(
    (set, get) => ({
      scaleId: 'pentMin',
      key: 'A',
      boxes: [1],
      exercise: 'subir-descer',
      perBeat: 2,
      display: 'tudo',
      bpm: 70,
      sound: true,
      countIn: true,
      pace: 'metronomo',
      autoBpm: false,
      presets: [],
      quizStats: {},
      onlyScaleNotes: true,
      set: (patch) => set(patch),
      savePreset: (name) =>
        set((s) => ({ presets: [...s.presets, { id: String(Date.now()), name, config: pickConfig(s) }] })),
      loadPreset: (id) => {
        const p = get().presets.find((x) => x.id === id)
        if (p) set({ ...p.config })
      },
      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),
      recordQuiz: (key, g) => set((s) => ({ quizStats: { ...s.quizStats, [key]: grade(s.quizStats[key], g) } })),
    }),
    { name: 'escalas-v1' },
  ),
)
