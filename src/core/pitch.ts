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
 * Para começar uma nota exige clareza alta; para continuar a mesma nota (`holding`), aceita
 * clareza menor: no fim da nota a corda vibra menos "limpa" e a leitura seria descartada.
 */
export class GuitarPitch {
  private det: PitchDetector<Float32Array>
  constructor(size: number, minDb = -65, private startClarity = 0.9, private holdClarity = 0.6) {
    this.det = PitchDetector.forFloat32Array(size)
    this.det.minVolumeDecibels = minDb
  }

  detect(buf: Float32Array, sampleRate: number, holding: number | null = null): NoteReading | null {
    const [freq, clarity] = this.det.findPitch(buf, sampleRate)
    if (freq < MIN_HZ || freq > MAX_HZ || clarity <= 0) return null
    const r = freqToNote(freq)
    if (clarity >= this.startClarity) return r
    return holding !== null && r.midi === holding && clarity >= this.holdClarity ? r : null
  }
}

/**
 * Acompanha a nota ao longo do tempo:
 * - mediana das últimas leituras (um salto de oitava isolado não troca a nota);
 * - segura a nota por `holdMs` quando as leituras falham no meio da ressonância.
 */
export class NoteTracker {
  private hist: number[] = []
  private current: NoteReading | null = null
  private lastSeen = -Infinity
  constructor(private size = 5, private holdMs = 800) {}

  /** nota MIDI atual (para a histerese do detector) */
  get midi(): number | null {
    return this.current?.midi ?? null
  }

  push(reading: NoteReading | null, now: number): NoteReading | null {
    if (!reading) {
      if (this.current && now - this.lastSeen > this.holdMs) {
        this.current = null
        this.hist = []
      }
      return this.current
    }
    this.lastSeen = now
    this.hist.push(reading.midi)
    if (this.hist.length > this.size) this.hist.shift()
    const sorted = [...this.hist].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    // os cents vêm da leitura atual quando ela é a nota estabilizada
    if (reading.midi === median) this.current = reading
    else if (this.current?.midi !== median) this.current = { ...reading, ...freqToNote(440 * 2 ** ((median - 69) / 12)), cents: 0 }
    return this.current
  }
}
