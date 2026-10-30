import type { NoteReading } from './pitch'

// Cada nota tocada vira um evento: palhetada nova (o volume dá um salto) ou troca de nota sem
// palhetar (ligado, slide, bend que chega noutra nota). O NoteTracker segura a nota por 0,8 s
// para a tela não piscar; aqui é o contrário: queremos saber quando cada nota COMEÇA.

export interface NoteEvent {
  /** sequencial, para a tela animar cada nota uma vez */
  id: number
  midi: number
  cents: number
  /** ms (performance.now) */
  t: number
  /** veio de uma palhetada (salto de volume) ou de uma troca de nota sem ataque */
  attack: boolean
}

export interface OnsetOptions {
  /** salto de volume (dB) sobre o mínimo recente que conta como palhetada */
  jumpDb: number
  /** janela (ms) em que se procura esse mínimo */
  lookbackMs: number
  /** volume mínimo (dBFS) para considerar qualquer coisa */
  gateDb: number
  /** leituras iguais seguidas para confirmar a altura */
  confirm: number
  /** intervalo mínimo entre dois eventos (ms) */
  refractoryMs: number
  /** sem leitura por este tempo = a nota acabou (a mesma nota depois conta como nova) */
  releaseMs: number
  /** quanto tempo uma palhetada espera a altura se firmar (ms) */
  attackWindowMs: number
}

export const ONSET_DEFAULTS: OnsetOptions = {
  jumpDb: 6,
  lookbackMs: 90,
  gateDb: -52,
  confirm: 2,
  refractoryMs: 70,
  releaseMs: 160,
  attackWindowMs: 160,
}

export class NoteOnsets {
  private env: { t: number; db: number }[] = []
  private cur: number | null = null
  private lastReading = -Infinity
  private cand: { midi: number; n: number } | null = null
  private attackAt = -Infinity
  private lastEmit = -Infinity
  private seq = 0
  constructor(public opt: OnsetOptions = ONSET_DEFAULTS) {}

  /** nota soando agora (para a histerese do detector de altura) */
  get midi(): number | null {
    return this.cur
  }

  /**
   * Uma leitura por quadro: a altura bruta do detector (sem mediana longa) e o volume da parte
   * mais recente do sinal. Devolve o evento de nota que começou neste quadro, se houver.
   */
  push(reading: NoteReading | null, db: number, now: number): NoteEvent | null {
    const o = this.opt
    // palhetada: o volume sobe de repente em relação ao mínimo dos últimos ~90 ms
    while (this.env.length && this.env[0].t < now - o.lookbackMs) this.env.shift()
    const floor = this.env.length ? Math.min(...this.env.map((e) => e.db)) : -Infinity
    if (db > o.gateDb && db - floor >= o.jumpDb) {
      this.attackAt = now
      // o mínimo recomeça daqui: o mesmo ataque não dispara de novo nos quadros seguintes,
      // só uma nova subida depois de o volume cair
      this.env = []
    }
    this.env.push({ t: now, db })

    if (!reading) {
      this.cand = null
      if (this.cur !== null && now - this.lastReading > o.releaseMs) this.cur = null
      return null
    }
    this.lastReading = now
    this.cand = this.cand && this.cand.midi === reading.midi ? { midi: reading.midi, n: this.cand.n + 1 } : { midi: reading.midi, n: 1 }
    if (this.cand.n < o.confirm) return null

    const m = this.cand.midi
    const attacked = now - this.attackAt <= o.attackWindowMs
    const changed = m !== this.cur
    // salto de oitava sem palhetada: é erro de leitura (harmônico), não nota nova
    const octaveGlitch = this.cur !== null && Math.abs(m - this.cur) === 12 && !attacked
    if (octaveGlitch) return null
    if (!(changed || attacked)) return null
    if (now - this.lastEmit < o.refractoryMs) {
      // muito perto do anterior: só atualiza qual nota está soando
      this.cur = m
      return null
    }
    this.cur = m
    this.lastEmit = now
    this.attackAt = -Infinity
    return { id: ++this.seq, midi: m, cents: reading.cents, t: now, attack: attacked }
  }

  reset() {
    this.env = []
    this.cur = null
    this.cand = null
    this.attackAt = -Infinity
    this.lastEmit = -Infinity
    this.lastReading = -Infinity
  }
}
