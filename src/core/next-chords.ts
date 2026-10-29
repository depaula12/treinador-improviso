import type { KeyGuess } from './key'
import { KEYS, type ChordInfo } from './theory'

export interface Suggestion {
  symbol: string
  /** grau em algarismo romano relativo ao tom (ex.: "IV") */
  roman: string
  /** peso relativo (quanto maior, mais comum) */
  weight: number
}

type Q = 'maj' | 'm' | 'dom'
interface Step {
  deg: number
  q: Q
  w: number
}

/**
 * Transições comuns em blues, rock e pop, por grau (semitons a partir da tônica).
 * Pesos feitos à mão a partir do repertório clássico; depois podem ser aprendidos das músicas importadas.
 */
const MAJOR: Record<number, Step[]> = {
  0: [{ deg: 5, q: 'maj', w: 5 }, { deg: 7, q: 'maj', w: 4 }, { deg: 9, q: 'm', w: 3 }, { deg: 10, q: 'maj', w: 2 }, { deg: 2, q: 'm', w: 1 }],
  2: [{ deg: 7, q: 'maj', w: 5 }, { deg: 5, q: 'maj', w: 2 }, { deg: 0, q: 'maj', w: 1 }],
  4: [{ deg: 9, q: 'm', w: 3 }, { deg: 5, q: 'maj', w: 3 }, { deg: 2, q: 'm', w: 1 }],
  5: [{ deg: 0, q: 'maj', w: 5 }, { deg: 7, q: 'maj', w: 4 }, { deg: 2, q: 'm', w: 2 }, { deg: 5, q: 'm', w: 1 }],
  7: [{ deg: 0, q: 'maj', w: 6 }, { deg: 5, q: 'maj', w: 3 }, { deg: 9, q: 'm', w: 2 }],
  9: [{ deg: 5, q: 'maj', w: 5 }, { deg: 2, q: 'm', w: 3 }, { deg: 7, q: 'maj', w: 2 }, { deg: 4, q: 'm', w: 1 }],
  10: [{ deg: 5, q: 'maj', w: 5 }, { deg: 0, q: 'maj', w: 4 }],
}
const MINOR: Record<number, Step[]> = {
  0: [{ deg: 10, q: 'maj', w: 5 }, { deg: 8, q: 'maj', w: 4 }, { deg: 5, q: 'm', w: 3 }, { deg: 7, q: 'dom', w: 2 }, { deg: 3, q: 'maj', w: 2 }],
  3: [{ deg: 10, q: 'maj', w: 4 }, { deg: 8, q: 'maj', w: 3 }, { deg: 5, q: 'm', w: 2 }],
  5: [{ deg: 0, q: 'm', w: 5 }, { deg: 7, q: 'dom', w: 3 }, { deg: 10, q: 'maj', w: 2 }],
  7: [{ deg: 0, q: 'm', w: 6 }, { deg: 8, q: 'maj', w: 2 }],
  8: [{ deg: 10, q: 'maj', w: 5 }, { deg: 7, q: 'dom', w: 3 }, { deg: 0, q: 'm', w: 2 }, { deg: 5, q: 'm', w: 1 }],
  10: [{ deg: 0, q: 'm', w: 5 }, { deg: 8, q: 'maj', w: 4 }, { deg: 3, q: 'maj', w: 2 }],
}
// blues: I7, IV7 e V7 (todos dominantes)
const BLUES: Record<number, Step[]> = {
  0: [{ deg: 5, q: 'dom', w: 6 }, { deg: 7, q: 'dom', w: 3 }],
  5: [{ deg: 0, q: 'dom', w: 6 }, { deg: 7, q: 'dom', w: 2 }],
  7: [{ deg: 5, q: 'dom', w: 5 }, { deg: 0, q: 'dom', w: 5 }],
}

const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII']
const suffix = (q: Q) => (q === 'm' ? 'm' : q === 'dom' ? '7' : '')
const roman = (deg: number, q: Q) => (q === 'm' ? ROMAN[deg].toLowerCase() : ROMAN[deg]) + (q === 'dom' ? '7' : '')

const isDominant = (c: ChordInfo) => c.semitones.includes(4) && c.semitones.includes(10)

/** Grau de um acorde no tom (ex.: D7 em Lá → "IV7"). */
export function romanOf(c: ChordInfo, key: KeyGuess): string {
  const deg = (((c.root - key.root) % 12) + 12) % 12
  return roman(deg, c.minor ? 'm' : isDominant(c) ? 'dom' : 'maj')
}

/** Escala para improvisar no tom: blues/dominantes e tons menores → pentatônica menor; maior → pentatônica maior. */
export function scaleForKey(key: KeyGuess, current: ChordInfo | null): 'pentMin' | 'pentMaj' {
  if (key.mode === 'minor') return 'pentMin'
  return current && isDominant(current) ? 'pentMin' : 'pentMaj'
}

/**
 * Próximos acordes prováveis a partir do acorde atual e do tom estimado.
 * Se o acorde atual é dominante e o tom é maior, usa a tabela de blues (I7–IV7–V7).
 * Acorde fora da tabela (ex.: emprestado): sugere voltar à tônica, IV ou V.
 */
export function suggestNext(current: ChordInfo, key: KeyGuess, max = 3): Suggestion[] {
  const deg = (((current.root - key.root) % 12) + 12) % 12
  const blues = key.mode === 'major' && isDominant(current) && deg in BLUES
  const table = blues ? BLUES : key.mode === 'major' ? MAJOR : MINOR
  const steps =
    table[deg] ??
    (key.mode === 'major'
      ? [{ deg: 0, q: 'maj' as Q, w: 3 }, { deg: 5, q: 'maj' as Q, w: 2 }, { deg: 7, q: 'maj' as Q, w: 2 }]
      : [{ deg: 0, q: 'm' as Q, w: 3 }, { deg: 7, q: 'dom' as Q, w: 2 }, { deg: 10, q: 'maj' as Q, w: 2 }])
  return steps
    .slice()
    .sort((a, b) => b.w - a.w)
    .slice(0, max)
    .map((s) => ({ symbol: KEYS[(key.root + s.deg) % 12] + suffix(s.q), roman: roman(s.deg, s.q), weight: s.w }))
}
