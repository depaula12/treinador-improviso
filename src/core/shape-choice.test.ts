import { describe, expect, it } from 'vitest'
import { closeShapes, easyShape, handPos, shapeDistance, shapeMidi, shapeOptions } from './shape-choice'
import { parseChord } from './theory'

const pcsOf = (frets: (number | null)[]) => new Set(shapeMidi(frets).map((m) => m % 12))
const chordPcs = (sym: string) => {
  const c = parseChord(sym)!
  return new Set(c.semitones.map((s) => (c.root + s) % 12))
}
const totalMove = (seq: string[], pick: Record<string, (number | null)[]>) =>
  seq.reduce((t, s, i) => t + shapeDistance(pick[s], pick[seq[(i + 1) % seq.length]]), 0)

describe('desenhos de cada acorde', () => {
  it('o mais simples primeiro (a forma aberta), sem repetir desenho', () => {
    expect(easyShape('C')!.frets).toEqual([null, 3, 2, 0, 1, 0])
    for (const sym of ['C', 'F#m7', 'Bb7M(9)', 'E7(9)', 'Dm7(b5)', 'G/B', 'A13']) {
      const opts = shapeOptions(sym)
      expect(opts.length, sym).toBeGreaterThan(1)
      expect(new Set(opts.map((v) => v.frets.join())).size, sym).toBe(opts.length)
      // só notas do acorde (com a barra, o baixo pedido)
      for (const v of opts) for (const p of pcsOf(v.frets)) expect(chordPcs(sym).has(p) || parseChord(sym)!.bass === p, `${sym} ${v.frets}`).toBe(true)
    }
    expect(shapeOptions('xyz')).toEqual([])
  })

  it('notas MIDI do grave ao agudo e posição da mão', () => {
    expect(shapeMidi([null, 3, 2, 0, 1, 0])).toEqual([48, 52, 55, 60, 64])
    expect(handPos([null, 0, 2, 2, 2, 0])).toBe(2)
    expect(handPos([0, 0, 0, 0, 0, 0])).toBe(1)
  })
})

describe('aproximar os desenhos', () => {
  it('menos movimento que os desenhos mais simples e todos tocam o acorde certo', () => {
    for (const seq of [['F', 'Bb', 'C', 'F'], ['Dm7', 'G7', 'C7M', 'A7'], ['Bm7', 'E7', 'A7M(9)', 'F#7'], ['Am', 'F', 'C', 'G']]) {
      const pick = closeShapes(seq)
      const easy = Object.fromEntries(seq.map((s) => [s, easyShape(s)!.frets]))
      expect(totalMove(seq, pick), seq.join()).toBeLessThanOrEqual(totalMove(seq, easy) + 1e-9)
      for (const s of seq) expect(pick[s], s).toBeTruthy()
    }
  })

  it('ii–V–I em C fica numa região só do braço', () => {
    const pick = closeShapes(['Dm7', 'G7', 'C7M'])
    const pos = ['Dm7', 'G7', 'C7M'].map((s) => handPos(pick[s]))
    expect(Math.max(...pos) - Math.min(...pos)).toBeLessThanOrEqual(3)
  })

  it('não troca o aberto fácil por pestana sem ganho real', () => {
    const pick = closeShapes(['G', 'C', 'D', 'Em'])
    expect(pick.C).toEqual([null, 3, 2, 0, 1, 0])
    expect(pick.G).toEqual(easyShape('G')!.frets)
  })
})
