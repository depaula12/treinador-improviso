import { describe, expect, it } from 'vitest'
import { parseCifra } from './cifra'
import {
  deleteBar, duplicateBar, duplicateSection, flatBars, guessKey, mergeNext, setBar, songChords, songFromCifra,
  soundingKey, splitBar, startBeats, timedChords, timingValid, toPlayBars, transposeChord, transposeKey, writtenSequence,
  type Song,
} from './song'

const song = (): Song => songFromCifra(parseCifra('Tom: G\n[Verso]\nG D Em C\n[Refrão]\nC D G G'), 0)

describe('transposição', () => {
  it('mantém sufixo e baixo', () => {
    expect(transposeChord('D/F#', 2)).toBe('E/G#')
    expect(transposeChord('Am7(9)', 3)).toBe('Cm7(9)')
    expect(transposeChord('Bm7b5', 1)).toBe('Cm7b5')
    expect(transposeChord('E7', -2, true)).toBe('D7')
    expect(transposeChord('C', 1, true)).toBe('Db')
    expect(transposeChord('Bb', 0)).toBe('Bb')
  })
  it('grafia do tom de chegada', () => {
    expect(transposeKey('G', 3)).toBe('Bb')
    expect(transposeKey('Bm', 2)).toBe('C#m')
    expect(transposeKey('Am', -2)).toBe('Gm')
    expect(transposeKey('E', 2)).toBe('F#')
  })
  it('usa bemóis em tom de bemol', () => {
    const s = { ...song(), transpose: 3 } // G -> Bb
    expect(soundingKey(s)).toBe('Bb')
    expect(songChords(s)).toEqual(['Bb', 'F', 'Gm', 'Eb'])
  })
})

describe('songFromCifra', () => {
  it('capotraste vira transposição', () => {
    const s = songFromCifra(parseCifra('Tom: D\nCapotraste na 2ª casa\nD A Bm G'))
    expect(s.transpose).toBe(2)
    expect(soundingKey(s)).toBe('E')
  })
  it('sem "Tom:" estima pelos acordes', () => {
    expect(guessKey([['Am'], ['G'], ['F'], ['E7']])).toBe('Am')
    expect(guessKey([['A7'], ['D7'], ['A7'], ['E7']])).toBe('A')
  })
  it('achata as seções em ordem', () => {
    const f = flatBars(song())
    expect(f).toHaveLength(8)
    expect(f[4]).toEqual({ section: 1, bar: 0, chords: ['C'] })
  })
})

describe('durações', () => {
  it('sem marcação: 1 compasso por acorde, 2+2 divide', () => {
    const s = mergeNext(song(), 0, 0) // [G D] Em C | C D G G
    expect(timedChords(s).map((t) => t.beats)).toEqual([2, 2, 4, 4, 4, 4, 4, 4])
    expect(toPlayBars(timedChords(s))[0]).toEqual([{ beat: 0, chord: 'G' }, { beat: 2, chord: 'D' }])
  })
  it('com marcação: acordes atravessam a barra', () => {
    const base = song()
    const s: Song = { ...base, useTiming: true, timing: { beats: [6, 2, 4, 4, 3, 1, 8, 4], sequence: writtenSequence(base), bpm: 100 } }
    const bars = toPlayBars(timedChords(s))
    expect(bars[0]).toEqual([{ beat: 0, chord: 'G' }])
    expect(bars[1]).toEqual([{ beat: 0, chord: 'G' }, { beat: 2, chord: 'D' }])
    // C (4) + C (3) seguidos: o compasso 5 continua em C e o D entra no tempo 4
    expect(bars[4]).toEqual([{ beat: 0, chord: 'C' }, { beat: 3, chord: 'D' }])
    expect(bars.slice(5)).toEqual([[{ beat: 0, chord: 'G' }], [{ beat: 0, chord: 'G' }], [{ beat: 0, chord: 'G' }]])
    expect(bars).toHaveLength(8)
    expect(startBeats(timedChords(s)).slice(0, 4)).toEqual([0, 6, 8, 12])
  })
  it('marcação vencida quando a grade muda; desligada volta ao padrão', () => {
    const base = song()
    const s: Song = { ...base, useTiming: true, timing: { beats: [6, 2, 4, 4, 3, 1, 8, 4], sequence: writtenSequence(base), bpm: 100 } }
    expect(timingValid(s)).toBe(true)
    expect(timingValid(deleteBar(s, 0, 0))).toBe(false)
    expect(timedChords(deleteBar(s, 0, 0)).every((t) => t.beats === 4)).toBe(true)
    expect(timedChords({ ...s, useTiming: false }).every((t) => t.beats === 4)).toBe(true)
  })
})

describe('edição da grade', () => {
  it('junta (2+2) e separa de volta', () => {
    const m = mergeNext(song(), 0, 0)
    expect(m.sections[0].bars).toEqual([['G', 'D'], ['Em'], ['C']])
    // não junta 3 acordes num compasso
    expect(mergeNext(m, 0, 0).sections[0].bars).toEqual(m.sections[0].bars)
    expect(splitBar(m, 0, 0).sections[0].bars).toEqual(song().sections[0].bars)
  })
  it('dobra, apaga e troca compassos', () => {
    expect(duplicateBar(song(), 0, 2).sections[0].bars.flat()).toEqual(['G', 'D', 'Em', 'Em', 'C'])
    expect(deleteBar(song(), 0, 0).sections[0].bars.flat()).toEqual(['D', 'Em', 'C'])
    expect(setBar(song(), 0, 3, 'Am7 D7')!.sections[0].bars[3]).toEqual(['Am7', 'D7'])
    expect(setBar(song(), 0, 3, 'Xyz')).toBeNull()
  })
  it('não mexe no original', () => {
    const s = song()
    mergeNext(s, 0, 0)
    duplicateSection(s, 1)
    expect(s.sections[0].bars).toHaveLength(4)
    expect(s.sections).toHaveLength(2)
    expect(duplicateSection(s, 1).sections.map((x) => x.name)).toEqual(['Verso', 'Refrão', 'Refrão'])
  })
})
