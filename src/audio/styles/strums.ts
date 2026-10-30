import { chance } from '../humanize'
import { bossaGuitar } from './bossa'
import type { BarContext, PitchedNote } from './types'

// Levadas de violão: trocam só a parte do violão da base (bateria, baixo e piano seguem o estilo).
// Na área Compor cada seção pode ter a sua (verso dedilhado, refrão em colcheias…).

export interface Strum {
  id: string
  name: string
  /** em uma linha, como se toca */
  how: string
  guitar(ctx: BarContext): PitchedNote[]
}

const SW = 2 / 3
const D = 'down' as const
const U = 'up' as const
/** cordas de cima do desenho (a palhetada para cima pega só elas) */
const top = (v: number[], n: number) => (v.length > n ? v.slice(-n) : v)
/** cordas de baixo (abafado de rock, power chord) */
const low = (v: number[], n: number) => (v.length > n ? v.slice(0, n) : v)

export const STRUMS: Strum[] = [
  {
    id: 'pop', name: 'Pop (baixo-cima)', how: 'B . B C . C B C: a batida mais comum do violão pop',
    guitar: ({ guitarVoicing: v }) => [
      { beat: 0, dur: 0.9, vel: 0.6, midi: v, strum: D },
      { beat: 1, dur: 0.45, vel: 0.52, midi: v, strum: D },
      { beat: 1.5, dur: 0.6, vel: 0.4, midi: top(v, 4), strum: U },
      { beat: 2.5, dur: 0.45, vel: 0.42, midi: top(v, 4), strum: U },
      { beat: 3, dur: 0.45, vel: 0.52, midi: v, strum: D },
      { beat: 3.5, dur: 0.45, vel: 0.4, midi: top(v, 4), strum: U },
    ],
  },
  {
    id: 'dedilhado', name: 'Balada dedilhada', how: 'baixo no 1 e no 3, os dedos sobem e descem as cordas em colcheias',
    guitar: ({ guitarVoicing: v }) => {
      if (v.length < 4) return [{ beat: 0, dur: 3.9, vel: 0.5, midi: v, strum: D }]
      const n = v.length
      // p i m a m i (polegar no baixo; a nota do polegar no 3 é a corda seguinte)
      const order = [0, n - 3, n - 2, n - 1, 1, n - 3, n - 2, n - 1]
      return order.map((k, i) => ({ beat: i / 2, dur: i % 4 === 0 ? 2 : 1.2, vel: i % 4 === 0 ? 0.5 : 0.38, midi: [v[k]] }))
    },
  },
  {
    id: 'rock', name: 'Rock em colcheias', how: 'colcheias para baixo nas cordas graves, acento nos tempos',
    guitar: ({ guitarVoicing: v }) =>
      Array.from({ length: 8 }, (_, i) => ({ beat: i / 2, dur: 0.42, vel: i % 2 ? 0.44 : 0.58, midi: low(v, 4), strum: D })),
  },
  {
    id: 'reggae', name: 'Reggae', how: 'acorde curto e seco só no contratempo (tempos 2 e 4), nas cordas de cima',
    guitar: (ctx) => {
      const v = top(ctx.guitarVoicing, 3)
      const out: PitchedNote[] = [1, 3].map((beat) => ({ beat, dur: 0.18, vel: 0.55, midi: v, strum: D }))
      if (ctx.variation === 'B') out.push({ beat: 3.5, dur: 0.15, vel: 0.35, midi: v, strum: U })
      return out
    },
  },
  {
    id: 'funk', name: 'Funk em semicolcheias', how: 'mão em semicolcheias o tempo todo; só algumas batidas soam, o resto é abafado',
    guitar: (ctx) => {
      const v = top(ctx.guitarVoicing, 3)
      const accents = ctx.variation === 'A' ? [0, 0.75, 1.5, 2.5, 3.25] : [0, 1, 1.75, 2.5, 3, 3.75]
      const out: PitchedNote[] = []
      for (let i = 0; i < 16; i++) {
        const beat = i / 4
        const hit = accents.includes(beat)
        // abafadas: bem baixinho e curtinhas (o "tchk" da mão abafando)
        if (hit || chance(0.55)) out.push({ beat, dur: hit ? 0.22 : 0.06, vel: hit ? 0.52 : 0.12, midi: v, strum: i % 2 ? U : D })
      }
      return out
    },
  },
  {
    id: 'shuffle', name: 'Shuffle', how: 'baixo-cima com o balanço tercinado do blues',
    guitar: ({ guitarVoicing: v }) =>
      [0, 1, 2, 3].flatMap((b) => [
        { beat: b, dur: SW * 0.95, vel: b % 2 ? 0.5 : 0.58, midi: v, strum: D },
        { beat: b + SW, dur: (1 - SW) * 0.9, vel: 0.36, midi: top(v, 4), strum: U },
      ]),
  },
  {
    id: 'bossa', name: 'Bossa nova', how: 'polegar no baixo (1 e 3) e os dedos sincopados nos agudos, em dois compassos',
    guitar: bossaGuitar,
  },
  {
    id: 'uma', name: 'Uma batida por compasso', how: 'uma batida no tempo 1 e deixa soar: ótimo para ouvir os acordes',
    guitar: ({ guitarVoicing: v }) => [{ beat: 0, dur: 3.9, vel: 0.62, midi: v, strum: D }],
  },
]

export const strumById = (id: string | null | undefined) => (id ? STRUMS.find((s) => s.id === id) ?? null : null)
