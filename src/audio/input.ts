import {
  ChordTracker,
  chromaFromSpectrum,
  ChromaSmoother,
  matchChord,
  type ChordGuess,
  type Chroma,
  type TrackerOptions,
} from '../core/chroma'
import { NoteOnsets, type NoteEvent } from '../core/onset'
import { GuitarPitch, levels, NoteTracker, type NoteReading } from '../core/pitch'

export interface InputFrame {
  /** dBFS do bloco atual */
  rms: number
  peak: number
  /** nota estabilizada (mediana), ou null se não há nota clara */
  note: NoteReading | null
  /** acorde estabilizado (precisa repetir algumas leituras), ou null */
  chord: ChordGuess | null
  /** energia das 12 notas na última leitura de acorde */
  chroma: Chroma | null
  /** os 3 melhores palpites da última leitura (para mostrar alternativas) */
  guesses: ChordGuess[]
  /** nota que começou neste quadro (uma por palhetada ou troca de nota), ou null */
  onset: NoteEvent | null
}

const SIZE = 4096 // ~85 ms a 48 kHz: cabe vários períodos do Mi grave (82 Hz)
// volume para achar a palhetada: só o fim do bloco (~21 ms), senão o ataque fica "borrado"
const ATTACK_SIZE = 1024
// acordes: janela longa (~340 ms) para separar notas vizinhas no grave (Mi e Fá a 82/87 Hz)
const CHORD_FFT = 16384
// abaixo disso não tenta ler acorde (só ruído/fim da nota)
const CHORD_MIN_DB = -50

/** Lista as entradas de áudio. Os nomes só aparecem depois da primeira permissão. */
export async function listInputs(): Promise<MediaDeviceInfo[]> {
  const all = await navigator.mediaDevices.enumerateDevices()
  return all.filter((d) => d.kind === 'audioinput')
}

/**
 * Acha a interface da guitarra pelo nome (o Cube Baby aparece como "Linha (USB-Audio)").
 * Antes da permissão os nomes vêm vazios: aí não há como saber e devolve undefined.
 */
export function guessGuitarInput(devices: MediaDeviceInfo[]): MediaDeviceInfo | undefined {
  return devices.find((d) => /usb|cube|linha|line|interface/i.test(d.label))
}

/**
 * Captura da guitarra: lê o sinal, mede o nível e detecta a nota ~30×/s.
 * O som não é devolvido para a saída (evita eco/realimentação e o atraso do Windows).
 */
export class AudioInput {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private raf = 0
  private chords = new ChordTracker()

  /** Ajusta estabilidade e tempo mínimo entre trocas, mesmo com a entrada ligada. */
  setChordOptions(opt: TrackerOptions) {
    this.chords.opt = opt
  }

  async start(deviceId: string | undefined, onFrame: (f: InputFrame) => void) {
    this.stop()
    // o contexto nasce ainda dentro do clique (antes de esperar a permissão) e é reaproveitado
    // nas trocas de entrada: criado depois, o Chrome o deixaria suspenso e o sinal não andaria
    this.ctx ??= new AudioContext({ latencyHint: 'interactive' })
    const ctx = this.ctx
    // sem processamento de voz: cancelamento de eco e ganho automático destroem o sinal da guitarra
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    if (ctx.state === 'suspended') await ctx.resume()
    const src = ctx.createMediaStreamSource(this.stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = SIZE
    src.connect(analyser)
    this.source = src

    const buf = new Float32Array(SIZE)
    const det = new GuitarPitch(SIZE)
    const track = new NoteTracker()
    const onsets = new NoteOnsets()
    const recent = buf.subarray(SIZE - ATTACK_SIZE)
    const sr = ctx.sampleRate

    const spec = ctx.createAnalyser()
    spec.fftSize = CHORD_FFT
    spec.smoothingTimeConstant = 0.3
    src.connect(spec)
    const db = new Float32Array(spec.frequencyBinCount)
    const mags = new Float32Array(spec.frequencyBinCount)
    const binHz = sr / CHORD_FFT
    const chords = this.chords
    const smoother = new ChromaSmoother()
    let chord: ChordGuess | null = null
    let chroma: Chroma | null = null
    let guesses: ChordGuess[] = []
    let frame = 0

    const tick = () => {
      const now = performance.now()
      analyser.getFloatTimeDomainData(buf)
      const lv = levels(buf)
      const raw = det.detect(buf, sr, onsets.midi ?? track.midi)
      const note: NoteReading | null = track.push(raw, now)
      const onset = onsets.push(raw, levels(recent).rms, now)
      // acorde a ~15 leituras/s (a FFT grande é mais cara que a detecção de nota)
      if (frame++ % 4 === 0) {
        if (lv.rms > CHORD_MIN_DB) {
          spec.getFloatFrequencyData(db)
          for (let i = 0; i < db.length; i++) mags[i] = 10 ** (db[i] / 20)
          const c = chromaFromSpectrum(mags, binHz)
          chroma = smoother.push(c.chroma, chords.opt.smoothing)
          const all = matchChord(chroma!, c.bass)
          guesses = all.slice(0, 3)
          chord = chords.push(all, now)
        } else {
          smoother.push(null, 1)
          chord = chords.push(null, now)
        }
      }
      onFrame({ ...lv, note, chord, chroma, guesses, onset })
      this.raf = requestAnimationFrame(tick)
    }
    tick()
    return this.stream.getAudioTracks()[0]?.label ?? ''
  }

  /** Para de ouvir (o contexto continua, para religar sem novo clique). */
  stop() {
    cancelAnimationFrame(this.raf)
    this.source?.disconnect()
    this.source = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
  }

  /** Libera tudo (ao sair da tela). */
  close() {
    this.stop()
    void this.ctx?.close()
    this.ctx = null
  }
}
