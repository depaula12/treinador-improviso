import { PitchDetector } from 'pitchy'
import { TUNING } from './fretboard-model'
import { KEYS } from './theory'

export interface NoteReading {
  /** nota MIDI mais próxima */
  midi: number
  /** desvio em cents (−50 a +50) em relação a `midi` */
  cents: number
  freq: number
  name: string
  octave: number
}

export function freqToNote(freq: number): NoteReading {
  const exact = 69 + 12 * Math.log2(freq / 440)
  const midi = Math.round(exact)
  return { midi, cents: Math.round((exact - midi) * 100), freq, name: KEYS[((midi % 12) + 12) % 12], octave: Math.floor(midi / 12) - 1 }
}

/** Posições [corda, casa] onde soa exatamente essa nota (corda 0 = Mi agudo). */
export function positionsOf(midi: number, maxFret = 15): { string: number; fret: number }[] {
  return TUNING.flatMap((open, string) => {
    const fret = midi - open
    return fret >= 0 && fret <= maxFret ? [{ string, fret }] : []
  })
}

/** Nível em dBFS: RMS e pico de um bloco de amostras. */
export function levels(buf: ArrayLike<number>): { rms: number; peak: number } {
  let sum = 0
  let peak = 0
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i]
    sum += v * v
    const a = Math.abs(v)
    if (a > peak) peak = a
  }
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity)
  return { rms: db(Math.sqrt(sum / buf.length)), peak: db(peak) }
}

// faixa útil da guitarra: Mi grave afinado um tom abaixo (~73 Hz) até a casa 24 da 1ª corda (~1319 Hz)
const MIN_HZ = 70
const MAX_HZ = 1400

/**
 * Detector de nota (McLeod, via pitchy) com os limites da guitarra.
 * `detect` devolve null quando está baixo demais, sem clareza ou fora da faixa.
 */
export class GuitarPitch {
  private det: PitchDetector<Float32Array>
  constructor(size: number, minDb = -55, private minClarity = 0.9) {
    this.det = PitchDetector.forFloat32Array(size)
    this.det.minVolumeDecibels = minDb
  }

  detect(buf: Float32Array, sampleRate: number): NoteReading | null {
    const [freq, clarity] = this.det.findPitch(buf, sampleRate)
    if (clarity < this.minClarity || freq < MIN_HZ || freq > MAX_HZ) return null
    return freqToNote(freq)
  }
}

/** Mediana das últimas leituras de MIDI: segura a nota quando uma leitura isolada pula de oitava. */
export class NoteSmoother {
  private hist: number[] = []
  constructor(private size = 5) {}
  push(midi: number | null): number | null {
    if (midi === null) {
      this.hist = []
      return null
    }
    this.hist.push(midi)
    if (this.hist.length > this.size) this.hist.shift()
    const sorted = [...this.hist].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length / 2)]
  }
}
