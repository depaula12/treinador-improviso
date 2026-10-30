import { memo } from 'react'
import { TUNING } from '../core/fretboard-model'
import { formulaName, type Voicing } from '../core/voicings'
import { KEYS } from '../core/theory'

interface Props {
  voicing: Voicing
  /** rótulo nas bolinhas */
  labels?: 'graus' | 'notas' | 'nenhum'
  /** esconde o nome do acorde (quiz desenho → cifra) */
  hideName?: boolean
  caption?: string
  /** bolinhas clicáveis (quiz "onde está a 3ª?"): recebe a corda (0 = 6ª) */
  onPick?: (string: number) => void
  /** anel de certo/errado em volta de uma corda, depois de responder */
  marks?: Partial<Record<number, 'right' | 'wrong'>>
  /** todas as bolinhas da mesma cor (não entrega onde está a fundamental) */
  neutral?: boolean
}

const LOW_TO_HIGH = [...TUNING].reverse()
const FRETS_SHOWN = 5

/** Diagrama vertical de acorde: 6ª corda à esquerda, pestana em cima. */
export const ChordDiagram = memo(function ChordDiagram({ voicing, labels = 'graus', hideName, caption, onPick, marks, neutral }: Props) {
  const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0)
  const maxF = fretted.length ? Math.max(...fretted) : 0
  // janela de 5 casas; começa na 1 se o desenho couber nela
  const base = maxF <= FRETS_SHOWN ? 1 : Math.min(...fretted)
  const W = 156
  const H = 190
  const left = 40
  const top = 42
  const sw = (W - left - 14) / 5
  const fh = (H - top - 14) / FRETS_SHOWN
  const xOf = (s: number) => left + s * sw

  // pestana: a casa mais baixa repetida em várias cordas, incluindo a da fundamental
  const minF = fretted.length ? Math.min(...fretted) : 0
  const barreStrings = voicing.frets.map((f, i) => (f === minF ? i : -1)).filter((i) => i >= 0)
  const barre = minF > 0 && barreStrings.length >= 3 && barreStrings[0] === voicing.rootString ? barreStrings : null

  return (
    <figure className="chord-diagram">
      {!hideName && <figcaption className="cd-name">{voicing.symbol}</figcaption>}
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={hideName ? 'Desenho de acorde' : `Desenho de ${voicing.symbol}`}>
        {base === 1 ? (
          <rect x={left} y={top - 5} width={sw * 5} height={5} fill="var(--fg)" />
        ) : (
          <text x={left - 15} y={top + fh / 2 + 5} textAnchor="end" className="cd-base">{base}</text>
        )}
        {Array.from({ length: FRETS_SHOWN + 1 }, (_, i) => (
          <line key={`f${i}`} x1={left} x2={left + sw * 5} y1={top + i * fh} y2={top + i * fh} stroke="var(--muted)" strokeWidth={1.2} />
        ))}
        {Array.from({ length: 6 }, (_, s) => (
          <line key={`s${s}`} x1={xOf(s)} x2={xOf(s)} y1={top} y2={top + FRETS_SHOWN * fh} stroke="var(--muted)" strokeWidth={1 + (5 - s) * 0.25} />
        ))}
        {barre && (
          <rect
            x={xOf(barre[0]) - 9}
            y={top + (minF - base + 0.5) * fh - 9}
            width={xOf(barre[barre.length - 1]) - xOf(barre[0]) + 18}
            height={18}
            rx={9}
            fill="var(--scale)"
            opacity={0.45}
          />
        )}
        {voicing.frets.map((f, s) => {
          const x = xOf(s)
          if (f === null) {
            return <text key={s} x={x} y={top - 14} textAnchor="middle" className="cd-mark">×</text>
          }
          const pc = (LOW_TO_HIGH[s] + f) % 12
          const semis = (pc - voicing.rootPc + 12) % 12
          const isRoot = semis === 0 && !neutral
          const lab = labels === 'graus' ? formulaName(semis, voicing.quality) : labels === 'notas' ? KEYS[pc] : ''
          const mark = marks?.[s]
          const ring = mark ? <circle cx={x} cy={f === 0 ? top - 18 : top + (f - base + 0.5) * fh} r={f === 0 ? 11 : 14} fill="none" stroke={mark === 'right' ? 'var(--good)' : 'var(--root)'} strokeWidth={3} /> : null
          const hit = onPick ? (
            <circle cx={x} cy={f === 0 ? top - 18 : top + (f - base + 0.5) * fh} r={16} fill="transparent" className="cd-hit" onClick={() => onPick(s)} />
          ) : null
          if (f === 0) {
            return (
              <g key={s}>
                <circle cx={x} cy={top - 18} r={7} fill="none" stroke={isRoot ? 'var(--root)' : 'var(--fg)'} strokeWidth={2} />
                {lab && <text x={x} y={top - 30} textAnchor="middle" className="cd-open">{lab}</text>}
                {ring}
                {hit}
              </g>
            )
          }
          const y = top + (f - base + 0.5) * fh
          return (
            <g key={s}>
              <circle cx={x} cy={y} r={10} fill={isRoot ? 'var(--root)' : 'var(--accent)'} />
              {lab && <text x={x} y={y + 4} textAnchor="middle" className="cd-lab">{lab}</text>}
              {ring}
              {hit}
            </g>
          )
        })}
      </svg>
      {caption && <div className="cd-caption">{caption}</div>}
    </figure>
  )
})
