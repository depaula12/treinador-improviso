import { midiInRange, nearestMidi } from '../../core/theory'
import { chance, rand } from '../humanize'
import type { BarContext, DrumHit, PitchedNote, Style } from './types'

// Bossa nova: colcheias retas e leves, bumbo "1 . . e 3 . . e" (o surdo do samba bem baixinho),
// aro da caixa no desenho da clave em dois compassos e a batida do violão de João Gilberto
// (polegar no baixo nos tempos 1 e 3, dedos sincopados nos agudos).

/** clave de bossa (3-2), em tempos: compasso par e compasso ímpar */
const CLAVE = [[0, 1.5, 3], [1, 2.5]]
/** dedos do violão: o desenho que se repete a cada dois compassos */
const FINGERS = [[0, 1, 1.5, 2.5, 3], [0.5, 1.5, 2, 3]]

const odd = (ctx: BarContext) => Math.abs(ctx.index) % 2

function drums(ctx: BarContext): DrumHit[] {
  const out: DrumHit[] = []
  // chimbal em colcheias, quase sussurrado (no lugar da vassourinha)
  for (let i = 0; i < 8; i++) out.push({ piece: ctx.variation === 'B' ? 'ride' : 'hhClosed', beat: i / 2, vel: i % 2 ? 0.16 : 0.24 })
  // bumbo: 1, e do 2, 3, e do 4
  for (const [beat, vel] of [[0, 0.5], [1.5, 0.3], [2, 0.42], [3.5, 0.3]]) out.push({ piece: 'kick', beat, vel })
  // aro: a caixa bem leve faz o papel do rimshot
  const clave = ctx.isFill ? CLAVE[odd(ctx)].filter((b) => b < 3) : CLAVE[odd(ctx)]
  for (const beat of clave) out.push({ piece: 'snare', beat, vel: rand(0.2, 0.26) })
  if (ctx.isFill) {
    out.push({ piece: 'snare', beat: 3, vel: 0.22 }, { piece: 'snare', beat: 3.5, vel: 0.28 }, { piece: 'tomFloor', beat: 3.75, vel: 0.3 })
  } else if (chance(0.25)) {
    out.push({ piece: 'snare', beat: 3.75, vel: rand(0.08, 0.12) })
  }
  if (ctx.isPhraseStart && ctx.index > 0) out.push({ piece: 'ride', beat: 0, vel: 0.35 })
  return out
}

// Baixo: fundamental e quinta em mínimas pontuadas, antecipando o próximo acorde no "e" do 4.
function bass(ctx: BarContext): PitchedNote[] {
  const r = midiInRange(ctx.chord.root, 31)
  const fifth = ctx.chord.semitones.includes(6) && !ctx.chord.semitones.includes(7) ? r + 6 : r + 7
  const out: PitchedNote[] = [
    { beat: 0, dur: 1.45, vel: 0.72, midi: [r] },
    { beat: 1.5, dur: 0.45, vel: 0.5, midi: [fifth - 12 >= 28 ? fifth - 12 : r] },
    { beat: 2, dur: 1.4, vel: 0.66, midi: [fifth] },
  ]
  if (ctx.next.root !== ctx.chord.root) {
    const n = nearestMidi(ctx.next.root, r)
    out.push({ beat: 3.5, dur: 0.5, vel: 0.6, midi: [n < 28 ? n + 12 : n] })
  }
  else out.push({ beat: 3.5, dur: 0.45, vel: 0.45, midi: [r] })
  return out
}

// Piano: acordes curtos e esparsos, antecipando o tempo 3.
function piano(ctx: BarContext): PitchedNote[] {
  const v = ctx.pianoVoicing
  if (ctx.variation === 'B') {
    return [
      { beat: 0.5, dur: 0.4, vel: 0.3, midi: v },
      { beat: 1.5, dur: 0.9, vel: 0.33, midi: v },
      { beat: 3, dur: 0.8, vel: 0.3, midi: v },
    ]
  }
  return [
    { beat: 0, dur: 1.4, vel: 0.34, midi: v },
    { beat: 2.5, dur: 1.2, vel: 0.3, midi: v },
  ]
}

/** A batida de bossa: polegar no baixo (1 e 3) e os dedos sincopados nas 3–4 cordas de cima. */
export function bossaGuitar(ctx: BarContext): PitchedNote[] {
  const v = ctx.guitarVoicing
  if (!v.length) return []
  const top = v.length > 4 ? v.slice(-4) : v.slice(1)
  const low = v[0]
  // o polegar alterna a fundamental com a nota da 5ª corda (ou a mesma, se o desenho não tiver)
  const alt = v.find((m) => m > low && m - low <= 7 && (m - low) % 12 === 7) ?? low
  const out: PitchedNote[] = [
    { beat: 0, dur: 1.6, vel: 0.5, midi: [low] },
    { beat: 2, dur: 1.6, vel: 0.46, midi: [alt] },
  ]
  for (const beat of FINGERS[odd(ctx)]) out.push({ beat, dur: 0.42, vel: beat % 1 ? 0.4 : 0.44, midi: top })
  return out
}

export const bossa: Style = { id: 'bossa', name: 'Bossa nova', drums, bass, piano, guitar: bossaGuitar }
