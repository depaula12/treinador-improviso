import { TUNING } from './fretboard-model'
import type { ChordInfo } from './theory'
import { matchQuality, type Voicing } from './voicings'

// Gerador de desenhos: procura no braço todas as formas tocáveis de qualquer acorde,
// em vez de depender só do banco fixo (voicings.ts).

type F = number | null
// 6ª -> 1ª corda, classes de altura
const LOW_TO_HIGH = [...TUNING].reverse().map((m) => m % 12)

export interface ShapeOptions {
  /** última casa considerada */
  maxFret?: number
  /** largura máxima do desenho em casas (4 = dedos 1 a 4, uma casa cada) */
  span?: number
}

export interface Shape extends Voicing {
  /** casa mais baixa pressionada (0 se o desenho só tem cordas soltas) */
  position: number
  /** dedos necessários, contando a pestana como 1 */
  fingers: number
  barre: boolean
  /** intervalos que ficaram de fora (ex.: a 5ª num acorde de 9) */
  omitted: number[]
  /** quanto maior, mais natural de tocar */
  score: number
}

/**
 * Intervalos (mod 12) que precisam soar e os que podem sair.
 * Regra de guitarrista: em acorde de 4+ notas a 5ª justa pode sair; em 9/11/13
 * também saem as extensões do meio (a 9ª num 13, a 11ª num 13).
 */
export function chordTones(c: ChordInfo): { required: number[]; optional: number[] } {
  const top = Math.max(...c.semitones)
  const set = [...new Set(c.semitones.map((s) => s % 12))]
  const optional = new Set<number>()
  if (set.length >= 4 && c.semitones.includes(7)) optional.add(7)
  if (set.length >= 5) {
    if (c.semitones.includes(14) && top > 14) optional.add(2)
    if (c.semitones.includes(17) && top > 17) optional.add(5)
  }
  // 11 dominante (1 3 5 b7 9 11): a 3ª briga com a 11ª e costuma sair
  if (top === 17 && c.semitones.includes(4)) optional.add(4)
  return { required: set.filter((s) => !optional.has(s)), optional: [...optional] }
}

/** Todas as formas tocáveis do acorde, da mais grave para a mais aguda no braço. */
export function findShapes(c: ChordInfo, opt: ShapeOptions = {}): Shape[] {
  const maxFret = opt.maxFret ?? 15
  const span = opt.span ?? 4
  const { required, optional } = chordTones(c)
  const allowed = new Set([...required, ...optional].map((s) => (c.root + s) % 12))
  const bass = c.bass ?? c.root
  allowed.add(bass)
  const need = required.map((s) => (c.root + s) % 12)
  if (c.bass !== undefined) need.push(c.bass)
  const minStrings = Math.min(3, new Set(need).size)
  const quality = matchQuality(c)?.id ?? ''

  const found = new Map<string, Scored>()
  for (let lo = 1; lo + span - 1 <= maxFret; lo++) {
    // opções por corda: abafada, solta (se for nota do acorde) ou uma casa da janela
    const choices: F[][] = LOW_TO_HIGH.map((open) => {
      const ch: F[] = [null]
      if (allowed.has(open)) ch.push(0)
      for (let f = lo; f < lo + span; f++) if (allowed.has((open + f) % 12)) ch.push(f)
      return ch
    })
    const frets: F[] = Array(6).fill(null)
    const walk = (s: number) => {
      if (s === 6) {
        const shape = evaluate(frets, c, bass, need, minStrings, quality)
        if (shape) found.set(shape.frets.join(','), shape)
        return
      }
      for (const f of choices[s]) {
        frets[s] = f
        walk(s + 1)
      }
    }
    walk(0)
  }
  return prune([...found.values()]).sort((a, b) => a.position - b.position || b.strings - a.strings || a.fingers - b.fingers)
}

interface Scored extends Shape {
  strings: number
}

function evaluate(frets: F[], c: ChordInfo, bass: number, need: number[], minStrings: number, quality: string): Scored | null {
  const played = frets.flatMap((f, i) => (f === null ? [] : [i]))
  if (played.length < minStrings) return null
  const first = played[0]
  const last = played[played.length - 1]
  // no máximo uma corda abafada no meio (ex.: x32x10 não, mas 3x0003 sim)
  if (last - first + 1 - played.length > 1) return null
  const pcs = played.map((i) => (LOW_TO_HIGH[i] + frets[i]!) % 12)
  if (pcs[0] !== bass) return null
  if (!need.every((p) => pcs.includes(p))) return null

  const pressed = played.filter((i) => frets[i]! > 0)
  const position = pressed.length ? Math.min(...pressed.map((i) => frets[i]!)) : 0
  const atMin = pressed.filter((i) => frets[i] === position)
  // pestana: o 1º dedo deita na casa mais baixa; nenhuma corda solta pode ficar embaixo dele
  const barre = atMin.length >= 2 && !played.some((i) => i > atMin[0] && i < atMin[atMin.length - 1] && frets[i] === 0)
  const maxPressed = pressed.length ? Math.max(...pressed.map((i) => frets[i]!)) : 0
  // na casa mais alta, cordas vizinhas na mesma casa cabem num dedo só (pestaninha do anelar,
  // como no Lá com pestana x02220 ou na forma de Lá móvel)
  const upper = pressed.filter((i) => !barre || frets[i]! > position)
  // (no máximo 3 cordas, como o anelar consegue)
  const ringBarre = maxPressed > position
    ? Math.min(2, upper.filter((i, k) => frets[i] === maxPressed && k > 0 && upper[k - 1] === i - 1 && frets[i - 1] === maxPressed).length)
    : 0
  const fingers = (barre ? 1 : 0) + upper.length - ringBarre
  if (fingers > 4) return null
  // corda solta só em desenho de primeira posição (até a casa 4)
  if (played.some((i) => frets[i] === 0) && pressed.some((i) => frets[i]! > 4)) return null
  // power chord: blocos de 2 a 4 cordas vizinhas, sem corda solta além do baixo
  if (need.length <= 2 && new Set(pcs).size <= 2) {
    if (played.length > 4 || last - first + 1 !== played.length) return null
    if (played.slice(1).some((i) => frets[i] === 0)) return null
  }

  const omitted = c.semitones.map((s) => s % 12).filter((s, i, a) => a.indexOf(s) === i && !pcs.includes((c.root + s) % 12))
  const rootString = played.find((i) => pcs[played.indexOf(i)] === c.root) ?? first
  const form = position <= 4 && played.some((i) => frets[i] === 0) ? 'aberto' : first === 0 ? '6' : '5'
  // nota de "quão natural" é o desenho: mais cordas soando, menos dedos, sem buraco, nada faltando
  const holes = last - first + 1 - played.length
  const score =
    played.length * 2 - fingers - holes * 3 - omitted.length * 2 + (pcs.filter((p) => p === c.root).length > 1 ? 1 : 0) -
    (maxPressed - position >= 3 ? 1 : 0) - (first > 2 ? 2 : 0)
  return { quality, form, rootPc: c.root, symbol: c.symbol, frets: [...frets], rootString, position, fingers, barre, omitted, score, strings: played.length }
}

const REGIONS = [0, 4, 7, 10, 13]
// abaixo disso o desenho é pedaço estranho: aparece só em "todas"
const MIN_MAIN = 3
/** Os desenhos mais naturais, no máximo `perRegion` por região do braço (0–3, 4–6, 7–9, 10–12, 13+). */
export function mainShapes(list: Shape[], perRegion = 2): Shape[] {
  const region = (p: number) => REGIONS.filter((r) => p >= r).length
  const picked: Shape[] = []
  for (let r = 1; r <= REGIONS.length; r++) {
    const here = list.filter((v) => region(v.position) === r && v.score >= MIN_MAIN).sort((a, b) => b.score - a.score)
    picked.push(...here.slice(0, perRegion))
  }
  return picked
}

/**
 * Tira desenhos que são pedaços de outro sem vantagem: se o desenho maior usa as mesmas casas
 * nas cordas em comum e não pede mais dedos, o menor sobra.
 */
function prune(list: Scored[]): Scored[] {
  return list.filter(
    (a) =>
      !list.some(
        (b) =>
          b !== a &&
          b.strings > a.strings &&
          b.fingers <= a.fingers &&
          a.frets.every((f, i) => f === null || f === b.frets[i]),
      ),
  )
}
