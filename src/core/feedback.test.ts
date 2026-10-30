import { describe, expect, it } from 'vitest'
import {
  addScore, addTally, chordMatches, EMPTY_SCORE, EMPTY_TALLY, fretOnString, judgeNote, judgeStep, nextBpm, placeNote, played,
  scoreDownbeat, stepScore, tallyInside,
} from './feedback'

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

describe('cada nota tocada', () => {
  // A7 no blues em Lá: alvo C# (1), acorde A C# E G, pentatônica menor A C D E G
  const ctx = { targetPc: 1, chordPcs: [9, 1, 4, 7], scalePcs: [9, 0, 2, 4, 7] }
  it('alvo, acorde, escala e fora', () => {
    expect(judgeNote(1, ctx)).toBe('alvo')
    expect(judgeNote(4, ctx)).toBe('acorde')
    expect(judgeNote(2, ctx)).toBe('escala')
    expect(judgeNote(5, ctx)).toBe('fora')
    expect(judgeNote(1, { ...ctx, targetPc: null })).toBe('acorde')
  })
  it('placar por nota: % dentro', () => {
    let t = EMPTY_TALLY
    for (const v of ['alvo', 'escala', 'escala', 'fora'] as const) t = addTally(t, v)
    expect(tallyInside(t)).toBe(75)
    expect(tallyInside(EMPTY_TALLY)).toBe(0)
  })
  it('acende dentro do box em foco', () => {
    // Lá 57: 6ª casa 17, 5ª casa 12, 4ª casa 7, 3ª casa 2; box 1 de Lá = casas 5–8
    expect(placeNote(57, { band: [5, 8] })).toEqual({ string: 3, fret: 7 })
    // C 60 no box 1: 3ª corda casa 5 (ou 4ª casa 10, fora)
    expect(placeNote(60, { band: [5, 8] })).toEqual({ string: 2, fret: 5 })
  })
  it('sem box, fica perto da nota anterior; sem nada, embaixo no braço', () => {
    expect(placeNote(57, { prev: { string: 4, fret: 12 } })).toEqual({ string: 4, fret: 12 })
    expect(placeNote(57)).toEqual({ string: 2, fret: 2 })
    expect(placeNote(20)).toBeNull()
  })
})

describe('exercício de escala conferido', () => {
  const at = 10
  it('certo, fora do tempo, outra oitava, errado e faltou', () => {
    expect(judgeStep([{ midi: 57, t: 10.03 }], 57, at, 0.5).verdict).toBe('certo')
    expect(judgeStep([{ midi: 57, t: 10.15 }], 57, at, 0.5)).toEqual({ verdict: 'tempo', offsetMs: 150 })
    expect(judgeStep([{ midi: 69, t: 10 }], 57, at, 0.5).verdict).toBe('oitava')
    expect(judgeStep([{ midi: 58, t: 10 }], 57, at, 0.5).verdict).toBe('errado')
    expect(judgeStep([{ midi: 57, t: 10.6 }], 57, at, 0.5).verdict).toBe('faltou')
  })
  it('a janela encolhe em notas rápidas e escolhe a nota mais perto do tempo', () => {
    // semicolcheia a 120 bpm: 0,125 s; 0,08 s de atraso já é fora do tempo
    expect(judgeStep([{ midi: 57, t: 10.06 }], 57, at, 0.125).verdict).toBe('tempo')
    expect(judgeStep([{ midi: 57, t: 9.8 }, { midi: 57, t: 10.01 }], 57, at, 0.5)).toEqual({ verdict: 'certo', offsetMs: 10 })
  })
  it('nota da volta e speed trainer', () => {
    expect(stepScore(['certo', 'certo', 'tempo', 'faltou'])).toBe(63)
    expect(nextBpm(80, 95)).toBe(85)
    expect(nextBpm(80, 80)).toBe(80)
    expect(nextBpm(80, 50)).toBe(75)
    expect(nextBpm(198, 100)).toBe(200)
  })
})
