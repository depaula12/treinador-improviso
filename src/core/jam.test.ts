import { describe, expect, it } from 'vitest'
import { estimateKey, tonicHints, weightsFromChords } from './key'
import { suggestNext } from './next-chords'
import { parseChord } from './theory'

const hist = (...syms: string[]) => syms.map((symbol) => ({ symbol, ms: 2000 }))

describe('tom a partir dos acordes', () => {
  it.each([
    ['blues em Lá (A7 D7 E7)', hist('A7', 'A7', 'D7', 'A7', 'E7', 'D7', 'A7'), 'A maior'],
    ['pop em Sol (G D Em C)', hist('G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'), 'G maior'],
    ['rock menor em Mi (Em D C D)', hist('Em', 'D', 'C', 'D', 'Em', 'D', 'C', 'D'), 'E menor'],
    ['Dó maior (C F G C)', hist('C', 'F', 'G', 'C', 'F', 'G', 'C'), 'C maior'],
    ['Dó maior começando no IV (F G C C)', hist('F', 'G', 'C', 'C', 'F', 'G', 'C', 'C'), 'C maior'],
    ['Lá menor começando no bVI (F G Am Am)', hist('F', 'G', 'Am', 'Am', 'F', 'G', 'Am', 'Am'), 'A menor'],
  ])('%s', (_, h, expected) => {
    expect(estimateKey(weightsFromChords(h), tonicHints(h))[0].name).toBe(expected)
  })

  it('sem as dicas de tônica, Em–D–C–D empata para Ré maior (motivo das dicas existirem)', () => {
    const h = hist('Em', 'D', 'C', 'D', 'Em', 'D', 'C', 'D')
    expect(estimateKey(weightsFromChords(h))[0].name).toBe('D maior')
  })
})

describe('próximo acorde', () => {
  const key = (name: string) => {
    const h = hist(...name.split(' '))
    return estimateKey(weightsFromChords(h), tonicHints(h))[0]
  }
  const A = key('A7 A7 D7 A7 E7 D7 A7')
  const G = key('G D Em C G D Em C')
  const Em = key('Em D C D Em D C D')

  it('blues: A7 → D7 primeiro; E7 → D7 ou A7', () => {
    expect(suggestNext(parseChord('A7')!, A).map((s) => s.symbol)).toEqual(['D7', 'E7'])
    expect(suggestNext(parseChord('E7')!, A).map((s) => s.symbol).sort()).toEqual(['A7', 'D7'])
  })

  it('pop em Sol: G → C, D, Em', () => {
    expect(suggestNext(parseChord('G')!, G).map((s) => s.symbol)).toEqual(['C', 'D', 'Em'])
    expect(suggestNext(parseChord('D')!, G)[0]).toMatchObject({ symbol: 'G', roman: 'I' })
  })

  it('menor em Mi: Em → D, C; B7 → Em', () => {
    expect(suggestNext(parseChord('Em')!, Em).slice(0, 2).map((s) => s.symbol)).toEqual(['D', 'C'])
    expect(suggestNext(parseChord('B7')!, Em)[0].symbol).toBe('Em')
  })

  it('acorde fora da tabela volta para a tônica', () => {
    expect(suggestNext(parseChord('F#')!, G)[0].symbol).toBe('G')
  })
})
