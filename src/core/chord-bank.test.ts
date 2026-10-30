import { describe, expect, it } from 'vitest'
import { allShapes, placeShape, rootsOf, shapesFor, voicingMidi } from './chord-bank'
import { TUNING } from './fretboard-model'
import { QUALITIES, qualityById } from './voicings'

const LOW = [...TUNING].reverse()

describe('banco de desenhos', () => {
  it('muitos desenhos por tipo: tríades e formas móveis além das do banco', () => {
    expect(shapesFor('maj').length).toBeGreaterThanOrEqual(12)
    expect(shapesFor('m').length).toBeGreaterThanOrEqual(12)
    expect(shapesFor('7').length).toBeGreaterThanOrEqual(6)
    expect(shapesFor('maj').filter((c) => c.kind === 'triade')).toHaveLength(9)
    for (const q of QUALITIES) expect(shapesFor(q.id).length, q.id).toBeGreaterThanOrEqual(2)
  })

  it('todo desenho, em todas as fundamentais em que cabe, forma o acorde certo', () => {
    for (const card of allShapes()) {
      const q = qualityById(card.quality)
      const pcs = new Set(q.pcs)
      for (const root of rootsOf(card)) {
        const v = placeShape(card, root)!
        const played = v.frets.flatMap((f, i) => (f === null ? [] : [(LOW[i] + f - root + 1200) % 12]))
        for (const p of played) expect(pcs.has(p), `${card.id} em ${root}: nota ${p}`).toBe(true)
        // nenhuma nota obrigatória falta (5ª pode faltar em tétrades, como na guitarra de verdade)
        for (const need of q.pcs.filter((x) => !(x === 7 && q.pcs.length >= 4))) {
          expect(played.includes(need), `${card.id} em ${root}: falta ${need}`).toBe(true)
        }
        for (const f of v.frets) if (f !== null) expect(f).toBeGreaterThanOrEqual(0)
        for (const f of v.frets) if (f !== null) expect(f).toBeLessThanOrEqual(15)
        expect(voicingMidi(v).length).toBe(v.frets.filter((f) => f !== null).length)
      }
    }
  })

  it('desenhos móveis cabem em quase todas as fundamentais; os abertos só na deles', () => {
    for (const card of allShapes()) {
      if (card.fixedRoot !== null) expect(rootsOf(card)).toEqual([card.fixedRoot])
      else expect(rootsOf(card).length, card.id).toBeGreaterThanOrEqual(10)
    }
  })

  it('tríade invertida: a nota mais grave é a 3ª ou a 5ª', () => {
    const inv1 = shapesFor('maj').find((c) => c.kind === 'triade' && c.bassInterval === 4)!
    const v = placeShape(inv1, 0)! // Dó maior com Mi no baixo
    const low = v.frets.findIndex((f) => f !== null)
    expect((LOW[low] + v.frets[low]!) % 12).toBe(4)
  })

  it('níveis em ordem: abertas simples no 1, extensões no 4; ids únicos', () => {
    expect(shapesFor('maj')[0].level).toBe(1)
    expect(shapesFor('m7b5').every((c) => c.level === 4)).toBe(true)
    const ids = allShapes().map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
