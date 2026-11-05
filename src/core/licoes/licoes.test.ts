import { describe, expect, it } from 'vitest'
import { TUNING } from '../fretboard-model'
import { blocksFor, fromKey as dayFromKey, SPRINTS } from '../plano'
import { boxRange, SCALES } from '../scales'
import { KEYS } from '../theory'
import { fretOf, MAJOR, NAT_PC, OPEN, PENT_MIN, SEMIS } from './ajuda'
import { addDaysKey, dueKeys, fromKey, LESSONS, lessonFor, qKey, realize, review } from './index'

/** gerador de números fixo para repetir os sorteios */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}
const pcOf = (name: string) => {
  const base = NAT_PC[name[0]]
  const acc = name.slice(1)
  return (base + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12
}

describe('lições', () => {
  it('ids únicos e no formato s{sprint}-{tarefa}', () => {
    const ids = LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of LESSONS) expect(l.id).toBe(`s${l.sprint}-${l.task}`)
  })
  it('cada lição tem texto, algo para tocar e 4+ perguntas', () => {
    for (const l of LESSONS) {
      expect(l.steps.some((s) => s.t === 'p'), l.id).toBe(true)
      expect(l.steps.some((s) => s.t === 'tente'), l.id).toBe(true)
      expect(l.quiz.length, l.id).toBeGreaterThanOrEqual(4)
    }
  })
  it('lição de sprint corresponde a uma tarefa de teoria que não é quiz de outra área', () => {
    for (const l of LESSONS.filter((x) => x.sprint > 0)) {
      const txt = SPRINTS[l.sprint - 1].teoria[l.task]
      expect(txt, l.id).not.toMatch(/^Quiz/)
    }
  })
  it('perguntas: a resposta está entre as opções, sem opções repetidas (200 sorteios)', () => {
    const rnd = seeded(7)
    for (const l of LESSONS)
      l.quiz.forEach((spec, i) => {
        for (let k = 0; k < ('gen' in spec ? 200 : 1); k++) {
          const q = realize(spec, rnd)
          expect(q.options, `${l.id}#${i}`).toContain(q.answer)
          expect(new Set(q.options).size, `${l.id}#${i}`).toBe(q.options.length)
          expect(q.options.length, `${l.id}#${i}`).toBeGreaterThanOrEqual(2)
          expect(q.why.length).toBeGreaterThan(5)
        }
      })
  })
  it('figuras: posições dentro do braço e notas certas', () => {
    for (const l of LESSONS)
      for (const s of l.steps) {
        if (s.t !== 'braco') continue
        const f = s.fig
        if (f.names) expect(f.names.length, l.id).toBe(f.semis.length)
        f.names?.forEach((n, i) => expect(pcOf(n), `${l.id} ${n}`).toBe((f.root + f.semis[i]) % 12))
        for (const [str, fr] of f.pos ?? []) {
          expect(str >= 1 && str <= 6 && fr >= f.frets[0] && fr <= f.frets[1], `${l.id} ${str}:${fr}`).toBe(true)
          const pc = (TUNING[str - 1] + fr) % 12
          expect(f.semis.map((x) => (f.root + x) % 12), `${l.id} ${str}:${fr}`).toContain(pc)
        }
        for (const m of f.marks ?? []) {
          const rootPos = f.pos?.[0]
          if (rootPos && SEMIS[m.label] !== undefined) {
            const rootMidi = TUNING[rootPos[0] - 1] + rootPos[1]
            expect(TUNING[m.s - 1] + m.f - rootMidi, `${l.id} ${m.label}`).toBe(SEMIS[m.label])
          }
        }
        if (f.box) {
          const sc = SCALES.find((x) => x.id === f.box!.scaleId)!
          const r = boxRange(sc, f.root, f.box.box)
          expect(r[0] >= f.frets[0] && r[1] <= f.frets[1], `${l.id} box`).toBe(true)
        }
      }
  })
})

describe('tabelas das lições batem com a teoria', () => {
  it('fretOf confere com a afinação', () => {
    for (const s of [1, 2, 3, 4, 5, 6]) for (const n of Object.keys(NAT_PC)) expect((OPEN[s] + fretOf(s, n)) % 12).toBe(NAT_PC[n])
  })
  it('pentatônica menor = 1 b3 4 5 b7', () => {
    for (const [k, notes] of Object.entries(PENT_MIN)) expect(notes.map((n) => (pcOf(n) - pcOf(k) + 12) % 12)).toEqual([0, 3, 5, 7, 10])
  })
  it('escala maior = T T S T T T S, uma letra por grau', () => {
    for (const [k, notes] of Object.entries(MAJOR)) {
      expect(notes.map((n) => (pcOf(n) - pcOf(k) + 12) % 12)).toEqual([0, 2, 4, 5, 7, 9, 11])
      expect(new Set(notes.map((n) => n[0])).size).toBe(7)
    }
  })
  it('KEYS do app usam os mesmos nomes de altura', () => {
    expect(KEYS.map(pcOf)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})

describe('revisão espaçada', () => {
  it('errou volta amanhã; acertos espaçam 2, 4, 8 dias e então sai', () => {
    let r = review(undefined, false, '2026-11-10')!
    expect(r).toEqual({ box: 0, due: '2026-11-11' })
    r = review(r, true, '2026-11-11')!
    expect(r).toEqual({ box: 1, due: '2026-11-13' })
    r = review(r, true, '2026-11-13')!
    expect(r.due).toBe('2026-11-17')
    r = review(r, true, '2026-11-17')!
    expect(r.due).toBe('2026-11-25')
    expect(review(r, true, '2026-11-25')).toBeNull()
  })
  it('acertar de primeira não entra na revisão', () => {
    expect(review(undefined, true, '2026-11-10')).toBeNull()
  })
  it('dueKeys só traz o que venceu', () => {
    const k1 = qKey('s1-0', 0)
    const k2 = qKey('s1-1', 1)
    expect(dueKeys({ [k1]: { box: 0, due: '2026-11-11' }, [k2]: { box: 0, due: '2026-11-12' }, 'x#9': { box: 0, due: '2026-01-01' } }, '2026-11-11')).toEqual([k1])
    expect(fromKey(k2)?.index).toBe(1)
  })
  it('addDaysKey atravessa o mês', () => {
    expect(addDaysKey('2026-11-30', 1)).toBe('2026-12-01')
  })
})

describe('ligação com o plano', () => {
  it('o bloco de teoria aponta para a lição do dia quando ela existe', () => {
    // seg 9 nov = tarefa 0 do sprint 1; ter 10 nov = tarefa 1
    expect(blocksFor(dayFromKey('2026-11-09')).find((b) => b.id === 'teoria')?.licao).toBe('s1-0')
    expect(blocksFor(dayFromKey('2026-11-10')).find((b) => b.id === 'teoria')?.licao).toBe('s1-1')
    expect(blocksFor(dayFromKey('2026-11-10')).find((b) => b.id === 'teoria')?.area).toBe('teoria')
  })
  it('a semana zero lê a lição s0-0', () => {
    expect(blocksFor(dayFromKey('2026-11-06')).find((b) => b.id === 'd-guia')?.licao).toBe('s0-0')
  })
  it('lessonFor', () => {
    expect(lessonFor(2, 1)?.id).toBe('s2-1')
    expect(lessonFor(1, 2)).toBeUndefined()
  })
})
