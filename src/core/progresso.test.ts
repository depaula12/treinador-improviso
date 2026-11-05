import { describe, expect, it } from 'vitest'
import { blocksFor, fromKey } from './plano'
import { clock, dayCounts, dayMinutes, earTotals, journal, lastDays, plannedMinutes, series, streak, type DayLog } from './progresso'

const d = fromKey

describe('minutos do dia', () => {
  it('dia útil do sprint planeja 240 min', () => {
    expect(plannedMinutes(d('2026-11-10'))).toBe(240)
  })
  it('bloco só marcado conta o planejado; com timer conta o do timer', () => {
    const date = d('2026-11-10')
    const [a, b] = blocksFor(date)
    const day: DayLog = { blocks: { [a.id]: { done: true, min: 0 }, [b.id]: { done: false, min: 12 } } }
    expect(dayMinutes(date, day)).toBe(a.min + 12)
  })
  it('ids que não existem mais no plano são ignorados', () => {
    expect(dayMinutes(d('2026-11-10'), { blocks: { velho: { done: true, min: 99 } } })).toBe(0)
  })
})

describe('sequência', () => {
  const done = (k: string): DayLog => ({ blocks: Object.fromEntries(blocksFor(d(k)).map((b) => [b.id, { done: true, min: 0 }])) })
  it('conta dias seguidos e hoje em aberto não quebra', () => {
    const days = { '2026-11-10': done('2026-11-10'), '2026-11-11': done('2026-11-11') }
    expect(streak(days, d('2026-11-12'))).toBe(2)
    expect(streak({ ...days, '2026-11-12': done('2026-11-12') }, d('2026-11-12'))).toBe(3)
  })
  it('um dia vazio no meio zera', () => {
    expect(streak({ '2026-11-10': done('2026-11-10') }, d('2026-11-12'))).toBe(0)
  })
  it('30 min já valem o dia', () => {
    expect(dayCounts(d('2026-11-10'), { blocks: { tec: { done: false, min: 30 } } })).toBe(true)
    expect(dayCounts(d('2026-11-10'), { blocks: { tec: { done: false, min: 20 } } })).toBe(false)
  })
})

describe('séries e diário', () => {
  const days: Record<string, DayLog> = {
    '2026-11-11': { blocks: {}, bpm: 72, ear: { int: { c: 8, t: 10 } } },
    '2026-11-10': { blocks: {}, bpm: 68, rating: 4, travou: 'troca do box 1 para o 2', ear: { int: { c: 5, t: 10 }, grau: { c: 3, t: 4 } } },
  }
  it('bpm em ordem de data', () => {
    expect(series(days, 'bpm')).toEqual([{ key: '2026-11-10', v: 68 }, { key: '2026-11-11', v: 72 }])
  })
  it('ouvido soma por modo', () => {
    expect(earTotals(days)).toEqual({ int: { c: 13, t: 20 }, grau: { c: 3, t: 4 } })
    expect(earTotals(days, ['2026-11-11'])).toEqual({ int: { c: 8, t: 10 } })
  })
  it('diário só traz dias com registro', () => {
    expect(journal(days).map((j) => j.key)).toEqual(['2026-11-10'])
  })
  it('lastDays termina hoje', () => {
    const l = lastDays(days, d('2026-11-11'), 7)
    expect(l).toHaveLength(7)
    expect(l[6].key).toBe('2026-11-11')
  })
})

it('clock', () => {
  expect(clock(299)).toBe('4:59')
  expect(clock(3900)).toBe('1:05:00')
  expect(clock(-3)).toBe('0:00')
})
