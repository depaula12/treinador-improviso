// Marcar trocas com a gravação: o usuário bate no tempo (acha o BPM) e depois bate a cada troca
// de acorde. As batidas viram durações em tempos, encaixadas na grade de semínimas.

/** BPM pelas batidas no tempo (mediana dos intervalos, ignora batida perdida). */
export function bpmFromTaps(times: number[]): number | null {
  if (times.length < 3) return null
  const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b)
  const mid = gaps[Math.floor(gaps.length / 2)]
  if (mid <= 0) return null
  return 60000 / mid
}

export interface Quantized {
  /** duração de cada acorde, em tempos (semínimas) */
  beats: number[]
  bpm: number
}

/**
 * Encaixa as batidas de troca na grade de tempos.
 * `changes[0]` é o início do 1º acorde; `end` (opcional) é o fim do último.
 * Cada intervalo entre trocas é arredondado sozinho (o erro do BPM não se acumula ao longo
 * da música); o período começa no BPM batido e é refinado pelas próprias trocas, sem sair
 * de ±15% para não pular para o dobro/metade do andamento.
 */
export function quantizeChanges(changes: number[], end: number | null, bpm: number): Quantized {
  if (!changes.length) return { beats: [], bpm: Math.round(bpm) }
  const marks = [...changes, ...(end !== null ? [end] : [])]
  const gaps = marks.slice(1).map((t, i) => t - marks[i])
  const p0 = 60000 / bpm
  let p = p0
  let beats: number[] = []
  for (let iter = 0; iter < 5; iter++) {
    // cada troca anda pelo menos 1 tempo
    beats = gaps.map((g) => Math.max(1, Math.round(g / p)))
    const total = beats.reduce((a, b) => a + b, 0)
    if (!total) break
    const fit = gaps.reduce((a, b) => a + b, 0) / total
    p = Math.min(p0 * 1.15, Math.max(p0 * 0.85, fit))
  }
  // sem batida de fim: o último acorde completa o compasso (mínimo 1 compasso)
  if (end === null) beats.push(4)
  // o loop precisa de compassos inteiros: o último acorde estica até fechar
  const total = beats.reduce((a, b) => a + b, 0)
  if (total % 4) beats[beats.length - 1] += 4 - (total % 4)
  return { beats, bpm: Math.round(60000 / p) }
}
