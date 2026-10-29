import { describe, expect, it } from 'vitest'
import { parseChord } from './theory'
import { formulaName, matchQuality, QUALITIES, voicingPcs, voicingsFor } from './voicings'

describe('banco de desenhos', () => {
  const all = QUALITIES.flatMap((q) => Array.from({ length: 12 }, (_, r) => voicingsFor(q.id, r).map((v) => ({ q, r, v })))).flat()

  it('tem desenhos para todos os tipos nos 12 tons', () => {
    expect(all.length).toBeGreaterThan(240)
  })

  it.each(all.map(({ q, r, v }) => [`${v.symbol} (${v.form})`, q, r, v] as const))('%s forma o acorde certo', (_, q, r, v) => {
    const played = v.frets.filter((f): f is number => f !== null)
    // casas válidas (o bug das casas negativas passava despercebido sem isto)
    for (const f of played) expect(f).toBeGreaterThanOrEqual(0)
    for (const f of played) expect(f).toBeLessThanOrEqual(17)

    const got = new Set(voicingPcs(v))
    const want = new Set(q.pcs.map((s) => (r + s) % 12))
    // todas as notas tocadas pertencem ao acorde
    for (const pc of got) expect(want.has(pc)).toBe(true)
    // pode omitir a 5ª (ex.: C7 aberto x32310), mas nunca a fundamental, a 3ª ou a 7ª
    for (const pc of want) if ((pc - r + 12) % 12 !== 7) expect(got.has(pc)).toBe(true)
    // nota mais grave = fundamental
    expect(voicingPcs(v)[0]).toBe(r)
    // abertura tocável
    const pressed = played.filter((f) => f > 0)
    if (pressed.length) expect(Math.max(...pressed) - Math.min(...pressed)).toBeLessThanOrEqual(4)
  })
})

describe('decodificador', () => {
  it.each([
    ['Bm7', 'm7', '1 b3 5 b7'],
    ['F#7', '7', '1 3 5 b7'],
    ['C7M', '7M', '1 3 5 7'],
    ['Cadd9', 'add9', '1 3 5 9'],
    ['Dsus4', 'sus4', '1 4 5'],
    ['A5', '5', '1 5'],
  ])('%s é %s com fórmula %s', (sym, quality, formula) => {
    const c = parseChord(sym)!
    const q = matchQuality(c)
    expect(q?.id).toBe(quality)
    expect(c.semitones.map((s) => formulaName(s, q?.id)).join(' ')).toBe(formula)
  })

  it('acordes fora do banco são reconhecidos, mas sem qualidade', () => {
    const c = parseChord('Bdim')
    expect(c).not.toBeNull()
    expect(matchQuality(c!)).toBeNull()
  })
})
