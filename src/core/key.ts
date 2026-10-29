import { parseChord } from './theory'
import { KEYS } from './theory'

export interface KeyGuess {
  root: number
  mode: 'major' | 'minor'
  /** correlação com o perfil (−1 a 1) */
  score: number
  name: string
}

// Perfis de Krumhansl-Kessler: quanto cada grau "pertence" ao tom (0 = tônica)
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

function pearson(a: number[], b: number[]): number {
  const n = a.length
  const ma = a.reduce((s, x) => s + x, 0) / n
  const mb = b.reduce((s, x) => s + x, 0) / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  return da && db ? num / Math.sqrt(da * db) : 0
}

export interface TonicHint {
  /** fundamental candidata a tônica */
  root: number
  minor: boolean
  /** bônus somado à correlação */
  bonus: number
}

/**
 * Tons mais prováveis para um "peso" por nota (0 = Dó). `hints` dão um empurrão a tônicas
 * prováveis (onde as frases começam/repousam), o que desfaz empates como Em–D–C–D
 * (as notas sozinhas apontam Ré maior; o ouvido diz Mi menor).
 */
export function estimateKey(weights: number[], hints: TonicHint[] = []): KeyGuess[] {
  const out: KeyGuess[] = []
  for (let root = 0; root < 12; root++) {
    const rot = weights.map((_, i) => weights[(i + root) % 12])
    const bonus = (minor: boolean) => hints.filter((h) => h.root === root && h.minor === minor).reduce((s, h) => s + h.bonus, 0)
    out.push({ root, mode: 'major', score: pearson(rot, MAJOR) + bonus(false), name: `${KEYS[root]} maior` })
    out.push({ root, mode: 'minor', score: pearson(rot, MINOR) + bonus(true), name: `${KEYS[root]} menor` })
  }
  return out.sort((a, b) => b.score - a.score)
}

/**
 * Dicas de tônica a partir do histórico: o primeiro acorde da frase e o acorde mais tocado
 * de uma vez só (o mais longo sem trocar) costumam ser a "casa".
 */
export function tonicHints(history: { symbol: string; ms: number }[]): TonicHint[] {
  if (!history.length) return []
  const hint = (symbol: string, bonus: number): TonicHint[] => {
    const c = parseChord(symbol)
    return c ? [{ root: c.root, minor: c.minor, bonus }] : []
  }
  const longest = history.reduce((a, b) => (b.ms > a.ms ? b : a))
  return [...hint(history[0].symbol, 0.2), ...hint(longest.symbol, 0.06)]
}

/** Peso de cada nota a partir do histórico de acordes (tempo tocado; fundamental vale mais). */
export function weightsFromChords(history: { symbol: string; ms: number }[]): number[] {
  const w = new Array(12).fill(0)
  for (const h of history) {
    const c = parseChord(h.symbol)
    if (!c) continue
    c.semitones.forEach((s, i) => (w[(c.root + s) % 12] += h.ms * (i === 0 ? 1.5 : 1)))
  }
  return w
}
