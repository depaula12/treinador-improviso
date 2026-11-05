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
  /** progressão de tom menor (a base soa menor) */
  minor?: boolean
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
    minor: true,
  },
  {
    id: 'bluesMinor',
    name: 'Blues menor de 12',
    // o V7 dominante no fim puxa de volta para o i (como em "The Thrill Is Gone")
    romans: ['im7', 'im7', 'im7', 'im7', 'ivm7', 'ivm7', 'im7', 'im7', 'bVI7', 'V7', 'im7', 'V7'],
    defaultKey: 'A',
    defaultStyle: 'slow128',
    defaultScale: 'pentMin',
    minor: true,
  },
  { id: 'minorIivv', name: 'Menor i–iv–v', romans: ['im', 'ivm', 'vm', 'im'], defaultKey: 'A', defaultStyle: 'rock', defaultScale: 'pentMin', minor: true },
  { id: 'minorPop', name: 'Menor i–bVI–bIII–bVII', romans: ['im', 'bVI', 'bIII', 'bVII'], defaultKey: 'A', defaultStyle: 'ballad', defaultScale: 'pentMin', minor: true },
  // andaluza: a escala acompanha o acorde (no V7 entra o frígio dominante, com a sensível)
  { id: 'andalusian', name: 'Menor i–bVII–bVI–V (andaluza)', romans: ['im', 'bVII', 'bVI', 'V7'], defaultKey: 'A', defaultStyle: 'rock', defaultScale: 'auto', minor: true },
]

/** A versão no outro modo de cada progressão: escolher um tom menor troca a base para a menor. */
const COUNTERPART: Record<string, string> = {
  blues12: 'bluesMinor',
  blues12quick: 'bluesMinor',
  pop: 'minorPop',
  rock: 'minorRock',
  bluesMinor: 'blues12',
  minorPop: 'pop',
  minorRock: 'rock',
  minorIivv: 'pop',
  andalusian: 'pop',
}

/** Progressão equivalente no modo pedido (a mesma, se já for desse modo). */
export function progressionFor(id: string, minor: boolean): ProgressionDef {
  const cur = PROGRESSIONS.find((p) => p.id === id) ?? PROGRESSIONS[0]
  if (!!cur.minor === minor) return cur
  return PROGRESSIONS.find((p) => p.id === COUNTERPART[cur.id]) ?? cur
}

const PT_NAMES: Record<string, string> = {
  C: 'Dó', Db: 'Ré♭', D: 'Ré', Eb: 'Mi♭', E: 'Mi', F: 'Fá', 'F#': 'Fá#', G: 'Sol', Ab: 'Lá♭', A: 'Lá', Bb: 'Si♭', B: 'Si',
}

/** "Am (Lá menor)" / "A (Lá maior)": cifra e nome, para o seletor de tom. */
export const keyLabel = (key: string, minor: boolean) =>
  `${key}${minor ? 'm' : ''} (${PT_NAMES[key] ?? key} ${minor ? 'menor' : 'maior'})`

/** "Am" / "A": a forma curta, para títulos. */
export const keyShort = (key: string, minor: boolean) => `${key}${minor ? 'm' : ''}`

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
