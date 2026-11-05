import { describe, expect, it } from 'vitest'
import { RESTRICTIONS } from '../features/improviso/restrictions'
import { EXERCISES } from './exercises'
import { ALL_OF } from './ear'
import { blocksFor, daysBetween, dateKey, fromKey, PHASES, sprintOf, SPRINTS, sprintStart, START } from './plano'
import { PROGRESSIONS, parseProgression } from './progressions'
import { AUTO_SCALE, SCALES } from './scales'
import { KEYS } from './theory'

const STYLE_IDS = ['shuffle', 'rock', 'slow128', 'ballad', 'bossa']
const d = (k: string) => fromKey(k)

describe('datas do plano', () => {
  it('semana zero antes de 9 nov 2026', () => {
    expect(sprintOf(d('2026-11-05'))).toEqual({ n: 0, day: 0 })
    expect(sprintOf(d('2026-11-08'))).toEqual({ n: 0, day: 0 })
  })
  it('sprint 1 começa na segunda 9 nov e dura 14 dias', () => {
    expect(START.getDay()).toBe(1)
    expect(sprintOf(d('2026-11-09'))).toEqual({ n: 1, day: 1 })
    expect(sprintOf(d('2026-11-22'))).toEqual({ n: 1, day: 14 })
    expect(sprintOf(d('2026-11-23'))).toEqual({ n: 2, day: 1 })
  })
  it('atravessa o horário de verão e a virada do ano sem errar o dia', () => {
    expect(daysBetween(d('2026-12-31'), d('2027-01-01'))).toBe(1)
    expect(sprintOf(sprintStart(7))).toEqual({ n: 7, day: 1 })
    expect(sprintOf(sprintStart(24))).toEqual({ n: 24, day: 1 })
  })
  it('depois do último sprint continua no 24', () => {
    expect(sprintOf(d('2028-01-10')).n).toBe(24)
  })
  it('dateKey e fromKey são inversos', () => {
    expect(dateKey(fromKey('2027-03-07'))).toBe('2027-03-07')
  })
  it('as fases cobrem os 24 sprints, em ordem', () => {
    expect(SPRINTS.map((s) => s.n)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1))
    expect(PHASES.flatMap((p) => Array.from({ length: p.range[1] - p.range[0] + 1 }, (_, i) => p.range[0] + i))).toEqual(SPRINTS.map((s) => s.n))
  })
})

describe('configurações dos blocos apontam para coisas que existem', () => {
  it.each(SPRINTS.map((s) => [s.n, s] as const))('sprint %i', (_, s) => {
    if (s.tec.cfg) {
      const c = s.tec.cfg
      expect(SCALES.map((x) => x.id)).toContain(c.scaleId)
      expect(KEYS).toContain(c.key)
      expect(EXERCISES.map((x) => x.id)).toContain(c.exercise)
      for (const b of c.boxes) expect(b).toBeGreaterThanOrEqual(1)
    } else expect(s.tec.area).toBeTruthy()
    if (s.imp.cfg) {
      const c = s.imp.cfg
      if (c.progId === 'custom') {
        const p = parseProgression(c.customText ?? '')
        expect(p.invalid).toEqual([])
        expect(p.chords.length).toBeGreaterThan(0)
      } else expect(PROGRESSIONS.map((x) => x.id)).toContain(c.progId)
      expect(KEYS).toContain(c.key)
      expect(STYLE_IDS).toContain(c.styleId)
      expect([AUTO_SCALE, ...SCALES.map((x) => x.id)]).toContain(c.scaleId)
      if (c.restrictionId) expect(RESTRICTIONS.map((r) => r.id)).toContain(c.restrictionId)
    } else expect(s.imp.area).toBeTruthy()
    for (const p of s.ear) for (const x of p.set) expect(ALL_OF[p.m]).toContain(x)
    expect(s.saida.length).toBeGreaterThan(0)
  })
})

describe('roteiro do dia', () => {
  const total = (k: string) => blocksFor(d(k)).reduce((a, b) => a + b.min, 0)
  it('dia útil: 4 horas em 8 blocos, A e B', () => {
    const bs = blocksFor(d('2026-11-10'))
    expect(bs).toHaveLength(8)
    expect(total('2026-11-10')).toBe(240)
    expect(new Set(bs.map((b) => b.group))).toEqual(new Set(['A', 'B']))
  })
  it('a teoria alterna conforme o dia da semana (com a lição quando existe)', () => {
    const tb = (k: string) => blocksFor(d(k)).find((b) => b.id === 'teoria')!
    expect(tb('2026-11-09').licao).toBe('s1-0') // seg: tarefa 0
    expect(tb('2026-11-10').licao).toBe('s1-1') // ter: tarefa 1
    expect(tb('2026-11-11').lines[0]).toBe(SPRINTS[0].teoria[2]) // qua: quiz, sem lição
    expect(tb('2026-11-11').area).toBe('acordes')
    expect(tb('2026-11-12').licao).toBe('s1-0') // qui
  })
  it('domingo é leve; no 7º dia grava o meio do sprint e no 14º faz o teste', () => {
    expect(blocksFor(d('2026-11-15')).map((b) => b.id)).toContain('meio')
    const teste = blocksFor(d('2026-11-22'))
    expect(teste.map((b) => b.id)).toContain('teste')
    expect(total('2026-11-22')).toBeLessThan(240)
  })
  it('semana zero: diagnóstico', () => {
    expect(blocksFor(d('2026-11-05'))[0].id).toBe('d-imp')
  })
  it('ids únicos em cada dia', () => {
    for (const k of ['2026-11-05', '2026-11-10', '2026-11-22', '2027-06-02']) {
      const ids = blocksFor(d(k)).map((b) => b.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
