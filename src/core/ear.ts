/**
 * Treino de ouvido: intervalos, qualidade de acorde, graus na tonalidade e acordes do campo.
 * Cada pergunta vira uma lista de notas com hora de início; quem toca é o motor de áudio.
 */
import type { EarMode, EarPreset } from './plano'

export const INTERVALS: Record<string, number> = {
  '2m': 1, '2M': 2, '3m': 3, '3M': 4, '4J': 5, TT: 6, '5J': 7, '6m': 8, '6M': 9, '7m': 10, '7M': 11, '8J': 12,
}
export const QUALITIES: Record<string, number[]> = {
  maior: [0, 4, 7], menor: [0, 3, 7], dim: [0, 3, 6], aum: [0, 4, 8], sus4: [0, 5, 7],
  '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], '7M': [0, 4, 7, 11], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9],
  '6': [0, 4, 7, 9], '9': [0, 4, 7, 10, 14],
}
export const DEGREES: Record<string, number> = {
  '1': 0, b2: 1, '2': 2, b3: 3, '3': 4, '4': 5, '#4': 6, '5': 7, b6: 8, '6': 9, b7: 10, '7': 11,
}
/** tríades do campo, em semitons a partir da tônica */
export const ROMANS: Record<string, number[]> = {
  I: [0, 4, 7], ii: [2, 5, 9], iii: [4, 7, 11], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16], 'vii°': [11, 14, 17],
  iv: [5, 8, 12], bVII: [10, 14, 17], bVI: [8, 12, 15], bIII: [3, 7, 10],
}

export const MODE_NAME: Record<EarMode, string> = { int: 'Intervalos', acorde: 'Acordes', grau: 'Graus', campo: 'Campo harmônico' }
export const MODE_HINT: Record<EarMode, string> = {
  int: 'Duas notas. Diga a distância entre elas.',
  acorde: 'Um acorde arpejado e depois junto. Diga o tipo.',
  grau: 'Uma cadência I–IV–V–I define o tom; depois soa uma nota. Que grau ela é?',
  campo: 'Uma cadência I–IV–V–I define o tom; depois soa um acorde. Que grau ele é?',
}
/** todas as respostas possíveis de cada modo, na ordem de exibição */
export const ALL_OF: Record<EarMode, string[]> = {
  int: Object.keys(INTERVALS),
  acorde: Object.keys(QUALITIES),
  grau: Object.keys(DEGREES),
  campo: Object.keys(ROMANS),
}
/** conjunto inicial quando você troca de modo à mão */
export const DEFAULT_SET: Record<EarMode, string[]> = {
  int: ['3m', '3M', '5J', '8J'], acorde: ['maior', 'menor'], grau: ['1', '3', '5'], campo: ['I', 'IV', 'V'],
}

export interface NoteEvent {
  midi: number
  /** segundos desde o início da pergunta */
  t: number
  dur: number
  vel: number
}
export interface EarQuestion {
  answer: string
  events: NoteEvent[]
}

const CADENCE = [ROMANS.I, ROMANS.IV, ROMANS.V, ROMANS.I]

/** acorde em bloco: tríade na região média e a fundamental uma oitava abaixo */
function block(key: number, ch: number[], t: number, dur: number, vel = 0.5): NoteEvent[] {
  return [{ midi: key - 12 + ch[0], t, dur, vel: vel + 0.08 }, ...ch.map((iv) => ({ midi: key + iv, t, dur, vel }))]
}

/**
 * Sorteia e monta uma pergunta. `rnd` devolve um número em [0, 1) (Math.random no app; fixo nos testes).
 * As alturas ficam na região do violão (fundamentais entre Mi2 e Ré#4).
 */
export function makeQuestion(p: EarPreset, rnd: () => number = Math.random): EarQuestion {
  const pick = <T,>(xs: T[]) => xs[Math.min(xs.length - 1, Math.floor(rnd() * xs.length))]
  const answer = pick(p.set)
  if (p.m === 'int') {
    const root = 50 + Math.floor(rnd() * 12)
    const top = root + INTERVALS[answer]
    if (p.dir === 'harm') return { answer, events: [{ midi: root, t: 0, dur: 2, vel: 0.6 }, { midi: top, t: 0, dur: 2, vel: 0.6 }] }
    const [a, b] = p.dir === 'desc' ? [top, root] : [root, top]
    return { answer, events: [{ midi: a, t: 0, dur: 1.1, vel: 0.62 }, { midi: b, t: 0.8, dur: 1.5, vel: 0.62 }] }
  }
  if (p.m === 'acorde') {
    const root = 48 + Math.floor(rnd() * 12)
    const ivs = QUALITIES[answer]
    const arp = ivs.map((iv, i) => ({ midi: root + iv, t: i * 0.3, dur: 1.2, vel: 0.55 }))
    const t2 = ivs.length * 0.3 + 0.35
    return { answer, events: [...arp, ...ivs.map((iv, i) => ({ midi: root + iv, t: t2 + i * 0.02, dur: 2, vel: 0.6 - i * 0.03 }))] }
  }
  // graus e campo: cadência no tom sorteado, depois a nota ou o acorde
  const key = 52 + Math.floor(rnd() * 12)
  const events = CADENCE.flatMap((ch, i) => block(key, ch, i * 0.6, 0.9, 0.42))
  const t2 = CADENCE.length * 0.6 + 0.55
  if (p.m === 'grau') events.push({ midi: key + 12 + DEGREES[answer], t: t2, dur: 1.8, vel: 0.7 })
  else events.push(...block(key, ROMANS[answer], t2, 1.9, 0.5))
  return { answer, events }
}

/** liga ou desliga um item do conjunto, mantendo a ordem do modo e pelo menos 2 itens */
export function toggleItem(mode: EarMode, set: string[], item: string): string[] {
  if (set.includes(item)) return set.length > 2 ? set.filter((x) => x !== item) : set
  return ALL_OF[mode].filter((x) => set.includes(x) || x === item)
}
