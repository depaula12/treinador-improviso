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

// ---------- cada nota que você toca ----------

/** alvo (3ª/7ª sugerida) > outra nota do acorde > escala > fora */
export type NoteVerdict = 'alvo' | 'acorde' | 'escala' | 'fora'

export function judgeNote(pc: number, o: { targetPc: number | null; chordPcs: number[]; scalePcs: number[] }): NoteVerdict {
  if (o.targetPc !== null && pc === o.targetPc) return 'alvo'
  if (o.chordPcs.includes(pc)) return 'acorde'
  if (o.scalePcs.includes(pc)) return 'escala'
  return 'fora'
}

export interface NoteTally {
  alvo: number
  acorde: number
  escala: number
  fora: number
}
export const EMPTY_TALLY: NoteTally = { alvo: 0, acorde: 0, escala: 0, fora: 0 }
export const addTally = (t: NoteTally, v: NoteVerdict): NoteTally => ({ ...t, [v]: t[v] + 1 })
export const tallyTotal = (t: NoteTally) => t.alvo + t.acorde + t.escala + t.fora
/** % das notas dentro da escala ou do acorde (as "certas") */
export const tallyInside = (t: NoteTally) => (tallyTotal(t) ? Math.round(((tallyTotal(t) - t.fora) / tallyTotal(t)) * 100) : 0)

/**
 * Onde a nota ouvida acende no braço. O captador não diz a corda: a mesma nota existe em 3–4
 * lugares. Fica a casa dentro do box em foco; sem box, a mais perto da nota anterior (a mão
 * anda pouco); sem nada, a mais baixa até a casa 12.
 */
export function placeNote(
  midi: number,
  o: { band?: [number, number] | null; prev?: { string: number; fret: number } | null; maxFret?: number } = {},
): { string: number; fret: number } | null {
  const maxFret = o.maxFret ?? 17
  const all = TUNING.flatMap((open, string) => {
    const fret = midi - open
    return fret >= 0 && fret <= maxFret ? [{ string, fret }] : []
  })
  if (!all.length) return null
  const dist = (p: { string: number; fret: number }) => {
    let d = 0
    if (o.band) {
      const [a, b] = o.band
      // fora do box custa caro; uma casa além da borda (esticada) custa pouco
      d += p.fret < a ? (a - p.fret) * 3 : p.fret > b ? (p.fret - b) * 3 : 0
    }
    if (o.prev) d += Math.abs(p.fret - o.prev.fret) + Math.abs(p.string - o.prev.string) * 0.6
    if (!o.band && !o.prev) d += p.fret > 12 ? 20 : p.fret * 0.1
    return d
  }
  return all.reduce((best, p) => (dist(p) < dist(best) ? p : best))
}

// ---------- exercício de escala: cada nota da sequência ----------

/** certo = nota e tempo; tempo = nota certa, mas fora do tempo; oitava = nome certo, outra oitava */
export type StepVerdict = 'certo' | 'tempo' | 'oitava' | 'errado' | 'faltou'

/**
 * Julga um passo do exercício: a nota esperada `expected` soou perto de `at` (segundos)?
 * Janela proporcional ao tamanho do passo (colcheia rápida = janela menor).
 */
export function judgeStep(notes: HeardNote[], expected: number, at: number, stepSec: number): { verdict: StepVerdict; offsetMs: number | null } {
  const half = Math.min(0.22, stepSec * 0.5)
  const tight = Math.min(0.09, stepSec * 0.3)
  const near = notes.filter((n) => n.t >= at - half && n.t <= at + half)
  const pick = (ns: HeardNote[]) => ns.reduce((b, n) => (Math.abs(n.t - at) < Math.abs(b.t - at) ? n : b))
  const exact = near.filter((n) => n.midi === expected)
  if (exact.length) {
    const n = pick(exact)
    const off = Math.round((n.t - at) * 1000)
    return { verdict: Math.abs(n.t - at) <= tight ? 'certo' : 'tempo', offsetMs: off }
  }
  const octave = near.filter((n) => n.midi % 12 === expected % 12)
  if (octave.length) return { verdict: 'oitava', offsetMs: Math.round((pick(octave).t - at) * 1000) }
  if (near.length) return { verdict: 'errado', offsetMs: null }
  return { verdict: 'faltou', offsetMs: null }
}

/** % de acerto de uma volta: certo vale 1, tempo e oitava valem meio */
export function stepScore(vs: StepVerdict[]): number {
  if (!vs.length) return 0
  const pts = vs.reduce((s, v) => s + (v === 'certo' ? 1 : v === 'tempo' || v === 'oitava' ? 0.5 : 0), 0)
  return Math.round((pts / vs.length) * 100)
}

/** Speed trainer: depois de uma volta, quanto mudar o andamento. */
export const nextBpm = (bpm: number, score: number, step = 5) =>
  score >= 90 ? Math.min(200, bpm + step) : score < 70 ? Math.max(40, bpm - step) : bpm

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
