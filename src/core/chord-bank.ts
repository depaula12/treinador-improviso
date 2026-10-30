import { findShapes, mainShapes } from './chord-shapes'
import { TUNING } from './fretboard-model'
import { parseChord } from './theory'
import { qualityById, QUALITIES, symbolOf, voicingFor, type FormKind, type Voicing } from './voicings'

// Banco de DESENHOS para o quiz de acordes: para cada tipo, os desenhos do banco curado, os melhores
// desenhos móveis que o gerador acha pelo braço (os que funcionam em quase todas as fundamentais)
// e as tríades nas cordas agudas (3 inversões em 3 grupos de cordas). Cada desenho é um "cartão"
// da repetição espaçada, com nível de complexidade de 1 a 4.

type F = number | null
// 6ª -> 1ª corda
const LOW = [...TUNING].reverse()

export type ShapeKind = 'aberta' | 'pestana' | 'movel' | 'triade'
export const KIND_LABEL: Record<ShapeKind, string> = {
  aberta: 'Abertas',
  pestana: 'Pestana na 6ª e 5ª corda',
  movel: 'Outras formas móveis',
  triade: 'Tríades nas cordas agudas',
}
export type Level = 1 | 2 | 3 | 4

export interface ShapeCard {
  /** chave estável para a repetição espaçada */
  id: string
  quality: string
  kind: ShapeKind
  /**
   * Casas do desenho (6ª → 1ª). Desenho móvel: relativas à casa da nota mais grave (0 = ela).
   * Desenho fixo (aberto): casas absolutas, e `fixedRoot` diz a fundamental.
   */
  frets: F[]
  /** corda (0 = 6ª) da nota mais grave */
  bassString: number
  /** intervalo da nota mais grave (0 = fundamental; tríade invertida: 3ª ou 5ª) */
  bassInterval: number
  fixedRoot: number | null
  label: string
  level: Level
}

// complexidade de cada tipo (o nível final é o maior entre o do tipo e o da forma)
const QUALITY_LEVEL: Record<string, Level> = {
  '5': 1, maj: 1, m: 1, '7': 1, m7: 2, '7M': 3, sus2: 3, sus4: 3, add9: 3, '6': 4, '9': 4, '7#9': 4, m7b5: 4, dim7: 4,
}
const KIND_LEVEL: Record<ShapeKind, Level> = { aberta: 1, pestana: 2, movel: 3, triade: 3 }
const levelOf = (quality: string, kind: ShapeKind): Level => Math.max(QUALITY_LEVEL[quality] ?? 3, KIND_LEVEL[kind]) as Level

const ORD = ['6ª', '5ª', '4ª', '3ª', '2ª', '1ª']
const INV = ['fundamental no baixo', '1ª inversão (3ª no baixo)', '2ª inversão (5ª no baixo)']

/** Desenho móvel a partir de casas absolutas: relativo à nota mais grave (null se tiver corda solta). */
function relative(frets: F[]): { rel: F[]; bass: number } | null {
  const bass = frets.findIndex((f) => f !== null)
  if (bass < 0 || frets.some((f) => f === 0)) return null
  const b = frets[bass]!
  return { rel: frets.map((f) => (f === null ? null : f - b)), bass }
}

const keyOf = (bass: number, rel: F[]) => `${bass}:${rel.map((f) => (f === null ? 'x' : f)).join('.')}`

function describe(rel: F[], bass: number, kind: ShapeKind): string {
  const strings = rel.filter((f) => f !== null).length
  const span = Math.max(...rel.filter((f): f is number => f !== null)) - Math.min(...rel.filter((f): f is number => f !== null))
  const shape = kind === 'pestana' ? 'pestana' : strings <= 4 ? `${strings} cordas` : `${strings} cordas, abertura ${span + 1} casas`
  return `fundamental na ${ORD[bass]} corda · ${shape}`
}

/** Tríades fechadas (maior/menor) em 3 cordas vizinhas, nas 3 inversões. */
function triads(quality: string): ShapeCard[] {
  if (quality !== 'maj' && quality !== 'm') return []
  const ints = quality === 'maj' ? [0, 4, 7] : [0, 3, 7]
  const out: ShapeCard[] = []
  // grupos de cordas (índice da mais grave): Sol-Si-Mi, Ré-Sol-Si, Lá-Ré-Sol
  for (const low of [3, 2, 1]) {
    for (let inv = 0; inv < 3; inv++) {
      const order = [ints[inv], ints[(inv + 1) % 3], ints[(inv + 2) % 3]]
      // desenho com fundamental em Dó, procurado perto da casa 5 (depois é transposto)
      // todas as combinações (casa 1 a 15) das três notas nas três cordas: fica a mais fechada
      let best: F[] | null = null
      let bestSpan = 99
      const at = (s: number, iv: number) => Array.from({ length: 15 }, (_, i) => i + 1).filter((f) => (LOW[s] + f) % 12 === iv % 12)
      for (const f0 of at(low, order[0])) {
        for (const f1 of at(low + 1, order[1])) {
          for (const f2 of at(low + 2, order[2])) {
            const span = Math.max(f0, f1, f2) - Math.min(f0, f1, f2)
            if (span > 3 || span >= bestSpan) continue
            const frets: F[] = [null, null, null, null, null, null]
            frets[low] = f0
            frets[low + 1] = f1
            frets[low + 2] = f2
            best = frets
            bestSpan = span
          }
        }
      }
      if (!best) continue
      const r = relative(best)!
      const id = `${quality}|triade|${keyOf(r.bass, r.rel)}`
      out.push({
        id, quality, kind: 'triade', frets: r.rel, bassString: r.bass, bassInterval: order[0], fixedRoot: null,
        label: `tríade · cordas ${ORD[low + 2]}-${ORD[low + 1]}-${ORD[low]} · ${INV[inv]}`, level: levelOf(quality, 'triade'),
      })
    }
  }
  return out
}

const cache = new Map<string, ShapeCard[]>()

/** Todos os desenhos de um tipo de acorde, do mais simples ao mais complexo. */
export function shapesFor(quality: string): ShapeCard[] {
  const hit = cache.get(quality)
  if (hit) return hit
  const q = qualityById(quality)
  const out: ShapeCard[] = []
  const seen = new Set<string>()

  // 1) formas abertas do banco curado (fundamental fixa)
  for (let root = 0; root < 12; root++) {
    const v = voicingFor(quality, root, 'aberto')
    if (!v) continue
    const id = `${quality}|aberta|${root}`
    out.push({ id, quality, kind: 'aberta', frets: v.frets, bassString: v.frets.findIndex((f) => f !== null), bassInterval: 0, fixedRoot: root, label: 'forma aberta', level: levelOf(quality, 'aberta') })
  }
  // 2) pestanas do banco (6ª e 5ª corda)
  for (const form of ['6', '5'] as FormKind[]) {
    const v = voicingFor(quality, 4, form)
    const r = v && relative(v.frets)
    if (!r) continue
    const k = keyOf(r.bass, r.rel)
    seen.add(k)
    out.push({ id: `${quality}|pestana|${k}`, quality, kind: 'pestana', frets: r.rel, bassString: r.bass, bassInterval: 0, fixedRoot: null, label: `fundamental na ${ORD[r.bass]} corda (a do banco)`, level: levelOf(quality, 'pestana') })
  }
  // 3) formas móveis que o gerador acha em pelo menos 6 das 12 fundamentais (as que são "do tipo")
  const count = new Map<string, { rel: F[]; bass: number; n: number; score: number }>()
  for (let root = 0; root < 12; root++) {
    const c = parseChord(symbolOf(root, q))
    if (!c) continue
    for (const sh of mainShapes(findShapes(c), 3)) {
      const r = relative(sh.frets)
      if (!r) continue
      const k = keyOf(r.bass, r.rel)
      const cur = count.get(k) ?? { ...r, n: 0, score: 0 }
      cur.n++
      cur.score = Math.max(cur.score, sh.score)
      count.set(k, cur)
    }
  }
  // só os bem naturais (nota alta no gerador): variações estranhas não valem a pena decorar
  const movable = [...count.entries()]
    .filter(([k, v]) => v.n >= 6 && v.score >= 7 && !seen.has(k))
    .sort((a, b) => b[1].score - a[1].score || b[1].n - a[1].n)
    .slice(0, 5)
  for (const [k, v] of movable) {
    out.push({ id: `${quality}|movel|${k}`, quality, kind: 'movel', frets: v.rel, bassString: v.bass, bassInterval: 0, fixedRoot: null, label: describe(v.rel, v.bass, 'movel'), level: levelOf(quality, 'movel') })
  }
  // 4) tríades
  out.push(...triads(quality))

  const sorted = out.sort((a, b) => a.level - b.level)
  cache.set(quality, sorted)
  return sorted
}

/** Todos os cartões dos tipos pedidos. */
export const allShapes = (qualities: string[] = QUALITIES.map((q) => q.id)) => qualities.flatMap(shapesFor)

/**
 * O desenho tocado com esta fundamental: casas absolutas entre 1 e 15 (oitava mais baixa que cabe).
 * Desenho aberto só existe na fundamental dele.
 */
export function placeShape(card: ShapeCard, root: number): Voicing | null {
  const q = qualityById(card.quality)
  const symbol = symbolOf(root, q)
  if (card.fixedRoot !== null) {
    if (card.fixedRoot !== root) return null
    const rs = card.frets.findIndex((f, i) => f !== null && (LOW[i] + f) % 12 === root)
    return { quality: card.quality, form: 'aberto', rootPc: root, symbol, frets: card.frets, rootString: rs }
  }
  const bassPc = (root + card.bassInterval) % 12
  let base = (((bassPc - LOW[card.bassString]) % 12) + 12) % 12
  const pressed = card.frets.filter((f): f is number => f !== null)
  const lo = Math.min(...pressed)
  const hi = Math.max(...pressed)
  while (base + lo < 1) base += 12
  if (base + hi > 15) base -= 12
  if (base + lo < 1) return null
  const frets = card.frets.map((f) => (f === null ? null : f + base))
  const rs = frets.findIndex((f, i) => f !== null && (LOW[i] + f) % 12 === root)
  return { quality: card.quality, form: card.bassString === 0 ? '6' : '5', rootPc: root, symbol, frets, rootString: rs < 0 ? card.bassString : rs }
}

/** Fundamentais em que o cartão existe (abertas: só uma; móveis: todas as que cabem no braço). */
export const rootsOf = (card: ShapeCard) =>
  card.fixedRoot !== null ? [card.fixedRoot] : Array.from({ length: 12 }, (_, r) => r).filter((r) => placeShape(card, r))

/** Notas MIDI do desenho (do grave ao agudo), para tocar. */
export const voicingMidi = (v: Voicing) => v.frets.flatMap((f, i) => (f === null ? [] : [LOW[i] + f]))
