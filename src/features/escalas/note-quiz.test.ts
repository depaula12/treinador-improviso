import { describe, expect, it } from 'vitest'
import { fretsOf, noteCards, pcAt } from './note-quiz'

describe('onde está a nota', () => {
  it('Lá na 3ª corda (Sol) fica na casa 2 e na 14 fora do limite', () => {
    expect(fretsOf(2, 9)).toEqual([2])
    expect(fretsOf(2, 9, 15)).toEqual([2, 14])
  })

  it('Mi nas cordas Mi aparece na solta e na 12', () => {
    expect(fretsOf(0, 4)).toEqual([0, 12])
    expect(fretsOf(5, 4)).toEqual([0, 12])
  })

  it('toda casa devolvida tem mesmo a nota pedida', () => {
    for (let s = 0; s < 6; s++) for (let pc = 0; pc < 12; pc++) {
      const fs = fretsOf(s, pc)
      expect(fs.length).toBeGreaterThan(0)
      for (const f of fs) expect(pcAt(s, f)).toBe(pc)
    }
  })

  it('cartões: 6 cordas × notas da escala', () => {
    expect(noteCards([9, 0, 2, 4, 7])).toHaveLength(30)
  })
})
