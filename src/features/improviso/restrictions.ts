export interface Restriction {
  id: string
  text: string
  /** limita o braço a um desenho */
  box?: number
  onlyChord?: boolean
  /** cordas permitidas (0 = Mi agudo) */
  strings?: number[]
}

export const RESTRICTIONS: Restriction[] = [
  { id: 'nenhuma', text: 'Sem restrição.' },
  ...[1, 2, 3, 4, 5].map((n) => ({ id: `box${n}`, text: `Só o desenho (box) ${n}.`, box: n })),
  { id: 'terca', text: 'Termine cada frase na 3ª do acorde da vez (bolinha marcada 3 ou b3).' },
  { id: 'tres', text: 'Só 3 notas da escala. Varie ritmo e duração, não as notas.' },
  { id: 'acorde', text: 'Só notas do acorde (as escuras somem).', onlyChord: true },
  { id: 'troca', text: 'Na troca de acorde, a primeira nota é a fundamental ou a 3ª do novo acorde (anéis).' },
  { id: 'pergunta', text: 'Pergunta e resposta: toque 2 tempos, espere 2 tempos, responda.' },
  { id: 'pausa', text: 'Frase de 1 compasso, pausa de 1 compasso.' },
  { id: 'contratempo', text: 'Comece toda frase no contratempo (no "e" do tempo).' },
  { id: 'agudas', text: 'Só nas cordas 1 e 2.', strings: [0, 1] },
  { id: 'repete', text: 'Repita a mesma frase em cada acorde, mudando só a nota do tempo 1.' },
]

export function drawRestriction(currentId: string): Restriction {
  const pool = RESTRICTIONS.filter((r) => r.id !== 'nenhuma' && r.id !== currentId)
  return pool[Math.floor(Math.random() * pool.length)]
}
