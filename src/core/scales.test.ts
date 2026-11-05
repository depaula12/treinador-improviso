import { describe, expect, it } from 'vitest'
import { TUNING } from './fretboard-model'
import { keyLabel, keyShort, parseProgression, progressionFor, PROGRESSIONS, realize } from './progressions'
import { boxPositions, boxRange, chordScale, SCALES, scalePcs } from './scales'
import { parseChord } from './theory'

const pentMin = SCALES.find((s) => s.id === 'pentMin')!
const blues = SCALES.find((s) => s.id === 'blues')!
const A = 9

describe('desenhos (boxes)', () => {
  it('pentatônica menor de Lá: faixas clássicas dos 5 desenhos', () => {
    expect([1, 2, 3, 4, 5].map((b) => boxRange(pentMin, A, b))).toEqual([
      [5, 8],
      [7, 10],
      [9, 13],
      [0, 3],
      [2, 5],
    ])
  })

  it('box 1 de Lá menor tem A e C na 6ª e na 1ª corda (casas 5 e 8)', () => {
    const box = boxPositions(pentMin, A, 1)
    for (const s of [0, 5]) for (const f of [5, 8]) expect(box.has(`${s}:${f}`)).toBe(true)
  })

  it('escala blues acrescenta só a b5 ao desenho', () => {
    const extra = [...boxPositions(blues, A, 1)].filter((k) => !boxPositions(pentMin, A, 1).has(k))
    expect(extra.length).toBeGreaterThan(0)
    for (const k of extra) {
      const [s, f] = k.split(':').map(Number)
      expect((TUNING[s] + f) % 12).toBe((A + 6) % 12) // Eb
    }
  })

  it.each(SCALES.flatMap((sc) => [1, 2, 3, 4, 5].map((b) => [sc.id, b] as const)))('%s box %i cabe em até 6 casas em todos os tons', (id, b) => {
    const sc = SCALES.find((s) => s.id === id)!
    for (let key = 0; key < 12; key++) {
      const [lo, hi] = boxRange(sc, key, b)
      expect(lo).toBeGreaterThanOrEqual(0)
      expect(hi - lo).toBeLessThanOrEqual(6)
    }
  })
})

describe('escalas novas', () => {
  const pcAt = (k: string) => {
    const [s, f] = k.split(':').map(Number)
    return (TUNING[s] + f) % 12
  }
  const sc = (id: string) => SCALES.find((s) => s.id === id)!

  it('arpejos: os 5 desenhos só têm notas do acorde', () => {
    for (const [id, pcs] of [['arpMaj', [9, 1, 4]], ['arpM7', [9, 0, 4, 7]], ['arp7', [9, 1, 4, 7]]] as const) {
      for (let box = 1; box <= 5; box++) {
        const ks = [...boxPositions(sc(id), 9, box)]
        expect(ks.length, `${id} box ${box}`).toBeGreaterThan(5)
        for (const k of ks) expect(pcs as readonly number[], `${id} box ${box} ${k}`).toContain(pcAt(k))
      }
    }
  })

  it('dórico tem a 6ª maior e o mixolídio a b7', () => {
    expect(scalePcs(sc('dorian'), 9)).toContain(6) // F# em Lá dórico
    expect(scalePcs(sc('mixo'), 9)).toContain(7) // G em Lá mixolídio
    expect(scalePcs(sc('harmMin'), 9)).toContain(8) // G# na menor harmônica de Lá
  })

  it('escala por acorde', () => {
    const c = (s: string) => parseChord(s)!
    const Amaj = { root: 9, minor: false }
    const Amin = { root: 9, minor: true }
    expect(chordScale(c('A7'), Amaj).id).toBe('mixo')
    expect(chordScale(c('Bm7'), Amaj).id).toBe('dorian')
    expect(chordScale(c('Am'), Amin).id).toBe('minor')
    expect(chordScale(c('Dm'), Amin).id).toBe('dorian')
    expect(chordScale(c('D'), Amaj).id).toBe('lydian') // IV de Lá maior: lídio (G# do tom, não G)
    expect(chordScale(c('A5'), Amaj).id).toBe('pentMin')
  })

  it('escala pela função no tom (auditoria 5.7 e 5.8)', () => {
    const c = (s: string) => parseChord(s)!
    const C = { root: 0, minor: false }
    const Am = { root: 9, minor: true }
    const id = (ch: string, k: { root: number; minor: boolean }) => chordScale(c(ch), k).id
    // Dó maior: I jônio, ii dórico, iii frígio, IV lídio, V mixolídio, vi eólio, viiø lócrio
    expect(['C7M', 'Dm7', 'Em7', 'F7M', 'G7', 'Am7', 'Bm7(b5)'].map((x) => id(x, C))).toEqual(['major', 'dorian', 'phrygian', 'lydian', 'mixo', 'minor', 'locrian'])
    // Lá menor: i eólio, iiø lócrio, bIII jônio, iv dórico, v frígio, V7 frígio dominante, bVI lídio, bVII mixolídio
    expect(['Am7', 'Bm7(b5)', 'C7M', 'Dm7', 'Em7', 'E7', 'F7M', 'G7'].map((x) => id(x, Am))).toEqual(['minor', 'locrian', 'major', 'dorian', 'phrygian', 'phrygDom', 'lydian', 'mixo'])
    // blues: os três dominantes em mixolídio
    expect(['A7', 'D7', 'E7'].map((x) => id(x, { root: 9, minor: false }))).toEqual(['mixo', 'mixo', 'mixo'])
    // fora do tom, pela qualidade: A7 em Dó (dominante secundário) e Bb (empréstimo)
    expect(id('A7', C)).toBe('mixo')
    expect(id('Bb', C)).toBe('major')
  })

  it('cada modo escolhido contém todas as notas do acorde e só notas do tom quando o acorde é do tom', () => {
    const c = (s: string) => parseChord(s)!
    const C = { root: 0, minor: false }
    const diat = [0, 2, 4, 5, 7, 9, 11]
    for (const ch of ['C7M', 'Dm7', 'Em7', 'F7M', 'G7', 'Am7', 'Bm7(b5)']) {
      const x = c(ch)
      const pcs = scalePcs(chordScale(x, C), x.root)
      for (const s of x.semitones) expect(pcs, ch).toContain((x.root + s) % 12)
      for (const p of pcs) expect(diat, `${ch}: ${p}`).toContain(p)
    }
    // V7 de Lá menor: E G# B D cabem no frígio dominante de Mi
    const e7 = c('E7')
    const pcs = scalePcs(chordScale(e7, { root: 9, minor: true }), 4)
    for (const s of e7.semitones) expect(pcs).toContain((4 + s) % 12)
    expect(pcs).toContain(8) // G#, a sensível de Lá
  })
})

describe('progressões', () => {
  it('blues de 12 em Lá', () => {
    expect(realize(PROGRESSIONS[0], 'A').map((c) => c.symbol)).toEqual(['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'])
  })

  it('progressões menores em Lá menor', () => {
    const sym = (id: string) => realize(PROGRESSIONS.find((p) => p.id === id)!, 'A').map((c) => c.symbol)
    expect(sym('bluesMinor')).toEqual(['Am7', 'Am7', 'Am7', 'Am7', 'Dm7', 'Dm7', 'Am7', 'Am7', 'F7', 'E7', 'Am7', 'E7'])
    expect(sym('minorIivv')).toEqual(['Am', 'Dm', 'Em', 'Am'])
    expect(sym('minorPop')).toEqual(['Am', 'F', 'C', 'G'])
    expect(sym('andalusian')).toEqual(['Am', 'G', 'F', 'E7'])
    // todas as menores começam num acorde menor (a base soa menor)
    for (const p of PROGRESSIONS.filter((x) => x.minor)) expect(realize(p, 'E')[0].minor, p.id).toBe(true)
    for (const p of PROGRESSIONS.filter((x) => !x.minor)) expect(realize(p, 'E')[0].minor, p.id).toBe(false)
  })

  it('trocar o modo do tom troca a progressão pela equivalente', () => {
    expect(progressionFor('blues12', true).id).toBe('bluesMinor')
    expect(progressionFor('bluesMinor', false).id).toBe('blues12')
    expect(progressionFor('pop', true).id).toBe('minorPop')
    expect(progressionFor('rock', true).id).toBe('minorRock')
    // já está no modo pedido: fica a mesma
    expect(progressionFor('andalusian', true).id).toBe('andalusian')
    expect(progressionFor('blues12quick', false).id).toBe('blues12quick')
    // toda progressão tem par no outro modo
    for (const p of PROGRESSIONS) expect(!!progressionFor(p.id, !p.minor).minor, p.id).toBe(!p.minor)
  })

  it('nome do tom', () => {
    expect(keyLabel('A', true)).toBe('Am (Lá menor)')
    expect(keyLabel('F#', false)).toBe('F# (Fá# maior)')
    expect(keyShort('Bb', true)).toBe('Bbm')
  })

  it('progressão digitada: repetição, separadores e cifras inválidas', () => {
    const { chords, invalid } = parseProgression('Am*2 G | F, E7 X9z D/F#')
    expect(chords.map((c) => c.symbol)).toEqual(['Am', 'Am', 'G', 'F', 'E7', 'D/F#'])
    expect(invalid).toEqual(['X9z'])
  })
})
