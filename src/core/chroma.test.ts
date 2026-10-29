import { describe, expect, it } from 'vitest'
import { ChordTracker, chromaFromSpectrum, matchChord } from './chroma'
import { TUNING } from './fretboard-model'
import { KEYS } from './theory'
import { QUALITIES, voicingFor, type FormKind } from './voicings'

const SR = 48000
const N = 16384 // igual ao do navegador
const LOW_TO_HIGH = [...TUNING].reverse()

// FFT radix-2 iterativa só para os testes (no navegador quem faz é o AnalyserNode)
function magnitudes(x: Float32Array): Float32Array {
  const n = x.length
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  for (let i = 0; i < n; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))) // Hann
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      ;[re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k)
        const wi = Math.sin(ang * k)
        const ur = re[i + k], ui = im[i + k]
        const vr = re[i + k + len / 2] * wr - im[i + k + len / 2] * wi
        const vi = re[i + k + len / 2] * wi + im[i + k + len / 2] * wr
        re[i + k] = ur + vr
        im[i + k] = ui + vi
        re[i + k + len / 2] = ur - vr
        im[i + k + len / 2] = ui - vi
      }
    }
  }
  const out = new Float32Array(n / 2)
  for (let i = 0; i < n / 2; i++) out[i] = Math.hypot(re[i], im[i])
  return out
}

/** Acorde de guitarra sintético: cada corda com harmônicos, cordas agudas um pouco mais fracas. */
function strum(midis: number[]): Float32Array {
  const buf = new Float32Array(N)
  const harm = [1, 0.7, 0.45, 0.3, 0.2, 0.12]
  midis.forEach((m, s) => {
    const f = 440 * 2 ** ((m - 69) / 12)
    const amp = 0.15 * (1 - s * 0.06)
    for (let i = 0; i < N; i++) {
      let v = 0
      harm.forEach((h, k) => (v += h * Math.sin((2 * Math.PI * f * (k + 1) * i) / SR + s)))
      buf[i] += amp * v
    }
  })
  return buf
}

const notesOf = (frets: (number | null)[]) => frets.flatMap((f, i) => (f === null ? [] : [LOW_TO_HIGH[i] + f]))

function detect(midis: number[]) {
  const { chroma, bass } = chromaFromSpectrum(magnitudes(strum(midis)), SR / N)
  return matchChord(chroma, bass)[0]
}

describe('detecção de acordes (sinal sintético)', () => {
  const cases: [string, string, number, FormKind][] = [
    ['E', 'maj', 4, 'aberto'], ['A', 'maj', 9, 'aberto'], ['D', 'maj', 2, 'aberto'], ['C', 'maj', 0, 'aberto'], ['G', 'maj', 7, 'aberto'],
    ['Am', 'm', 9, 'aberto'], ['Em', 'm', 4, 'aberto'], ['Dm', 'm', 2, 'aberto'],
    ['E7', '7', 4, 'aberto'], ['A7', '7', 9, 'aberto'], ['D7', '7', 2, 'aberto'], ['B7', '7', 11, 'aberto'],
    ['Am7', 'm7', 9, 'aberto'], ['Em7', 'm7', 4, 'aberto'],
    ['A5', '5', 9, 'aberto'], ['E5', '5', 4, 'aberto'],
    ['F (pestana na 6ª)', 'maj', 5, '6'], ['Bm (pestana na 5ª)', 'm', 11, '5'], ['F#m7 (6ª)', 'm7', 6, '6'], ['C7 (5ª)', '7', 0, '5'],
    ['Bb (5ª)', 'maj', 10, '5'], ['G#m (6ª)', 'm', 8, '6'],
  ]
  it.each(cases)('%s', (_, quality, root, form) => {
    const v = voicingFor(quality, root, form)!
    const g = detect(notesOf(v.frets))
    expect(g.symbol).toBe(KEYS[root] + QUALITIES.find((q) => q.id === quality)!.suffix)
  })

  it('banco inteiro (maior, m, 7, m7 × 12 tons × formas), cordas com volume aleatório e ruído: ≥ 85% certo', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    let ok = 0
    let total = 0
    const misses: string[] = []
    for (const quality of ['maj', 'm', '7', 'm7']) {
      for (let root = 0; root < 12; root++) {
        for (const form of ['6', '5', 'aberto'] as FormKind[]) {
          const v = voicingFor(quality, root, form)
          if (!v) continue
          const buf = new Float32Array(N)
          notesOf(v.frets).forEach((m) => {
            const one = strum([m])
            const amp = 0.5 + rnd() // cada corda de 0,5× a 1,5×
            for (let i = 0; i < N; i++) buf[i] += one[i] * amp
          })
          for (let i = 0; i < N; i++) buf[i] += (rnd() - 0.5) * 0.01
          const { chroma, bass } = chromaFromSpectrum(magnitudes(buf), SR / N)
          const g = matchChord(chroma, bass)[0]
          total++
          if (g.symbol === v.symbol) ok++
          else misses.push(`${v.symbol}(${form})→${g.symbol}`)
        }
      }
    }
    console.log(`acertos ${ok}/${total}; erros: ${misses.join(' ')}`)
    expect(ok / total).toBeGreaterThanOrEqual(0.85)
  })

  it('uma nota sozinha não vira acorde menor ou maior por engano com folga', () => {
    // nota isolada: o melhor palpite deve ter a própria nota como fundamental
    const g = detect([45])
    expect(g.root).toBe(9)
  })
})

describe('ChordTracker', () => {
  const A = { root: 9, quality: 'maj', symbol: 'A', score: 0.9 }
  const D = { root: 2, quality: 'maj', symbol: 'D', score: 0.9 }
  it('só mostra depois de 3 leituras iguais e segura no silêncio', () => {
    const t = new ChordTracker(3, 1500)
    expect(t.push(A, 0)).toBeNull()
    expect(t.push(A, 100)).toBeNull()
    expect(t.push(A, 200)?.symbol).toBe('A')
    expect(t.push(D, 300)?.symbol).toBe('A') // uma leitura de D ainda não troca
    expect(t.push(null, 1000)?.symbol).toBe('A')
    expect(t.push(null, 2000)).toBeNull()
  })
})
