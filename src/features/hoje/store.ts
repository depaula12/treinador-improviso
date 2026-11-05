import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dateKey, type AreaId, type EarMode } from '../../core/plano'
import { emptyDay, type DayLog } from '../../core/progresso'

/** bloco aberto numa área ("Abrir"): a área mostra a faixa de treino no topo */
export interface ActiveBlock {
  date: string
  blockId: string
  area: AreaId
  title: string
  /** frase curta para lembrar o que fazer */
  hint: string
}

/** um timer por vez; rodando = endAt, pausado = left */
export interface Timer {
  date: string
  blockId: string
  /** duração planejada, em segundos */
  total: number
  endAt: number | null
  left: number
}

interface HojeState {
  days: Record<string, DayLog>
  /** testes de saída marcados: exits[sprint][i] */
  exits: Record<number, boolean[]>
  active: ActiveBlock | null
  timer: Timer | null
  patchDay: (date: string, patch: Partial<DayLog>) => void
  toggleBlock: (date: string, blockId: string) => void
  addMinutes: (date: string, blockId: string, min: number) => void
  /** guarda o maior bpm do dia */
  logBpm: (bpm: number) => void
  logImp: (field: 'dentro' | 'alvo', pct: number) => void
  logEar: (mode: EarMode, ok: boolean) => void
  toggleExit: (sprint: number, i: number) => void
  setActive: (a: ActiveBlock | null) => void
  setTimer: (t: Timer | null) => void
}

const today = () => dateKey(new Date())

export const useHoje = create<HojeState>()(
  persist(
    (set) => {
      const edit = (date: string, f: (d: DayLog) => DayLog) =>
        set((s) => ({ days: { ...s.days, [date]: f(s.days[date] ?? emptyDay()) } }))
      return {
        days: {},
        exits: {},
        active: null,
        timer: null,
        patchDay: (date, patch) => edit(date, (d) => ({ ...d, ...patch })),
        toggleBlock: (date, id) =>
          edit(date, (d) => {
            const b = d.blocks[id] ?? { done: false, min: 0 }
            return { ...d, blocks: { ...d.blocks, [id]: { ...b, done: !b.done } } }
          }),
        addMinutes: (date, id, min) =>
          edit(date, (d) => {
            const b = d.blocks[id] ?? { done: false, min: 0 }
            return { ...d, blocks: { ...d.blocks, [id]: { ...b, min: Math.round((b.min + min) * 10) / 10 } } }
          }),
        logBpm: (bpm) => edit(today(), (d) => ({ ...d, bpm: Math.max(d.bpm ?? 0, bpm) })),
        logImp: (field, pct) => edit(today(), (d) => ({ ...d, [field]: Math.round(pct) })),
        logEar: (mode, ok) =>
          edit(today(), (d) => {
            const cur = d.ear?.[mode] ?? { c: 0, t: 0 }
            return { ...d, ear: { ...d.ear, [mode]: { c: cur.c + (ok ? 1 : 0), t: cur.t + 1 } } }
          }),
        toggleExit: (sprint, i) =>
          set((s) => {
            const arr = [...(s.exits[sprint] ?? [])]
            arr[i] = !arr[i]
            return { exits: { ...s.exits, [sprint]: arr } }
          }),
        setActive: (active) => set({ active }),
        setTimer: (timer) => set({ timer }),
      }
    },
    { name: 'hoje-v1', version: 1 },
  ),
)
