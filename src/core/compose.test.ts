import { describe, expect, it } from 'vitest'
import { movesFor, romanIn, sectionStarts } from './compose'
import { parseChord } from './theory'

const G = { root: 7, minor: false }
const Am = { root: 9, minor: true }
const move = (key: typeof G, last: string | null, id: string) => movesFor(key, last ? parseChord(last) : null).find((m) => m.id === id)

describe('compor: opções por intenção', () => {
  it('em Sol maior, a tensão é o D7 e a conclusão forte é D7 → G', () => {
    expect(move(G, 'G', 'tensao')!.options[0].chords).toEqual(['D7'])
    expect(move(G, 'C', 'fim-forte')!.options[0]).toMatchObject({ chords: ['D7', 'G'], romans: 'V7 → I' })
  })

  it('em Lá menor: subir a energia é F → G; conclusão épica F → G → Am', () => {
    expect(move(Am, 'Am', 'energia')!.options[0].chords).toEqual(['F', 'G'])
    expect(move(Am, 'Dm', 'fim-epico')!.options[0].chords).toEqual(['F', 'G', 'Am'])
  })

  it('não repete o último acorde: já no IV, a conclusão sóbria é só o I', () => {
    expect(move(G, 'C', 'fim-sobrio')!.options[0].chords).toEqual(['G'])
    // já na tônica, "repousar" oferece o repouso suave (vi) primeiro
    expect(move(G, 'G', 'repousar')!.options[0].chords).toEqual(['Em'])
  })

  it('toda opção tem acordes válidos, graus e o porquê; nenhuma começa no acorde atual', () => {
    for (const key of [G, Am, { root: 0, minor: false }, { root: 4, minor: true }]) {
      for (const last of [null, 'C', 'Am', 'G', 'E7', 'F']) {
        const lastC = last ? parseChord(last) : null
        const moves = movesFor(key, lastC)
        expect(moves.length).toBeGreaterThanOrEqual(8)
        for (const m of moves) {
          expect(m.feel.length).toBeGreaterThan(5)
          for (const o of m.options) {
            expect(o.chords.length).toBeGreaterThan(0)
            for (const c of o.chords) expect(parseChord(c), c).not.toBeNull()
            expect(o.why.length).toBeGreaterThan(10)
            expect(o.romans.split(' → ')).toHaveLength(o.chords.length)
          }
        }
      }
    }
  })

  it('começos de seção: refrão em tom maior abre no IV; em menor, no bVI', () => {
    expect(sectionStarts(G, 'Refrão')[0].chords).toEqual(['C'])
    expect(sectionStarts(Am, 'Refrão')[0].chords).toEqual(['F'])
    expect(sectionStarts(G, 'Verso')[0].chords).toEqual(['G'])
  })

  it('graus da progressão', () => {
    expect(['G', 'D7', 'Em', 'C', 'Dsus4'].map((s) => romanIn(G, s))).toEqual(['I', 'V7', 'vi', 'IV', 'Vsus4'])
    expect(['Am', 'F', 'G', 'E7'].map((s) => romanIn(Am, s))).toEqual(['i', 'bVI', 'bVII', 'V7'])
  })
})
