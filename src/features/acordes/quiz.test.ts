import { describe, expect, it } from 'vitest'
import { QUALITIES } from '../../core/voicings'
import { drawWeighted, grade } from './leitner'
import { buildCards, makeQuestion, songCards } from './quiz-model'

describe('songCards', () => {
  it('só os acordes da música, com a fundamental fixa', () => {
    const { cards, skipped } = songCards('cifra-desenho', ['Bm', 'G', 'D/F#', 'Em', 'E13'], ['6', 'aberto'])
    expect(skipped).toEqual(['E13'])
    expect(cards.every((c) => c.root !== null)).toBe(true)
    // D/F# conta como D; G e Em têm forma aberta
    expect(cards.map((c) => c.key)).toEqual(expect.arrayContaining(['cifra-desenho:maj|aberto|7', 'cifra-desenho:m|aberto|4', 'cifra-desenho:maj|6|2', 'cifra-desenho:m|6|11']))
    for (const c of cards) {
      const q = makeQuestion('cifra-desenho', c)
      expect(q.root).toBe(c.root)
      expect(q.options).toHaveLength(4)
    }
  })
  it('cifra → notas: um cartão por acorde', () => {
    expect(songCards('cifra-notas', ['A7', 'D7', 'A7', 'E7'], []).cards).toHaveLength(3)
  })
})
import type { QuizMode } from './store'

const all = QUALITIES.map((q) => q.id)

describe.each(['cifra-desenho', 'desenho-cifra', 'cifra-notas'] as QuizMode[])('quiz %s', (mode) => {
  it('sempre tem 4 opções distintas e a resposta marcada está certa', () => {
    const cards = buildCards(mode, all, ['6', '5', 'aberto'])
    for (let i = 0; i < 500; i++) {
      const q = makeQuestion(mode, cards[i % cards.length])
      expect(q.options).toHaveLength(4)
      const keys = q.options.map((o) => (o.voicing ? o.voicing.frets.join() : o.label))
      expect(new Set(keys).size).toBe(4)
      const ans = q.options[q.answer]
      if (mode === 'cifra-desenho') expect(ans.voicing!.frets).toEqual(q.voicing!.frets)
      if (mode === 'desenho-cifra') expect(ans.label).toBe(q.symbol)
      if (mode === 'cifra-notas') expect(ans.label).toBe(q.notes.join(' '))
    }
  })
})

describe('Leitner', () => {
  it('errar volta para a caixa 1; acertar rápido sobe', () => {
    expect(grade({ box: 4, seen: 3, right: 3 }, 'errei').box).toBe(1)
    expect(grade({ box: 2, seen: 1, right: 1 }, 'rapido').box).toBe(3)
    expect(grade(undefined, 'rapido').box).toBe(3)
  })

  it('itens da caixa 1 saem bem mais que os da caixa 5', () => {
    const stats = { a: { box: 1, seen: 1, right: 0 }, b: { box: 5, seen: 9, right: 9 } }
    let a = 0
    for (let i = 0; i < 5000; i++) if (drawWeighted([{ k: 'a' }, { k: 'b' }], (x) => x.k, stats).k === 'a') a++
    expect(a / 5000).toBeGreaterThan(0.85)
  })
})
