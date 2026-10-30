import { describe, expect, it } from 'vitest'
import { NoteOnsets, type NoteEvent } from './onset'
import { freqToNote, type NoteReading } from './pitch'

const note = (midi: number): NoteReading => freqToNote(440 * 2 ** ((midi - 69) / 12))
const FRAME = 1000 / 60

/** Simula quadros de 60/s: cada trecho é [midi ou null, dB, duração em ms]. */
function run(parts: [number | null, number, number][], o = new NoteOnsets()) {
  const out: NoteEvent[] = []
  let t = 0
  for (const [midi, db, ms] of parts) {
    for (let k = 0; k < ms / FRAME; k++) {
      // a corda decai depois do ataque: ~0,5 dB por quadro
      const e = o.push(midi === null ? null : note(midi), db - k * 0.5, t)
      if (e) out.push(e)
      t += FRAME
    }
  }
  return out
}

describe('cada nota tocada vira um evento', () => {
  it('três notas diferentes, com silêncio entre elas', () => {
    const ev = run([[null, -80, 100], [57, -20, 300], [null, -80, 200], [60, -20, 300], [null, -80, 200], [62, -22, 300]])
    expect(ev.map((e) => e.midi)).toEqual([57, 60, 62])
    expect(ev.every((e) => e.attack)).toBe(true)
  })

  it('a mesma nota palhetada duas vezes seguidas conta duas vezes (o volume salta de novo)', () => {
    const ev = run([[null, -80, 100], [57, -20, 250], [57, -34, 60], [57, -18, 250]])
    expect(ev.map((e) => e.midi)).toEqual([57, 57])
  })

  it('ligado / slide: troca de nota sem palhetada também conta', () => {
    const ev = run([[null, -80, 100], [57, -20, 250], [59, -26, 250], [60, -29, 250]])
    expect(ev.map((e) => e.midi)).toEqual([57, 59, 60])
    expect(ev.slice(1).every((e) => !e.attack)).toBe(true)
  })

  it('nota sustentada não vira várias, e um salto de oitava isolado sem ataque é ignorado', () => {
    const ev = run([[null, -80, 100], [45, -20, 400], [57, -40, 50], [45, -41, 300]])
    expect(ev.map((e) => e.midi)).toEqual([45])
  })

  it('leitura de um quadro só (ruído) não vira nota', () => {
    const ev = run([[null, -80, 100], [64, -30, FRAME], [null, -80, 200]])
    expect(ev).toEqual([])
  })

  it('cada evento tem id novo e sai em até ~50 ms depois da palhetada', () => {
    const o = new NoteOnsets()
    const ev = run([[null, -80, 100], [57, -20, 300], [null, -80, 200], [57, -20, 300]], o)
    expect(new Set(ev.map((e) => e.id)).size).toBe(2)
    // começou em 100 ms; confirmação em 2 quadros
    expect(ev[0].t - 100).toBeLessThanOrEqual(50)
  })
})
