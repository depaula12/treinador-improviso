import { keyUsesFlats, newId, transposeChord, transposeKey, type Song } from './song'
import { KEYS, parseChord } from './theory'

// A composição da área Compor: seções com acordes, cada um com a sua duração e (opcional) o
// desenho escolhido no braço. Funções puras: a tela só guarda o resultado.

/** duração em tempos: ½ compasso, 1 ou 2 compassos */
export const DURATIONS = [
  { beats: 2, label: '½' },
  { beats: 4, label: '1' },
  { beats: 8, label: '2' },
] as const

export interface CompChord {
  id: string
  symbol: string
  /** tempos (2, 4 ou 8) */
  beats: number
  /** desenho escolhido: casa por corda, da 6ª para a 1ª (null = abafada); sem isso, o mais simples */
  frets?: (number | null)[] | null
}

export interface CompSection {
  id: string
  name: string
  chords: CompChord[]
  /** levada do violão nesta seção (id de STRUMS); sem isso, a do estilo */
  strum?: string | null
}

/** Posição de um acorde: seção e índice dentro dela. */
export interface Place {
  sec: number
  idx: number
}

export const newChord = (symbol: string, beats = 4): CompChord => ({ id: newId(), symbol, beats })
export const newSection = (name: string, chords: CompChord[] = []): CompSection => ({ id: newId(), name, chords })

/** Nome do tom, como "Am" ou "Bb". */
export const keyName = (root: number, minor: boolean) => KEYS[root] + (minor ? 'm' : '')

const edit = (sections: CompSection[], sec: number, fn: (chords: CompChord[]) => CompChord[]) =>
  sections.map((s, i) => (i === sec ? { ...s, chords: fn([...s.chords]) } : s))

/** Insere os acordes na seção `sec`, antes do índice `at` (at = tamanho: no fim). Cifras inválidas ficam de fora. */
export function insertChords(sections: CompSection[], sec: number, at: number, symbols: string[], beats = 4): CompSection[] {
  const add = symbols.filter((s) => parseChord(s)).map((s) => newChord(s, beats))
  return edit(sections, sec, (cs) => {
    cs.splice(Math.max(0, Math.min(at, cs.length)), 0, ...add)
    return cs
  })
}

export function updateChord(sections: CompSection[], p: Place, patch: Partial<Omit<CompChord, 'id'>>): CompSection[] {
  return edit(sections, p.sec, (cs) => cs.map((c, i) => (i === p.idx ? { ...c, ...patch } : c)))
}

/** Troca a cifra (o desenho escolhido era de outro acorde: volta ao mais simples). */
export function replaceChord(sections: CompSection[], p: Place, symbol: string): CompSection[] {
  if (!parseChord(symbol)) return sections
  return updateChord(sections, p, { symbol, frets: null })
}

export const removeChord = (sections: CompSection[], p: Place) => edit(sections, p.sec, (cs) => cs.filter((_, i) => i !== p.idx))

export function duplicateChord(sections: CompSection[], p: Place): CompSection[] {
  return edit(sections, p.sec, (cs) => {
    if (cs[p.idx]) cs.splice(p.idx + 1, 0, { ...cs[p.idx], id: newId() })
    return cs
  })
}

/**
 * Move o acorde de `from` para antes do acorde `to` (contado antes de tirar; to.idx = tamanho da
 * seção põe no fim). Pode mudar de seção. Devolve as seções e onde o acorde foi parar.
 */
export function moveChord(sections: CompSection[], from: Place, to: Place): { sections: CompSection[]; at: Place } {
  const c = sections[from.sec]?.chords[from.idx]
  if (!c || !sections[to.sec]) return { sections, at: from }
  let idx = to.idx
  if (to.sec === from.sec && from.idx < to.idx) idx--
  const without = removeChord(sections, from)
  idx = Math.max(0, Math.min(idx, without[to.sec].chords.length))
  const out = edit(without, to.sec, (cs) => {
    cs.splice(idx, 0, c)
    return cs
  })
  return { sections: out, at: { sec: to.sec, idx } }
}

/**
 * Transpõe tudo `n` semitons, com a grafia do tom de chegada. Os desenhos escolhidos sobem junto
 * quando ainda cabem no braço sem corda solta; senão voltam ao mais simples.
 */
export function transposeSections(sections: CompSection[], n: number, fromKey: string): CompSection[] {
  const shift = ((n % 12) + 12) % 12
  if (!shift) return sections
  const flats = keyUsesFlats(transposeKey(fromKey, shift))
  // para baixo quando fica mais perto (de C para A: -3, não +9)
  const fretShift = shift > 6 ? shift - 12 : shift
  return sections.map((s) => ({
    ...s,
    chords: s.chords.map((c) => {
      let frets: CompChord['frets'] = null
      if (c.frets) {
        const moved = c.frets.map((f) => (f === null ? null : f + fretShift))
        const used = c.frets.filter((f): f is number => f !== null)
        const ok = !used.includes(0) && moved.every((f) => f === null || (f >= 1 && f <= 17))
        frets = ok ? moved : null
      }
      return { ...c, symbol: transposeChord(c.symbol, shift, flats), frets }
    }),
  }))
}

/** Os acordes na ordem em que tocam. */
export const playSequence = (sections: CompSection[]) => sections.flatMap((s) => s.chords)

/** Total em compassos (½ conta meio). */
export const totalBars = (sections: CompSection[]) => playSequence(sections).reduce((t, c) => t + c.beats, 0) / 4

/** Levada do violão de cada compasso tocado: a da seção em que o compasso começa. */
export function barStrums(sections: CompSection[]): (string | null)[] {
  const out: (string | null)[] = []
  let at = 0
  for (const s of sections) {
    for (const c of s.chords) {
      for (let b = Math.ceil(at / 4); b * 4 < at + c.beats; b++) out[b] ??= s.strum ?? null
      at += c.beats
    }
  }
  return out
}

/** A composição vira uma música da área Músicas: um acorde por compasso da grade, com as durações marcadas. */
export function compositionSong(o: { title: string; key: string; bpm: number; styleId: string; sections: CompSection[] }, now = Date.now()): Song {
  const sections = o.sections.filter((s) => s.chords.length)
  const seq = playSequence(sections)
  return {
    id: newId(),
    title: o.title,
    artist: '',
    key: o.key,
    transpose: 0,
    bpm: o.bpm,
    styleId: o.styleId,
    sections: sections.map((s) => ({ name: s.name, bars: s.chords.map((c) => [c.symbol]) })),
    timing: { beats: seq.map((c) => c.beats), sequence: seq.map((c) => c.symbol), bpm: o.bpm },
    useTiming: true,
    createdAt: now,
    updatedAt: now,
  }
}

/** Rascunho da versão 1 (seções com uma lista de cifras, um compasso cada). */
export function fromV1(sections: { name: string; chords: string[] }[]): CompSection[] {
  return sections.map((s) => newSection(s.name, s.chords.map((c) => newChord(c))))
}
