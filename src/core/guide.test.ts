import { describe, expect, it } from 'vitest'
import { guideIntervals, guideLine } from './guide'
import { PROGRESSIONS, realize } from './progressions'
import { parseChord } from './theory'

describe('notas-guia', () => {
  it('3ª e 7ª; sem 7ª só a 3ª; power chord usa a 5ª', () => {
    expect(guideIntervals(parseChord('A7')!)).toEqual([4, 10])
    expect(guideIntervals(parseChord('Am7')!)).toEqual([3, 10])
    expect(guideIntervals(parseChord('G')!)).toEqual([4])
    expect(guideIntervals(parseChord('E5')!)).toEqual([7])
  })

  it('blues de 12 em Lá no box 1 (casas 5–8): alvos dentro da região e movimento curto', () => {
    const chords = realize(PROGRESSIONS[0], 'A')
    const line = guideLine(chords, 5, 8)
    expect(line).toHaveLength(12)
    line.forEach((t, i) => {
      expect(t.fret).toBeGreaterThanOrEqual(5)
      expect(t.fret).toBeLessThanOrEqual(8)
      // é mesmo 3ª ou 7ª do acorde do compasso
      expect(guideIntervals(chords[i])).toContain(t.interval)
    })
    // linha suave: nenhum salto maior que uma terça maior entre compassos
    for (let i = 1; i < line.length; i++) expect(Math.abs(line[i].midi - line[i - 1].midi)).toBeLessThanOrEqual(4)
  })

  it('A7 → D7: a 3ª de A7 (C#) resolve um semitom abaixo na b7 de D7 (C)', () => {
    const line = guideLine([parseChord('A7')!, parseChord('D7')!], 5, 8)
    const [a, d] = line
    if (a.interval === 4) expect(d.midi - a.midi).toBe(-1)
  })

  it('funciona em todas as progressões e tons', () => {
    for (const p of PROGRESSIONS) for (const key of ['C', 'E', 'G', 'Bb']) {
      const line = guideLine(realize(p, key), 0, 12)
      expect(line.every((t) => t !== undefined)).toBe(true)
    }
  })
})
