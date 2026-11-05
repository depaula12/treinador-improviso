/**
 * Lições de teoria: texto curto, exemplos para ouvir e ver no braço, algo para tocar e perguntas
 * no fim. Cada lição é ligada a uma tarefa de teoria do plano (sprint, índice 0–2).
 */
import type { NoteEvent } from '../ear'

export interface Question {
  q: string
  options: string[]
  answer: string
  /** explicação curta mostrada depois de responder */
  why: string
}

/** pergunta fixa ou gerada (cada vez sai uma diferente do mesmo conceito) */
export type QuestionSpec = Question | { gen: (rnd: () => number) => Question }

/** figura no braço. Cordas numeradas como na guitarra: 6 = Mi grave, 1 = Mi agudo. */
export interface Fig {
  /** tônica (classe de altura, 0 = Dó) */
  root: number
  /** notas destacadas, em semitons a partir da tônica */
  semis: number[]
  /** nomes das notas (na ordem de `semis`); padrão: nomes do app */
  names?: string[]
  labels: 'notas' | 'graus'
  /** região do braço [primeira, última casa] */
  frets: [number, number]
  /** só estas posições [corda 1–6, casa] */
  pos?: [number, number][]
  /** ou um desenho da área Escalas */
  box?: { scaleId: string; box: number }
  /** marcações por cima (verde, com rótulo) */
  marks?: { s: number; f: number; label: string }[]
}

export type Step =
  | { t: 'p'; text: string }
  | { t: 'lista'; items: string[] }
  | { t: 'braco'; fig: Fig; caption?: string }
  | { t: 'ouvir'; items: { label: string; events: NoteEvent[] }[] }
  | { t: 'tente'; text: string }
  | { t: 'dica'; text: string }

export interface Lesson {
  /** `s{sprint}-{tarefa}`; s0 = semana zero */
  id: string
  sprint: number
  /** índice da tarefa de teoria do sprint (0–2) */
  task: number
  title: string
  min: number
  steps: Step[]
  quiz: QuestionSpec[]
}
