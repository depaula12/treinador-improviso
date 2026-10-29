import { midiInRange, nearestMidi } from '../../core/theory'
import { chance, pick, rand } from '../humanize'
import type { BarContext, DrumHit, PitchedNote, Style } from './types'

// Pop rock / balada: colcheias retas, dinâmica mais baixa.
const EIGHTHS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]

function groove(ctx: BarContext, untilBeat = 4): DrumHit[] {
  const out: DrumHit[] = []
  const b = ctx.variation === 'B'
  for (const pos of EIGHTHS) {
    if (pos >= untilBeat) break
    out.push({ piece: b ? 'ride' : 'hhClosed', beat: pos, vel: pos % 1 === 0 ? 0.48 : 0.3 })
  }
  // bumbo 1, "e" do 2 e 3 (balada pop clássica)
  out.push({ piece: 'kick', beat: 0, vel: 0.78 })
  if (untilBeat > 2.5) out.push({ piece: 'kick', beat: 2.5, vel: 0.62 })
  if (b && untilBeat > 3) out.push({ piece: 'kick', beat: 3.5, vel: 0.45 })
  out.push({ piece: 'snare', beat: 1, vel: 0.72 })
  if (untilBeat > 3) out.push({ piece: 'snare', beat: 3, vel: 0.75 })
  if (chance(0.2)) out.push({ piece: 'snare', beat: 2.75, vel: rand(0.08, 0.14) })
  return out
}

function drums(ctx: BarContext): DrumHit[] {
  let hits: DrumHit[]
  if (ctx.isFill) {
    hits = groove(ctx, 3)
    const toms = pick([
      ['tomHi', 'tomMid', 'tomFloor', 'tomFloor'],
      ['snare', 'snare', 'tomMid', 'tomFloor'],
    ] as const)
    toms.forEach((piece, i) => hits.push({ piece, beat: 3 + i * 0.25, vel: 0.5 + 0.1 * i }))
  } else {
    hits = groove(ctx)
  }
  if (ctx.isPhraseStart) hits.push({ piece: 'crash', beat: 0, vel: 0.6 })
  return hits
}

// Baixo: fundamental–quinta.
function bass(ctx: BarContext): PitchedNote[] {
  const r = midiInRange(ctx.chord.root, 28)
  const out: PitchedNote[] = [
    { beat: 0, dur: 1.4, vel: 0.82, midi: [r] },
    { beat: 1.5, dur: 0.45, vel: 0.6, midi: [r] },
    { beat: 2, dur: 1.4, vel: 0.75, midi: [r + 7] },
  ]
  if (ctx.next.symbol !== ctx.chord.symbol) {
    const target = nearestMidi(ctx.next.root, r + 7)
    // passagem diatônica aproximada: um tom abaixo do alvo
    out.push({ beat: 3.5, dur: 0.45, vel: 0.6, midi: [target - 2] })
  } else {
    out.push({ beat: 3.5, dur: 0.45, vel: 0.55, midi: [r + 7] })
  }
  return out
}

// Piano: acorde no 1 e arpejo em colcheias na variação B.
function piano(ctx: BarContext): PitchedNote[] {
  const v = ctx.pianoVoicing
  if (ctx.variation === 'A' || ctx.isFill) {
    return [
      { beat: 0, dur: 1.9, vel: 0.45, midi: v },
      { beat: 2, dur: 1.9, vel: 0.4, midi: v },
    ]
  }
  const arp = [v[0], v[1], v[2], v[v.length - 1], v[2], v[1], v[0], v[1]]
  return [
    { beat: 0, dur: 1.5, vel: 0.38, midi: [v[0] - 12] },
    ...arp.map((m, i) => ({ beat: i * 0.5, dur: 0.6, vel: i % 2 === 0 ? 0.4 : 0.32, midi: [m] })),
  ]
}

// Violão: D . D U . U D U
function guitar(ctx: BarContext): PitchedNote[] {
  const v = ctx.guitarVoicing
  const up = v.slice(2)
  return [
    { beat: 0, dur: 0.9, vel: 0.6, midi: v, strum: 'down' },
    { beat: 1, dur: 0.45, vel: 0.52, midi: v, strum: 'down' },
    { beat: 1.5, dur: 0.6, vel: 0.4, midi: up, strum: 'up' },
    { beat: 2.5, dur: 0.45, vel: 0.42, midi: up, strum: 'up' },
    { beat: 3, dur: 0.45, vel: 0.52, midi: v, strum: 'down' },
    { beat: 3.5, dur: 0.45, vel: 0.4, midi: up, strum: 'up' },
  ]
}

export const ballad: Style = { id: 'ballad', name: 'Pop rock / balada', drums, bass, piano, guitar }
