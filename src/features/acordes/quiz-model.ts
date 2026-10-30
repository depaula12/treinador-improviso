import { parseChord } from '../../core/theory'
import { matchQuality, openRoots, QUALITIES, qualityById, symbolOf, voicingFor, type FormKind, type Voicing } from '../../core/voicings'
import type { QuizMode } from './store'

/** Um "cartão": o que se quer decorar. Formas móveis sorteiam a fundamental a cada vez. */
export interface Card {
  key: string
  quality: string
  form: FormKind
  /** fixo nas formas abertas; null = sorteia */
  root: number | null
}

export function buildCards(mode: QuizMode, qualities: string[], forms: FormKind[]): Card[] {
  const cards: Card[] = []
  for (const quality of qualities) {
    if (mode === 'cifra-notas') {
      // notas dependem da fundamental: um cartão por acorde
      for (let r = 0; r < 12; r++) cards.push({ key: `notas:${quality}|${r}`, quality, form: '6', root: r })
      continue
    }
    for (const form of forms) {
      if (form === 'aberto') {
        for (const r of openRoots(quality)) cards.push({ key: `${mode}:${quality}|aberto|${r}`, quality, form, root: r })
      } else if (voicingFor(quality, 0, form)) {
        cards.push({ key: `${mode}:${quality}|${form}`, quality, form, root: null })
      }
    }
  }
  return cards
}

/**
 * Cartões só com os acordes de uma música (fundamental fixa). Acordes fora do banco
 * (ex.: m7b5, 9) ficam de fora e voltam em `skipped`.
 */
export function songCards(mode: QuizMode, chords: string[], forms: FormKind[]): { cards: Card[]; skipped: string[] } {
  const cards: Card[] = []
  const skipped: string[] = []
  const seen = new Set<string>()
  const push = (c: Card) => {
    if (!seen.has(c.key)) cards.push(c)
    seen.add(c.key)
  }
  for (const sym of chords) {
    const c = parseChord(sym)
    const q = c ? matchQuality(c) : null
    if (!c || !q) {
      skipped.push(sym)
      continue
    }
    const root = c.root
    if (mode === 'cifra-notas') {
      push({ key: `notas:${q.id}|${root}`, quality: q.id, form: '6', root })
      continue
    }
    for (const form of forms) {
      if (form === 'aberto' ? openRoots(q.id).includes(root) : voicingFor(q.id, root, form)) {
        // mesma chave do treino geral nas formas abertas: o progresso é um só
        push({ key: form === 'aberto' ? `${mode}:${q.id}|aberto|${root}` : `${mode}:${q.id}|${form}|${root}`, quality: q.id, form, root })
      }
    }
  }
  return { cards, skipped }
}

export interface Question {
  card: Card
  root: number
  symbol: string
  voicing: Voicing | null
  notes: string[]
  /** alternativas (múltipla escolha); a correta tem índice `answer` */
  options: { label: string; voicing?: Voicing; notes?: string[] }[]
  answer: number
}

const shuffle = <T,>(xs: T[]) => {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const notesOf = (root: number, quality: string) => parseChord(symbolOf(root, qualityById(quality)))?.notes ?? []

export function makeQuestion(mode: QuizMode, card: Card): Question {
  const root = card.root ?? Math.floor(Math.random() * 12)
  const q = qualityById(card.quality)
  const symbol = symbolOf(root, q)
  const voicing = mode === 'cifra-notas' ? null : voicingFor(card.quality, root, card.form)
  const notes = notesOf(root, card.quality)

  // distratores: mesma fundamental e mesma forma, outro tipo de acorde
  const others = shuffle(QUALITIES.filter((x) => x.id !== card.quality))
  let options: Question['options'] = []
  if (mode === 'cifra-desenho') {
    const seen = new Set([voicing!.frets.join()])
    for (const o of others) {
      const v = voicingFor(o.id, root, card.form)
      if (v && !seen.has(v.frets.join())) {
        seen.add(v.frets.join())
        options.push({ label: v.symbol, voicing: v })
      }
      if (options.length === 3) break
    }
    // forma aberta com poucos vizinhos: completa com o mesmo tipo em outra forma
    if (options.length < 3) {
      for (const f of ['6', '5'] as FormKind[]) {
        for (const o of others) {
          const v = voicingFor(o.id, root, f)
          if (v && options.length < 3 && !seen.has(v.frets.join())) {
            seen.add(v.frets.join())
            options.push({ label: v.symbol, voicing: v })
          }
        }
      }
    }
    options.push({ label: symbol, voicing: voicing! })
  } else if (mode === 'desenho-cifra') {
    options = others.slice(0, 3).map((o) => ({ label: symbolOf(root, o) }))
    options.push({ label: symbol })
  } else if (mode === 'cifra-notas') {
    const seen = new Set([notes.join()])
    for (const o of others) {
      const n = notesOf(root, o.id)
      if (!seen.has(n.join())) {
        seen.add(n.join())
        options.push({ label: n.join(' '), notes: n })
      }
      if (options.length === 3) break
    }
    options.push({ label: notes.join(' '), notes })
  }
  const correct = options[options.length - 1]
  options = shuffle(options)
  return { card, root, symbol, voicing, notes, options, answer: options.indexOf(correct) }
}
