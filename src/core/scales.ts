import { TUNING } from './fretboard-model'

export interface ScaleDef {
  id: string
  name: string
  semitones: number[]
  /** pentatônica que define os desenhos (boxes) */
  pent: 'minor' | 'major'
}

export const SCALES: ScaleDef[] = [
  { id: 'pentMin', name: 'Pentatônica menor', semitones: [0, 3, 5, 7, 10], pent: 'minor' },
  { id: 'pentMaj', name: 'Pentatônica maior', semitones: [0, 2, 4, 7, 9], pent: 'major' },
  { id: 'blues', name: 'Blues', semitones: [0, 3, 5, 6, 7, 10], pent: 'minor' },
  { id: 'major', name: 'Maior', semitones: [0, 2, 4, 5, 7, 9, 11], pent: 'major' },
  { id: 'minor', name: 'Menor natural', semitones: [0, 2, 3, 5, 7, 8, 10], pent: 'minor' },
]

const PENT = { minor: [0, 3, 5, 7, 10], major: [0, 2, 4, 7, 9] }

export const scalePcs = (scale: ScaleDef, root: number) => scale.semitones.map((s) => (root + s) % 12)

/** chave "corda:casa" (corda 0 = Mi agudo) */
export const posKey = (string: number, fret: number) => `${string}:${fret}`

/**
 * Desenho N (1–5) da escala: parte do N-ésimo grau da pentatônica na 6ª corda e sobe
 * duas notas por corda. Escalas com mais notas (blues, maior, menor) incluem as notas
 * extras que caem na mesma região de cada corda.
 */
export function boxPositions(scale: ScaleDef, root: number, box: number): Set<string> {
  const found = boxBase(scale, root, box)
  // o mesmo desenho uma oitava acima/abaixo, quando cabe no braço
  const out = new Set<string>()
  for (const shift of [-12, 0, 12]) {
    if (found.every(([, f]) => f + shift >= 0 && f + shift <= 24)) {
      for (const [s, f] of found) out.add(posKey(s, f + shift))
    }
  }
  return out
}

export interface ScaleNote {
  /** 0 = corda 1 (Mi agudo) */
  string: number
  fret: number
  midi: number
  /** semitons a partir da tônica (0–11) */
  degree: number
}

/**
 * Notas do desenho em ordem de altura (do grave ao agudo), uma por altura:
 * quando a mesma nota cai em duas cordas, fica a da corda mais grossa.
 */
export function boxNotes(scale: ScaleDef, root: number, box: number): ScaleNote[] {
  const byMidi = new Map<number, ScaleNote>()
  // boxBase vem da 6ª para a 1ª corda: a primeira ocorrência é a da corda mais grossa
  for (const [s, f] of boxBase(scale, root, box)) {
    const midi = TUNING[s] + f
    if (!byMidi.has(midi)) byMidi.set(midi, { string: s, fret: f, midi, degree: (midi - root + 120) % 12 })
  }
  return [...byMidi.values()].sort((a, b) => a.midi - b.midi)
}

/** Faixa de casas [primeira, última] do desenho, na oitava mais grave. */
export function boxRange(scale: ScaleDef, root: number, box: number): [number, number] {
  const frets = boxBase(scale, root, box).map(([, f]) => f)
  return [Math.min(...frets), Math.max(...frets)]
}

/** Posições [corda, casa] do desenho na oitava em que ele começa (casa 0–11 na 6ª corda). */
function boxBase(scale: ScaleDef, root: number, box: number): [number, number][] {
  const pent = PENT[scale.pent]
  const k = (box - 1) % 5
  const startPc = (root + pent[k]) % 12
  let pitch = TUNING[5] + ((startPc - TUNING[5]) % 12 + 12) % 12

  // 12 notas ascendentes da pentatônica, duas por corda, da 6ª para a 1ª
  const pentSet = new Set(pent.map((s) => (root + s) % 12))
  const perString: number[][] = [[], [], [], [], [], []]
  for (let i = 0; i < 12; i++) {
    const s = 5 - Math.floor(i / 2)
    perString[s].push(pitch - TUNING[s])
    do pitch++
    while (!pentSet.has(pitch % 12))
  }

  const pcs = new Set(scalePcs(scale, root))
  const found: [number, number][] = []
  perString.forEach((frets, s) => {
    const lo = Math.min(...frets) - 1
    const hi = Math.max(...frets) + 1
    for (let f = Math.max(0, lo); f <= hi; f++) {
      const pc = (TUNING[s] + f) % 12
      // pentatônica do desenho + notas extras da escala na mesma região
      if (frets.includes(f) || (pcs.has(pc) && !pentSet.has(pc))) found.push([s, f])
    }
  })
  return found
}
