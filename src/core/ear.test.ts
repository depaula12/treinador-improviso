import { describe, expect, it } from 'vitest'
import { DEGREES, INTERVALS, makeQuestion, QUALITIES, ROMANS, toggleItem } from './ear'

/** sorteio previsível: devolve os valores em sequência */
const seq = (...xs: number[]) => {
  let i = 0
  return () => xs[i++ % xs.length]
}

describe('perguntas de ouvido', () => {
  it('intervalo subindo: duas notas, a segunda depois e acima', () => {
    const q = makeQuestion({ m: 'int', set: ['3M', '5J'], dir: 'asc' }, seq(0.9, 0))
    expect(q.answer).toBe('5J')
    const [a, b] = q.events
    expect(b.midi - a.midi).toBe(INTERVALS['5J'])
    expect(b.t).toBeGreaterThan(a.t)
  })
  it('intervalo descendo começa pela nota de cima', () => {
    const q = makeQuestion({ m: 'int', set: ['3m'], dir: 'desc' }, seq(0, 0.5))
    expect(q.events[0].midi - q.events[1].midi).toBe(3)
  })
  it('intervalo harmônico: as duas juntas', () => {
    const q = makeQuestion({ m: 'int', set: ['6M'], dir: 'harm' }, seq(0, 0.2))
    expect(q.events[0].t).toBe(q.events[1].t)
  })
  it('acorde: arpejo e depois junto, com as notas da qualidade', () => {
    const q = makeQuestion({ m: 'acorde', set: ['m7'] }, seq(0, 0))
    const ivs = QUALITIES.m7
    expect(q.events).toHaveLength(ivs.length * 2)
    const root = q.events[0].midi
    expect(q.events.slice(0, ivs.length).map((e) => e.midi - root)).toEqual(ivs)
  })
  it('grau: cadência no tom e a nota no grau certo, uma oitava acima', () => {
    const q = makeQuestion({ m: 'grau', set: ['b7'] }, seq(0, 0))
    const key = 52
    const last = q.events.at(-1)!
    expect(last.midi).toBe(key + 12 + DEGREES.b7)
    // a cadência começa no I: fundamental embaixo + tríade
    expect(q.events.filter((e) => e.t === 0).map((e) => e.midi).sort()).toEqual([key - 12, key, key + 4, key + 7].sort())
  })
  it('campo: o acorde final é o grau sorteado', () => {
    const q = makeQuestion({ m: 'campo', set: ['vi'] }, seq(0, 0))
    const lastT = q.events.at(-1)!.t
    const fin = q.events.filter((e) => e.t === lastT).map((e) => e.midi - 52).sort((a, b) => a - b)
    expect(fin).toEqual([ROMANS.vi[0] - 12, ...ROMANS.vi])
  })
  it('alturas na região do violão', () => {
    for (let i = 0; i < 50; i++) {
      for (const m of ['int', 'acorde', 'grau', 'campo'] as const) {
        const set = m === 'int' ? ['8J'] : m === 'acorde' ? ['9'] : m === 'grau' ? ['7'] : ['vii°']
        for (const e of makeQuestion({ m, set }).events) {
          expect(e.midi).toBeGreaterThanOrEqual(40)
          expect(e.midi).toBeLessThanOrEqual(88)
        }
      }
    }
  })
})

describe('conjunto de respostas', () => {
  it('liga na ordem do modo e não deixa menos de 2', () => {
    expect(toggleItem('int', ['5J', '3M'], '2M')).toEqual(['2M', '3M', '5J'])
    expect(toggleItem('int', ['3M', '5J'], '5J')).toEqual(['3M', '5J'])
    expect(toggleItem('int', ['3M', '5J', '8J'], '5J')).toEqual(['3M', '8J'])
  })
})
