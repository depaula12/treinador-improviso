import { boxNotes, boxRange, type ScaleDef, type ScaleNote } from './scales'

export type ExerciseId = 'subir-descer' | 'grupos3' | 'grupos4' | 'tercas' | 'percorrer'

export const EXERCISES: { id: ExerciseId; name: string; hint: string }[] = [
  { id: 'subir-descer', name: 'Subir e descer', hint: 'O desenho inteiro, do grave ao agudo e de volta.' },
  { id: 'grupos3', name: 'Grupos de 3', hint: '1-2-3, 2-3-4, 3-4-5… subindo, e o espelho descendo.' },
  { id: 'grupos4', name: 'Grupos de 4', hint: '1-2-3-4, 2-3-4-5… subindo, e o espelho descendo.' },
  { id: 'tercas', name: 'Terças', hint: 'Pulando uma nota: 1-3, 2-4, 3-5… subindo e descendo.' },
  { id: 'percorrer', name: 'Percorrer os boxes', hint: 'Sobe um box, desce o seguinte, atravessando o braço.' },
]

const upDown = (ns: ScaleNote[]) => [...ns, ...ns.slice(1, -1).reverse()]

function groups(ns: ScaleNote[], size: number): ScaleNote[] {
  const up: ScaleNote[] = []
  for (let i = 0; i + size <= ns.length; i++) up.push(...ns.slice(i, i + size))
  const rev = [...ns].reverse()
  const down: ScaleNote[] = []
  for (let i = 0; i + size <= rev.length; i++) down.push(...rev.slice(i, i + size))
  return [...up, ...down]
}

function thirds(ns: ScaleNote[]): ScaleNote[] {
  const out: ScaleNote[] = []
  for (let i = 0; i + 2 < ns.length; i++) out.push(ns[i], ns[i + 2])
  const rev = [...ns].reverse()
  for (let i = 0; i + 2 < rev.length; i++) out.push(rev[i], rev[i + 2])
  return out
}

/** Boxes na ordem em que aparecem no braço (da pestana para o corpo). */
export function boxesByNeck(scale: ScaleDef, root: number, boxes: number[]): number[] {
  return [...boxes].sort((a, b) => boxRange(scale, root, a)[0] - boxRange(scale, root, b)[0])
}

/** Sequência de notas do exercício; vários boxes são encadeados na ordem do braço. */
export function buildExercise(id: ExerciseId, scale: ScaleDef, root: number, boxes: number[]): ScaleNote[] {
  const ordered = boxesByNeck(scale, root, boxes)
  if (id === 'percorrer') {
    return ordered.flatMap((b, i) => {
      const ns = boxNotes(scale, root, b)
      return i % 2 === 0 ? ns : [...ns].reverse()
    })
  }
  return ordered.flatMap((b) => {
    const ns = boxNotes(scale, root, b)
    if (id === 'grupos3') return groups(ns, 3)
    if (id === 'grupos4') return groups(ns, 4)
    if (id === 'tercas') return thirds(ns)
    return upDown(ns)
  })
}
