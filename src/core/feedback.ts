import { TUNING } from './fretboard-model'
import { parseChord } from './theory'

// O app conferindo o que você toca: placar de notas-alvo no tempo 1, acorde pedido no quiz
// e nota pedida no "onde está a nota". Funções puras; a tela só junta com a entrada de áudio.

export interface HeardNote {
  midi: number
  /** segundos (performance.now() / 1000) */
  t: number
}

export type DownbeatResult = 'alvo' | 'acorde' | 'fora' | 'silencio'

/**
 * O que você tocou perto do tempo 1: um pouco antes (antecipar é musical) até um pouco depois
 * (a detecção leva ~0,1 s para fechar a nota).
 */
export function scoreDownbeat(
  notes: HeardNote[],
  downbeat: number,
  targetPc: number | null,
  chordPcs: number[],
  before = 0.18,
  after = 0.32,
): DownbeatResult {
  const near = notes.filter((n) => n.t >= downbeat - before && n.t <= downbeat + after)
  if (!near.length) return 'silencio'
  const pcs = near.map((n) => n.midi % 12)
  if (targetPc !== null && pcs.includes(targetPc)) return 'alvo'
  if (pcs.some((p) => chordPcs.includes(p))) return 'acorde'
  return 'fora'
}

export interface Score {
  alvo: number
  acorde: number
  fora: number
  silencio: number
}
export const EMPTY_SCORE: Score = { alvo: 0, acorde: 0, fora: 0, silencio: 0 }
export const addScore = (s: Score, r: DownbeatResult): Score => ({ ...s, [r]: s[r] + 1 })
/** compassos em que você tocou algo (o silêncio não conta como erro) */
export const played = (s: Score) => s.alvo + s.acorde + s.fora

/** O acorde ouvido é o pedido? Mesma fundamental e mesmas notas (G7M = Gmaj7, D/F# não é D). */
export function chordMatches(heard: string, wanted: string): boolean {
  const a = parseChord(heard)
  const b = parseChord(wanted)
  if (!a || !b || a.root !== b.root) return false
  const set = (s: number[]) => [...new Set(s.map((x) => x % 12))].sort((x, y) => x - y).join()
  return set(a.semitones) === set(b.semitones)
}

/**
 * Casa onde a nota ouvida cai naquela corda (0 = Mi agudo), ou null se a nota não dá nessa
 * corda até `maxFret` (tocou em outra corda ou oitava).
 */
export function fretOnString(midi: number, string: number, maxFret = 12): number | null {
  const f = midi - TUNING[string]
  return f >= 0 && f <= maxFret ? f : null
}
