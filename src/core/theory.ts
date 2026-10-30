import { Chord, Interval, Note } from 'tonal'

export interface ChordInfo {
  symbol: string
  tonic: string
  /** classe de altura da fundamental, 0 = C */
  root: number
  /** intervalos em semitons a partir da fundamental, ex.: [0, 4, 7, 10] */
  semitones: number[]
  notes: string[]
  minor: boolean
  /** baixo invertido (C/G -> 7), só quando a cifra tem barra */
  bass?: number
}

// Cifras brasileiras (como no Cifra Club) -> notação que o tonal entende.
// A ordem importa: as formas com parênteses saem antes da regra geral que tira os parênteses.
const BR_SUFFIX: [RegExp, string][] = [
  [/^m7M\((9)\)$/, 'mMaj9'],
  [/^m7M$|^m\(7M\)$/, 'mMaj7'],
  [/^7M\(9\)$/, 'maj9'],
  [/^7M\(#11\)$/, 'maj7#11'],
  [/^7M$/, 'maj7'],
  [/^7\(9\)$|^7\/9$/, '9'],
  [/^7\(13\)$|^7\/13$/, '13'],
  [/^7\(4\)$|^7\/4$|^74$/, '7sus4'],
  [/^7\(4\/9\)$|^7\(9\/4\)$/, '9sus4'],
  [/^m7\(9\)$|^m7\/9$/, 'm9'],
  [/^m7\(11\)$|^m7\/11$/, 'm11'],
  [/^m7\(b5\)$|^m7b5$|^ø$/, 'm7b5'],
  [/^m\(9\)$|^m\(add9\)$|^madd9$/, 'madd9'],
  [/^\(9\)$|^\(add9\)$|^9\)$/, 'add9'],
  [/^6\(9\)$|^6\/9$/, '69'],
  [/^4$/, 'sus4'],
  [/^2$/, 'sus2'],
  [/^[°º]7$/, 'dim7'],
  [/^[°º]$/, 'dim'],
  [/^\+$|^5\+$|^\(#5\)$/, 'aug'],
]

function normalize(symbol: string): string {
  const s = symbol.trim()
  const m = s.match(/^([A-G][#b]?)(.*)$/)
  if (!m) return s
  const [, root, suffix] = m
  for (const [re, to] of BR_SUFFIX) if (re.test(suffix)) return root + to
  return root + suffix.replace(/7M/g, 'maj7').replace(/\(([^)]*)\)/g, '$1')
}

export function parseChord(symbol: string): ChordInfo | null {
  // baixo invertido: "D/F#" -> acorde D com F# no baixo (o tonal mede os intervalos a partir do baixo)
  const slash = symbol.trim().match(/^(.+)\/([A-G][#b]?)$/)
  const c = Chord.get(normalize(slash ? slash[1] : symbol))
  if (c.empty || !c.tonic) return null
  const semitones = c.intervals.map((i) => Interval.semitones(i) ?? 0)
  const bass = slash ? Note.chroma(slash[2]) : undefined
  return {
    symbol,
    tonic: c.tonic,
    root: Note.chroma(c.tonic) ?? 0,
    semitones,
    notes: c.notes,
    minor: semitones.includes(3) && !semitones.includes(4),
    ...(bass !== undefined ? { bass } : {}),
  }
}

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** MIDI da classe de altura `pc` mais próxima de `ref`. */
export function nearestMidi(pc: number, ref: number): number {
  const base = ref - (((ref - pc) % 12) + 12) % 12
  return ref - base > 6 ? base + 12 : base
}

/** MIDI da classe de altura `pc` dentro de [low, low+11]. */
export function midiInRange(pc: number, low: number): number {
  return low + ((((pc - low) % 12) + 12) % 12)
}
