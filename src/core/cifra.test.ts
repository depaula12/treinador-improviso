import { describe, expect, it } from 'vitest'
import { chordToken, parseCifra } from './cifra'
import { parseChord } from './theory'

// Cifras de exemplo no formato do Cifra Club, com letra fictícia (não embutir cifras de terceiros).
const BASICA = `Música de Teste
Banda Exemplo

Tom: Bm
Afinação: E A D G B E

[Intro] Bm  G  D  A

[Primeira Parte]

Bm              G
Lá lá lá lá lá lá lá lá
D                 A
Lá lá lá lá lá lá lá

[Refrão]

      G      D/F#    Em
Uô uô uô uô uô uô uô uô
      G      D/F#    A
Uô uô uô uô uô uô uô

[Solo]
Parte 1 de 2
E|-------------------|
B|-----7--8--7-------|
G|--7------------7---|

[Final] Bm  G  D  A  (2x)
`

const BRASILEIRA = `Tom: C
Capotraste na 2ª casa

[Intro] C7M  Am7(9)  Dm7(b5)  G7(13)

[Verso]
C7M          A7(9)    Dm7        G4  G7
Pa pa pa pa pa pa pa pa pa pa pa pa
F6(9)     Fm6     Bº    E7(b9)   Am
Pa pa pa pa pa pa pa pa pa pa pa pa

( C7M  %  Dm7  G7 )
`

describe('parseCifra', () => {
  it('lê título, artista, tom e seções', () => {
    const p = parseCifra(BASICA)
    expect(p.title).toBe('Música de Teste')
    expect(p.artist).toBe('Banda Exemplo')
    expect(p.key).toBe('Bm')
    expect(p.sections.map((s) => s.name)).toEqual(['Intro', 'Primeira Parte', 'Refrão', 'Final'])
  })

  it('um acorde por compasso, na ordem', () => {
    const p = parseCifra(BASICA)
    expect(p.sections[0].bars).toEqual([['Bm'], ['G'], ['D'], ['A']])
    expect(p.sections[2].bars.flat()).toEqual(['G', 'D/F#', 'Em', 'G', 'D/F#', 'A'])
  })

  it('pula tablatura e avisa a seção que ficou de fora', () => {
    const p = parseCifra(BASICA)
    expect(p.skipped).toEqual(['Solo'])
  })

  it('repete a linha marcada com (2x)', () => {
    const p = parseCifra(BASICA)
    expect(p.sections[3].bars.flat()).toEqual(['Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A'])
  })

  it('entende a notação brasileira, capotraste, % e parênteses', () => {
    const p = parseCifra(BRASILEIRA)
    expect(p.capo).toBe(2)
    expect(p.sections[0].bars.flat()).toEqual(['C7M', 'Am7(9)', 'Dm7(b5)', 'G7(13)'])
    expect(p.sections[1].bars.flat()).toEqual(['C7M', 'A7(9)', 'Dm7', 'G4', 'G7', 'F6(9)', 'Fm6', 'Bº', 'E7(b9)', 'Am', 'C7M', 'C7M', 'Dm7', 'G7'])
    for (const c of p.sections.flatMap((s) => s.bars.flat())) expect(parseChord(c), c).not.toBeNull()
  })

  it('não confunde letra com acorde', () => {
    const p = parseCifra(`[Verso]
A
A day in the life of a band
Am I wrong
E A D`)
    expect(p.sections[0].bars.flat()).toEqual(['A', 'E', 'A', 'D'])
  })

  it('sem seções: tudo vira "Música"', () => {
    const p = parseCifra('Em  C  G  D\nletra qualquer aqui\nEm  C  G  D')
    expect(p.sections).toHaveLength(1)
    expect(p.sections[0].name).toBe('Música')
    expect(p.sections[0].bars).toHaveLength(8)
  })
})

describe('chordToken + cifra brasileira', () => {
  it.each([
    ['A7(9)', [0, 4, 7, 10, 14]],
    ['Dm7(b5)', [0, 3, 6, 10]],
    ['G7M', [0, 4, 7, 11]],
    ['E4', [0, 5, 7]],
    ['A7(4)', [0, 5, 7, 10]],
    ['Bº', [0, 3, 6]],
    ['C(9)', [0, 4, 7, 14]],
    ['Am7M', [0, 3, 7, 11]],
    ['F6(9)', [0, 4, 7, 9, 14]],
    ['G7(13)', [0, 4, 7, 10, 14, 21]],
  ])('%s', (sym, semis) => {
    expect(chordToken(sym)).toBe(sym)
    expect(parseChord(sym)!.semitones).toEqual(semis)
  })
  it('rejeita palavras', () => {
    for (const w of ['Amor', 'Dia', 'Eu', 'Bem', 'Cada', 'Gente', 'Fim']) expect(chordToken(w), w).toBeNull()
  })
})
