import { midiInRange, type ChordInfo } from '../core/theory'

const LOW = 50 // D3: nota mais grave permitida no voicing
const HIGH = 74 // D5: nota mais aguda

/** Todas as inversões em posição fechada dentro de [LOW, HIGH]. */
function candidates(chord: ChordInfo): number[][] {
  // até 4 notas; em acordes maiores que isso, descarta a 5ª
  let tones = chord.semitones.map((s) => (chord.root + s) % 12)
  if (tones.length > 4) tones = tones.filter((_, i) => chord.semitones[i] !== 7)
  const out: number[][] = []
  for (let inv = 0; inv < tones.length; inv++) {
    const order = [...tones.slice(inv), ...tones.slice(0, inv)]
    for (let base = LOW; base < LOW + 12; base++) {
      if (base % 12 !== order[0]) continue
      for (const shift of [0, 12]) {
        const v: number[] = []
        let cur = base + shift
        for (const pc of order) {
          while (cur % 12 !== pc) cur++
          v.push(cur)
          cur++
        }
        if (v[v.length - 1] <= HIGH) out.push(v)
      }
    }
  }
  return out
}

function distance(a: number[], b: number[]): number {
  // compara notas em ordem; tamanhos diferentes contam a nota excedente contra a mais próxima
  const n = Math.max(a.length, b.length)
  let d = 0
  for (let i = 0; i < n; i++) d += Math.abs(a[Math.min(i, a.length - 1)] - b[Math.min(i, b.length - 1)])
  return d
}

/**
 * Violão: forma de pestana "E" com a fundamental na 6ª corda (R 5 R 3 5 R),
 * trocando a oitava do meio pela 7ª quando o acorde tem sétima.
 */
export function guitarVoicing(chord: ChordInfo): number[] {
  const r = midiInRange(chord.root, 40) // E2..D#3
  const has = (s: number) => chord.semitones.includes(s)
  const third = has(3) && !has(4) ? 3 : has(2) ? 2 : has(5) ? 5 : 4 // sus2/sus4 substituem a 3ª
  const seventh = has(10) ? 10 : has(11) ? 11 : 12
  const isPower = chord.semitones.length === 2
  if (isPower) return [r, r + 7, r + 12]
  return [r, r + 7, r + seventh, r + 12 + third, r + 19, r + 24]
}

/** Voicing com menor movimento em relação ao anterior (voice leading). */
export function voiceLead(chord: ChordInfo, prev: number[] | null): number[] {
  const cs = candidates(chord)
  const ref = prev ?? [57, 60, 64, 67] // centro do teclado
  let best = cs[0]
  let bestD = Infinity
  for (const c of cs) {
    // penaliza levemente voicings que derivam para os extremos
    const center = Math.abs(c.reduce((s, x) => s + x, 0) / c.length - 62) * 0.5
    const d = distance(c, ref) + center
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}
