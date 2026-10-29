import { KEYS } from './theory'
import { QUALITIES } from './voicings'

/** Energia de cada uma das 12 notas (0 = Dó), normalizada para o máximo = 1. */
export type Chroma = number[]

const MIN_HZ = 75
const MAX_HZ = 1200

/**
 * Chroma a partir do espectro (magnitudes lineares por faixa de frequência).
 * Só entram picos locais: cada parcial vira a nota mais próxima. Parciais agudos pesam menos,
 * porque são em grande parte harmônicos (o 3º harmônico soa como a 5ª, o 5º como a 3ª maior).
 * Também devolve a nota mais grave com energia relevante (o baixo do acorde).
 */
export interface ChromaOptions {
  /** expoente aplicado à magnitude de cada pico (1 = linear; < 1 comprime, equilibrando cordas fracas) */
  exponent: number
  /** pico mínimo em relação ao maior */
  floor: number
}
// valores escolhidos por busca em 280 acordes sintéticos com volume aleatório por corda (99,6% de acerto);
// a compressão (expoente 0,5) é o que mais pesa: com energia ao quadrado a corda mais forte apagava a 3ª
export const CHROMA_DEFAULTS: ChromaOptions = { exponent: 0.5, floor: 0.05 }

export function chromaFromSpectrum(
  mags: ArrayLike<number>,
  binHz: number,
  opt: ChromaOptions = CHROMA_DEFAULTS,
): { chroma: Chroma; bass: number | null } {
  const chroma = new Array(12).fill(0)
  const lo = Math.max(2, Math.floor(MIN_HZ / binHz))
  const hi = Math.min(mags.length - 2, Math.ceil(MAX_HZ / binHz))
  let max = 0
  for (let i = lo; i <= hi; i++) if (mags[i] > max) max = mags[i]
  if (max <= 0) return { chroma, bass: null }

  let bass: number | null = null
  for (let i = lo; i <= hi; i++) {
    const m = mags[i]
    // pico local acima de 1/20 do maior (−26 dB)
    if (m < max * opt.floor || m < mags[i - 1] || m < mags[i + 1]) continue
    // interpolação parabólica para achar a frequência entre as faixas
    const a = mags[i - 1]
    const c = mags[i + 1]
    const d = (a - c) / (2 * (a - 2 * m + c) || 1)
    const freq = (i + d) * binHz
    const midi = 69 + 12 * Math.log2(freq / 440)
    const pc = ((Math.round(midi) % 12) + 12) % 12
    const weight = 1 / Math.sqrt(freq / MIN_HZ)
    chroma[pc] += (m / max) ** opt.exponent * weight
    if (bass === null && m >= max * 0.15) bass = pc
  }
  const top = Math.max(...chroma)
  return { chroma: top > 0 ? chroma.map((v) => v / top) : chroma, bass }
}

export interface ChordGuess {
  root: number
  quality: string
  symbol: string
  score: number
}

const TEMPLATES = QUALITIES.flatMap((q) =>
  Array.from({ length: 12 }, (_, root) => {
    const pcs = q.pcs.map((s) => (root + s) % 12)
    return { root, quality: q.id, symbol: KEYS[root] + q.suffix, pcs }
  }),
)

/**
 * Compara o chroma com os moldes de todos os acordes do banco (9 tipos × 12 fundamentais).
 * Nota: similaridade de cosseno + bônus quando o baixo é a fundamental + leve preferência por
 * acordes mais simples (senão um A soaria sempre como Aadd9 ou A7 por causa dos harmônicos).
 */
export interface MatchOptions {
  bassBonus: number
  /** penalidade por nota a mais que 3 (preferência por acordes simples) */
  extraPenalty: number
  /** penalidade do power chord proporcional à 3ª presente */
  powerThirdPenalty: number
}
export const MATCH_DEFAULTS: MatchOptions = { bassBonus: 0.06, extraPenalty: 0, powerThirdPenalty: 0.3 }

export function matchChord(chroma: Chroma, bass: number | null, opt: MatchOptions = MATCH_DEFAULTS): ChordGuess[] {
  const norm = Math.sqrt(chroma.reduce((s, v) => s + v * v, 0)) || 1
  return TEMPLATES.map((t) => {
    let dot = 0
    for (const pc of t.pcs) dot += chroma[pc]
    let score = dot / (norm * Math.sqrt(t.pcs.length))
    if (bass !== null && bass === t.root) score += opt.bassBonus
    score -= opt.extraPenalty * Math.max(0, t.pcs.length - 3)
    // power chord só se não houver 3ª: no violão a 3ª costuma estar numa corda só e soa fraca,
    // então sem esta regra todo acorde maior/menor viraria "5"
    if (t.quality === '5') score -= opt.powerThirdPenalty * Math.max(chroma[(t.root + 3) % 12], chroma[(t.root + 4) % 12])
    return { root: t.root, quality: t.quality, symbol: t.symbol, score }
  }).sort((a, b) => b.score - a.score)
}

/** Acorde só aparece depois de repetir por `stable` leituras; some `holdMs` depois do som acabar. */
export class ChordTracker {
  private candidate: string | null = null
  private count = 0
  private shown: ChordGuess | null = null
  private lastSeen = -Infinity
  constructor(private stable = 3, private holdMs = 1500) {}

  push(guess: ChordGuess | null, now: number): ChordGuess | null {
    if (!guess) {
      if (now - this.lastSeen > this.holdMs) this.shown = null
      this.candidate = null
      this.count = 0
      return this.shown
    }
    this.lastSeen = now
    if (guess.symbol === this.candidate) this.count++
    else {
      this.candidate = guess.symbol
      this.count = 1
    }
    if (this.count >= this.stable || this.shown?.symbol === guess.symbol) this.shown = guess
    return this.shown
  }
}
