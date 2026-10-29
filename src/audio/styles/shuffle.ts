import { midiInRange, nearestMidi } from '../../core/theory'
import { chance, pick, rand } from '../humanize'
import type { BarContext, DrumHit, DrumPiece, PitchedNote, Style } from './types'

// Shuffle de blues: cada tempo dividido em 3 (tercina). A colcheia "do e" cai em 2/3 do tempo.
const T = 1 / 3
const SW = 2 / 3
const BEATS = [0, 1, 2, 3]

// ---------- Bateria ----------

function groove(ctx: BarContext, untilBeat = 4): DrumHit[] {
  const out: DrumHit[] = []
  const b = ctx.variation === 'B'
  const cymbal: DrumPiece = b ? 'ride' : 'hhClosed'

  for (const beat of BEATS) {
    if (beat >= untilBeat) break
    // condução: tempo (acento leve nos tempos 2 e 4) + colcheia swingada
    const backbeat = beat === 1 || beat === 3
    out.push({ piece: cymbal, beat, vel: backbeat ? 0.62 : 0.55 })
    const lastSwing = beat === 3 && b && chance(0.4)
    out.push({ piece: lastSwing ? 'hhOpen' : cymbal, beat: beat + SW, vel: lastSwing ? 0.5 : 0.36 })

    if (backbeat) {
      out.push({ piece: 'snare', beat, vel: 0.86 })
    } else {
      out.push({ piece: 'kick', beat, vel: beat === 0 ? 0.85 : 0.75 })
    }
    // ghost notes na caixa: no "e" antes do backbeat e, raramente, na tercina do meio
    if (chance(beat % 2 === 0 ? 0.4 : 0.22)) out.push({ piece: 'snare', beat: beat + SW, vel: rand(0.1, 0.2) })
    if (chance(0.1)) out.push({ piece: 'snare', beat: beat + T, vel: rand(0.08, 0.15) })
  }
  // bumbo antecipando o 3 ou o 1 seguinte
  if (b && untilBeat > 2 && chance(0.45)) out.push({ piece: 'kick', beat: 1 + SW, vel: 0.5 })
  if (untilBeat >= 4 && chance(b ? 0.4 : 0.15)) out.push({ piece: 'kick', beat: 3 + SW, vel: 0.5 })
  return out
}

type Slot = DrumPiece | null
// viradas nos tempos 3 e 4 (6 tercinas)
const FILLS: Slot[][] = [
  ['snare', 'snare', 'snare', 'tomHi', 'tomMid', 'tomFloor'],
  ['snare', null, 'snare', 'snare', 'snare', 'snare'],
  ['tomHi', null, 'tomHi', 'tomMid', null, 'tomFloor'],
  ['snare', null, 'snare', 'tomHi', 'tomMid', 'tomFloor'],
]
// virada curta: só o tempo 4
const SHORT_FILLS: Slot[][] = [
  ['snare', 'snare', 'snare'],
  ['tomHi', 'tomMid', 'tomFloor'],
  ['snare', 'tomMid', 'tomFloor'],
]

function fill(): DrumHit[] {
  const long = chance(0.6)
  const slots = long ? pick(FILLS) : pick(SHORT_FILLS)
  const start = long ? 2 : 3
  const out = groove({ variation: 'A' } as BarContext, start)
  slots.forEach((piece, i) => {
    if (!piece) return
    // crescendo ao longo da virada
    const vel = 0.55 + (0.35 * i) / slots.length
    out.push({ piece, beat: start + i * T, vel })
  })
  out.push({ piece: 'kick', beat: start, vel: 0.7 })
  return out
}

function drums(ctx: BarContext): DrumHit[] {
  const hits = ctx.isFill ? fill() : groove(ctx)
  if (ctx.isPhraseStart) hits.push({ piece: 'crash', beat: 0, vel: 0.75 })
  return hits
}

// ---------- Baixo ----------

// desenho de shuffle: R-3-5-6 subindo, b7-6-5-3 descendo
function walk(ctx: BarContext, up: boolean): number[] {
  if (ctx.chord.minor) return up ? [0, 3, 5, 7] : [10, 7, 5, 3]
  return up ? [0, 4, 7, 9] : [10, 9, 7, 4]
}

function bass(ctx: BarContext): PitchedNote[] {
  const root = midiInRange(ctx.chord.root, 28) // E1..D#2
  // primeiro compasso do acorde sobe; segundo compasso do mesmo acorde desce
  const up = ctx.prev.symbol !== ctx.chord.symbol || ctx.index % 2 === 0
  const degrees = walk(ctx, up)
  const out: PitchedNote[] = []
  BEATS.forEach((beat, i) => {
    const n = root + degrees[i]
    out.push({ beat, dur: 0.6, vel: 0.85, midi: [n] })
    out.push({ beat: beat + SW, dur: 0.28, vel: 0.6, midi: [n] })
  })
  // troca de acorde: aproximação cromática por baixo na última colcheia
  if (ctx.next.symbol !== ctx.chord.symbol) {
    const target = nearestMidi(ctx.next.root, root + degrees[3])
    out[out.length - 1] = { beat: 3 + SW, dur: 0.28, vel: 0.68, midi: [target - 1] }
  }
  return out
}

// ---------- Piano ----------

function piano(ctx: BarContext): PitchedNote[] {
  const v = ctx.pianoVoicing
  if (ctx.isFill) {
    return [{ beat: 0, dur: 1.8, vel: 0.5, midi: v }]
  }
  if (ctx.variation === 'A') {
    return [
      { beat: SW, dur: 0.22, vel: 0.36, midi: v },
      { beat: 1, dur: 0.4, vel: 0.5, midi: v },
      { beat: 2 + SW, dur: 0.22, vel: 0.36, midi: v },
      { beat: 3, dur: 0.4, vel: 0.52, midi: v },
    ]
  }
  return [
    { beat: 0, dur: 1.3, vel: 0.5, midi: v },
    { beat: 2 + SW, dur: 0.25, vel: 0.4, midi: v },
    { beat: 3 + SW, dur: 0.25, vel: 0.44, midi: v },
  ]
}

// ---------- Violão ----------

// Boogie de duas cordas: fundamental + 5ª alternando com 6ª (b7 na variação B).
function guitar(ctx: BarContext): PitchedNote[] {
  const root = midiInRange(ctx.chord.root, 40) // E2..D#3
  const top = ctx.variation === 'B' ? [7, 9, 10, 9] : [7, 9, 7, 9]
  const out: PitchedNote[] = []
  BEATS.forEach((beat, i) => {
    const pair = [root, root + top[i]]
    out.push({ beat, dur: 0.55, vel: 0.7, midi: pair, strum: 'down' })
    out.push({ beat: beat + SW, dur: 0.28, vel: 0.5, midi: pair, strum: 'down' })
  })
  return out
}

export const shuffle: Style = {
  id: 'shuffle',
  name: 'Shuffle de blues',
  drums,
  bass,
  piano,
  guitar,
}
