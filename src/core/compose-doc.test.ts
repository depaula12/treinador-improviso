import { describe, expect, it } from 'vitest'
import {
  barStrums, compositionSong, duplicateChord, fromV1, insertChords, moveChord, newChord, newSection, playSequence,
  removeChord, replaceChord, totalBars, transposeSections, updateChord, type CompSection,
} from './compose-doc'
import { timedChords, toPlayBars } from './song'

const syms = (ss: CompSection[]) => ss.map((s) => s.chords.map((c) => c.symbol).join(' '))
const doc = () => [newSection('Verso', ['Am', 'F', 'C', 'G'].map((c) => newChord(c))), newSection('Refrão', ['F', 'G'].map((c) => newChord(c)))]

describe('editar a composição', () => {
  it('insere em qualquer posição e ignora cifra inválida', () => {
    expect(syms(insertChords(doc(), 0, 1, ['Dm', 'xyz']))).toEqual(['Am Dm F C G', 'F G'])
    expect(syms(insertChords(doc(), 1, 99, ['C']))).toEqual(['Am F C G', 'F G C'])
    expect(syms(insertChords(doc(), 0, 0, ['E7']))[0]).toBe('E7 Am F C G')
  })

  it('troca a cifra e esquece o desenho escolhido', () => {
    const d = updateChord(doc(), { sec: 0, idx: 1 }, { frets: [1, 3, 3, 2, 1, 1] })
    const r = replaceChord(d, { sec: 0, idx: 1 }, 'Dm')
    expect(r[0].chords[1]).toMatchObject({ symbol: 'Dm', frets: null })
    expect(replaceChord(d, { sec: 0, idx: 1 }, '???')).toBe(d)
  })

  it('apaga e duplica', () => {
    expect(syms(removeChord(doc(), { sec: 0, idx: 0 }))[0]).toBe('F C G')
    const d = duplicateChord(doc(), { sec: 0, idx: 3 })
    expect(syms(d)[0]).toBe('Am F C G G')
    expect(d[0].chords[3].id).not.toBe(d[0].chords[4].id)
  })

  it('move para frente, para trás e para outra seção', () => {
    expect(syms(moveChord(doc(), { sec: 0, idx: 0 }, { sec: 0, idx: 4 }).sections)[0]).toBe('F C G Am')
    expect(syms(moveChord(doc(), { sec: 0, idx: 3 }, { sec: 0, idx: 0 }).sections)[0]).toBe('G Am F C')
    const m = moveChord(doc(), { sec: 0, idx: 0 }, { sec: 1, idx: 1 })
    expect(syms(m.sections)).toEqual(['F C G', 'F Am G'])
    expect(m.at).toEqual({ sec: 1, idx: 1 })
    // soltar no mesmo lugar não muda nada
    expect(syms(moveChord(doc(), { sec: 0, idx: 1 }, { sec: 0, idx: 2 }).sections)[0]).toBe('Am F C G')
  })

  it('transpõe com a grafia do tom de chegada e leva junto o desenho que cabe', () => {
    let d = updateChord(doc(), { sec: 0, idx: 1 }, { frets: [1, 3, 3, 2, 1, 1] }) // F com pestana
    d = updateChord(d, { sec: 0, idx: 2 }, { frets: [null, 3, 2, 0, 1, 0] }) // C aberto
    const t = transposeSections(d, 1, 'Am') // para Bbm
    expect(syms(t)).toEqual(['Bbm Gb Db Ab', 'Gb Ab'])
    expect(t[0].chords[1].frets).toEqual([2, 4, 4, 3, 2, 2])
    expect(t[0].chords[2].frets).toBeNull() // forma aberta não sobe sem pestana
    expect(syms(transposeSections(doc(), 2, 'Am'))[0]).toBe('Bm G D A')
    // -3 em vez de +9: a pestana desce
    const down = transposeSections(updateChord(doc(), { sec: 0, idx: 1 }, { frets: [5, 7, 7, 6, 5, 5] }), 9, 'Am')
    expect(down[0].chords[1].frets).toEqual([2, 4, 4, 3, 2, 2])
  })
})

describe('tocar e salvar', () => {
  it('durações: ½ divide o compasso, 2 atravessa a barra', () => {
    let d = updateChord(doc(), { sec: 0, idx: 0 }, { beats: 8 })
    d = updateChord(d, { sec: 0, idx: 1 }, { beats: 2 })
    d = updateChord(d, { sec: 0, idx: 2 }, { beats: 2 })
    expect(totalBars(d)).toBe(2 + 0.5 + 0.5 + 1 + 2)
    const bars = toPlayBars(playSequence(d).map((c) => ({ chord: c.symbol, beats: c.beats })))
    expect(bars[0]).toEqual([{ beat: 0, chord: 'Am' }])
    expect(bars[1]).toEqual([{ beat: 0, chord: 'Am' }])
    expect(bars[2]).toEqual([{ beat: 0, chord: 'F' }, { beat: 2, chord: 'C' }])
  })

  it('levada de cada compasso: a da seção em que ele começa', () => {
    const d = doc()
    d[0].strum = 'dedilhado'
    d[1].strum = 'rock'
    let e = updateChord(d, { sec: 0, idx: 3 }, { beats: 2 }) // verso termina no meio do compasso 4
    expect(barStrums(e)).toEqual(['dedilhado', 'dedilhado', 'dedilhado', 'dedilhado', 'rock', 'rock'])
    e = updateChord(d, { sec: 1, idx: 1 }, { beats: 8 })
    expect(barStrums(e)).toEqual(['dedilhado', 'dedilhado', 'dedilhado', 'dedilhado', 'rock', 'rock', 'rock'])
    expect(barStrums(doc())).toEqual([null, null, null, null, null, null])
  })

  it('o desenho escolhido vai junto para a base', () => {
    const bars = toPlayBars([{ chord: 'C', beats: 2, midi: [48, 52, 55] }, { chord: 'G', beats: 2 }])
    expect(bars[0]).toEqual([{ beat: 0, chord: 'C', midi: [48, 52, 55] }, { beat: 2, chord: 'G' }])
  })

  it('vira música com as durações valendo e as seções preservadas', () => {
    const d = updateChord(doc(), { sec: 0, idx: 1 }, { beats: 2 })
    const song = compositionSong({ title: 'Teste', key: 'Am', bpm: 100, styleId: 'ballad', sections: [...d, newSection('Ponte')] })
    expect(song.sections.map((s) => s.name)).toEqual(['Verso', 'Refrão'])
    expect(timedChords(song).map((c) => c.beats)).toEqual([4, 2, 4, 4, 4, 4])
    expect(song).toMatchObject({ bpm: 100, styleId: 'ballad', key: 'Am' })
  })

  it('rascunho antigo vira o modelo novo', () => {
    const v2 = fromV1([{ name: 'Verso', chords: ['Am', 'G'] }])
    expect(v2[0].chords.map((c) => [c.symbol, c.beats])).toEqual([['Am', 4], ['G', 4]])
  })
})
