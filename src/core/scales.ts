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
  // modos e escalas do blues/rock: pentatônica + as notas que dão a cor
  { id: 'dorian', name: 'Dórico (menor com 6ª maior)', semitones: [0, 2, 3, 5, 7, 9, 10], pent: 'minor' },
  { id: 'mixo', name: 'Mixolídio (maior com b7)', semitones: [0, 2, 4, 5, 7, 9, 10], pent: 'major' },
  { id: 'harmMin', name: 'Menor harmônica', semitones: [0, 2, 3, 5, 7, 8, 11], pent: 'minor' },
  { id: 'bluesMaj', name: 'Blues maior', semitones: [0, 2, 3, 4, 7, 9], pent: 'major' },
  // modos que a "escala acompanha o acorde" usa conforme a função do acorde no tom
  { id: 'lydian', name: 'Lídio (maior com #4)', semitones: [0, 2, 4, 6, 7, 9, 11], pent: 'major' },
  { id: 'phrygian', name: 'Frígio (menor com b2)', semitones: [0, 1, 3, 5, 7, 8, 10], pent: 'minor' },
  { id: 'locrian', name: 'Lócrio (meio-diminuto)', semitones: [0, 1, 3, 5, 6, 8, 10], pent: 'minor' },
  { id: 'phrygDom', name: 'Frígio dominante (V7 do tom menor)', semitones: [0, 1, 4, 5, 7, 8, 10], pent: 'minor' },
  // arpejos: só as notas do acorde, no mesmo desenho da pentatônica
  { id: 'arpMaj', name: 'Arpejo maior (1 3 5)', semitones: [0, 4, 7], pent: 'major' },
  { id: 'arpMin', name: 'Arpejo menor (1 b3 5)', semitones: [0, 3, 7], pent: 'minor' },
  { id: 'arp7', name: 'Arpejo 7 (1 3 5 b7)', semitones: [0, 4, 7, 10], pent: 'major' },
  { id: 'arpM7', name: 'Arpejo m7 (1 b3 5 b7)', semitones: [0, 3, 7, 10], pent: 'minor' },
  { id: 'arp7M', name: 'Arpejo 7M (1 3 5 7)', semitones: [0, 4, 7, 11], pent: 'major' },
]

/** Escala "acompanha o acorde": o modo que combina com cada acorde (mixolídio no 7, dórico no m7…). */
export const AUTO_SCALE = 'auto'

/**
 * Escala que soa bem sobre o acorde, pela função dele no tom (é o que a teoria ensina):
 * tom maior: I jônio, ii dórico, iii frígio, IV lídio, V mixolídio, vi eólio, viiø lócrio;
 * tom menor: i eólio, iiø lócrio, bIII jônio, iv dórico, v frígio, V7 frígio dominante (5º modo da
 * menor harmônica: tem a 3ª do acorde, que é a sensível do tom), bVI lídio, bVII mixolídio.
 * Acorde com 3ª e b7 (dominante, como no blues) usa mixolídio em qualquer grau do tom maior.
 * Fora do tom: regra pela qualidade (7 mixolídio, menor dórico, maior jônio, meio-diminuto lócrio).
 */
export function chordScale(chord: { root: number; semitones: number[]; minor: boolean }, key: { root: number; minor: boolean }): ScaleDef {
  const has = (s: number) => chord.semitones.some((x) => x % 12 === s)
  const r = (((chord.root - key.root) % 12) + 12) % 12
  const dom = has(4) && has(10)
  const halfDim = has(3) && has(6) && !has(7)
  const maj = has(4) && !has(10)
  const min = chord.minor && !halfDim
  let id: string | null = null
  if (!has(3) && !has(4)) id = 'pentMin' // power chord / sus: a pentatônica não erra
  else if (!key.minor) {
    if (dom) id = 'mixo'
    else if (maj) id = r === 0 ? 'major' : r === 5 ? 'lydian' : r === 7 ? 'mixo' : null
    else if (min) id = r === 2 ? 'dorian' : r === 4 ? 'phrygian' : r === 9 ? 'minor' : null
    else if (halfDim && r === 11) id = 'locrian'
  } else {
    if (min) id = r === 0 ? 'minor' : r === 5 ? 'dorian' : r === 7 ? 'phrygian' : null
    else if (halfDim && r === 2) id = 'locrian'
    else if (r === 7 && has(4)) id = 'phrygDom'
    else if (maj) id = r === 3 ? 'major' : r === 8 ? 'lydian' : r === 10 ? 'mixo' : null
    else if (dom && r === 10) id = 'mixo'
  }
  // fora do tom: pela qualidade
  id ??= dom ? 'mixo' : halfDim ? 'locrian' : chord.minor ? 'dorian' : 'major'
  return SCALES.find((s) => s.id === id)!
}

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
      // o desenho da pentatônica, só com as notas da escala (arpejos e a menor harmônica não usam
      // todas), + as notas extras da escala na mesma região
      if (pcs.has(pc) && (frets.includes(f) || !pentSet.has(pc))) found.push([s, f])
    }
  })
  return found
}
