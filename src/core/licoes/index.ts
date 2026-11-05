import { FASE1 } from './fase1'
import type { Lesson, Question, QuestionSpec } from './tipos'

export type { Lesson, Question, Step, Fig } from './tipos'

export const LESSONS: Lesson[] = [...FASE1]
const BY_ID = new Map(LESSONS.map((l) => [l.id, l]))

export const lessonById = (id: string) => BY_ID.get(id)
/** lição da tarefa de teoria `task` (0–2) do sprint; sprint 0 = semana zero */
export const lessonFor = (sprint: number, task: number) => BY_ID.get(`s${sprint}-${task}`)

/** monta a pergunta (as geradas saem diferentes a cada vez) */
export const realize = (q: QuestionSpec, rnd: () => number = Math.random): Question => ('gen' in q ? q.gen(rnd) : q)

// ---------- revisão: pergunta errada volta nos dias seguintes ----------

/** chave da pergunta: "s1-0#2" = lição s1-0, pergunta 2 */
export const qKey = (lessonId: string, i: number) => `${lessonId}#${i}`
export function fromKey(k: string): { lesson: Lesson; index: number } | null {
  const [id, i] = k.split('#')
  const lesson = BY_ID.get(id)
  const index = Number(i)
  return lesson && lesson.quiz[index] ? { lesson, index } : null
}

export interface ReviewItem {
  /** 0 = acabou de errar; ao chegar em 4 sai da revisão */
  box: number
  /** dia (yyyy-mm-dd) em que volta */
  due: string
}

/** intervalo em dias depois de acertar na caixa n */
const GAP = [1, 2, 4, 8]

export function addDaysKey(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(y, m - 1, d + n)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

/**
 * Atualiza a revisão depois de uma resposta. Errou: volta amanhã, do começo.
 * Acertou na revisão: espaça (1, 2, 4, 8 dias) e sai na 4ª vez seguida. Devolve null quando sai.
 */
export function review(item: ReviewItem | undefined, ok: boolean, today: string): ReviewItem | null {
  if (!ok) return { box: 0, due: addDaysKey(today, 1) }
  if (!item) return null
  const box = item.box + 1
  if (box >= GAP.length) return null
  return { box, due: addDaysKey(today, GAP[box]) }
}

/** chaves que vencem hoje (ou antes), mais antigas primeiro */
export const dueKeys = (items: Record<string, ReviewItem>, today: string) =>
  Object.entries(items)
    .filter(([k, v]) => v.due <= today && fromKey(k))
    .sort((a, b) => (a[1].due < b[1].due ? -1 : 1))
    .map(([k]) => k)
