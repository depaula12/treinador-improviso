import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from '../../ui/toast'
import { engine, type Instrument, type MixState, type Position } from '../../audio/engine'
import type { Segment } from '../../core/song'
import type { LabelMode } from '../../ui/Fretboard'

/** música da área Músicas carregada como base (progId === 'song'), já transposta */
export interface LoadedSong {
  id: string
  title: string
  /** compassos com as trocas (tempo 0–3 em que cada acorde entra) */
  bars: Segment[][]
  /** levada do violão por compasso (área Compor); null = a do estilo */
  strums?: (string | null)[]
}

interface ImprovisoState {
  progId: string
  /** progressão digitada (progId === 'custom') */
  customText: string
  song: LoadedSong | null
  /** acorde da vez (o player mostra na "capa") */
  now: string
  key: string
  /** tom menor (Am em vez de A): muda o rótulo, a escala e, nas progressões prontas, a base */
  keyMinor: boolean
  styleId: string
  scaleId: string
  restrictionId: string
  labels: LabelMode
  maxFret: number
  onlyChord: boolean
  /** desenho em foco no braço (1–5); 0 = braço inteiro */
  focusBox: number
  /** mostra a nota-alvo sugerida (3ª/7ª) de cada compasso */
  guide: boolean
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

export const useImproviso = create<ImprovisoState>()(
  persist(
    (set) => ({
  progId: 'blues12',
  customText: 'Am*2 G F E7',
  song: null,
  now: '',
  key: 'A',
  keyMinor: false,
  styleId: 'shuffle',
  scaleId: 'pentMin',
  restrictionId: 'nenhuma',
  labels: 'graus',
  maxFret: 15,
  onlyChord: false,
  focusBox: 1,
  guide: true,
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
    }),
    {
      name: 'improviso-v1',
      version: 1,
      // estado da sessão (tocando, posição, acorde da vez) não vai para o armazenamento
      partialize: ({ status: _s, pos: _p, now: _n, set: _set, setChannel: _c, ...keep }) => keep,
      // vindo de uma versão sem algum campo novo: completa com o padrão
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<ImprovisoState>
        return { ...current, ...s, mix: { ...current.mix, ...(s.mix ?? {}) }, status: 'idle', pos: null, now: '' }
      },
    },
  ),
)

/** Tocar/Parar da base, usado pelo Improviso e pela cifra rolando da área Músicas. */
export async function togglePlay() {
  const s = useImproviso.getState()
  if (s.status === 'playing') {
    engine.stop()
    s.set({ status: 'idle', pos: null })
    return
  }
  if (s.status === 'loading') return
  s.set({ status: 'loading' })
  try {
    // só bateria e baixo precisam estar prontos: piano e violão entram assim que chegarem
    await engine.start(s.mix, 'base')
  } catch (e) {
    useImproviso.getState().set({ status: 'idle' })
    toast((e as Error).message, 'error')
    return
  }
  engine.setMix(useImproviso.getState().mix)
  engine.setHumanize(useImproviso.getState().humanize)
  engine.play()
  useImproviso.getState().set({ status: 'playing' })
}
