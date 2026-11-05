import * as Tone from 'tone'
import type { DrumPiece } from './styles/types'

// MuldjordKit (CC BY 4.0). Camadas de velocity da mais fraca para a mais forte;
// `alt` é um segundo conjunto gravado (round robin) para não repetir o mesmo sample.
const KIT: Record<DrumPiece, { layers: string[]; alt?: string[] }> = {
  kick: {
    layers: ['8-KdrumL', '13-KdrumL', '17-KdrumL', '21-KdrumL', '25-KdrumL'],
    alt: ['9-KdrumR', '15-KdrumR', '19-KdrumR', '23-KdrumR', '26-KdrumR'],
  },
  snare: {
    layers: ['5-Snare', '10-Snare', '20-Snare', '30-Snare', '42-Snare', '53-Snare'],
    alt: ['5-Snare2', '10-Snare2', '20-Snare2', '30-Snare2', '42-Snare2', '53-Snare2'],
  },
  hhClosed: {
    layers: ['3-HihatClosed', '8-HihatClosed', '12-HihatClosed', '16-HihatClosed', '20-HihatClosed', '24-HihatClosed', '28-HihatClosed'],
  },
  hhOpen: { layers: ['8-HihatOpen', '14-HihatOpen', '20-HihatOpen', '26-HihatOpen'] },
  ride: { layers: ['3-RideL', '6-RideL', '9-RideL'] },
  crash: { layers: ['8-CrashR', '12-CrashR'] },
  tomHi: { layers: ['3-Tom1', '7-Tom1', '11-Tom1'] },
  tomMid: { layers: ['4-Tom3', '9-Tom3', '14-Tom3'] },
  tomFloor: { layers: ['6-Tom4', '12-Tom4', '18-Tom4'] },
}

export class DrumKit {
  private buffers: Tone.ToneAudioBuffers
  private openHat: Tone.ToneBufferSource | null = null
  private lastFile = new Map<DrumPiece, string>()
  private active = new Set<Tone.ToneBufferSource>()

  /** resolve quando todas as camadas da bateria estiverem baixadas */
  readonly ready: Promise<void>

  constructor(private out: Tone.InputNode, baseUrl: string) {
    const urls: Record<string, string> = {}
    for (const { layers, alt } of Object.values(KIT)) {
      for (const f of [...layers, ...(alt ?? [])]) urls[f] = `${f}.mp3`
    }
    let ok: () => void = () => {}
    let fail: (e: Error) => void = () => {}
    this.ready = new Promise((res, rej) => ((ok = res), (fail = rej)))
    this.buffers = new Tone.ToneAudioBuffers({ urls, baseUrl, onload: () => ok(), onerror: (e) => fail(e) })
  }

  get loaded() {
    return this.buffers.loaded
  }

  private choose(piece: DrumPiece, vel: number): string {
    const { layers, alt } = KIT[piece]
    const idx = Math.min(layers.length - 1, Math.round(vel * (layers.length - 1)))
    // round robin: alterna entre o conjunto principal e o alternativo, ou uma camada vizinha
    const options = [layers[idx]]
    if (alt) options.push(alt[idx])
    else if (idx > 0) options.push(layers[idx - 1])
    const last = this.lastFile.get(piece)
    const pool = options.length > 1 ? options.filter((o) => o !== last) : options
    const file = pool[Math.floor(Math.random() * pool.length)]
    this.lastFile.set(piece, file)
    return file
  }

  hit(piece: DrumPiece, time: number, vel: number) {
    const buffer = this.buffers.get(this.choose(piece, vel))
    // a camada já carrega o timbre; o ganho ajusta o fino
    const gain = 0.45 + 0.55 * vel
    const src = new Tone.ToneBufferSource({ url: buffer, fadeOut: 0.02 }).connect(this.out)
    src.onended = () => {
      this.active.delete(src)
      src.dispose()
    }
    this.active.add(src)
    src.start(time, 0, undefined, gain)

    // chimbal fechado (ou pedal) corta o aberto
    if (piece === 'hhClosed' && this.openHat) {
      try {
        this.openHat.stop(time)
      } catch {
        /* já terminou */
      }
      this.openHat = null
    }
    if (piece === 'hhOpen') this.openHat = src
  }

  /** Corta tudo o que ainda está soando (pratos têm até 3,5 s de cauda). */
  stopAll(time: number) {
    for (const src of this.active) {
      try {
        src.stop(time)
      } catch {
        /* já terminou */
      }
    }
    this.openHat = null
  }
}

/** quantos arquivos a bateria baixa */
export const DRUM_FILES = Object.values(KIT).reduce((n, { layers, alt }) => n + layers.length + (alt?.length ?? 0), 0)
