// Leitner simples: caixa 1 (não sabe) a 5 (domina). Caixas baixas saem mais no sorteio.

export interface CardStat {
  box: number
  seen: number
  right: number
}

export type Grade = 'errei' | 'lento' | 'rapido'

const WEIGHT = [0, 16, 8, 4, 2, 1] // índice = caixa
export const NEW_BOX = 2

export function grade(stat: CardStat | undefined, g: Grade): CardStat {
  const s = stat ?? { box: NEW_BOX, seen: 0, right: 0 }
  const box = g === 'errei' ? 1 : g === 'lento' ? Math.max(1, Math.min(s.box, 3)) : Math.min(5, s.box + 1)
  return { box, seen: s.seen + 1, right: s.right + (g === 'errei' ? 0 : 1) }
}

/** Sorteio ponderado pela caixa, evitando repetir o último item. */
export function drawWeighted<T>(items: T[], keyOf: (t: T) => string, stats: Record<string, CardStat>, lastKey?: string): T {
  const pool = items.length > 1 ? items.filter((t) => keyOf(t) !== lastKey) : items
  const weights = pool.map((t) => WEIGHT[stats[keyOf(t)]?.box ?? NEW_BOX])
  let r = Math.random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i]
    if (r <= 0) return pool[i]
  }
  return pool[pool.length - 1]
}
