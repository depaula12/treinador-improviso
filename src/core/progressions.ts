import { Progression } from 'tonal'
import { parseChord, type ChordInfo } from './theory'

export interface ProgressionDef {
  id: string
  name: string
  /** um grau por compasso */
  romans: string[]
  defaultKey: string
  defaultStyle: string
  defaultScale: string
}

export const PROGRESSIONS: ProgressionDef[] = [
  {
    id: 'blues12',
    name: 'Blues de 12',
    romans: ['I7', 'I7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    defaultKey: 'A',
    defaultStyle: 'shuffle',
    defaultScale: 'pentMin',
  },
  {
    id: 'blues12quick',
    name: 'Blues de 12 (quick change)',
    romans: ['I7', 'IV7', 'I7', 'I7', 'IV7', 'IV7', 'I7', 'I7', 'V7', 'IV7', 'I7', 'V7'],
    defaultKey: 'A',
    defaultStyle: 'shuffle',
    defaultScale: 'pentMin',
  },
  { id: 'pop', name: 'I–V–vi–IV', romans: ['I', 'V', 'vim', 'IV'], defaultKey: 'G', defaultStyle: 'ballad', defaultScale: 'pentMaj' },
  { id: 'rock', name: 'I–bVII–IV', romans: ['I', 'bVII', 'IV', 'I'], defaultKey: 'D', defaultStyle: 'rock', defaultScale: 'pentMin' },
  {
    id: 'minorRock',
    name: 'Menor i–bVII–bVI',
    romans: ['im', 'bVII', 'bVI', 'bVII'],
    defaultKey: 'E',
    defaultStyle: 'rock',
    defaultScale: 'pentMin',
  },
]

/**
 * Progressão digitada: um acorde por compasso, separados por espaço, vírgula ou "|".
 * "A7*4" repete o acorde por 4 compassos.
 */
export function parseProgression(text: string): { chords: ChordInfo[]; invalid: string[] } {
  const chords: ChordInfo[] = []
  const invalid: string[] = []
  for (const token of text.split(/[\s,|]+/).filter(Boolean)) {
    const [sym, times] = token.split('*')
    const c = parseChord(sym)
    if (!c) {
      invalid.push(token)
      continue
    }
    const n = Math.min(16, Math.max(1, Number(times) || 1))
    for (let i = 0; i < n; i++) chords.push(c)
  }
  return { chords, invalid }
}

export function realize(prog: ProgressionDef, key: string): ChordInfo[] {
  return Progression.fromRomanNumerals(key, prog.romans).map((sym) => {
    const c = parseChord(sym)
    if (!c) throw new Error(`Cifra inválida gerada: ${sym}`)
    return c
  })
}
