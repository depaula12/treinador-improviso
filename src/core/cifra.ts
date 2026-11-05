import { parseChord } from './theory'

// Leitor de cifra colada (formato do Cifra Club: acordes numa linha, letra na de baixo,
// seções entre colchetes). A cifra não traz duração: cada acorde vira um compasso, e a
// grade editável da área Músicas acerta o resto.

export interface ParsedSection {
  name: string
  /** um item por compasso; dois acordes = compasso dividido (2+2) */
  bars: string[][]
}

export interface ParsedCifra {
  title: string
  artist: string
  /** "Tom: X" da cifra, se veio */
  key: string | null
  /** capotraste na casa N (0 = sem) */
  capo: number
  sections: ParsedSection[]
  /** seções que só tinham tablatura ou letra e ficaram de fora */
  skipped: string[]
  /** cifras que pareciam acorde mas não foram reconhecidas (bar = compasso, a partir de 1) */
  unknown: { section: string; bar: number; token: string }[]
  /** onde a cifra tinha N.C. (sem acorde): a base ainda não tem compasso de silêncio */
  noChord: { section: string; bar: number }[]
}

const IGNORE = /^(\||\|\||-+|\/|:|\.|–|\(|\)|\[|\])$/
const REPEAT = /^\(?\s*(?:(\d+)\s*[xX]|[xX]\s*(\d+))\s*\)?:?$/
const NO_CHORD = /^(N\.?C\.?|\(?N\.?C\.?\)?)$/i

/** Tira parênteses soltos em volta do token: "(Bm" / "G)" / "(A7(9))". */
function trimParens(t: string): string {
  let s = t
  const count = (c: string) => [...s].filter((x) => x === c).length
  while (s.startsWith('(') && count('(') > count(')')) s = s.slice(1)
  while (s.endsWith(')') && count(')') > count('(')) s = s.slice(0, -1)
  if (/^\(.*\)$/.test(s) && /^\([A-G]/.test(s)) s = s.slice(1, -1)
  return s
}

/** O token é uma cifra válida? (devolve o símbolo limpo) */
export function chordToken(token: string): string | null {
  const t = trimParens(token.trim())
  if (!/^[A-G][#b]?/.test(t)) return null
  return parseChord(t) ? t : null
}

/** parece cifra (fundamental + algo típico de acorde), mesmo que não seja reconhecida */
const CHORD_LIKE = /^[A-G][#b]?(?:[\d()°º+\-/ø]|m(?!a)|maj|dim|aug|sus|add)/

/** item de uma linha de acordes, na ordem em que aparece */
type Item = { kind: 'chord'; c: string } | { kind: 'unknown'; t: string } | { kind: 'nc' }

type Line =
  | { kind: 'blank' }
  | { kind: 'header'; name: string; rest: string }
  | { kind: 'tab' }
  | { kind: 'key'; key: string }
  | { kind: 'capo'; fret: number }
  | { kind: 'chords'; items: Item[]; repeat: number }
  | { kind: 'text'; text: string }

function chordLine(text: string): { items: Item[]; repeat: number } | null {
  const tokens = text.split(/\s+/).filter(Boolean)
  let repeat = 1
  const items: Item[] = []
  let chords = 0
  let words = 0
  const last = () => [...items].reverse().find((x) => x.kind === 'chord') as { c: string } | undefined
  for (const raw of tokens) {
    if (NO_CHORD.test(raw)) {
      items.push({ kind: 'nc' })
      continue
    }
    if (IGNORE.test(raw)) continue
    const rep = raw.match(REPEAT)
    if (rep) {
      repeat = Math.min(8, Number(rep[1] ?? rep[2]) || 1)
      continue
    }
    if (raw === '%' && last()) {
      items.push({ kind: 'chord', c: last()!.c })
      chords++
      continue
    }
    // "G|D" ou "G-D": separadores colados
    const parts = raw.split(/[|]/).filter(Boolean)
    const ok = parts.map(chordToken)
    if (ok.every(Boolean)) {
      items.push(...(ok as string[]).map((c) => ({ kind: 'chord' as const, c })))
      chords += ok.length
    } else {
      words++
      const t = trimParens(raw)
      if (CHORD_LIKE.test(t)) items.push({ kind: 'unknown', t })
    }
  }
  // linha de acordes: quase tudo é cifra (sobra espaço para um "riff" ou "2ª vez")
  const unknown = items.filter((x) => x.kind === 'unknown').length
  if (!chords || chords + unknown < (chords + words) * 0.75) return null
  return { items, repeat }
}

function classify(line: string): Line {
  const t = line.trim()
  if (!t) return { kind: 'blank' }
  const head = t.match(/^\[([^\]]+)\]\s*(.*)$/)
  if (head) return { kind: 'header', name: head[1].trim(), rest: head[2] }
  // tablatura: "E|---3---|" , "e|-0-" ou linhas cheias de traços
  if (/^[eEbBgGdDaA]\s*[|:]/.test(t) || /-{4,}/.test(t) || /^\|?(-|\d|h|p|b|\/|~|\|)+\|?$/.test(t.replace(/\s/g, ''))) return { kind: 'tab' }
  const key = t.match(/^tom\s*:\s*([A-G][#b]?m?)/i)
  if (key) return { kind: 'key', key: key[1] }
  // "Afinação: E A D G B E" parece linha de acordes
  if (/^(afina[cç][aã]o|composi[cç][aã]o|letra|tuning)\s*:/i.test(t)) return { kind: 'text', text: '' }
  const capo = t.match(/capo(?:traste)?[^\d]*(\d{1,2})/i)
  if (capo) return { kind: 'capo', fret: Number(capo[1]) }
  const ch = chordLine(t)
  if (ch) return { kind: 'chords', ...ch }
  return { kind: 'text', text: t }
}

// títulos de seção do Cifra Club que são só tablatura ou nota de rodapé
const TAB_SECTION = /^(tab|tablatura|dedilhado|riff)\b/i

export function parseCifra(text: string): ParsedCifra {
  const out: ParsedCifra = { title: '', artist: '', key: null, capo: 0, sections: [], skipped: [], unknown: [], noChord: [] }
  const lines = text.replace(/\r/g, '').split('\n').map(classify)
  let current: ParsedSection | null = null
  let seenMusic = false
  const intro: string[] = []

  const open = (name: string) => {
    close()
    current = { name, bars: [] }
  }
  const close = () => {
    if (!current) return
    if (current.bars.length) out.sections.push(current)
    else out.skipped.push(current.name)
    current = null
  }
  const add = (items: Item[], repeat: number) => {
    if (!current) current = { name: 'Música', bars: [] }
    const sec = current
    for (let r = 0; r < repeat; r++)
      for (const it of items) {
        if (it.kind === 'chord') sec.bars.push([it.c])
        // avisos só na primeira passada de uma repetição
        else if (r > 0) continue
        else if (it.kind === 'unknown') out.unknown.push({ section: sec.name, bar: sec.bars.length + 1, token: it.t })
        else out.noChord.push({ section: sec.name, bar: sec.bars.length + 1 })
      }
  }

  for (const l of lines) {
    switch (l.kind) {
      case 'header': {
        seenMusic = true
        const name = l.name.replace(/^tab\s*-\s*/i, '')
        open(TAB_SECTION.test(l.name) ? `${name} (tab)` : name)
        const ch = l.rest ? chordLine(l.rest) : null
        if (ch) add(ch.items, ch.repeat)
        break
      }
      case 'key':
        out.key = l.key
        break
      case 'capo':
        out.capo = l.fret
        break
      case 'chords':
        seenMusic = true
        add(l.items, l.repeat)
        break
      case 'text':
        if (l.text && !seenMusic && intro.length < 2 && !/cifra club/i.test(l.text)) intro.push(l.text)
        break
    }
  }
  close()
  ;[out.title, out.artist] = [intro[0] ?? '', intro[1] ?? '']
  return out
}
