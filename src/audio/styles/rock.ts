import { midiInRange } from '../../core/theory'
import { chance, pick, rand } from '../humanize'
import type { BarContext, DrumHit, DrumPiece, PitchedNote, Style } from './types'

// Rock reto: colcheias sem swing.
const EIGHTHS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]

function groove(ctx: BarContext, untilBeat = 4): DrumHit[] {
  const out: DrumHit[] = []
  const b = ctx.variation === 'B'
  for (const pos of EIGHTHS) {
    if (pos >= untilBeat) break
    const onBeat = pos % 1 === 0
    out.push({ piece: b ? 'ride' : 'hhClosed', beat: pos, vel: onBeat ? 0.62 : 0.42 })
  }
  // bumbo no 1 e no 3; na B também no "e" do 3
  out.push({ piece: 'kick', beat: 0, vel: 0.9 })
  if (untilBeat > 2) out.push({ piece: 'kick', beat: 2, vel: 0.82 })
  if (untilBeat > 2.5 && (b || chance(0.3))) out.push({ piece: 'kick', beat: 2.5, vel: 0.7 })
  if (chance(0.2)) out.push({ piece: 'kick', beat: 1.5, vel: 0.55 })
  // caixa no 2 e no 4 com ghost ocasional
  out.push({ piece: 'snare', beat: 1, vel: 0.9 })
  if (untilBeat > 3) out.push({ piece: 'snare', beat: 3, vel: 0.92 })
  if (chance(0.25)) out.push({ piece: 'snare', beat: 1.75, vel: rand(0.1, 0.18) })
  if (untilBeat > 3.5 && chance(0.2)) out.push({ piece: 'snare', beat: 3.75, vel: rand(0.1, 0.18) })
  return out
}

type Slot = DrumPiece | null
// viradas em semicolcheias no tempo 4, ou colcheias nos tempos 3 e 4
const FILLS: { start: number; step: number; slots: Slot[] }[] = [
  { start: 3, step: 0.25, slots: ['snare', 'snare', 'snare', 'snare'] },
  { start: 3, step: 0.25, slots: ['snare', 'snare', 'tomMid', 'tomFloor'] },
  { start: 2, step: 0.5, slots: ['snare', 'snare', 'tomHi', 'tomFloor'] },
  { start: 2, step: 0.25, slots: ['snare', null, 'snare', 'snare', 'tomHi', 'tomHi', 'tomFloor', 'tomFloor'] },
]

function drums(ctx: BarContext): DrumHit[] {
  let hits: DrumHit[]
  if (ctx.isFill) {
    const f = pick(FILLS)
    hits = groove(ctx, f.start)
    f.slots.forEach((piece, i) => {
      if (piece) hits.push({ piece, beat: f.start + i * f.step, vel: 0.6 + (0.3 * i) / f.slots.length })
    })
  } else {
    hits = groove(ctx)
  }
  if (ctx.isPhraseStart) hits.push({ piece: 'crash', beat: 0, vel: 0.8 })
  return hits
}

// Baixo: colcheias na fundamental, quinta de passagem e aproximação na troca.
function bass(ctx: BarContext): PitchedNote[] {
  const r = midiInRange(ctx.chord.root, 28)
  const out: PitchedNote[] = EIGHTHS.map((pos) => ({
    beat: pos,
    dur: 0.42,
    vel: pos % 1 === 0 ? 0.85 : 0.68,
    midi: [r],
  }))
  if (ctx.variation === 'B') out[5] = { ...out[5], midi: [r + 7] }
  if (ctx.next.symbol !== ctx.chord.symbol) {
    // alvo na mesma região (E1..D#2) para nunca descer abaixo do Mi grave
    const target = midiInRange(ctx.next.root, 28)
    out[7] = { ...out[7], midi: [target > r ? target - 1 : target + 1] }
  }
  return out
}

// Piano: acordes longos (cama), empurrando o "e" do 2 na variação B.
function piano(ctx: BarContext): PitchedNote[] {
  const v = ctx.pianoVoicing
  if (ctx.variation === 'A' || ctx.isFill) {
    return [
      { beat: 0, dur: 1.9, vel: 0.48, midi: v },
      { beat: 2, dur: ctx.isFill ? 1 : 1.9, vel: 0.44, midi: v },
    ]
  }
  return [
    { beat: 0, dur: 1.4, vel: 0.5, midi: v },
    { beat: 1.5, dur: 0.4, vel: 0.42, midi: v },
    { beat: 2.5, dur: 1.4, vel: 0.46, midi: v },
  ]
}

// Violão: batida D D U U D U.
function guitar(ctx: BarContext): PitchedNote[] {
  const v = ctx.guitarVoicing
  const up = v.slice(2) // na volta da mão, só as cordas agudas
  return [
    { beat: 0, dur: 0.9, vel: 0.72, midi: v, strum: 'down' },
    { beat: 1, dur: 0.45, vel: 0.62, midi: v, strum: 'down' },
    { beat: 1.5, dur: 0.45, vel: 0.45, midi: up, strum: 'up' },
    { beat: 2.5, dur: 0.45, vel: 0.48, midi: up, strum: 'up' },
    { beat: 3, dur: 0.45, vel: 0.64, midi: v, strum: 'down' },
    { beat: 3.5, dur: 0.45, vel: 0.45, midi: up, strum: 'up' },
  ]
}

export const rock: Style = { id: 'rock', name: 'Rock reto', drums, bass, piano, guitar }
