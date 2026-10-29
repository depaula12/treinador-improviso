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
}

// Cifras brasileiras -> notação que o tonal entende
function normalize(symbol: string): string {
  return symbol
    .trim()
    .replace(/7M/g, 'maj7')
    .replace(/\(([^)]*)\)/g, '$1')
}

export function parseChord(symbol: string): ChordInfo | null {
  const c = Chord.get(normalize(symbol))
  if (c.empty || !c.tonic) return null
  const semitones = c.intervals.map((i) => Interval.semitones(i) ?? 0)
  return {
    symbol,
    tonic: c.tonic,
    root: Note.chroma(c.tonic) ?? 0,
    semitones,
    notes: c.notes,
    minor: semitones.includes(3) && !semitones.includes(4),
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
