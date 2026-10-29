export const rand = (min: number, max: number) => min + Math.random() * (max - min)
export const chance = (p: number) => Math.random() < p
export const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]

let enabled = true
export function setHumanize(on: boolean) {
  enabled = on
}

/**
 * Desvio de tempo em segundos. Distribuição triangular (concentra perto do centro)
 * em ±spreadMs, mais um atraso fixo `layBackMs` (ex.: baixo levemente atrás).
 */
export function timing(spreadMs: number, layBackMs = 0): number {
  if (!enabled) return 0
  const tri = Math.random() + Math.random() - 1
  return (tri * spreadMs + layBackMs) / 1000
}

/** Velocity com variação aleatória de ±range, presa em [0.05, 1]. */
export function velocity(v: number, range = 0.08): number {
  const out = enabled ? v + (Math.random() * 2 - 1) * range : v
  return Math.min(1, Math.max(0.05, out))
}

/** Atraso entre cordas no strum (10–25 ms), em segundos. */
export function strumGap(): number {
  return (enabled ? rand(10, 25) : 15) / 1000
}
