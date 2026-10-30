import { describe, expect, it } from 'vitest'
import { bpmFromTaps, quantizeChanges } from './tap'

// batidas "humanas": tempo certo + erro de até ±40 ms, determinístico
const jitter = (i: number) => ((i * 37) % 81) - 40

describe('bpmFromTaps', () => {
  it('acha o andamento mesmo com batidas imprecisas', () => {
    const taps = Array.from({ length: 10 }, (_, i) => 1000 + i * 500 + jitter(i) / 2)
    expect(bpmFromTaps(taps)!).toBeGreaterThan(115)
    expect(bpmFromTaps(taps)!).toBeLessThan(125)
  })
  it('precisa de pelo menos 3 batidas', () => {
    expect(bpmFromTaps([0, 500])).toBeNull()
  })
})

describe('quantizeChanges', () => {
  it('recupera durações reais (4, 2, 2, 3, 1, 4) com batidas imprecisas', () => {
    const real = [4, 2, 2, 3, 1, 4]
    const beatMs = 60000 / 96
    let at = 0
    const changes = real.map((d, i) => {
      const t = at + jitter(i)
      at += d * beatMs
      return 5000 + t
    })
    const end = 5000 + at + jitter(9)
    // BPM batido um pouco errado (100 em vez de 96)
    const q = quantizeChanges(changes, end, 100)
    expect(q.beats).toEqual(real)
    expect(q.bpm).toBeGreaterThanOrEqual(95)
    expect(q.bpm).toBeLessThanOrEqual(97)
  })
  it('sem batida de fim, o último acorde fica com 1 compasso', () => {
    const q = quantizeChanges([0, 2000, 4000], null, 120)
    expect(q.beats).toEqual([4, 4, 4])
  })
  it('fecha compassos inteiros esticando o último acorde', () => {
    const q = quantizeChanges([0, 1500, 2000], 2500, 120) // 3 + 1 + 1 tempos
    expect(q.beats).toEqual([3, 1, 4])
  })
  it('batidas grudadas contam pelo menos 1 tempo', () => {
    const q = quantizeChanges([0, 2000, 2050, 4000], 6000, 120)
    expect(q.beats.every((b) => b >= 1)).toBe(true)
  })
})
