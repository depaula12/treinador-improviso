/** Afinação padrão, corda 1 (Mi agudo) a 6 (Mi grave), em MIDI. */
export const TUNING = [64, 59, 55, 50, 45, 40]

export interface FretPos {
  /** 0 = corda 1 (Mi agudo) */
  string: number
  fret: number
  midi: number
  pc: number
}

export function allPositions(maxFret: number): FretPos[] {
  const out: FretPos[] = []
  TUNING.forEach((open, string) => {
    for (let fret = 0; fret <= maxFret; fret++) {
      const midi = open + fret
      out.push({ string, fret, midi, pc: midi % 12 })
    }
  })
  return out
}

/** Posição de cada traste em fração do comprimento, como num braço real (regra de 17,817). */
export function fretFractions(maxFret: number): number[] {
  const pos = [0]
  let rem = 1
  let total = 0
  for (let f = 1; f <= maxFret; f++) {
    const w = rem / 17.817
    total += w
    rem -= w
    pos.push(total)
  }
  return pos.map((p) => p / total)
}

export const INLAYS = [3, 5, 7, 9, 15, 17]

const DEGREE: Record<number, string> = {
  0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7',
}
export const degreeName = (semitones: number) => DEGREE[((semitones % 12) + 12) % 12]
