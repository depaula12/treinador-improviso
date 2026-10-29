import { describe, expect, it } from 'vitest'
import { buildExercise, boxesByNeck, EXERCISES } from './exercises'
import { boxNotes, SCALES } from './scales'

const pentMin = SCALES.find((s) => s.id === 'pentMin')!
const A = 9

describe('notas do desenho', () => {
  it('box 1 de Lá menor: 12 notas subindo de A2 a C5', () => {
    const ns = boxNotes(pentMin, A, 1)
    expect(ns).toHaveLength(12)
    expect(ns[0]).toMatchObject({ string: 5, fret: 5, degree: 0 })
    expect(ns.at(-1)).toMatchObject({ string: 0, fret: 8, degree: 3 })
    for (let i = 1; i < ns.length; i++) expect(ns[i].midi).toBeGreaterThan(ns[i - 1].midi)
  })

  it.each(SCALES.map((s) => [s.id, s] as const))('%s: alturas sem repetição e só notas da escala', (_, sc) => {
    for (let key = 0; key < 12; key++) {
      for (let b = 1; b <= 5; b++) {
        const ns = boxNotes(sc, key, b)
        expect(new Set(ns.map((n) => n.midi)).size).toBe(ns.length)
        for (const n of ns) expect(sc.semitones).toContain(n.degree)
      }
    }
  })
})

describe('exercícios', () => {
  const box1 = boxNotes(pentMin, A, 1)

  it('subir e descer volta ao começo sem repetir as pontas', () => {
    const seq = buildExercise('subir-descer', pentMin, A, [1])
    expect(seq).toHaveLength(box1.length * 2 - 2)
    expect(seq[box1.length - 1]).toEqual(box1.at(-1))
    expect(seq.at(-1)).toEqual(box1[1])
  })

  it('grupos de 3 começam 1-2-3, 2-3-4', () => {
    const seq = buildExercise('grupos3', pentMin, A, [1])
    expect(seq.slice(0, 6).map((n) => n.midi)).toEqual([0, 1, 2, 1, 2, 3].map((i) => box1[i].midi))
  })

  it('terças pulam uma nota', () => {
    const seq = buildExercise('tercas', pentMin, A, [1])
    expect(seq.slice(0, 4).map((n) => n.midi)).toEqual([0, 2, 1, 3].map((i) => box1[i].midi))
  })

  it('percorrer: boxes na ordem do braço, alternando subida e descida', () => {
    expect(boxesByNeck(pentMin, A, [1, 2, 3, 4, 5])).toEqual([4, 5, 1, 2, 3])
    const seq = buildExercise('percorrer', pentMin, A, [1, 2])
    const b2 = boxNotes(pentMin, A, 2)
    expect(seq[0]).toEqual(box1[0])
    expect(seq[box1.length]).toEqual(b2.at(-1)) // desce o box 2 a partir do agudo
  })

  it.each(EXERCISES.map((e) => [e.id] as const))('%s gera notas em todas as escalas e tons', (id) => {
    for (const sc of SCALES) for (let key = 0; key < 12; key++) {
      expect(buildExercise(id, sc, key, [1, 3]).length).toBeGreaterThan(8)
    }
  })
})
