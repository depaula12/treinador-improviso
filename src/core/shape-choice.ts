import { findShapes, mainShapes, type Shape } from './chord-shapes'
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
  const all = findShapes(c)
  const byFrets = new Map(all.map((s) => [s.frets.join(), s]))
  // primeiro as formas consagradas do banco (aberta, de Mi, de Lá) até a casa 7, as mais fáceis
  // antes; depois os desenhos gerados (os melhores de cada região) e o resto do banco, pelo esforço
  const cost = new Map<Voicing, number>()
  const BANK_FIRST = -100
  for (const v of q ? voicingsFor(q.id, c.root) : []) {
    // (o gerador pode ter podado a forma do banco: aí a conta é feita direto pelas casas)
    const s = byFrets.get(v.frets.join()) ?? rough(v.frets)
    cost.set(v, effort(s) + (s.position <= 7 ? BANK_FIRST : 0))
  }
  for (const s of mainShapes(all, 6)) if (!cost.has(s)) cost.set(s, effort(s))
  const ranked = [...cost.keys()].sort((a, b) => cost.get(a)! - cost.get(b)!)
  const seen = new Set<string>()
  const out: Voicing[] = []
  for (const v of ranked) {
    const k = v.frets.join()
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ ...v, symbol: sym })
  }
  return out.slice(0, max)
}

/**
 * Esforço para tocar (menor = mais fácil): dedos, abestamento, mão longe da cabeça do braço,
 * nota que falta, abertura grande e baixo pressionado por cima da pestana. Mais cordas soando
 * ajuda um pouco. Os do banco (aberto, formas de Mi e de Lá) já vêm antes.
 */
export function effort(s: Shape): number {
  const played = s.frets.flatMap((f, i) => (f === null ? [] : [i]))
  const first = played[0]
  const holes = played[played.length - 1] - first + 1 - played.length
  const pressed = s.frets.filter((f): f is number => f !== null && f > 0)
  const top = pressed.length ? Math.max(...pressed) : 0
  const bassOverBarre = s.barre && s.frets[first]! > s.position ? 3 : 0
  const missing = s.omitted.filter((x) => x !== 7).length * 1.5 + (s.omitted.includes(7) ? 0.3 : 0)
  const open = s.frets.includes(0) && s.position <= 3 ? 0.5 : 0
  return (
    s.fingers * 1.5 + (s.barre ? 1.5 : 0) + pressed.length * 0.3 + Math.max(0, s.position - 4) * 0.6 + holes * 2 + missing -
    played.length * 0.5 + bassOverBarre + (top - s.position >= 3 ? 1.5 : 0) - open
  )
}

/** Medidas aproximadas de um desenho que o gerador não devolveu (dedos = cordas pressionadas, fora a pestana). */
function rough(frets: F[]): Shape {
  const pressed = frets.filter((f): f is number => f !== null && f > 0)
  const position = pressed.length ? Math.min(...pressed) : 0
  const atMin = pressed.filter((f) => f === position).length
  const barre = atMin >= 2
  const fingers = barre ? 1 + pressed.length - atMin : pressed.length
  return { frets, position, fingers, barre, omitted: [], score: 0, quality: '', form: '5', rootPc: 0, symbol: '', rootString: 0 }
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
