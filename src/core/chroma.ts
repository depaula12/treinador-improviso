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

// Tipos que a detecção reconhece: os 9 validados com a guitarra. Os tipos novos do banco
// (6, º7, 9…) ficam de fora de propósito: C6 tem as mesmas notas de Am7, e o detector passaria
// a trocar um pelo outro.
export const DETECT_QUALITIES = ['5', 'maj', 'm', '7', 'm7', '7M', 'sus2', 'sus4', 'add9']

const TEMPLATES = QUALITIES.filter((q) => DETECT_QUALITIES.includes(q.id)).flatMap((q) =>
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

export interface TrackerOptions {
  /** leituras seguidas que um acorde novo precisa vencer para aparecer */
  stable: number
  /** vantagem mínima de pontuação sobre o acorde atual para trocar (tendência a ficar no atual) */
  stickiness: number
  /** tempo mínimo (ms) que um acorde fica na tela antes de poder ser trocado */
  minHoldMs: number
  /** quanto tempo (ms) o acorde fica depois que o som acaba */
  releaseMs: number
  /** peso da leitura nova na média do chroma (1 = sem média; menor = mais suave) */
  smoothing: number
}

export type Stability = 'rapida' | 'equilibrada' | 'estavel'
export const STABILITY: Record<Stability, Omit<TrackerOptions, 'minHoldMs' | 'releaseMs'>> = {
  rapida: { stable: 2, stickiness: 0.02, smoothing: 0.7 },
  equilibrada: { stable: 3, stickiness: 0.05, smoothing: 0.45 },
  estavel: { stable: 5, stickiness: 0.1, smoothing: 0.25 },
}
export const TRACKER_DEFAULTS: TrackerOptions = { ...STABILITY.equilibrada, minHoldMs: 800, releaseMs: 1500 }

/**
 * Estabiliza o acorde exibido:
 * - um acorde novo só entra se vencer `stable` leituras seguidas, por uma margem `stickiness`
 *   sobre a pontuação do acorde atual naquela mesma leitura;
 * - e só depois de o atual ter ficado `minHoldMs` na tela.
 * Recebe a lista completa de palpites (para saber quanto o acorde atual ainda pontua).
 */
export class ChordTracker {
  private candidate: string | null = null
  private count = 0
  private shown: ChordGuess | null = null
  private shownAt = -Infinity
  private lastSeen = -Infinity
  opt: TrackerOptions

  constructor(opt: Partial<TrackerOptions> = {}) {
    this.opt = { ...TRACKER_DEFAULTS, ...opt }
  }

  push(guesses: ChordGuess[] | null, now: number): ChordGuess | null {
    if (!guesses?.length) {
      if (now - this.lastSeen > this.opt.releaseMs) this.shown = null
      this.candidate = null
      this.count = 0
      return this.shown
    }
    this.lastSeen = now
    const top = guesses[0]
    if (this.shown) {
      if (top.symbol === this.shown.symbol) {
        this.shown = top
        this.candidate = null
        this.count = 0
        return this.shown
      }
      // o atual ainda está perto do primeiro lugar: fica
      const cur = guesses.find((g) => g.symbol === this.shown!.symbol)
      if (cur && top.score - cur.score < this.opt.stickiness) {
        this.candidate = null
        this.count = 0
        return this.shown
      }
    }
    if (top.symbol === this.candidate) this.count++
    else {
      this.candidate = top.symbol
      this.count = 1
    }
    const held = now - this.shownAt >= this.opt.minHoldMs
    if (this.count >= this.opt.stable && (held || !this.shown)) {
      this.shown = top
      this.shownAt = now
      this.candidate = null
      this.count = 0
    }
    return this.shown
  }
}

/** Média móvel do chroma: reduz o "pisca-pisca" entre leituras. */
export class ChromaSmoother {
  private avg: Chroma | null = null
  push(c: Chroma | null, alpha: number): Chroma | null {
    if (!c) return (this.avg = null)
    this.avg = this.avg ? this.avg.map((v, i) => alpha * c[i] + (1 - alpha) * v) : [...c]
    return this.avg
  }
}
