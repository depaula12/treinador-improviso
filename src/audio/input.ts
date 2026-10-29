import { GuitarPitch, levels, NoteSmoother, type NoteReading } from '../core/pitch'

export interface InputFrame {
  /** dBFS do bloco atual */
  rms: number
  peak: number
  /** nota estabilizada (mediana), ou null se não há nota clara */
  note: NoteReading | null
}

const SIZE = 4096 // ~85 ms a 48 kHz: cabe vários períodos do Mi grave (82 Hz)

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
    const smooth = new NoteSmoother(5)
    const sr = ctx.sampleRate
    let last: NoteReading | null = null

    const tick = () => {
      analyser.getFloatTimeDomainData(buf)
      const lv = levels(buf)
      const reading = det.detect(buf, sr)
      const midi = smooth.push(reading?.midi ?? null)
      // mantém os cents da leitura atual quando ela bate com a nota estabilizada
      if (midi === null) last = null
      else if (reading && reading.midi === midi) last = reading
      onFrame({ ...lv, note: last && last.midi === midi ? last : null })
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
