import { describe, expect, it } from 'vitest'
import { addScore, chordMatches, EMPTY_SCORE, fretOnString, played, scoreDownbeat } from './feedback'

describe('placar de notas-alvo', () => {
  // A7: alvo = 3ª (C#, pc 1); notas do acorde A C# E G
  const A7 = [9, 1, 4, 7]
  it('acertou o alvo no tempo 1 (um pouco antes também vale)', () => {
    expect(scoreDownbeat([{ midi: 61, t: 10.0 }], 10, 1, A7)).toBe('alvo')
    expect(scoreDownbeat([{ midi: 73, t: 9.9 }], 10, 1, A7)).toBe('alvo')
  })
  it('outra nota do acorde, nota de fora e silêncio', () => {
    expect(scoreDownbeat([{ midi: 64, t: 10.1 }], 10, 1, A7)).toBe('acorde')
    expect(scoreDownbeat([{ midi: 62, t: 10.1 }], 10, 1, A7)).toBe('fora')
    expect(scoreDownbeat([{ midi: 61, t: 11 }], 10, 1, A7)).toBe('silencio')
  })
  it('se tocou o alvo e outra nota perto, conta o alvo', () => {
    expect(scoreDownbeat([{ midi: 62, t: 9.95 }, { midi: 61, t: 10.05 }], 10, 1, A7)).toBe('alvo')
  })
  it('soma do placar; silêncio não conta como erro', () => {
    let s = EMPTY_SCORE
    for (const r of ['alvo', 'acorde', 'silencio', 'alvo', 'fora'] as const) s = addScore(s, r)
    expect(s).toEqual({ alvo: 2, acorde: 1, fora: 1, silencio: 1 })
    expect(played(s)).toBe(4)
  })
})

describe('quiz pelo áudio', () => {
  it('acorde ouvido igual ao pedido, com grafias diferentes', () => {
    expect(chordMatches('Bm7', 'Bm7')).toBe(true)
    expect(chordMatches('G7M', 'Gmaj7')).toBe(true)
    expect(chordMatches('A#m', 'Bbm')).toBe(true)
    expect(chordMatches('Bm', 'Bm7')).toBe(false)
    expect(chordMatches('E7', 'A7')).toBe(false)
  })
  it('nota na corda pedida', () => {
    // Lá (57) na 3ª corda (índice 2, Sol solto = 55) = casa 2
    expect(fretOnString(57, 2)).toBe(2)
    // Lá grave (45) não dá na 3ª corda
    expect(fretOnString(45, 2)).toBeNull()
    expect(fretOnString(64 + 13, 0)).toBeNull()
  })
})
