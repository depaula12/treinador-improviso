import { midiInRange, nearestMidi } from '../../core/theory'
import { chance, pick, rand } from '../humanize'
import type { BarContext, DrumHit, PitchedNote, Style } from './types'

// Slow blues 12/8: cada tempo (semínima pontuada) dividido em 3 colcheias.
const T = 1 / 3
const BEATS = [0, 1, 2, 3]
const TRIPLETS = BEATS.flatMap((b) => [b, b + T, b + 2 * T])

function groove(ctx: BarContext, untilBeat = 4): DrumHit[] {
  const out: DrumHit[] = []
  const b = ctx.variation === 'B'
  for (const pos of TRIPLETS) {
    if (pos >= untilBeat) break
    const first = pos % 1 === 0
    out.push({ piece: b ? 'ride' : 'hhClosed', beat: pos, vel: first ? 0.55 : 0.32 })
  }
  out.push({ piece: 'kick', beat: 0, vel: 0.85 })
  if (untilBeat > 2) out.push({ piece: 'kick', beat: 2, vel: 0.75 })
  // bumbo na última colcheia do tempo 2, puxando o 3
  if (untilBeat > 2 && (b || chance(0.4))) out.push({ piece: 'kick', beat: 1 + 2 * T, vel: 0.5 })
  out.push({ piece: 'snare', beat: 1, vel: 0.88 })
  if (untilBeat > 3) out.push({ piece: 'snare', beat: 3, vel: 0.9 })
  // ghosts na tercina antes do backbeat
  if (chance(0.35)) out.push({ piece: 'snare', beat: 2 * T, vel: rand(0.08, 0.16) })
  if (untilBeat > 3 && chance(0.35)) out.push({ piece: 'snare', beat: 2 + 2 * T, vel: rand(0.08, 0.16) })
  return out
}

const FILLS: DrumHit['piece'][][] = [
  ['snare', 'snare', 'snare'],
  ['snare', 'tomMid', 'tomFloor'],
  ['tomHi', 'tomMid', 'tomFloor'],
]

function drums(ctx: BarContext): DrumHit[] {
  let hits: DrumHit[]
  if (ctx.isFill) {
    hits = groove(ctx, 3)
    pick(FILLS).forEach((piece, i) => hits.push({ piece, beat: 3 + i * T, vel: 0.6 + 0.12 * i }))
    hits.push({ piece: 'kick', beat: 3, vel: 0.6 })
  } else {
    hits = groove(ctx)
  }
  if (ctx.isPhraseStart) hits.push({ piece: 'crash', beat: 0, vel: 0.7 })
  return hits
}

// Baixo: R–5–6–5 com a última tercina de cada tempo como passagem.
function bass(ctx: BarContext): PitchedNote[] {
  const r = midiInRange(ctx.chord.root, 28)
  const third = ctx.chord.minor ? 3 : 4
  const line = ctx.variation === 'A' ? [0, 7, 9, 7] : [0, third, 7, 9]
  const out: PitchedNote[] = []
  BEATS.forEach((beat, i) => {
    out.push({ beat, dur: 0.6, vel: 0.85, midi: [r + line[i]] })
    out.push({ beat: beat + 2 * T, dur: 0.3, vel: 0.55, midi: [r + line[i]] })
  })
  if (ctx.next.symbol !== ctx.chord.symbol) {
    const target = nearestMidi(ctx.next.root, r + line[3])
    out[7] = { beat: 3 + 2 * T, dur: 0.3, vel: 0.62, midi: [target - 1] }
  }
  return out
}

// Piano: o clássico das tercinas repetidas, acento no começo de cada tempo.
function piano(ctx: BarContext): PitchedNote[] {
  const v = ctx.pianoVoicing
  const last = ctx.isFill ? 3 : 4
  return TRIPLETS.filter((p) => p < last).map((p) => ({
    beat: p,
    dur: 0.3,
    vel: p % 1 === 0 ? 0.42 : 0.28,
    midi: v,
  }))
}

// Violão: acorde no 1 e no 3, deixando soar; abafa no 2 e 4 com a volta da mão.
function guitar(ctx: BarContext): PitchedNote[] {
  const v = ctx.guitarVoicing
  return [
    { beat: 0, dur: 1.8, vel: 0.62, midi: v, strum: 'down' },
    { beat: 1 + 2 * T, dur: 0.3, vel: 0.36, midi: v.slice(2), strum: 'up' },
    { beat: 2, dur: 1.8, vel: 0.58, midi: v, strum: 'down' },
  ]
}

export const slow128: Style = { id: 'slow128', name: 'Slow blues 12/8', drums, bass, piano, guitar }
