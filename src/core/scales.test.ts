import { describe, expect, it } from 'vitest'
import { TUNING } from './fretboard-model'
import { keyLabel, keyShort, parseProgression, progressionFor, PROGRESSIONS, realize } from './progressions'
import { boxPositions, boxRange, SCALES } from './scales'

const pentMin = SCALES.find((s) => s.id === 'pentMin')!
const blues = SCALES.find((s) => s.id === 'blues')!
const A = 9

describe('desenhos (boxes)', () => {
  it('pentatônica menor de Lá: faixas clássicas dos 5 desenhos', () => {
    expect([1, 2, 3, 4, 5].map((b) => boxRange(pentMin, A, b))).toEqual([
      [5, 8],
      [7, 10],
      [9, 13],
      [0, 3],
      [2, 5],
    ])
  })

  it('box 1 de Lá menor tem A e C na 6ª e na 1ª corda (casas 5 e 8)', () => {
    const box = boxPositions(pentMin, A, 1)
    for (const s of [0, 5]) for (const f of [5, 8]) expect(box.has(`${s}:${f}`)).toBe(true)
  })

  it('escala blues acrescenta só a b5 ao desenho', () => {
    const extra = [...boxPositions(blues, A, 1)].filter((k) => !boxPositions(pentMin, A, 1).has(k))
    expect(extra.length).toBeGreaterThan(0)
    for (const k of extra) {
      const [s, f] = k.split(':').map(Number)
      expect((TUNING[s] + f) % 12).toBe((A + 6) % 12) // Eb
    }
  })

  it.each(SCALES.flatMap((sc) => [1, 2, 3, 4, 5].map((b) => [sc.id, b] as const)))('%s box %i cabe em até 6 casas em todos os tons', (id, b) => {
    const sc = SCALES.find((s) => s.id === id)!
    for (let key = 0; key < 12; key++) {
      const [lo, hi] = boxRange(sc, key, b)
      expect(lo).toBeGreaterThanOrEqual(0)
      expect(hi - lo).toBeLessThanOrEqual(6)
    }
  })
})

describe('progressões', () => {
  it('blues de 12 em Lá', () => {
    expect(realize(PROGRESSIONS[0], 'A').map((c) => c.symbol)).toEqual(['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'])
  })

  it('progressões menores em Lá menor', () => {
    const sym = (id: string) => realize(PROGRESSIONS.find((p) => p.id === id)!, 'A').map((c) => c.symbol)
    expect(sym('bluesMinor')).toEqual(['Am7', 'Am7', 'Am7', 'Am7', 'Dm7', 'Dm7', 'Am7', 'Am7', 'F7', 'E7', 'Am7', 'E7'])
    expect(sym('minorIivv')).toEqual(['Am', 'Dm', 'Em', 'Am'])
    expect(sym('minorPop')).toEqual(['Am', 'F', 'C', 'G'])
    expect(sym('andalusian')).toEqual(['Am', 'G', 'F', 'E7'])
    // todas as menores começam num acorde menor (a base soa menor)
    for (const p of PROGRESSIONS.filter((x) => x.minor)) expect(realize(p, 'E')[0].minor, p.id).toBe(true)
    for (const p of PROGRESSIONS.filter((x) => !x.minor)) expect(realize(p, 'E')[0].minor, p.id).toBe(false)
  })

  it('trocar o modo do tom troca a progressão pela equivalente', () => {
    expect(progressionFor('blues12', true).id).toBe('bluesMinor')
    expect(progressionFor('bluesMinor', false).id).toBe('blues12')
    expect(progressionFor('pop', true).id).toBe('minorPop')
    expect(progressionFor('rock', true).id).toBe('minorRock')
    // já está no modo pedido: fica a mesma
    expect(progressionFor('andalusian', true).id).toBe('andalusian')
    expect(progressionFor('blues12quick', false).id).toBe('blues12quick')
    // toda progressão tem par no outro modo
    for (const p of PROGRESSIONS) expect(!!progressionFor(p.id, !p.minor).minor, p.id).toBe(!p.minor)
  })

  it('nome do tom', () => {
    expect(keyLabel('A', true)).toBe('Am (Lá menor)')
    expect(keyLabel('F#', false)).toBe('F# (Fá# maior)')
    expect(keyShort('Bb', true)).toBe('Bbm')
  })

  it('progressão digitada: repetição, separadores e cifras inválidas', () => {
    const { chords, invalid } = parseProgression('Am*2 G | F, E7 X9z D/F#')
    expect(chords.map((c) => c.symbol)).toEqual(['Am', 'Am', 'G', 'F', 'E7', 'D/F#'])
    expect(invalid).toEqual(['X9z'])
  })
})
