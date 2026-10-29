import { TUNING } from '../../core/fretboard-model'
import { KEYS } from '../../core/theory'

export const STRING_NAME = ['1ª (Mi agudo)', '2ª (Si)', '3ª (Sol)', '4ª (Ré)', '5ª (Lá)', '6ª (Mi grave)']

export interface NoteCard {
  key: string
  string: number
  pc: number
}

/** Um cartão por corda × nota. `pcs` limita às notas da escala escolhida. */
export function noteCards(pcs: number[]): NoteCard[] {
  return [0, 1, 2, 3, 4, 5].flatMap((s) => pcs.map((pc) => ({ key: `onde:${s}:${pc}`, string: s, pc })))
}

/** Casas (0–maxFret) onde a nota aparece naquela corda. */
export function fretsOf(string: number, pc: number, maxFret = 12): number[] {
  const first = (((pc - TUNING[string]) % 12) + 12) % 12
  const out: number[] = []
  for (let f = first; f <= maxFret; f += 12) out.push(f)
  return out
}

export const pcAt = (string: number, fret: number) => (TUNING[string] + fret) % 12
export const noteLabel = (pc: number) => KEYS[pc]
