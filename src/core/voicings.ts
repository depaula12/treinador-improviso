import { TUNING } from './fretboard-model'
import { KEYS, type ChordInfo } from './theory'

export interface QualityDef {
  id: string
  /** sufixo da cifra brasileira */
  suffix: string
  name: string
  /** intervalos em semitons (mod 12) */
  pcs: number[]
}

export const QUALITIES: QualityDef[] = [
  { id: '5', suffix: '5', name: 'Power chord', pcs: [0, 7] },
  { id: 'maj', suffix: '', name: 'Maior', pcs: [0, 4, 7] },
  { id: 'm', suffix: 'm', name: 'Menor', pcs: [0, 3, 7] },
  { id: '7', suffix: '7', name: 'Dominante (7)', pcs: [0, 4, 7, 10] },
  { id: 'm7', suffix: 'm7', name: 'Menor com sétima (m7)', pcs: [0, 3, 7, 10] },
  { id: '7M', suffix: '7M', name: 'Sétima maior (7M)', pcs: [0, 4, 7, 11] },
  { id: 'sus2', suffix: 'sus2', name: 'Suspenso 2 (sus2)', pcs: [0, 2, 7] },
  { id: 'sus4', suffix: 'sus4', name: 'Suspenso 4 (sus4)', pcs: [0, 5, 7] },
  { id: 'add9', suffix: 'add9', name: 'Com nona (add9)', pcs: [0, 2, 4, 7] },
]

export type FormKind = '6' | '5' | 'aberto'
export const FORM_LABEL: Record<FormKind, string> = {
  '6': 'Fundamental na 6ª corda',
  '5': 'Fundamental na 5ª corda',
  aberto: 'Forma aberta',
}

type F = number | null
const x = null

/** Formas móveis: casas relativas à fundamental, da 6ª para a 1ª corda. */
const MOVABLE: Record<string, Partial<Record<'6' | '5', F[]>>> = {
  '5': { '6': [0, 2, 2, x, x, x], '5': [x, 0, 2, 2, x, x] },
  maj: { '6': [0, 2, 2, 1, 0, 0], '5': [x, 0, 2, 2, 2, 0] },
  m: { '6': [0, 2, 2, 0, 0, 0], '5': [x, 0, 2, 2, 1, 0] },
  '7': { '6': [0, 2, 0, 1, 0, 0], '5': [x, 0, 2, 0, 2, 0] },
  m7: { '6': [0, 2, 0, 0, 0, 0], '5': [x, 0, 2, 0, 1, 0] },
  '7M': { '6': [0, x, 1, 1, 0, x], '5': [x, 0, 2, 1, 2, 0] },
  sus2: { '6': [0, 2, 4, 4, 0, 0], '5': [x, 0, 2, 2, 0, 0] },
  sus4: { '6': [0, 2, 2, 2, 0, 0], '5': [x, 0, 2, 2, 3, 0] },
  add9: { '6': [0, 2, 4, 1, 0, 0], '5': [x, 0, 2, 4, 2, 0] },
}

/** Formas abertas: [tônica, casas absolutas da 6ª para a 1ª]. */
const OPEN: Record<string, [string, F[]][]> = {
  '5': [['E', [0, 2, 2, x, x, x]], ['A', [x, 0, 2, 2, x, x]], ['D', [x, x, 0, 2, 3, x]]],
  maj: [['E', [0, 2, 2, 1, 0, 0]], ['A', [x, 0, 2, 2, 2, 0]], ['D', [x, x, 0, 2, 3, 2]], ['C', [x, 3, 2, 0, 1, 0]], ['G', [3, 2, 0, 0, 0, 3]]],
  m: [['E', [0, 2, 2, 0, 0, 0]], ['A', [x, 0, 2, 2, 1, 0]], ['D', [x, x, 0, 2, 3, 1]]],
  '7': [['E', [0, 2, 0, 1, 0, 0]], ['A', [x, 0, 2, 0, 2, 0]], ['D', [x, x, 0, 2, 1, 2]], ['C', [x, 3, 2, 3, 1, 0]], ['G', [3, 2, 0, 0, 0, 1]], ['B', [x, 2, 1, 2, 0, 2]]],
  m7: [['E', [0, 2, 0, 0, 0, 0]], ['A', [x, 0, 2, 0, 1, 0]], ['D', [x, x, 0, 2, 1, 1]]],
  '7M': [['C', [x, 3, 2, 0, 0, 0]], ['F', [x, x, 3, 2, 1, 0]], ['A', [x, 0, 2, 1, 2, 0]], ['D', [x, x, 0, 2, 2, 2]], ['G', [3, x, 0, 0, 0, 2]]],
  sus2: [['A', [x, 0, 2, 2, 0, 0]], ['D', [x, x, 0, 2, 3, 0]]],
  sus4: [['E', [0, 2, 2, 2, 0, 0]], ['A', [x, 0, 2, 2, 3, 0]], ['D', [x, x, 0, 2, 3, 3]]],
  add9: [['C', [x, 3, 2, 0, 3, 0]], ['G', [3, x, 0, 2, 0, 3]], ['E', [0, 2, 2, 1, 0, 2]]],
}

export interface Voicing {
  quality: string
  form: FormKind
  rootPc: number
  symbol: string
  /** casas absolutas da 6ª para a 1ª corda; null = corda abafada */
  frets: F[]
  /** índice (0 = 6ª corda) da corda com a fundamental mais grave */
  rootString: number
}

// TUNING vai da 1ª para a 6ª; aqui usamos 6ª -> 1ª
const LOW_TO_HIGH = [...TUNING].reverse()

export const symbolOf = (rootPc: number, q: QualityDef) => KEYS[rootPc] + q.suffix
export const qualityById = (id: string) => QUALITIES.find((q) => q.id === id)!

/** Desenho móvel ou aberto de um acorde. Retorna null se a forma não existir. */
export function voicingFor(quality: string, rootPc: number, form: FormKind): Voicing | null {
  const q = qualityById(quality)
  const symbol = symbolOf(rootPc, q)
  if (form === 'aberto') {
    const hit = OPEN[quality]?.find(([t]) => KEYS.indexOf(t) === rootPc)
    if (!hit) return null
    return { quality, form, rootPc, symbol, frets: hit[1], rootString: firstPlayed(hit[1]) }
  }
  const shape = MOVABLE[quality]?.[form]
  if (!shape) return null
  const s = form === '6' ? 0 : 1
  // fundamental entre a casa 1 e a 12 (casa 0 vira a forma aberta equivalente)
  // casa da fundamental: diferença de classe de altura (mod 12) entre a nota e a corda solta
  let r = (((rootPc - LOW_TO_HIGH[s]) % 12) + 12) % 12
  if (r === 0) r = 12
  return { quality, form, rootPc, symbol, frets: shape.map((f) => (f === null ? null : f + r)), rootString: s }
}

const firstPlayed = (frets: F[]) => frets.findIndex((f) => f !== null)

/** Todos os desenhos disponíveis de um acorde. */
export function voicingsFor(quality: string, rootPc: number): Voicing[] {
  return (['aberto', '6', '5'] as FormKind[]).map((f) => voicingFor(quality, rootPc, f)).filter((v): v is Voicing => !!v)
}

/** Raízes que têm forma aberta para a qualidade. */
export const openRoots = (quality: string) => (OPEN[quality] ?? []).map(([t]) => KEYS.indexOf(t))

/** Classes de altura tocadas por um desenho. */
export function voicingPcs(v: Voicing): number[] {
  return v.frets.flatMap((f, i) => (f === null ? [] : [(LOW_TO_HIGH[i] + f) % 12]))
}

/** Identifica a qualidade do banco a partir de um acorde do tonal (ou null). */
export function matchQuality(c: ChordInfo): QualityDef | null {
  const set = [...new Set(c.semitones.map((s) => s % 12))].sort((a, b) => a - b).join(',')
  return QUALITIES.find((q) => [...q.pcs].sort((a, b) => a - b).join(',') === set) ?? null
}

const EXT: Record<number, string> = { 13: 'b9', 14: '9', 15: '#9', 17: '11', 18: '#11', 20: 'b13', 21: '13' }
const BASE = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', '#5', '6', 'b7', '7']
/** Nome do intervalo na fórmula (14 -> 9, 10 -> b7…). */
export function formulaName(semitones: number, quality?: string): string {
  if (EXT[semitones]) return EXT[semitones]
  // add9 e sus2 compartilham o 2: no add9 ele é a 9ª
  if (semitones === 2 && quality === 'add9') return '9'
  if (semitones === 8) return 'b6'
  return BASE[semitones % 12]
}
