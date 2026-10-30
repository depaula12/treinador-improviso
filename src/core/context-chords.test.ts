import { describe, expect, it } from 'vitest'
import { buildCorpus, suggestFromContext } from './context-chords'
import type { KeyGuess } from './key'
import { parseChord } from './theory'

const K = (root: number, mode: 'major' | 'minor'): KeyGuess => ({ root, mode, score: 1, name: '' })
const chords = (s: string) => s.split(' ').map((x) => parseChord(x)!)
const corpus = buildCorpus()
const syms = (r: ReturnType<typeof suggestFromContext>, kind?: string) =>
  r.suggestions.filter((s) => !kind || s.kind === kind).map((s) => s.symbol)

describe('sugestão pelo contexto', () => {
  it('I–V–vi em Lá: o mais comum agora é o IV (D)', () => {
    const r = suggestFromContext(chords('A E F#m'), K(9, 'major'), corpus)
    expect(syms(r, 'segura')[0]).toBe('D')
    expect(r.context).toEqual(['I', 'V', 'vi'])
    expect(r.suggestions[0].reason).toContain('I–V–vi')
  })

  it('olha o contexto, não só o último acorde: o mesmo E leva a lugares diferentes', () => {
    // depois de A–E no pop, vem F#m; depois de A7–D7–A7–E7 no blues, volta para D7 ou A7
    const pop = suggestFromContext(chords('D A E'), K(9, 'major'), corpus)
    const blues = suggestFromContext(chords('A7 D7 A7 E7'), K(9, 'major'), corpus)
    expect(syms(pop, 'segura')[0]).toBe('F#m')
    expect(['D7', 'A7']).toContain(syms(blues, 'segura')[0])
  })

  it('blues: depois de I7–IV7–I7 vem o V7', () => {
    const r = suggestFromContext(chords('A7 D7 A7'), K(9, 'major'), corpus)
    expect(syms(r, 'segura')).toContain('E7')
  })

  it('menor: i–bVII–bVI pede bVII ou V7', () => {
    const r = suggestFromContext(chords('Am G F'), K(9, 'minor'), corpus)
    const top = syms(r, 'segura').slice(0, 2)
    expect(top.some((s) => s === 'G' || s === 'E7')).toBe(true)
  })

  it('as músicas da banda entram no banco e pesam mais', () => {
    // progressão incomum: C → Eb → F; sem a música, Eb não leva a F
    const song = { title: 'Música da Banda', key: 'C', chords: ['C', 'Eb', 'F', 'C', 'Eb', 'F'] }
    const r = suggestFromContext(chords('C Eb'), K(0, 'major'), buildCorpus([song]))
    expect(r.suggestions[0].symbol).toBe('F')
    expect(r.suggestions[0].reason).toContain('Música da Banda')
  })

  it('até 6 opções, sem repetir e sem sugerir o acorde atual; tem casa e surpresa', () => {
    for (const [h, k] of [['G D Em', K(7, 'major')], ['Em D C', K(4, 'minor')], ['A7 D7', K(9, 'major')], ['C F G', K(0, 'major')]] as const) {
      const r = suggestFromContext(chords(h), k, corpus)
      const all = syms(r)
      expect(all.length).toBeLessThanOrEqual(6)
      expect(new Set(all).size).toBe(all.length)
      expect(all).not.toContain(h.split(' ').at(-1))
      expect(r.suggestions.some((s) => s.kind === 'surpresa')).toBe(true)
      for (const s of r.suggestions) {
        expect(parseChord(s.symbol), s.symbol).not.toBeNull()
        expect(s.reason.length).toBeGreaterThan(10)
      }
    }
  })

  it('a volta para casa aparece quando a tônica não está entre as comuns', () => {
    const r = suggestFromContext(chords('C F'), K(0, 'major'), corpus)
    expect(syms(r)).toContain('C')
  })

  it('acorde fora de qualquer contexto ainda recebe sugestões (reserva)', () => {
    const r = suggestFromContext(chords('F#'), K(7, 'major'), corpus)
    expect(r.suggestions.length).toBeGreaterThan(2)
  })
})
