import { describe, expect, it } from 'vitest'
import { chordTones, findShapes, mainShapes } from './chord-shapes'
import { TUNING } from './fretboard-model'
import { parseChord } from './theory'
import { voicingsFor, QUALITIES } from './voicings'

const LOW = [...TUNING].reverse()
const shapes = (s: string) => findShapes(parseChord(s)!)
const has = (s: string, frets: (number | null)[]) => shapes(s).some((v) => v.frets.join(',') === frets.join(','))
const x = null

describe('findShapes', () => {
  it('acha as formas clássicas', () => {
    expect(has('C', [x, 3, 2, 0, 1, 0])).toBe(true)
    expect(has('G', [3, 2, 0, 0, 0, 3])).toBe(true)
    expect(has('A7', [x, 0, 2, 0, 2, 0])).toBe(true)
    expect(has('Bm7', [x, 2, 4, 2, 3, 2])).toBe(true)
    expect(has('F', [1, 3, 3, 2, 1, 1])).toBe(true)
    expect(has('E5', [0, 2, 2, x, x, x])).toBe(true)
  })

  it('inclui todos os desenhos móveis do banco', () => {
    for (const q of QUALITIES) {
      for (let root = 0; root < 12; root++) {
        const list = findShapes(parseChord(KEYS_SYM(root) + q.suffix)!)
        // o banco tem um desenho de 5 casas (sus2 na 6ª); o gerador para em 4
        const fits = (v: { frets: (number | null)[] }) => {
          const p = v.frets.filter((f): f is number => !!f)
          return Math.max(...p) - Math.min(...p) <= 3
        }
        for (const v of voicingsFor(q.id, root).filter((v) => v.form !== 'aberto' && fits(v))) {
          // o banco pode ter corda abafada a mais; vale se algum gerado contém o desenho
          const ok = list.some((g) => v.frets.every((f, i) => f === null || f === g.frets[i]))
          expect(ok, `${v.symbol} ${v.frets.join(',')}`).toBe(true)
        }
      }
    }
  })

  it('todo desenho é tocável e forma o acorde', () => {
    for (const s of ['C', 'Am', 'D7', 'F#m7', 'Bb7M', 'Esus4', 'Gadd9', 'Am7b5', 'Bdim', 'C13', 'E9', 'D6', 'Caug', 'A7sus4']) {
      const c = parseChord(s)!
      const pcs = new Set(c.semitones.map((t) => (c.root + t) % 12))
      const list = shapes(s)
      expect(list.length, s).toBeGreaterThan(3)
      for (const v of list) {
        const played = v.frets.flatMap((f, i) => (f === null ? [] : [(LOW[i] + f) % 12]))
        expect(played.every((p) => pcs.has(p)), `${s} ${v.frets}`).toBe(true)
        expect(played[0], `${s} baixo`).toBe(c.root)
        expect(v.fingers).toBeLessThanOrEqual(4)
        const pressed = v.frets.filter((f): f is number => !!f)
        if (pressed.length) expect(Math.max(...pressed) - Math.min(...pressed)).toBeLessThanOrEqual(3)
      }
    }
  })

  it('respeita o baixo invertido', () => {
    const list = shapes('D/F#')
    expect(list.length).toBeGreaterThan(0)
    for (const v of list) {
      const first = v.frets.findIndex((f) => f !== null)
      expect((LOW[first] + v.frets[first]!) % 12).toBe(6)
    }
    expect(has('D/F#', [2, 0, 0, 2, 3, 2])).toBe(true)
    // baixo fora do acorde: C/Bb
    expect(shapes('C/Bb').length).toBeGreaterThan(0)
  })

  it('ordena do começo do braço para o fim', () => {
    const pos = shapes('A').map((v) => v.position)
    expect(pos).toEqual([...pos].sort((a, b) => a - b))
  })

  it('não repete pedaços de um desenho maior com os mesmos dedos', () => {
    expect(has('C', [x, 3, 2, 0, 1, x])).toBe(false)
  })

  it('principais: as formas de sempre aparecem', () => {
    const main = (s: string) => mainShapes(shapes(s)).map((v) => v.frets.join(','))
    expect(main('C')).toContain([x, 3, 2, 0, 1, 0].join(','))
    expect(main('C')).toContain([8, 10, 10, 9, 8, 8].join(','))
    expect(main('A')).toContain([5, 7, 7, 6, 5, 5].join(','))
    expect(main('Am')).toContain([x, 12, 14, 14, 13, 12].join(','))
  })
})

describe('parseChord com baixo', () => {
  it('separa o baixo da barra', () => {
    const c = parseChord('D/F#')!
    expect(c.root).toBe(2)
    expect(c.bass).toBe(6)
    expect(c.semitones).toEqual([0, 4, 7])
    expect(parseChord('Am')!.bass).toBeUndefined()
  })
})

describe('chordTones', () => {
  it('deixa a 5ª opcional em acordes de 4+ notas', () => {
    expect(chordTones(parseChord('C7')!).optional).toEqual([7])
    expect(chordTones(parseChord('C')!).optional).toEqual([])
    expect(chordTones(parseChord('Cm7b5')!).optional).toEqual([])
  })
  it('no 13 a 9ª e a 5ª podem sair', () => {
    expect(chordTones(parseChord('C13')!).optional.sort()).toEqual([2, 7])
  })
})

function KEYS_SYM(root: number) {
  return ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][root]
}
