import * as Tone from 'tone'
import type { ChordInfo } from '../core/theory'
import { DrumKit } from './drums'
import { setHumanize, strumGap, timing, velocity } from './humanize'
import { createSampler, createSamplers } from './samplers'
import { ballad } from './styles/ballad'
import { rock } from './styles/rock'
import { shuffle } from './styles/shuffle'
import { slow128 } from './styles/slow128'
import type { BarContext, DrumPiece, PitchedNote, Style } from './styles/types'
import { guitarVoicing, voiceLead } from './voicing'

// Contexto de baixa latência: o lookahead padrão (0,1 s) atrasava a resposta ao play.
Tone.setContext(new Tone.Context({ latencyHint: 'interactive', lookAhead: 0.05 }))

export type Instrument = 'drums' | 'bass' | 'piano' | 'guitar'
export interface ChannelState {
  on: boolean
  /** dB */
  volume: number
}
export type MixState = Record<Instrument, ChannelState>

export interface SongConfig {
  chords: ChordInfo[]
  /**
   * Trocas dentro do compasso (música com durações): por índice de compasso, os acordes que entram
   * depois do tempo 1, ex.: [{ beat: 2, chord: D }] num compasso que começa em G. Vazio = compasso inteiro.
   */
  changes?: { beat: number; chord: ChordInfo }[][]
  style: Style
  bpm: number
  loop: boolean
  countIn: boolean
  /** virada a cada N compassos */
  fillEvery: 4 | 8
}

export interface Position {
  /** -1 durante a contagem */
  bar: number
  beat: number
}

export const STYLES: Style[] = [shuffle, rock, slow128, ballad]

export interface ExerciseConfig {
  bpm: number
  /** notas por tempo: 1 semínima, 2 colcheias, 3 tercinas, 4 semicolcheias */
  perBeat: 1 | 2 | 3 | 4
  notes: number[]
  /** toca cada nota com o violão (senão só o metrônomo) */
  sound: boolean
  countIn: boolean
}

/** Posição do exercício: índice da nota, ou -1 durante a contagem (com o tempo 1–4). */
export interface StepPos {
  index: number
  count?: number
}

// Desvio de tempo por instrumento (ms): [espalhamento, atraso fixo]
const FEEL: Record<Instrument | DrumPiece, [number, number]> = {
  drums: [6, 0],
  kick: [5, 0],
  snare: [6, 2],
  hhClosed: [9, 0],
  hhOpen: [9, 0],
  ride: [9, 0],
  crash: [5, 0],
  tomHi: [8, 0],
  tomMid: [8, 0],
  tomFloor: [8, 0],
  bass: [8, 5],
  piano: [12, 3],
  guitar: [12, 0],
}

type Pitched = Exclude<Instrument, 'drums'>

class Engine {
  private ready: Promise<void> | null = null
  private channels!: Record<Instrument, Tone.Channel>
  private samplers!: Record<Pitched, Tone.Sampler>
  private kit!: DrumKit
  /** volume geral liga/desliga: fecha em 30 ms no Parar para cortar o que ainda soa */
  private gate!: Tone.Gain
  private repeatId: number | null = null
  private barCounter = 0
  private lastVoicing: number[] | null = null

  /** exercícios de escala: metrônomo e violão num canal próprio, fora do mixer do Improviso */
  private click!: Tone.Synth
  private exSampler!: Tone.Sampler

  /** o que está tocando agora */
  mode: 'base' | 'exercise' | null = null
  config: SongConfig | null = null
  onPosition: ((p: Position | null) => void) | null = null
  onStep: ((p: StepPos | null) => void) | null = null

  /**
   * Monta o grafo e começa a baixar os samples. Pode rodar antes do primeiro clique
   * (o contexto fica suspenso até `start`), assim o play não espera o download.
   */
  load(mix: MixState): Promise<void> {
    if (this.ready) return this.ready
    this.ready = (async () => {
      const limiter = new Tone.Limiter(-1).toDestination()
      const comp = new Tone.Compressor({ threshold: -16, ratio: 3, attack: 0.01, release: 0.2 }).connect(limiter)
      this.gate = new Tone.Gain(0).connect(comp)
      const bus = new Tone.Gain(0.8).connect(this.gate)

      const reverb = new Tone.Reverb({ decay: 1.8, preDelay: 0.01, wet: 1 }).connect(bus)
      new Tone.Channel({ volume: 0 }).connect(reverb).receive('reverb')

      const mk = (send: number) => {
        const ch = new Tone.Channel().connect(bus)
        ch.send('reverb', send)
        return ch
      }
      this.channels = { drums: mk(-20), bass: mk(-40), piano: mk(-14), guitar: mk(-16) }
      this.setMix(mix)

      const base = `${import.meta.env.BASE_URL}samples`
      const s = createSamplers(base)
      s.piano.connect(this.channels.piano)
      s.bass.connect(this.channels.bass)
      s.guitar.connect(this.channels.guitar)
      this.samplers = s
      this.kit = new DrumKit(this.channels.drums, `${base}/drums/`)

      const ex = new Tone.Channel({ volume: 0 }).connect(bus)
      this.click = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.02 },
        volume: -8,
      }).connect(ex)
      this.exSampler = createSampler('guitar', base).connect(ex)

      await Promise.all([Tone.loaded(), reverb.ready])
    })()
    return this.ready
  }

  /** Precisa ser chamado a partir de um gesto do usuário (clique). */
  async start(mix: MixState) {
    await Promise.all([Tone.start(), this.load(mix)])
  }

  setMix(mix: MixState) {
    if (!this.channels) return
    for (const k of Object.keys(mix) as Instrument[]) {
      this.channels[k].mute = !mix[k].on
      this.channels[k].volume.rampTo(mix[k].volume, 0.05)
    }
  }

  setBpm(bpm: number) {
    if (this.config) this.config.bpm = bpm
    Tone.getTransport().bpm.rampTo(bpm, 0.2)
  }

  setHumanize(on: boolean) {
    setHumanize(on)
  }

  /**
   * Prévia curta: toca os acordes com o violão, um a cada `secEach` segundos, fora do Transport
   * (não mexe na configuração da base). Para a base ou o exercício que estiver tocando.
   * Devolve a duração em segundos.
   */
  async previewChords(chords: ChordInfo[], mix: MixState, secEach = 1.1): Promise<number> {
    await this.start(mix)
    if (this.mode) this.stop()
    this.exSampler.releaseAll()
    const now = Tone.now() + 0.08
    this.gate.gain.cancelScheduledValues(now)
    this.gate.gain.setValueAtTime(1, now)
    chords.forEach((c, i) => {
      const t = now + i * secEach
      // batida para baixo, uma corda por vez (como no estilo)
      guitarVoicing(c).sort((a, b) => a - b).forEach((m, j) => {
        const off = j * 0.018
        this.exSampler.triggerAttackRelease(Tone.Frequency(m, 'midi').toNote(), secEach * 0.95 - off, t + off, 0.7 - j * 0.04)
      })
    })
    return chords.length * secEach
  }

  /** Metrônomo + nota da vez, em loop. Interrompe a base do Improviso, se estiver tocando. */
  playExercise(o: ExerciseConfig) {
    if (!o.notes.length) return
    // avisa só o Improviso (a base parou); o exercício está só recomeçando
    const wasBase = this.mode === 'base'
    this.halt()
    if (wasBase) this.onPosition?.(null)
    this.mode = 'exercise'
    const tr = Tone.getTransport()
    tr.position = 0
    tr.timeSignature = 4
    tr.bpm.value = o.bpm
    const draw = Tone.getDraw()
    const raw = Tone.getContext().rawContext as AudioContext
    const outLat = raw.outputLatency || raw.baseLatency || 0
    const countSteps = o.countIn ? 4 * o.perBeat : 0
    let k = 0
    this.repeatId = tr.scheduleRepeat(
      (time) => {
        const step = k++
        const spb = 60 / tr.bpm.value
        if (step % o.perBeat === 0) {
          const beat = Math.floor(step / o.perBeat)
          this.click.triggerAttackRelease(beat % 4 === 0 ? 'E6' : 'A5', 0.03, time, beat % 4 === 0 ? 1 : 0.6)
        }
        if (step < countSteps) {
          if (step % o.perBeat === 0) {
            const count = step / o.perBeat + 1
            draw.schedule(() => this.onStep?.({ index: -1, count }), time + outLat)
          }
          return
        }
        const index = (step - countSteps) % o.notes.length
        if (o.sound) {
          this.exSampler.triggerAttackRelease(Tone.Frequency(o.notes[index], 'midi').toNote(), (spb / o.perBeat) * 0.95, time, 0.75)
        }
        draw.schedule(() => this.onStep?.({ index }), time + outLat)
      },
      `${tr.PPQ / o.perBeat}i`,
      0,
    )
    const now = Tone.now()
    this.gate.gain.cancelScheduledValues(now)
    this.gate.gain.setValueAtTime(1, now)
    tr.start('+0.05')
  }

  play() {
    if (!this.config) return
    // pode estar rodando um exercício de escala: para e avisa a tela de Escalas
    const wasExercise = this.mode === 'exercise'
    this.halt()
    if (wasExercise) this.onStep?.(null)
    this.mode = 'base'
    const tr = Tone.getTransport()
    tr.position = 0
    tr.timeSignature = 4
    tr.bpm.value = this.config.bpm
    this.barCounter = this.config.countIn ? -1 : 0
    this.lastVoicing = null
    // Cada compasso é montado uma semicolcheia antes de começar (um evento agendado para o
    // instante que o Transport está processando seria ignorado). O primeiro vai já.
    const measure = 4 * tr.PPQ
    const lead = tr.PPQ / 4
    this.scheduleBar(0)
    this.repeatId = tr.scheduleRepeat(
      (time) => this.scheduleBar(Math.round(tr.getTicksAtTime(time)) + lead),
      '1m',
      `${measure - lead}i`,
    )
    const now = Tone.now()
    this.gate.gain.cancelScheduledValues(now)
    this.gate.gain.setValueAtTime(1, now)
    tr.start('+0.05')
  }

  /** Para tudo e avisa as telas. */
  stop() {
    this.halt()
    this.mode = null
    this.onPosition?.(null)
    this.onStep?.(null)
  }

  /** Para o transporte e corta o som, sem avisar ninguém. */
  private halt() {
    const tr = Tone.getTransport()
    if (this.repeatId !== null) tr.clear(this.repeatId)
    this.repeatId = null
    tr.stop()
    tr.cancel()
    Tone.getDraw().cancel(0)
    if (this.gate) {
      const now = Tone.now()
      this.gate.gain.cancelScheduledValues(now)
      this.gate.gain.rampTo(0, 0.03, now)
      this.kit.stopAll(now + 0.04)
    }
  }

  /**
   * Monta o compasso que começa em `barTicks`. As notas não vão direto para o áudio:
   * cada uma vira um evento do Transport, entregue ao Web Audio só ~50 ms antes de soar.
   * Assim o Parar (tr.cancel) descarta na hora tudo o que ainda não tocou.
   */
  private scheduleBar(barTicks: number) {
    const cfg = this.config
    if (!cfg) return
    const tr = Tone.getTransport()
    const bar = this.barCounter++
    const draw = Tone.getDraw()
    // o som sai da caixa `outputLatency` depois do agendado (bem mais em fone Bluetooth);
    // a tela espera o mesmo tanto para ficar junto do que se ouve
    const raw = Tone.getContext().rawContext as AudioContext
    const outLat = raw.outputLatency || raw.baseLatency || 0
    const at = (beat: number, fn: (t: number) => void) =>
      tr.scheduleOnce(fn, `${Math.round(barTicks + beat * tr.PPQ)}i`)

    for (let beat = 0; beat < 4; beat++) {
      const pos = { bar: bar < 0 ? -1 : bar % cfg.chords.length, beat }
      at(beat, (t) => draw.schedule(() => this.onPosition?.(pos), t + outLat))
    }

    if (bar < 0) {
      // contagem: chimbal nas 4 semínimas
      for (let beat = 0; beat < 4; beat++) at(beat, (t) => this.kit.hit('hhClosed', t, beat === 0 ? 0.8 : 0.6))
      return
    }

    const n = cfg.chords.length
    if (!cfg.loop && bar >= n) {
      at(0, (t) => draw.schedule(() => this.stop(), t))
      return
    }
    this.scheduleMusic(cfg, bar, at)
  }

  private scheduleMusic(cfg: SongConfig, bar: number, at: (beat: number, fn: (t: number) => void) => void) {
    const n = cfg.chords.length

    const chordAt = (i: number) => cfg.chords[((i % n) + n) % n]
    const chord = chordAt(bar)
    const changes = cfg.changes?.[((bar % n) + n) % n] ?? []
    const phrase = Math.floor(bar / cfg.fillEvery)
    const pianoVoicing = voiceLead(chord, this.lastVoicing)
    this.lastVoicing = pianoVoicing

    const ctx: BarContext = {
      index: bar,
      chord,
      prev: chordAt(bar - 1),
      next: changes[0]?.chord ?? chordAt(bar + 1),
      variation: phrase % 2 === 0 ? 'A' : 'B',
      isFill: bar % cfg.fillEvery === cfg.fillEvery - 1,
      isPhraseStart: bar % cfg.fillEvery === 0,
      pianoVoicing,
      guitarVoicing: guitarVoicing(chord),
    }
    // troca no meio do compasso: o estilo gera o compasso para cada acorde e cada um fica só com
    // o seu trecho (notas cortadas na troca)
    const parts: { from: number; to: number; ctx: BarContext }[] = [{ from: 0, to: changes[0]?.beat ?? 4, ctx }]
    changes.forEach((c, k) => {
      const prev = parts[parts.length - 1].ctx
      const v = voiceLead(c.chord, prev.pianoVoicing)
      this.lastVoicing = v
      parts.push({
        from: c.beat,
        to: changes[k + 1]?.beat ?? 4,
        ctx: { ...ctx, chord: c.chord, prev: prev.chord, next: changes[k + 1]?.chord ?? chordAt(bar + 1), pianoVoicing: v, guitarVoicing: guitarVoicing(c.chord) },
      })
    })
    const pitched = (inst: Pitched): PitchedNote[] =>
      parts.length === 1
        ? cfg.style[inst](ctx)
        : parts.flatMap((p, k) => {
            const all = cfg.style[inst](p.ctx)
            const inside = all.filter((x) => x.beat >= p.from && x.beat < p.to).map((x) => ({ ...x, dur: Math.min(x.dur, p.to - x.beat) }))
            if (k === 0 || inside.some((x) => x.beat === p.from)) return inside
            // o padrão não ataca bem na troca (ex.: piano em mínimas e troca no tempo 4):
            // o que estaria soando ali entra junto com o acorde novo
            const held = all
              .filter((x) => x.beat < p.from && x.beat + x.dur > p.from)
              .map((x) => ({ ...x, beat: p.from, dur: Math.min(x.beat + x.dur, p.to) - p.from }))
            return [...held, ...inside]
          })

    // tempo humanizado de um evento; nunca no passado
    const human = (t: number, feel: [number, number]) => Math.max(Tone.now(), t + timing(...feel))

    for (const h of cfg.style.drums(ctx)) {
      at(h.beat, (t) => this.kit.hit(h.piece, human(t, FEEL[h.piece]), velocity(h.vel, 0.06)))
    }
    for (const inst of ['bass', 'piano', 'guitar'] as const) {
      for (const note of pitched(inst)) {
        at(note.beat, (t) => this.playNote(inst, note, human(t, FEEL[inst])))
      }
    }
  }

  private playNote(inst: Pitched, n: PitchedNote, start: number) {
    const sampler = this.samplers[inst]
    const spb = 60 / Tone.getTransport().bpm.value
    const dur = n.dur * spb
    const v = velocity(n.vel)
    if (n.strum) {
      // violão: uma corda por vez, 10–25 ms entre elas
      const order = n.strum === 'down' ? [...n.midi].sort((a, b) => a - b) : [...n.midi].sort((a, b) => b - a)
      let offset = 0
      order.forEach((m, i) => {
        sampler.triggerAttackRelease(Tone.Frequency(m, 'midi').toNote(), dur - offset, start + offset, v * (1 - i * 0.06))
        offset += strumGap()
      })
    } else if (inst === 'piano') {
      // piano: notas do acorde levemente desencontradas (0–8 ms), voz de cima um pouco mais forte
      n.midi.forEach((m, i) => {
        const roll = Math.random() * 0.008
        const lift = i === n.midi.length - 1 ? 0.06 : 0
        sampler.triggerAttackRelease(Tone.Frequency(m, 'midi').toNote(), dur, start + roll, Math.min(1, v + lift))
      })
    } else {
      sampler.triggerAttackRelease(n.midi.map((m) => Tone.Frequency(m, 'midi').toNote()), dur, start, v)
    }
  }
}

export const engine = new Engine()
