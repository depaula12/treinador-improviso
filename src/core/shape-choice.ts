import { findShapes, mainShapes } from './chord-shapes'
import { TUNING } from './fretboard-model'
import { parseChord } from './theory'
import { matchQuality, voicingsFor, type Voicing } from './voicings'

// Escolher o desenho de cada acorde na composição e aproximar os desenhos entre si
// (menos movimento da mão = trocas mais fáceis e vozes que andam pouco).

type F = number | null
const LOW_TO_HIGH = [...TUNING].reverse()

/** Desenhos de um acorde, do mais simples ao mais "trabalhado": os do banco e depois os gerados. */
export function shapeOptions(sym: string, max = 8): Voicing[] {
  // a busca no braço é pesada e a tela pede o mesmo acorde várias vezes por desenho
  let list = cache.get(sym)
  if (!list) {
    list = search(sym)
    cache.set(sym, list)
  }
  return list.slice(0, max)
}
const cache = new Map<string, Voicing[]>()

function search(sym: string, max = 8): Voicing[] {
  const c = parseChord(sym)
  if (!c) return []
  const q = c.bass === undefined ? matchQuality(c) : null
  const bank = q ? voicingsFor(q.id, c.root) : []
  const gen = mainShapes(findShapes(c)).sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const out: Voicing[] = []
  for (const v of [...bank, ...gen]) {
    const k = v.frets.join()
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ ...v, symbol: sym })
  }
  return out.slice(0, max)
}

/** O desenho mais simples (o primeiro das opções). */
export const easyShape = (sym: string): Voicing | null => shapeOptions(sym, 1)[0] ?? null

/** Notas MIDI do desenho, do grave para o agudo. */
export function shapeMidi(frets: F[]): number[] {
  return frets.flatMap((f, i) => (f === null ? [] : [LOW_TO_HIGH[i] + f])).sort((a, b) => a - b)
}

/** Onde a mão fica: média das casas pressionadas (corda solta conta como a 1ª posição). */
export function handPos(frets: F[]): number {
  const pressed = frets.filter((f): f is number => f !== null && f > 0)
  return pressed.length ? pressed.reduce((s, f) => s + f, 0) / pressed.length : 1
}

/** Custo de trocar de um desenho para o outro: quanto a mão anda + cordas que mudam. */
export function shapeDistance(a: F[], b: F[]): number {
  const changed = a.filter((f, i) => f !== b[i]).length
  return Math.abs(handPos(a) - handPos(b)) + changed * 0.25
}

const sameFrets = (a: F[] | null | undefined, b: F[]) => !!a && a.join() === b.join()

/**
 * Um desenho por cifra, com o menor movimento total ao longo da sequência (em loop: o último
 * volta para o primeiro). Os desenhos mais difíceis pagam um pouco a mais, para não trocar um
 * acorde aberto fácil por uma pestana só para economizar uma casa.
 */
export function closeShapes(sequence: string[]): Record<string, F[]> {
  const unique = [...new Set(sequence)]
  const opts: Record<string, Voicing[]> = {}
  for (const s of unique) opts[s] = shapeOptions(s)
  const usable = unique.filter((s) => opts[s].length)
  if (!usable.length) return {}
  const seq = sequence.filter((s) => opts[s].length)
  const ease = (s: string, frets: F[]) => opts[s].findIndex((v) => sameFrets(frets, v.frets)) * 0.35

  const cost = (pick: Record<string, F[]>) => {
    let t = 0
    for (let i = 0; i < seq.length; i++) {
      const a = pick[seq[i]]
      const b = pick[seq[(i + 1) % seq.length]]
      if (seq[i] !== seq[(i + 1) % seq.length]) t += shapeDistance(a, b)
    }
    return t + usable.reduce((s, sym) => s + ease(sym, pick[sym]), 0)
  }

  let best: Record<string, F[]> | null = null
  let bestCost = Infinity
  // começa por cada desenho do primeiro acorde; os outros entram na ordem em que aparecem,
  // cada um o mais perto possível dos vizinhos já escolhidos
  for (const start of opts[usable[0]]) {
    const pick: Record<string, F[]> = { [usable[0]]: start.frets }
    for (const sym of usable.slice(1)) {
      const neighbors = seq.flatMap((s, i) => {
        if (s !== sym) return []
        return [seq[(i - 1 + seq.length) % seq.length], seq[(i + 1) % seq.length]].filter((n) => n !== sym && pick[n])
      })
      let chosen = opts[sym][0].frets
      let low = Infinity
      for (const v of opts[sym]) {
        const c = neighbors.reduce((t, n) => t + shapeDistance(v.frets, pick[n]), 0) + ease(sym, v.frets)
        if (c < low) {
          low = c
          chosen = v.frets
        }
      }
      pick[sym] = chosen
    }
    const c = cost(pick)
    if (c < bestCost) {
      bestCost = c
      best = pick
    }
  }
  return best ?? {}
}
