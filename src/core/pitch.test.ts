import { describe, expect, it } from 'vitest'
import { freqToNote, GuitarPitch, levels, NoteSmoother, positionsOf } from './pitch'

const SR = 48000
const SIZE = 4096

/** Onda parecida com corda de guitarra: fundamental + harmônicos que decaem (2º mais forte que o 1º). */
function pluck(freq: number, amp = 0.3): Float32Array {
  const buf = new Float32Array(SIZE)
  const harm = [0.8, 1, 0.6, 0.4, 0.25, 0.15]
  for (let i = 0; i < SIZE; i++) {
    let v = 0
    harm.forEach((h, k) => (v += h * Math.sin((2 * Math.PI * freq * (k + 1) * i) / SR)))
    buf[i] = (amp * v) / 3
  }
  return buf
}

const midiToFreq = (m: number) => 440 * 2 ** ((m - 69) / 12)

describe('freqToNote', () => {
  it('A4 = 440 Hz, 0 cents', () => {
    expect(freqToNote(440)).toMatchObject({ midi: 69, name: 'A', octave: 4, cents: 0 })
  })
  it('Mi grave solto (E2) e desvio em cents', () => {
    expect(freqToNote(82.41)).toMatchObject({ midi: 40, name: 'E', octave: 2 })
    expect(freqToNote(440 * 2 ** (10 / 1200)).cents).toBe(10)
    expect(freqToNote(440 * 2 ** (-20 / 1200)).cents).toBe(-20)
  })
})

describe('detector com sinal sintético de guitarra', () => {
  const det = new GuitarPitch(SIZE)
  it.each([
    ['E2 (6ª solta)', 40],
    ['A2 (5ª solta)', 45],
    ['D3 (4ª solta)', 50],
    ['G3 (3ª solta)', 55],
    ['B3 (2ª solta)', 59],
    ['E4 (1ª solta)', 64],
    ['A5 (1ª, casa 17)', 81],
  ])('%s', (_, midi) => {
    const r = det.detect(pluck(midiToFreq(midi)), SR)
    expect(r?.midi).toBe(midi)
    expect(Math.abs(r!.cents)).toBeLessThanOrEqual(3)
  })

  it('silêncio e ruído baixo não viram nota', () => {
    expect(det.detect(new Float32Array(SIZE), SR)).toBeNull()
    const noise = new Float32Array(SIZE).map(() => (Math.random() - 0.5) * 0.001)
    expect(det.detect(noise, SR)).toBeNull()
  })
})

describe('auxiliares', () => {
  it('posições do Lá 110 Hz (A2): 6ª corda casa 5 e 5ª corda solta', () => {
    expect(positionsOf(45)).toEqual([
      { string: 4, fret: 0 },
      { string: 5, fret: 5 },
    ])
  })

  it('níveis: seno de amplitude 0,5 tem pico −6 dB', () => {
    const buf = new Float32Array(SIZE).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / SR))
    const { peak, rms } = levels(buf)
    expect(peak).toBeCloseTo(-6.02, 1)
    expect(rms).toBeCloseTo(-9.03, 1)
  })

  it('mediana ignora um salto de oitava isolado', () => {
    const s = new NoteSmoother(5)
    ;[45, 45, 57, 45, 45].forEach((m) => s.push(m))
    expect(s.push(45)).toBe(45)
    expect(s.push(null)).toBeNull()
  })
})
