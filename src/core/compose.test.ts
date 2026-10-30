import { describe, expect, it } from 'vitest'
import { colorize, LANGS, movesFor, romanIn, sectionStarts, type Lang } from './compose'
import { parseChord } from './theory'

const G = { root: 7, minor: false }
const Am = { root: 9, minor: true }
const move = (key: typeof G, last: string | null, id: string) => movesFor(key, last ? parseChord(last) : null).find((m) => m.id === id)

describe('compor: opções por intenção', () => {
  it('em Sol maior, a tensão é o D7 e a conclusão forte é D7 → G', () => {
    expect(move(G, 'G', 'tensao')!.options[0].chords).toEqual(['D7'])
    expect(move(G, 'C', 'fim-forte')!.options[0]).toMatchObject({ chords: ['D7', 'G'], romans: 'V7 → I' })
  })

  it('em Lá menor: subir a energia é F → G; conclusão épica F → G → Am', () => {
    expect(move(Am, 'Am', 'energia')!.options[0].chords).toEqual(['F', 'G'])
    expect(move(Am, 'Dm', 'fim-epico')!.options[0].chords).toEqual(['F', 'G', 'Am'])
  })

  it('não repete o último acorde: já no IV, a conclusão sóbria é só o I', () => {
    expect(move(G, 'C', 'fim-sobrio')!.options[0].chords).toEqual(['G'])
    // já na tônica, "repousar" oferece o repouso suave (vi) primeiro
    expect(move(G, 'G', 'repousar')!.options[0].chords).toEqual(['Em'])
  })

  it('toda opção tem acordes válidos, graus e o porquê; nenhuma começa no acorde atual', () => {
    for (const key of [G, Am, { root: 0, minor: false }, { root: 4, minor: true }]) {
      for (const last of [null, 'C', 'Am', 'G', 'E7', 'F']) {
        const lastC = last ? parseChord(last) : null
        const moves = movesFor(key, lastC)
        expect(moves.length).toBeGreaterThanOrEqual(8)
        for (const m of moves) {
          expect(m.feel.length).toBeGreaterThan(5)
          for (const o of m.options) {
            expect(o.chords.length).toBeGreaterThan(0)
            for (const c of o.chords) expect(parseChord(c), c).not.toBeNull()
            expect(o.why.length).toBeGreaterThan(10)
            expect(o.romans.split(' → ')).toHaveLength(o.chords.length)
          }
        }
      }
    }
  })

  it('começos de seção: refrão em tom maior abre no IV; em menor, no bVI', () => {
    expect(sectionStarts(G, 'Refrão')[0].chords).toEqual(['C'])
    expect(sectionStarts(Am, 'Refrão')[0].chords).toEqual(['F'])
    expect(sectionStarts(G, 'Verso')[0].chords).toEqual(['G'])
  })

  it('graus da progressão', () => {
    expect(['G', 'D7', 'Em', 'C', 'Dsus4'].map((s) => romanIn(G, s))).toEqual(['I', 'V7', 'vi', 'IV', 'Vsus4'])
    expect(['Am', 'F', 'G', 'E7'].map((s) => romanIn(Am, s))).toEqual(['i', 'bVI', 'bVII', 'V7'])
  })
})

describe('linguagens: blues e bossa/jazz', () => {
  const C = { root: 0, minor: false }
  const Dm = { root: 2, minor: true }
  const mv = (key: typeof C, last: string, id: string, lang: Lang) => movesFor(key, parseChord(last), lang).find((m) => m.id === id)

  it('blues: tônica com sétima, quick change e turnaround', () => {
    expect(mv(C, 'C7', 'energia', 'blues')!.options[0].chords).toEqual(['F7'])
    expect(mv(C, 'G7', 'fim-forte', 'blues')!.options[0].chords).toEqual(['F7', 'C7'])
    expect(mv(C, 'F7', 'suspense', 'blues')!.options[0]).toMatchObject({ chords: ['C7', 'A7', 'Dm7', 'G7'], romans: 'I7 → VI7 → ii7 → V7' })
    // diminuto de passagem com sustenido
    expect(mv(C, 'C7', 'energia', 'blues')!.options.some((o) => o.chords.join() === 'F7,F#º7')).toBe(true)
  })

  it('jazz: ii–V–I, substituto trítono, I7M → II7 e diminuto de passagem', () => {
    expect(mv(C, 'Am7', 'fim-forte', 'jazz')!.options[0].chords).toEqual(['Dm7', 'G7', 'C7M'])
    expect(mv(C, 'C7M', 'fim-epico', 'jazz')!.options[0].chords).toEqual(['Dm7', 'Db7', 'C7M(9)'])
    expect(mv(C, 'C7M', 'energia', 'jazz')!.options.map((o) => o.chords.join())).toContain('D7')
    expect(mv(C, 'C7M', 'surpresa', 'jazz')!.options.map((o) => o.chords.join())).toContain('C#º7,Dm7')
    expect(mv(Dm, 'Dm6', 'fim-forte', 'jazz')!.options[0].chords).toEqual(['Em7(b5)', 'A7(b9)', 'Dm6'])
  })

  it('toda linguagem, tom e acorde: opções válidas com graus e o porquê', () => {
    for (const { id: lang } of LANGS) {
      for (const key of [C, Dm, { root: 7, minor: false }, { root: 9, minor: true }]) {
        for (const last of ['C', 'C7', 'Dm7', 'G7', 'A7(b9)', 'F#º7']) {
          const moves = movesFor(key, parseChord(last), lang)
          expect(moves.length, `${lang} ${last}`).toBeGreaterThanOrEqual(8)
          for (const m of moves) for (const o of m.options) {
            for (const c of o.chords) expect(parseChord(c), `${lang}: ${c}`).not.toBeNull()
            expect(o.romans.split(' → ')).toHaveLength(o.chords.length)
            expect(o.why.length).toBeGreaterThan(10)
          }
        }
        for (const sec of ['Verso', 'Refrão', 'Ponte']) {
          for (const st of sectionStarts(key, sec, lang)) expect(parseChord(st.chords[0]), st.chords[0]).not.toBeNull()
        }
      }
    }
  })

  it('começos de seção por linguagem', () => {
    expect(sectionStarts(C, 'Verso', 'blues')[0].chords).toEqual(['C7'])
    expect(sectionStarts(C, 'Verso', 'jazz')[0].chords).toEqual(['C7M'])
    expect(sectionStarts(Dm, 'Verso', 'jazz')[0].chords).toEqual(['Dm6'])
  })

  it('graus com sétima, meio-diminuto e diminuto', () => {
    expect(['C7M', 'Dm7', 'G7(13)', 'Bm7(b5)', 'C#º7', 'G7sus4'].map((s) => romanIn(C, s))).toEqual(['I7M', 'ii7', 'V7', 'viiø', '#i\u00ba', 'V7sus4'])
  })

  it('colorir: C → C7M → C7M(9) → C6(9) → C; mantém o baixo', () => {
    const seq = ['C']
    for (let i = 0; i < 4; i++) seq.push(colorize(seq[seq.length - 1], 'jazz')!)
    expect(seq).toEqual(['C', 'C7M', 'C7M(9)', 'C6(9)', 'C'])
    expect(colorize('Am', 'jazz')).toBe('Am7')
    expect(colorize('G7', 'blues')).toBe('G9')
    expect(colorize('C/E', 'jazz')).toBe('C7M/E')
    expect(colorize('Bm7(b5)', 'jazz')).toBeNull()
    for (const lang of ['pop', 'blues', 'jazz'] as Lang[]) {
      for (const s of ['C', 'Am', 'G7', 'Dsus4', 'F#m7']) {
        const n = colorize(s, lang)
        if (n) expect(parseChord(n), `${lang} ${s} → ${n}`).not.toBeNull()
      }
    }
  })
})
