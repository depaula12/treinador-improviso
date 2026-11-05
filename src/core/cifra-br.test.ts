import { describe, expect, it } from 'vitest'
import { chordToken, parseCifra } from './cifra'
import { chordWarning, parseChord } from './theory'

// Tabela do apêndice A da auditoria (5 nov 2026): os 98 símbolos testados no modo Consultar,
// com a fórmula esperada em semitons a partir da fundamental. Fundamental sempre C (exceto onde indicado).
const T: [string, number[]][] = [
  ['C', [0, 4, 7]], ['Cm', [0, 3, 7]], ['C7', [0, 4, 7, 10]], ['Cm7', [0, 3, 7, 10]],
  ['C7M', [0, 4, 7, 11]], ['Cmaj7', [0, 4, 7, 11]], ['CM7', [0, 4, 7, 11]], ['C7+', [0, 4, 8, 10]],
  ['Cm7(b5)', [0, 3, 6, 10]], ['Cm7b5', [0, 3, 6, 10]], ['Cø', [0, 3, 6, 10]],
  ['C°', [0, 3, 6]], ['Cº', [0, 3, 6]], ['Cdim', [0, 3, 6]], ['C°7', [0, 3, 6, 9]], ['Cº7', [0, 3, 6, 9]], ['Cdim7', [0, 3, 6, 9]],
  ['C7(9)', [0, 4, 7, 10, 14]], ['C9', [0, 4, 7, 10, 14]], ['C7/9', [0, 4, 7, 10, 14]],
  ['C7(13)', [0, 4, 7, 10, 21]], ['C13', [0, 4, 7, 10, 14, 21]],
  ['C7(b9)', [0, 4, 7, 10, 13]], ['C7(#9)', [0, 4, 7, 10, 15]], ['C7(#5)', [0, 4, 8, 10]], ['C7(b5)', [0, 4, 6, 10]],
  ['C7(#11)', [0, 4, 7, 10, 18]], ['C7M(9)', [0, 4, 7, 11, 14]], ['Cmaj9', [0, 4, 7, 11, 14]], ['C7M(#11)', [0, 4, 7, 11, 18]],
  ['C6', [0, 4, 7, 9]], ['Cm6', [0, 3, 7, 9]], ['C6(9)', [0, 4, 7, 9, 14]], ['C6/9', [0, 4, 7, 9, 14]], ['C69', [0, 4, 7, 9, 14]],
  ['Cadd9', [0, 4, 7, 14]], ['C(9)', [0, 4, 7, 14]], ['C(add9)', [0, 4, 7, 14]], ['Cm(9)', [0, 3, 7, 14]],
  ['Cm9', [0, 3, 7, 10, 14]], ['Cm7(9)', [0, 3, 7, 10, 14]], ['Cm7/9', [0, 3, 7, 10, 14]],
  ['Csus4', [0, 5, 7]], ['C4', [0, 5, 7]], ['Csus2', [0, 2, 7]], ['C2', [0, 2, 7]], ['C7sus4', [0, 5, 7, 10]],
  ['C7(4)', [0, 5, 7, 10]], ['C7/4', [0, 5, 7, 10]], ['C4/7', [0, 5, 7, 10]], ['C9sus4', [0, 5, 7, 10, 14]], ['C7(4/9)', [0, 5, 7, 10, 14]],
  ['C5', [0, 7]], ['Caug', [0, 4, 8]], ['C+', [0, 4, 8]], ['C5+', [0, 4, 8]], ['C(#5)', [0, 4, 8]],
  ['Cm7M', [0, 3, 7, 11]], ['Cm(7M)', [0, 3, 7, 11]], ['CmMaj7', [0, 3, 7, 11]], ['Cm7M(9)', [0, 3, 7, 11, 14]],
  ['C7(9)(13)', [0, 4, 7, 10, 14, 21]], ['C7(b13)', [0, 4, 7, 10, 20]], ['C7(9-)', [0, 4, 7, 10, 13]], ['C7(9+)', [0, 4, 7, 10, 15]],
  ['Cadd11', [0, 4, 7, 17]], ['C7M(13)', [0, 4, 7, 11, 21]],
  ['C(b5)', [0, 4, 6]], ['Cm(b5)', [0, 3, 6]], ['C7(5+)', [0, 4, 8, 10]], ['C7(5-)', [0, 4, 6, 10]], ['C7M(5+)', [0, 4, 8, 11]],
  ['Cm7(5-)', [0, 3, 6, 10]], ['C7(9)(5+)', [0, 4, 8, 10, 14]], ['Cmaj7#5', [0, 4, 8, 11]], ['C7sus2', [0, 2, 7, 10]],
  ['Cm(add9)', [0, 3, 7, 14]], ['Cmadd9', [0, 3, 7, 14]], ['C7M7', [0, 4, 7, 11]], ['Cj7', [0, 4, 7, 11]], ['CMaj7', [0, 4, 7, 11]],
]
// as demais fundamentais e cifras com baixo
const ROOTED: [string, number, string[]][] = [
  ['D(b9)', 2, ['D', 'F#', 'A', 'Eb']], ['F(#9)', 5, ['F', 'A', 'C', 'G#']], ['G(#11)', 7, ['G', 'B', 'D', 'C#']],
  ['A(b13)', 9, ['A', 'C#', 'E', 'F']], ['E(b5)', 4, ['E', 'G#', 'Bb']], ['Bb', 10, ['Bb', 'D', 'F']],
  ['Db', 1, ['Db', 'F', 'Ab']], ['F#m', 6, ['F#', 'A', 'C#']], ['Ebm7', 3, ['Eb', 'Gb', 'Bb', 'Db']],
]

describe('cifra brasileira: tabela da auditoria', () => {
  it.each(T)('%s', (sym, semis) => {
    const c = parseChord(sym)
    expect(c, sym).not.toBeNull()
    expect(c!.root, sym).toBe(0)
    expect(c!.semitones, sym).toEqual(semis)
  })
  it.each(ROOTED)('%s mantém a fundamental escrita', (sym, root, notes) => {
    const c = parseChord(sym)!
    expect(c.root).toBe(root)
    expect(c.notes).toEqual(notes)
  })
  it('C(b5) nunca vira "Cb5": as notas são C E Gb', () => {
    expect(parseChord('C(b5)')!.notes).toEqual(['C', 'E', 'Gb'])
  })
  it('baixo invertido continua funcionando', () => {
    expect(parseChord('C/E')!.bass).toBe(4)
    expect(parseChord('Am/G')!.bass).toBe(7)
    expect(parseChord('C7M/E')!.semitones).toEqual([0, 4, 7, 11])
    expect(parseChord('Cm7(b5)/Gb')!.bass).toBe(6)
    expect(parseChord('D7(9)/F#')!.root).toBe(2)
  })
  it('7+ avisa a ambiguidade; o resto não', () => {
    expect(chordWarning('G7+')).toMatch(/7M/)
    expect(chordWarning('G7(9)')).toBeNull()
    expect(chordWarning('G7M')).toBeNull()
  })
  it('lixo continua recusado', () => {
    for (const w of ['C7(xyz)', 'Cfoo', 'C((9)', 'H7', 'C7(9', 'Amor']) expect(parseChord(w), w).toBeNull()
  })
  it('chordToken aceita as grafias novas', () => {
    for (const s of ['Cm7(5-)', 'G7(9)(13)', 'E7(9-)', 'A4/7', 'D7M(13)', 'F7M(5+)', 'B7(9+)']) expect(chordToken(s), s).toBe(s)
  })
})

describe('importação: nada some em silêncio', () => {
  it('lista os acordes que não reconheceu, com seção e compasso', () => {
    const p = parseCifra(`[Verso]
C7M     G7(15)    Dm7    G7
Pa pa pa pa pa pa pa pa`)
    expect(p.sections[0].bars.map((b) => b[0])).toEqual(['C7M', 'Dm7', 'G7'])
    expect(p.unknown).toEqual([{ section: 'Verso', bar: 2, token: 'G7(15)' }])
  })
  it('acordes brasileiros entram todos', () => {
    const p = parseCifra(`[Intro]
Cm7(5-)  F7(9-)  Bbm7  Eb7(9)(13)  Ab7M(5+)  Db4/7  Gm(b5)`)
    expect(p.sections[0].bars).toHaveLength(7)
    expect(p.unknown).toEqual([])
  })
  it('N.C. não some em silêncio: fica registrado onde estava', () => {
    const p = parseCifra(`[Intro]
C   N.C.   G   (N.C.)`)
    expect(p.sections[0].bars).toEqual([['C'], ['G']])
    expect(p.noChord).toEqual([{ section: 'Intro', bar: 2 }, { section: 'Intro', bar: 3 }])
  })
  it('palavras da letra não viram aviso', () => {
    const p = parseCifra(`[Verso]
Am   Das   G   Bem   F
Pa pa pa`)
    expect(p.unknown).toEqual([])
  })
})
