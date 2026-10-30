import { allShapes, placeShape, rootsOf, shapesFor, voicingMidi, type ShapeCard, type ShapeKind } from '../../core/chord-bank'
import { TUNING } from '../../core/fretboard-model'
import { KEYS, parseChord } from '../../core/theory'
import { formulaName, matchQuality, QUALITIES, qualityById, symbolOf, type Voicing } from '../../core/voicings'
import { drawWeighted, type CardStat } from './leitner'

// Quiz de acordes: um "item" é o que se quer decorar (um desenho, uma nota de um grau, uma
// diferença entre dois acordes); a pergunta sorteia a fundamental e monta as alternativas.

export type QuestionType = 'cifra-desenho' | 'desenho-cifra' | 'grau-no-desenho' | 'nota-do-grau' | 'comparar' | 'cifra-notas' | 'cronometrado'
export type QuizMode = QuestionType | 'misturado'

export const QUESTION_LABEL: Record<QuestionType, string> = {
  'cifra-desenho': 'Cifra → desenho',
  'desenho-cifra': 'Desenho → cifra',
  'grau-no-desenho': 'Graus no desenho (clique na bolinha)',
  'nota-do-grau': 'Nota de cada grau (3ª, 5ª, 9ª…)',
  comparar: 'O que muda de um acorde para outro',
  'cifra-notas': 'Cifra → notas',
  cronometrado: 'Cronometrado (com a guitarra)',
}
/** tipos que dependem de um desenho no braço */
export const SHAPE_TYPES: QuestionType[] = ['cifra-desenho', 'desenho-cifra', 'grau-no-desenho', 'cronometrado']

const LOW = [...TUNING].reverse()

export interface Item {
  key: string
  type: QuestionType
  quality: string
  card?: ShapeCard
  /** fundamental fixa (forma aberta, acordes de uma música) */
  root?: number
  /** nota-do-grau: o intervalo pedido (semitons) */
  interval?: number
  /** comparar: de qual tipo para qual */
  from?: string
}

export interface Option {
  label: string
  voicing?: Voicing
  notes?: string[]
}

export interface Question {
  item: Item
  type: QuestionType
  root: number
  symbol: string
  prompt: string
  sub?: string
  /** desenho mostrado na pergunta (desenho → cifra, graus no desenho) ou revelado (cronometrado) */
  voicing?: Voicing
  options: Option[]
  answer: number
  /** graus no desenho: cordas (0 = 6ª) que têm o grau pedido */
  answerStrings?: number[]
  /** depois de responder: o porquê */
  explain: string
  /** o que tocar no "ouvir a resposta" (um ou mais acordes, notas MIDI) */
  listen: number[][]
}

// ---------- níveis ----------

export interface LevelDef {
  qualities: string[]
  kinds: ShapeKind[]
  label: string
}
export const LEVELS: Record<1 | 2 | 3 | 4, LevelDef> = {
  1: { qualities: ['5', 'maj', 'm', '7'], kinds: ['aberta'], label: 'Abertos: maior, menor, 7 e power chord' },
  2: { qualities: ['5', 'maj', 'm', '7', 'm7'], kinds: ['aberta', 'pestana'], label: '+ pestanas na 6ª e 5ª corda e m7' },
  3: { qualities: ['5', 'maj', 'm', '7', 'm7', '7M', 'sus2', 'sus4', 'add9'], kinds: ['aberta', 'pestana', 'movel', 'triade'], label: '+ 7M, sus, add9, formas pelo braço e tríades' },
  4: { qualities: QUALITIES.map((q) => q.id), kinds: ['aberta', 'pestana', 'movel', 'triade'], label: 'Tudo: + 6, 9, 7(#9), m7(b5) e º7' },
}

// ---------- itens ----------

// "o que muda": de → para, e a mudança em palavras
const CHANGES: { from: string; to: string; what: string }[] = [
  { from: 'maj', to: 'm', what: 'a 3ª desce meio tom (3 → b3)' },
  { from: 'm', to: 'maj', what: 'a 3ª sobe meio tom (b3 → 3)' },
  { from: 'maj', to: '7', what: 'entra a 7ª menor (b7)' },
  { from: 'maj', to: '7M', what: 'entra a 7ª maior (7)' },
  { from: 'm', to: 'm7', what: 'entra a 7ª menor (b7)' },
  { from: '7', to: '7M', what: 'a 7ª sobe meio tom (b7 → 7)' },
  { from: 'maj', to: 'sus4', what: 'a 3ª sobe para a 4ª' },
  { from: 'maj', to: 'sus2', what: 'a 3ª desce para a 2ª' },
  { from: 'maj', to: 'add9', what: 'entra a 9ª, sem 7ª' },
  { from: '7', to: '9', what: 'entra a 9ª por cima do 7' },
  { from: 'maj', to: '6', what: 'entra a 6ª' },
  { from: 'm7', to: 'm7b5', what: 'a 5ª desce meio tom (5 → b5)' },
  { from: '7', to: '7#9', what: 'entra a 9ª aumentada (#9) junto com a 3ª maior' },
  { from: 'm7b5', to: 'dim7', what: 'a b7 desce meio tom e vira bb7' },
  { from: 'maj', to: '5', what: 'sai a 3ª: fica só fundamental e 5ª' },
]

export interface Filter {
  types: QuestionType[]
  qualities: string[]
  kinds: ShapeKind[]
  /** só os acordes desta lista (ex.: de uma música), com a fundamental fixa */
  songChords?: string[] | null
}

/** Os acordes de uma música viram (tipo, fundamental); os de fora do banco voltam em `skipped`. */
export function songTargets(chords: string[]): { targets: { quality: string; root: number }[]; skipped: string[] } {
  const targets: { quality: string; root: number }[] = []
  const skipped: string[] = []
  for (const sym of chords) {
    const c = parseChord(sym)
    const q = c ? matchQuality(c) : null
    if (!c || !q) skipped.push(sym)
    else if (!targets.some((t) => t.quality === q.id && t.root === c.root)) targets.push({ quality: q.id, root: c.root })
  }
  return { targets, skipped }
}

/** Tudo o que pode cair, dados os filtros. */
export function buildItems(f: Filter): Item[] {
  const items: Item[] = []
  const song = f.songChords ? songTargets(f.songChords).targets : null
  const qualities = song ? [...new Set(song.map((t) => t.quality))] : f.qualities
  const rootsFor = (q: string) => (song ? song.filter((t) => t.quality === q).map((t) => t.root) : null)

  for (const type of f.types) {
    if (SHAPE_TYPES.includes(type)) {
      for (const card of allShapes(qualities).filter((c) => f.kinds.includes(c.kind))) {
        const fixed = rootsFor(card.quality)
        if (!fixed) {
          items.push({ key: `${type}:${card.id}`, type, quality: card.quality, card, root: card.fixedRoot ?? undefined })
          continue
        }
        // música: o desenho só entra nas fundamentais dela em que ele cabe
        for (const root of fixed) {
          if (!placeShape(card, root)) continue
          items.push({ key: `${type}:${card.id}@${root}`, type, quality: card.quality, card, root })
        }
      }
    } else if (type === 'cifra-notas') {
      for (const q of qualities) for (const root of rootsFor(q) ?? KEYS.map((_, i) => i)) items.push({ key: `notas:${q}|${root}`, type, quality: q, root })
    } else if (type === 'nota-do-grau') {
      for (const q of qualities) {
        for (const iv of qualityById(q).pcs.filter((x) => x !== 0)) {
          const fixed = rootsFor(q)
          if (fixed) for (const root of fixed) items.push({ key: `grau:${q}|${iv}@${root}`, type, quality: q, interval: iv, root })
          else items.push({ key: `grau:${q}|${iv}`, type, quality: q, interval: iv })
        }
      }
    } else if (type === 'comparar') {
      for (const ch of CHANGES) {
        if (!qualities.includes(ch.to) && !qualities.includes(ch.from)) continue
        items.push({ key: `comparar:${ch.from}>${ch.to}`, type, quality: ch.to, from: ch.from })
      }
    }
  }
  return items
}

// ---------- sorteio ----------

/**
 * Item da vez: ponderado pela caixa (o que você erra sai mais), sem repetir os últimos itens
 * nem o mesmo acorde (tipo) em sequência quando há opção.
 */
export function drawItem(items: Item[], stats: Record<string, CardStat>, recent: string[], lastQuality?: string): Item {
  let pool = items.filter((i) => !recent.includes(i.key))
  const other = pool.filter((i) => i.quality !== lastQuality)
  if (other.length) pool = other
  if (!pool.length) pool = items
  return drawWeighted(pool, (i) => i.key, stats)
}

// ---------- perguntas ----------

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

// grafia de músico: em vez de Abm (Ab Cb Eb), G#m (G# B D#); em vez de Bbm7(b5) com Fb, A#m7(b5)
const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const AWKWARD = /(Cb|Fb|E#|B#|bb|##)/
/** Cifra do acorde nesta fundamental, com a grafia que dá notas "normais". */
export function spell(root: number, q: string): string {
  const def = qualityById(q)
  const flat = symbolOf(root, def)
  const notes = parseChord(flat)?.notes ?? []
  if (!notes.some((n) => AWKWARD.test(n.slice(1)) || /^(Cb|Fb)/.test(n))) return flat
  const sharp = SHARP[root] + def.suffix
  const sn = parseChord(sharp)?.notes ?? []
  return sn.some((n) => AWKWARD.test(n.slice(1))) ? flat : sharp
}

/** "3ª", "b3 (3ª menor)", "5ª", "b7 (7ª menor)"…: o grau como se fala. */
export function degLabel(iv: number, q: string): string {
  const f = formulaName(iv, q)
  const NAMES: Record<string, string> = {
    '1': 'fundamental', '2': '2ª', b3: 'b3 (3ª menor)', '3': '3ª', '4': '4ª', b5: 'b5 (5ª diminuta)', '5': '5ª', '#5': '#5 (5ª aumentada)',
    '6': '6ª', bb7: 'bb7 (7ª diminuta)', b7: 'b7 (7ª menor)', '7': '7ª (maior)', '9': '9ª', '#9': '#9 (9ª aumentada)', b9: 'b9',
  }
  return NAMES[f] ?? f
}

// dobrados (Bbb, F##) viram a nota equivalente que se usa na prática (A, G)
const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const plain = (n: string) => {
  const m = n.match(/^([A-G])(bb|##)$/)
  return m ? KEYS[(LETTER[m[1]] + (m[2] === 'bb' ? -2 : 2) + 12) % 12] : n
}
const notesOf = (root: number, q: string) => (parseChord(spell(root, q))?.notes ?? []).map(plain)
/** nome da nota de um grau do acorde (com a grafia certa: a 3ª de F# é A#, não Bb) */
function noteFor(root: number, q: string, iv: number): string {
  const c = parseChord(spell(root, q))
  const i = c ? c.semitones.findIndex((s) => s % 12 === iv) : -1
  return c && i >= 0 ? plain(c.notes[i]) : KEYS[(root + iv) % 12]
}
const formula = (q: string) => qualityById(q).pcs.map((s) => formulaName(s, q)).join(' ')
/** um desenho qualquer do acorde (para ouvir), o mais simples que cabe */
function anyVoicing(q: string, root: number): Voicing | null {
  for (const c of shapesFor(q)) {
    const v = placeShape(c, root)
    if (v) return v
  }
  return null
}
const listenOf = (v: Voicing | null) => (v ? [voicingMidi(v)] : [])

/** Monta a pergunta do item. `avoidRoot`: fundamental a evitar (a da pergunta anterior). */
export function makeQuestion(item: Item, avoidRoot?: number): Question {
  const card = item.card
  const roots = item.root !== undefined ? [item.root] : card ? rootsOf(card) : KEYS.map((_, i) => i)
  const root = pick(roots.length > 1 ? roots.filter((r) => r !== avoidRoot) : roots)
  const symbol = spell(root, item.quality)
  const placed = card ? placeShape(card, root)! : undefined
  const voicing = placed ? { ...placed, symbol } : undefined
  const others = shuffle(QUALITIES.filter((x) => x.id !== item.quality))
  const base = { item, type: item.type, root, symbol }

  if (item.type === 'cifra-desenho') {
    // distratores: OUTROS acordes (nomes diferentes) na mesma fundamental, de preferência do mesmo
    // tipo de forma e com o baixo na mesma corda: a diferença fica nos detalhes do desenho
    const seen = new Set([voicing!.frets.join()])
    const names = new Set([item.quality])
    const opts: Option[] = []
    const candidates = shuffle(others.flatMap((o) =>
      shapesFor(o.id).flatMap((c) => {
        const v = placeShape(c, root)
        return v ? [{ v: { ...v, symbol: spell(root, o.id) }, c, quality: o.id }] : []
      }),
    ))
    const score = (x: (typeof candidates)[number]) => (x.c.kind === card!.kind ? 2 : 0) + (x.c.bassString === card!.bassString ? 1 : 0)
    for (const x of candidates.sort((a, b) => score(b) - score(a))) {
      if (opts.length === 3) break
      if (seen.has(x.v.frets.join()) || names.has(x.quality)) continue
      seen.add(x.v.frets.join())
      names.add(x.quality)
      opts.push({ label: x.v.symbol, voicing: x.v })
    }
    const correct: Option = { label: symbol, voicing }
    const options = shuffle([...opts, correct])
    return {
      ...base, prompt: `Qual é o desenho de ${symbol}?`, sub: card!.label, options, answer: options.indexOf(correct),
      explain: `${symbol} = ${formula(item.quality)} (${notesOf(root, item.quality).join(' ')})`, listen: listenOf(voicing!),
    }
  }

  if (item.type === 'desenho-cifra') {
    const names = others.slice(0, 3).map((o) => spell(root, o.id))
    const correct: Option = { label: symbol }
    const options = shuffle([...names.map((label) => ({ label })), correct])
    return {
      ...base, prompt: 'Que acorde é este?', sub: card!.label, voicing, options, answer: options.indexOf(correct),
      explain: `${symbol} = ${formula(item.quality)} (${notesOf(root, item.quality).join(' ')})`, listen: listenOf(voicing!),
    }
  }

  if (item.type === 'grau-no-desenho') {
    // um grau que aparece no desenho; a fundamental só às vezes (o interessante são 3ª, 5ª, 7ª…)
    const present = voicing!.frets.flatMap((f, s) => (f === null ? [] : [{ s, iv: (LOW[s] + f - root + 1200) % 12 }]))
    const ivs = [...new Set(present.map((p) => p.iv))]
    const nonRoot = ivs.filter((i) => i !== 0)
    const iv = nonRoot.length && Math.random() > 0.15 ? pick(nonRoot) : 0
    const name = degLabel(iv, item.quality)
    return {
      ...base, prompt: `Neste ${symbol}, onde está a ${name}?`, sub: `${card!.label} · clique na bolinha`,
      voicing, options: [], answer: -1, answerStrings: present.filter((p) => p.iv === iv).map((p) => p.s),
      explain: `${symbol}: ${formula(item.quality)}. A ${name} é ${noteFor(root, item.quality, iv)}.`,
      listen: listenOf(voicing!),
    }
  }

  if (item.type === 'nota-do-grau') {
    const iv = item.interval!
    const notes = notesOf(root, item.quality)
    const pcs = qualityById(item.quality).pcs
    const correctName = noteFor(root, item.quality, iv)
    // distratores: outras notas do acorde e a vizinha de meio tom (o erro mais comum)
    const pool = shuffle([...notes.filter((n) => n !== correctName), KEYS[(root + iv + 1) % 12], KEYS[(root + iv + 11) % 12]])
    const opts = [...new Set(pool)].filter((n) => n !== correctName).slice(0, 3)
    const correct: Option = { label: correctName }
    const options = shuffle([...opts.map((label) => ({ label })), correct])
    const name = degLabel(iv, item.quality)
    return {
      ...base, prompt: `Qual é a ${name} de ${symbol}?`, options, answer: options.indexOf(correct),
      explain: `${symbol} = ${pcs.map((p) => `${formulaName(p, item.quality)}: ${noteFor(root, item.quality, p)}`).join(' · ')}`,
      listen: listenOf(anyVoicing(item.quality, root)),
    }
  }

  if (item.type === 'comparar') {
    const ch = CHANGES.find((c) => c.from === item.from && c.to === item.quality)!
    const fromSym = spell(root, ch.from)
    const wrong = shuffle(CHANGES.filter((c) => c.what !== ch.what)).map((c) => c.what)
    const opts = [...new Set(wrong)].slice(0, 3)
    const correct: Option = { label: ch.what }
    const options = shuffle([...opts.map((label) => ({ label })), correct])
    const a = anyVoicing(ch.from, root)
    const b = anyVoicing(ch.to, root)
    return {
      ...base, prompt: `De ${fromSym} para ${symbol}, o que muda?`, options, answer: options.indexOf(correct),
      explain: `${fromSym} = ${formula(ch.from)} → ${symbol} = ${formula(ch.to)}`,
      listen: [...listenOf(a), ...listenOf(b)],
    }
  }

  if (item.type === 'cifra-notas') {
    const notes = notesOf(root, item.quality)
    const seen = new Set([notes.join()])
    const opts: Option[] = []
    for (const o of others) {
      const n = notesOf(root, o.id)
      if (seen.has(n.join())) continue
      seen.add(n.join())
      opts.push({ label: n.join(' '), notes: n })
      if (opts.length === 3) break
    }
    const correct: Option = { label: notes.join(' '), notes }
    const options = shuffle([...opts, correct])
    return {
      ...base, prompt: `Quais são as notas de ${symbol}?`, options, answer: options.indexOf(correct),
      explain: `${symbol} = ${formula(item.quality)} (${notes.join(' ')})`, listen: listenOf(anyVoicing(item.quality, root)),
    }
  }

  // cronometrado: só a cifra e o desenho pedido; o desenho aparece ao revelar
  return {
    ...base, prompt: `Toque ${symbol}`, sub: card!.label, voicing, options: [], answer: -1,
    explain: `${symbol} = ${formula(item.quality)} (${notesOf(root, item.quality).join(' ')})`, listen: listenOf(voicing!),
  }
}
