/**
 * Registro diário do treino e as contas da aba Progresso (minutos, sequência, bpm, ouvido).
 * Puro: o store (features/hoje/store.ts) guarda os dados; aqui só se calcula.
 */
import { addDays, blocksFor, dateKey, fromKey, type Block, type EarMode } from './plano'

export interface BlockLog {
  done: boolean
  /** minutos marcados pelo timer (0 = só o check) */
  min: number
}

export interface DayLog {
  blocks: Record<string, BlockLog>
  /** maior bpm do dia com volta de 90%+ na técnica */
  bpm?: number
  /** % de notas dentro no Improviso (última sessão com 20+ notas) */
  dentro?: number
  /** % de alvos no tempo 1 (última sessão com 4+ compassos) */
  alvo?: number
  /** nota do dia, 1 a 5 */
  rating?: number
  travou?: string
  rec?: boolean
  /** acertos e total por modo de ouvido */
  ear?: Partial<Record<EarMode, { c: number; t: number }>>
}

export const emptyDay = (): DayLog => ({ blocks: {} })

/** minutos que contam: o do timer, ou o planejado do bloco quando só foi marcado como feito */
export function blockMinutes(b: Block, log: BlockLog | undefined): number {
  if (!log) return 0
  if (log.min > 0) return log.min
  return log.done ? b.min : 0
}

export function dayMinutes(date: Date, day: DayLog | undefined): number {
  if (!day) return 0
  return blocksFor(date).reduce((sum, b) => sum + blockMinutes(b, day.blocks[b.id]), 0)
}

export const plannedMinutes = (date: Date) => blocksFor(date).reduce((s, b) => s + b.min, 0)

/** dia que conta para a sequência: pelo menos 30 min ou metade do plano */
export function dayCounts(date: Date, day: DayLog | undefined): boolean {
  const m = dayMinutes(date, day)
  return m >= Math.min(30, plannedMinutes(date) / 2)
}

/**
 * Dias seguidos de treino até hoje. Hoje ainda em aberto não quebra a sequência:
 * ela conta de ontem para trás e soma hoje se já valeu.
 */
export function streak(days: Record<string, DayLog>, today: Date): number {
  let n = dayCounts(today, days[dateKey(today)]) ? 1 : 0
  for (let d = addDays(today, -1); ; d = addDays(d, -1)) {
    if (!dayCounts(d, days[dateKey(d)])) break
    n++
    if (n > 3650) break
  }
  return n
}

/** os últimos `n` dias, do mais antigo a hoje, com minutos feitos e planejados */
export function lastDays(days: Record<string, DayLog>, today: Date, n = 28) {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(today, i - n + 1)
    const k = dateKey(date)
    return { key: k, date, min: dayMinutes(date, days[k]), plan: plannedMinutes(date), day: days[k] }
  })
}

/** série de um número do registro (bpm, dentro, alvo), em ordem de data */
export function series(days: Record<string, DayLog>, field: 'bpm' | 'dentro' | 'alvo') {
  return Object.keys(days)
    .sort()
    .filter((k) => typeof days[k][field] === 'number')
    .map((k) => ({ key: k, v: days[k][field] as number }))
}

/** acerto do ouvido por modo, somando todos os dias (ou só os dias de `keys`) */
export function earTotals(days: Record<string, DayLog>, keys?: string[]) {
  const out: Partial<Record<EarMode, { c: number; t: number }>> = {}
  for (const k of keys ?? Object.keys(days)) {
    const e = days[k]?.ear
    if (!e) continue
    for (const m of Object.keys(e) as EarMode[]) {
      const cur = out[m] ?? { c: 0, t: 0 }
      out[m] = { c: cur.c + (e[m]?.c ?? 0), t: cur.t + (e[m]?.t ?? 0) }
    }
  }
  return out
}

/** linhas do diário (dias com nota, gravação ou "o que travou"), do mais novo ao mais velho */
export function journal(days: Record<string, DayLog>) {
  return Object.keys(days)
    .sort()
    .reverse()
    .filter((k) => days[k].rating || days[k].travou?.trim() || days[k].rec)
    .map((k) => ({ key: k, date: fromKey(k), ...days[k] }))
}

/** "2026-11-09" → "seg, 9 nov" */
const WD = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const MO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const shortDate = (d: Date) => `${WD[d.getDay()]}, ${d.getDate()} ${MO[d.getMonth()]}`

/** "1:05:00" / "4:59" para o timer */
export function clock(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}
