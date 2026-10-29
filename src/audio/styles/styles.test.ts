import { describe, expect, it } from 'vitest'
import { PROGRESSIONS, realize } from '../../core/progressions'
import { guitarVoicing, voiceLead } from '../voicing'
import { ballad } from './ballad'
import { rock } from './rock'
import { shuffle } from './shuffle'
import { slow128 } from './slow128'
import type { BarContext, PitchedNote } from './types'

// extensões reais dos samples/instrumentos
const RANGE = { bass: [28, 55], piano: [33, 84], guitar: [40, 76] } as const

describe.each([shuffle, rock, slow128, ballad])('estilo $name', (style) => {
  it('gera eventos dentro do compasso e da extensão de cada instrumento', () => {
    for (const prog of PROGRESSIONS) {
      for (const key of ['E', 'A', 'G', 'C', 'F#']) {
        const chords = realize(prog, key)
        const n = chords.length
        const at = (i: number) => chords[((i % n) + n) % n]
        let prev: number[] | null = null
        for (let bar = 0; bar < n * 8; bar++) {
          const v = voiceLead(at(bar), prev)
          prev = v
          const ctx: BarContext = {
            index: bar, chord: at(bar), prev: at(bar - 1), next: at(bar + 1),
            variation: Math.floor(bar / 4) % 2 ? 'B' : 'A', isFill: bar % 4 === 3, isPhraseStart: bar % 4 === 0,
            pianoVoicing: v, guitarVoicing: guitarVoicing(at(bar)),
          }
          for (const h of style.drums(ctx)) {
            expect(h.beat).toBeGreaterThanOrEqual(0)
            expect(h.beat).toBeLessThan(4)
            expect(h.vel).toBeGreaterThan(0)
            expect(h.vel).toBeLessThanOrEqual(1)
          }
          for (const inst of ['bass', 'piano', 'guitar'] as const) {
            const notes: PitchedNote[] = style[inst](ctx)
            for (const note of notes) {
              expect(note.beat).toBeGreaterThanOrEqual(0)
              expect(note.beat).toBeLessThan(4)
              for (const m of note.midi) {
                expect(m).toBeGreaterThanOrEqual(RANGE[inst][0])
                expect(m).toBeLessThanOrEqual(RANGE[inst][1])
              }
            }
          }
        }
      }
    }
  })
})

describe('voice leading do piano', () => {
  it('nunca move mais que 7 semitons somados entre acordes vizinhos do blues', () => {
    const chords = realize(PROGRESSIONS[0], 'A')
    let prev = voiceLead(chords[0], null)
    for (const c of chords.slice(1)) {
      const v = voiceLead(c, prev)
      const move = v.reduce((s, x, i) => s + Math.abs(x - (prev[i] ?? prev[prev.length - 1])), 0)
      expect(move).toBeLessThanOrEqual(7)
      prev = v
    }
  })
})
