import { Note } from 'tonal'
import type { ParsedCifra } from './cifra'
import { estimateKey, tonicHints, weightsFromChords } from './key'
import { KEYS, parseChord } from './theory'

// Música do repertório: seções com compassos (1 acorde ou 2 em 2+2), transposição e andamento.

export interface SongSection {
  name: string
  bars: string[][]
}

export interface Song {
  id: string
  title: string
  artist: string
  /** tom como está escrito na cifra (antes de transpor) */
  key: string
  /** semitons aplicados por cima da cifra (inclui o capotraste) */
  transpose: number
  bpm: number
  styleId: string
  sections: SongSection[]
  /** durações marcadas com a gravação (modo "marcar trocas"); sem isso, 1 compasso por acorde */
  timing?: SongTiming | null
  /** usa as durações marcadas (se ainda batem com a grade) */
  useTiming?: boolean
  createdAt: number
  updatedAt: number
}

export interface SongTiming {
  /** duração de cada acorde da grade, em tempos */
  beats: number[]
  /** acordes da grade na hora da marcação: se a grade mudar, a marcação não vale mais */
  sequence: string[]
  bpm: number
}

/** Um acorde tocado, com duração e a célula da grade de onde veio. */
export interface TimedChord {
  chord: string
  beats: number
  section: number
  bar: number
}

/** Trecho de um compasso tocado: acorde que entra no tempo `beat` (0–3). */
export interface Segment {
  beat: number
  chord: string
}

export interface FlatBar {
  section: number
  bar: number
  /** já transpostos */
  chords: string[]
}

const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])
/** O tom ("Bb", "Dm") se escreve com bemóis? */
export const keyUsesFlats = (key: string) => FLAT_KEYS.has(key)
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

const mod12 = (n: number) => ((n % 12) + 12) % 12

/** Nome da nota em `pc`, com bemol ou sustenido conforme o tom. */
function spell(pc: number, flats: boolean) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)]
}

/** Tom transposto ("Bm" + 2 -> "C#m"). */
export function transposeKey(key: string, n: number): string {
  const m = key.match(/^([A-G][#b]?)(m?)$/)
  if (!m) return key
  const pc = mod12((Note.chroma(m[1]) ?? 0) + n)
  const minor = m[2] === 'm'
  // escolhe a grafia mais comum do tom de chegada
  const sharp = spell(pc, false) + m[2]
  const flat = spell(pc, true) + m[2]
  if (FLAT_KEYS.has(flat)) return flat
  if (!minor && spell(pc, true) === 'Db') return flat
  return sharp
}

/** Transpõe uma cifra mantendo o sufixo e o baixo: "D/F#" + 2 -> "E/G#". */
export function transposeChord(symbol: string, n: number, flats = false): string {
  if (!n) return symbol
  const m = symbol.match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/)
  if (!m) return symbol
  const [, root, suffix, bass] = m
  const move = (note: string) => spell((Note.chroma(note) ?? 0) + n, flats)
  return move(root) + suffix + (bass ? `/${move(bass)}` : '')
}

/** Tom mais provável pelos acordes (cada compasso pesa igual; o 1º acorde ganha dica de tônica). */
export function guessKey(bars: string[][]): string {
  const hist = bars.flat().filter((s) => parseChord(s)).map((symbol) => ({ symbol, ms: 1000 }))
  if (!hist.length) return 'C'
  const [best] = estimateKey(weightsFromChords(hist), tonicHints(hist))
  return KEYS[best.root] + (best.mode === 'minor' ? 'm' : '')
}

let seq = 0
export const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`

export function songFromCifra(p: ParsedCifra, now = Date.now()): Song {
  const bars = p.sections.flatMap((s) => s.bars)
  return {
    id: newId(),
    title: p.title || 'Música sem nome',
    artist: p.artist,
    key: p.key ?? guessKey(bars),
    // com capotraste, os desenhos da cifra soam N semitons acima: a base toca no tom real
    transpose: p.capo,
    bpm: 90,
    styleId: 'rock',
    sections: p.sections.map((s) => ({ name: s.name, bars: s.bars.map((b) => [...b]) })),
    createdAt: now,
    updatedAt: now,
  }
}

/** Tom em que a música soa (escrito + transposição). */
export const soundingKey = (song: Song) => transposeKey(song.key, song.transpose)

/** Todos os compassos em ordem, já transpostos. */
export function flatBars(song: Song): FlatBar[] {
  const flats = FLAT_KEYS.has(soundingKey(song))
  return song.sections.flatMap((s, section) =>
    s.bars.map((b, bar) => ({ section, bar, chords: b.map((c) => transposeChord(c, song.transpose, flats)) })),
  )
}

/** Acordes diferentes da música (transpostos), na ordem em que aparecem. */
export function songChords(song: Song): string[] {
  return [...new Set(flatBars(song).flatMap((b) => b.chords))]
}

/** Acordes da grade em ordem, como estão escritos (sem transpor). */
export const writtenSequence = (song: Song) => song.sections.flatMap((s) => s.bars.flat())

/** A marcação de tempos ainda corresponde à grade? */
export const timingValid = (song: Song) =>
  !!song.timing && song.timing.sequence.join(' ') === writtenSequence(song).join(' ')

/** Usa as durações marcadas agora? */
export const usesTiming = (song: Song) => !!song.useTiming && timingValid(song)

/**
 * Acordes na ordem em que tocam, com a duração em tempos.
 * Sem marcação: cada compasso dura 4 tempos, dividido igualmente entre os acordes dele (2+2).
 */
export function timedChords(song: Song): TimedChord[] {
  const flats = FLAT_KEYS.has(soundingKey(song))
  const beats = usesTiming(song) ? song.timing!.beats : null
  let k = 0
  return song.sections.flatMap((s, section) =>
    s.bars.flatMap((b, bar) =>
      b.map((c) => ({ chord: transposeChord(c, song.transpose, flats), beats: beats ? beats[k++] : 4 / b.length, section, bar })),
    ),
  )
}

/** Corta a sequência em compassos de 4 tempos (o acorde que atravessa a barra continua no seguinte). */
export function toPlayBars(seq: { chord: string; beats: number }[]): Segment[][] {
  const bars: Segment[][] = []
  let at = 0
  for (const { chord, beats } of seq) {
    let left = beats
    while (left > 0) {
      const bar = Math.floor(at / 4)
      const beat = at % 4
      bars[bar] ??= []
      const segs = bars[bar]
      // mesmo acorde seguido no mesmo compasso: um trecho só
      if (!(segs.length && segs[segs.length - 1].chord === chord)) segs.push({ beat, chord })
      const take = Math.min(left, 4 - beat)
      at += take
      left -= take
    }
  }
  return bars
}

/** Início (em tempos) de cada acorde da sequência. */
export function startBeats(seq: { beats: number }[]): number[] {
  let at = 0
  return seq.map((x) => {
    const s = at
    at += x.beats
    return s
  })
}

// ---------- edição da grade (funções puras: devolvem uma cópia) ----------

type Edit = (bars: string[][]) => string[][]

function editSection(song: Song, section: number, fn: Edit): Song {
  return {
    ...song,
    updatedAt: Date.now(),
    sections: song.sections.map((s, i) => (i === section ? { ...s, bars: fn(s.bars.map((b) => [...b])) } : s)),
  }
}

/** Junta o compasso com o seguinte: os dois acordes dividem o compasso (2+2). */
export const mergeNext = (song: Song, section: number, bar: number) =>
  editSection(song, section, (bars) => {
    const a = bars[bar]
    const b = bars[bar + 1]
    if (!a || !b || a.length + b.length > 2) return bars
    bars.splice(bar, 2, [...a, ...b])
    return bars
  })

/** Separa um compasso 2+2 em dois compassos inteiros. */
export const splitBar = (song: Song, section: number, bar: number) =>
  editSection(song, section, (bars) => {
    const a = bars[bar]
    if (!a || a.length < 2) return bars
    bars.splice(bar, 1, [a[0]], [a[1]])
    return bars
  })

/** Repete o compasso logo depois dele (acorde que dura 2 compassos). */
export const duplicateBar = (song: Song, section: number, bar: number) =>
  editSection(song, section, (bars) => {
    if (!bars[bar]) return bars
    bars.splice(bar + 1, 0, [...bars[bar]])
    return bars
  })

export const deleteBar = (song: Song, section: number, bar: number) =>
  editSection(song, section, (bars) => bars.filter((_, i) => i !== bar))

/** Troca os acordes do compasso ("G D" vira 2+2). Retorna null se alguma cifra for inválida. */
export function setBar(song: Song, section: number, bar: number, text: string): Song | null {
  const chords = text.split(/\s+/).filter(Boolean)
  if (!chords.length || chords.length > 2 || !chords.every((c) => parseChord(c))) return null
  return editSection(song, section, (bars) => {
    bars[bar] = chords
    return bars
  })
}

/** Repete a seção inteira logo depois dela (ex.: refrão 2x). */
export function duplicateSection(song: Song, section: number): Song {
  const s = song.sections[section]
  if (!s) return song
  const copy = { name: s.name, bars: s.bars.map((b) => [...b]) }
  return { ...song, updatedAt: Date.now(), sections: [...song.sections.slice(0, section + 1), copy, ...song.sections.slice(section + 1)] }
}

export function deleteSection(song: Song, section: number): Song {
  return { ...song, updatedAt: Date.now(), sections: song.sections.filter((_, i) => i !== section) }
}
