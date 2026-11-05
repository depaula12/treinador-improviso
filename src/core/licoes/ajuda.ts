/** Peças usadas para escrever as lições: sons de exemplo, perguntas sorteadas e tabelas. */
import type { NoteEvent } from '../ear'
import type { Question } from './tipos'

/** notas uma depois da outra */
export function seq(midis: number[], gap = 0.5, dur = 0.9, at = 0): NoteEvent[] {
  return midis.map((midi, i) => ({ midi, t: at + i * gap, dur, vel: 0.62 }))
}

/** notas juntas (acorde), com um leve arpejo como na palhetada */
export function chord(midis: number[], at = 0, dur = 1.8): NoteEvent[] {
  return midis.map((midi, i) => ({ midi, t: at + i * 0.02, dur, vel: 0.58 - i * 0.02 }))
}

/** duas notas: a primeira e depois a segunda; então as duas juntas */
export function interval(a: number, b: number): NoteEvent[] {
  return [...seq([a, b], 0.7, 1.1), ...chord([a, b], 1.7, 1.6)]
}

/** cadência I–IV–V–I no tom (tônica em `key`, MIDI) e depois os eventos de `then` */
export function cadenceThen(key: number, then: (t: number) => NoteEvent[]): NoteEvent[] {
  const tri = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]]
  const ev = tri.flatMap((c, i) => [{ midi: key - 12 + c[0], t: i * 0.6, dur: 0.9, vel: 0.5 }, ...c.map((x) => ({ midi: key + x, t: i * 0.6, dur: 0.9, vel: 0.42 }))])
  return [...ev, ...then(tri.length * 0.6 + 0.5)]
}

const shuffle = <T,>(xs: T[], rnd: () => number) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export const pick = <T,>(xs: T[], rnd: () => number): T => xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))]

/** múltipla escolha: a resposta + até 3 distratores diferentes, em ordem sorteada */
export function mc(q: string, answer: string, pool: string[], why: string, rnd: () => number, n = 4): Question {
  const others = shuffle([...new Set(pool.filter((x) => x !== answer))], rnd).slice(0, n - 1)
  return { q, answer, options: shuffle([answer, ...others], rnd), why }
}

/** múltipla escolha com as opções na ordem dada (para perguntas fixas) */
export const fixed = (q: string, options: string[], answer: string, why: string): Question => ({ q, options, answer, why })

// ---------- tabelas ----------

/** nome em português de cada letra da cifra */
export const PT: Record<string, string> = { C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si' }
export const NATURALS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
/** classe de altura das naturais */
export const NAT_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
/** afinação padrão, corda 1 (Mi agudo) a 6 (Mi grave) */
export const OPEN: Record<number, number> = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 }
export const STRING_NAME: Record<number, string> = { 1: '1ª corda (Mi agudo)', 2: '2ª corda (Si)', 3: '3ª corda (Sol)', 4: '4ª corda (Ré)', 5: '5ª corda (Lá)', 6: '6ª corda (Mi grave)' }

/** casa (0–11) em que a nota natural cai na corda */
export const fretOf = (string: number, note: string) => (((NAT_PC[note] - OPEN[string]) % 12) + 12) % 12

/** intervalos simples: nome → semitons */
export const SEMIS: Record<string, number> = { '2m': 1, '2M': 2, '3m': 3, '3M': 4, '4J': 5, TT: 6, '5J': 7, '6m': 8, '6M': 9, '7m': 10, '7M': 11, '8J': 12 }

/** pentatônica menor (graus 1 b3 4 5 b7) com a grafia certa em alguns tons */
export const PENT_MIN: Record<string, string[]> = {
  A: ['A', 'C', 'D', 'E', 'G'],
  E: ['E', 'G', 'A', 'B', 'D'],
  D: ['D', 'F', 'G', 'A', 'C'],
  G: ['G', 'Bb', 'C', 'D', 'F'],
  B: ['B', 'D', 'E', 'F#', 'A'],
}
export const PENT_DEG = ['1', 'b3', '4', '5', 'b7']

/** escala maior com a grafia certa */
export const MAJOR: Record<string, string[]> = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  E: ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
}
/** acidentes da armadura de cada tom maior */
export const KEY_SIG: Record<string, string> = {
  C: 'nenhum', G: '1 sustenido', D: '2 sustenidos', A: '3 sustenidos', E: '4 sustenidos', B: '5 sustenidos',
  F: '1 bemol', Bb: '2 bemóis', Eb: '3 bemóis', Ab: '4 bemóis',
}
