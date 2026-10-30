import type { KeyGuess } from './key'
import { suggestNext } from './next-chords'
import { PROGRESSIONS, realize } from './progressions'
import { KEYS, parseChord, type ChordInfo } from './theory'

// Sugestão de próximo acorde pelo CONTEXTO: os últimos até 6 acordes tocados são procurados
// num "banco" de sequências (progressões prontas + músicas da banda), do trecho mais longo para
// o mais curto. Quanto mais longo o trecho reconhecido, mais peso. A tabela feita à mão
// (next-chords.ts) entra como reserva, para sempre haver opção.

type Q = 'maj' | 'm' | 'dom'
/** acorde relativo ao tom: grau (semitons da tônica) + tipo */
export interface Tok {
  deg: number
  q: Q
}

export interface Sequence {
  mode: 'major' | 'minor'
  toks: Tok[]
  /** de onde veio: progressão pronta ou música do repertório */
  source: 'progressao' | 'musica'
  name: string
}

export type SuggestionKind = 'segura' | 'casa' | 'surpresa'

export interface ContextSuggestion {
  symbol: string
  roman: string
  kind: SuggestionKind
  /** por que este acorde (uma linha, para aprender) */
  reason: string
  score: number
}

export interface ContextResult {
  suggestions: ContextSuggestion[]
  /** o trecho reconhecido (graus), ex.: ["I", "V", "vi"] */
  context: string[]
}

export const MAX_CONTEXT = 6

const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII']
const isDominant = (c: ChordInfo) => c.semitones.includes(4) && c.semitones.includes(10)
const qOf = (c: ChordInfo): Q => (c.minor ? 'm' : isDominant(c) ? 'dom' : 'maj')
const suffix = (q: Q) => (q === 'm' ? 'm' : q === 'dom' ? '7' : '')
export const romanTok = (t: Tok) => (t.q === 'm' ? ROMAN[t.deg].toLowerCase() : ROMAN[t.deg]) + (t.q === 'dom' ? '7' : '')
const same = (a: Tok, b: Tok) => a.deg === b.deg && a.q === b.q
const key = (t: Tok) => `${t.deg}:${t.q}`

export function tokOf(c: ChordInfo, root: number): Tok {
  return { deg: (((c.root - root) % 12) + 12) % 12, q: qOf(c) }
}

/** Junta repetições seguidas (A7 A7 D7 → A7 D7): o que importa é a troca. */
function collapse(toks: Tok[]): Tok[] {
  return toks.filter((t, i) => i === 0 || !same(t, toks[i - 1]))
}

/** Progressões prontas, em graus. Dão duas voltas, para a troca do fim para o começo contar. */
const BUILTIN: Sequence[] = PROGRESSIONS.map((p) => {
  const toks = collapse(realize(p, 'C').map((c) => tokOf(c, 0)))
  const loop = collapse([...toks, ...toks])
  return { mode: p.minor ? 'minor' : 'major', toks: loop, source: 'progressao', name: p.name }
})

/** Banco de sequências: progressões prontas + músicas (acordes já transpostos e tom em que soam). */
export function buildCorpus(songs: { title: string; key: string; chords: string[] }[] = []): Sequence[] {
  const fromSongs: Sequence[] = []
  for (const s of songs) {
    const m = s.key.match(/^([A-G][#b]?)(m?)$/)
    if (!m) continue
    const root = KEYS.indexOf(m[1]) >= 0 ? KEYS.indexOf(m[1]) : parseChord(m[1])?.root ?? 0
    const toks = collapse(s.chords.flatMap((sym) => {
      const c = parseChord(sym)
      return c ? [tokOf(c, root)] : []
    }))
    if (toks.length >= 2) fromSongs.push({ mode: m[2] ? 'minor' : 'major', toks, source: 'musica', name: s.title })
  }
  return [...BUILTIN, ...fromSongs]
}

// cores "fora do comum", por tom: acordes emprestados e dominantes secundários
const COLORS: Record<'major' | 'minor', { tok: Tok; why: string }[]> = {
  major: [
    { tok: { deg: 10, q: 'maj' }, why: 'emprestado do tom menor: som de rock clássico, abre espaço antes de voltar' },
    { tok: { deg: 8, q: 'maj' }, why: 'emprestado do tom menor: ar épico, de trilha de filme' },
    { tok: { deg: 5, q: 'm' }, why: 'o IV menor: um toque de melancolia que puxa de volta para o I' },
    { tok: { deg: 2, q: 'dom' }, why: 'dominante secundário: o II7 puxa com força para o V' },
    { tok: { deg: 4, q: 'dom' }, why: 'dominante secundário: o III7 puxa para o vi (bem usado em baladas)' },
  ],
  minor: [
    { tok: { deg: 7, q: 'dom' }, why: 'V7 com a sensível: tensão forte que pede para voltar ao i' },
    { tok: { deg: 5, q: 'maj' }, why: 'IV maior no tom menor: cor dórica, mais luminosa (Santana, Pink Floyd)' },
    { tok: { deg: 1, q: 'maj' }, why: 'bII: tensão escura e dramática antes de voltar ao i' },
    { tok: { deg: 3, q: 'maj' }, why: 'o relativo maior: alivia, soa como um raio de sol no tom menor' },
  ],
}

/**
 * Até 6 opções: as mais comuns para o contexto (segura), a volta para a tônica (casa)
 * e cores diferentes (surpresa). Cada uma com o motivo em uma linha.
 */
export function suggestFromContext(history: ChordInfo[], k: KeyGuess, corpus: Sequence[]): ContextResult {
  const hist = collapse(history.map((c) => tokOf(c, k.root))).slice(-MAX_CONTEXT)
  if (!hist.length) return { suggestions: [], context: [] }
  const cur = hist[hist.length - 1]
  const pool = corpus.filter((s) => s.mode === k.mode)

  // contagem por trecho reconhecido, do mais longo para o mais curto
  const score = new Map<string, number>()
  const best = new Map<string, { len: number; fromSong: string | null }>()
  let matched = 0
  for (let len = hist.length; len >= 1; len--) {
    const ctx = hist.slice(-len)
    const w = len * len * len
    for (const s of pool) {
      for (let i = len - 1; i < s.toks.length - 1; i++) {
        let ok = true
        for (let j = 0; j < len && ok; j++) ok = same(s.toks[i - len + 1 + j], ctx[j])
        if (!ok) continue
        const nxt = s.toks[i + 1]
        const id = key(nxt)
        // o seu repertório pesa o dobro: as sugestões puxam para o som da banda
        score.set(id, (score.get(id) ?? 0) + w * (s.source === 'musica' ? 2 : 1))
        const b = best.get(id)
        if (!b || len > b.len) best.set(id, { len, fromSong: s.source === 'musica' ? s.name : null })
        else if (len === b.len && !b.fromSong && s.source === 'musica') b.fromSong = s.name
        matched = Math.max(matched, len)
      }
    }
  }
  // reserva: a tabela feita à mão, com peso de um trecho de 1 acorde
  const curChord = history[history.length - 1]
  for (const sg of suggestNext(curChord, k, 5)) {
    const c = parseChord(sg.symbol)
    if (!c) continue
    const id = key(tokOf(c, k.root))
    score.set(id, (score.get(id) ?? 0) + sg.weight * 0.2)
    if (!best.has(id)) best.set(id, { len: 1, fromSong: null })
  }
  score.delete(key(cur))

  const sym = (t: Tok) => KEYS[(k.root + t.deg) % 12] + suffix(t.q)
  const ctxRoman = (len: number) => hist.slice(-len).map(romanTok).join('–')
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1])
  const out: ContextSuggestion[] = []
  const used = new Set<string>([key(cur)])

  for (const [id, sc] of ranked.slice(0, 3)) {
    const [deg, q] = id.split(':')
    const t: Tok = { deg: +deg, q: q as Q }
    const b = best.get(id)!
    const where = b.fromSong ? `como em "${b.fromSong}"` : 'nas progressões de blues, rock e pop'
    const reason = b.len >= 2
      ? `depois de ${ctxRoman(b.len)}, o ${romanTok(t)} é o caminho mais comum (${where})`
      : `o ${romanTok(t)} costuma vir depois do ${romanTok(cur)}`
    out.push({ symbol: sym(t), roman: romanTok(t), kind: 'segura', reason, score: sc })
    used.add(id)
  }

  const tonic: Tok = { deg: 0, q: k.mode === 'minor' ? 'm' : cur.q === 'dom' && hist.every((h) => h.q === 'dom') ? 'dom' : 'maj' }
  if (!used.has(key(tonic))) {
    out.push({ symbol: sym(tonic), roman: romanTok(tonic), kind: 'casa', reason: 'volta para a tônica: sensação de chegada, de "casa"', score: score.get(key(tonic)) ?? 0 })
    used.add(key(tonic))
  }

  // surpresas: as cores do tom que ainda não apareceram, as mais usadas no banco primeiro
  const colors = COLORS[k.mode]
    .filter((c) => !used.has(key(c.tok)))
    .sort((a, b) => (score.get(key(b.tok)) ?? 0) - (score.get(key(a.tok)) ?? 0))
    .slice(0, 2)
  for (const c of colors) out.push({ symbol: sym(c.tok), roman: romanTok(c.tok), kind: 'surpresa', reason: c.why, score: score.get(key(c.tok)) ?? 0 })

  return { suggestions: out, context: matched >= 2 ? hist.slice(-matched).map(romanTok) : [romanTok(cur)] }
}
