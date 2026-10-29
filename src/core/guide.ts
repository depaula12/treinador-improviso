import { TUNING } from './fretboard-model'
import type { ChordInfo } from './theory'

export interface GuideTarget {
  string: number
  fret: number
  midi: number
  /** semitons a partir da fundamental do acorde (4 = 3ª maior, 10 = b7…) */
  interval: number
}

/**
 * Notas-guia de um acorde: 3ª e 7ª (as que definem o acorde). Sem 7ª, só a 3ª;
 * sem 3ª (power chord, sus), a fundamental e a 5ª/4ª/2ª que houver.
 */
export function guideIntervals(c: ChordInfo): number[] {
  const s = c.semitones.map((x) => x % 12)
  const thirds = s.filter((x) => x === 3 || x === 4)
  const sevenths = s.filter((x) => x === 10 || x === 11)
  if (thirds.length) return [...thirds, ...sevenths]
  return s.filter((x) => x !== 0).length ? s.filter((x) => x !== 0) : [0]
}

/** Casas [lo, hi] onde procurar alvos; todas as cordas. */
function candidates(c: ChordInfo, lo: number, hi: number): GuideTarget[] {
  const want = new Set(guideIntervals(c))
  const out: GuideTarget[] = []
  TUNING.forEach((open, string) => {
    for (let fret = lo; fret <= hi; fret++) {
      const midi = open + fret
      const interval = (((midi - c.root) % 12) + 12) % 12
      if (want.has(interval)) out.push({ string, fret, midi, interval })
    }
  })
  return out
}

/**
 * Linha de notas-guia: um alvo por compasso, sempre o mais próximo (em altura) do alvo anterior,
 * dentro da região do braço [lo, hi]. Em empate prefere a 3ª. Passa duas voltas pela progressão
 * para que o primeiro compasso também conecte bem com o último.
 */
export function guideLine(chords: ChordInfo[], lo: number, hi: number): GuideTarget[] {
  if (!chords.length) return []
  const cands = chords.map((c) => candidates(c, lo, hi))
  // começa perto do meio da região, nas cordas do meio (Sol/Si)
  let prev = (TUNING[2] + TUNING[1]) / 2 + (lo + hi) / 2
  const pick = (i: number) => {
    const list = cands[i]
    if (!list.length) return null
    let best = list[0]
    let bestCost = Infinity
    for (const t of list) {
      const isThird = t.interval === 3 || t.interval === 4
      const cost = Math.abs(t.midi - prev) + (isThird ? 0 : 0.5)
      if (cost < bestCost) {
        bestCost = cost
        best = t
      }
    }
    prev = best.midi
    return best
  }
  for (let i = 0; i < chords.length; i++) pick(i) // aquecimento
  return chords.map((_, i) => pick(i)!).map((t, i) => t ?? cands[i][0])
}
