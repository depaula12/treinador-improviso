import { memo, type ReactNode } from 'react'
import { allPositions, degreeName, fretFractions, INLAYS } from '../core/fretboard-model'
import { posKey } from '../core/scales'
import { KEYS, type ChordInfo } from '../core/theory'

export type LabelMode = 'graus' | 'notas' | 'nenhum'

interface Props {
  maxFret: number
  /** classes de altura da escala */
  scale: number[]
  chord: ChordInfo
  /** acorde seguinte: brilho nas notas dele */
  next?: ChordInfo | null
  onlyChord?: boolean
  labels?: LabelMode
  /** se presente, só mostra estas posições ("corda:casa") */
  only?: Set<string> | null
  /** cordas permitidas (0 = Mi agudo) */
  strings?: number[] | null
  /** janela de foco [primeira, última casa]: casas largas e iguais, só a região do desenho */
  window?: [number, number] | null
}

const noteName = (chord: ChordInfo, pc: number) => {
  const i = chord.semitones.findIndex((s) => (chord.root + s) % 12 === pc)
  return i >= 0 ? chord.notes[i] : KEYS[pc]
}

/**
 * Braço horizontal, corda aguda em cima (como na tablatura).
 * Hierarquia: notas do acorde grandes e coloridas; escala em pontos pequenos e discretos.
 */
// memo: só redesenha quando as props mudam (troca de acorde, brilho no tempo 4)
export const Fretboard = memo(function Fretboard({ maxFret, scale, chord, next, onlyChord, labels = 'graus', only, strings, window: win }: Props) {
  const focus = !!win
  const a = win ? win[0] : 0
  const b = win ? win[1] : maxFret
  // foco mais estreito: no celular as bolinhas e rótulos ficam legíveis
  const W = focus ? 440 : 1000
  const H = focus ? 270 : 210
  const padL = 34
  const padR = 12
  const top = focus ? 30 : 26
  const bottom = focus ? 48 : 32
  const openW = a === 0 ? 40 : 0
  const x0 = padL + openW
  const x1 = W - padR
  const firstWire = a === 0 ? 0 : a - 1
  const fr = fretFractions(maxFret)
  const wire = (f: number) => (focus ? x0 + ((f - firstWire) / (b - firstWire)) * (x1 - x0) : x0 + fr[f] * (x1 - x0))
  const mid = (f: number) => (f === 0 ? padL + openW / 2 - 4 : (wire(f - 1) + wire(f)) / 2)
  const step = (H - top - bottom) / 5
  const y = (s: number) => top + s * step
  const big = focus ? 16 : 11
  const small = focus ? 5.5 : 4.5

  const chordPcs = chord.semitones.map((s) => (chord.root + s) % 12)
  const nextPcs = next ? next.semitones.map((s) => (next.root + s) % 12) : []
  const visible = (s: number, f: number) =>
    f >= a && f <= b && (!only || only.has(posKey(s, f))) && (!strings || strings.includes(s))

  const els: ReactNode[] = []
  els.push(<rect key="wood" x={x0} y={top - 12} width={x1 - x0} height={H - top - bottom + 24} rx={3} fill="var(--wood)" />)

  const inlay = (f: number, cy: number, k: string) =>
    els.push(<circle key={k} cx={mid(f)} cy={cy} r={focus ? 6 : 5} fill="var(--inlay)" />)
  // no foco os números das casas bastam; as marcações pareceriam notas
  if (!focus) for (const f of INLAYS) if (f >= Math.max(1, a) && f <= b) inlay(f, (y(0) + y(5)) / 2, `in${f}`)
  if (!focus && 12 >= Math.max(1, a) && 12 <= b) {
    inlay(12, (y(1) + y(2)) / 2, 'in12a')
    inlay(12, (y(3) + y(4)) / 2, 'in12b')
  }

  for (let f = firstWire; f <= b; f++) {
    const nut = f === 0
    els.push(<line key={`f${f}`} x1={wire(f)} y1={top - 12} x2={wire(f)} y2={H - bottom + 12} stroke={nut ? 'var(--nut)' : 'var(--fret)'} strokeWidth={nut ? 7 : 2} />)
  }
  for (let f = Math.max(1, a); f <= b; f++) {
    els.push(<text key={`n${f}`} x={mid(f)} y={H - (focus ? 10 : 8)} textAnchor="middle" className={focus ? 'fb-num big' : 'fb-num'}>{f}</text>)
  }
  for (let s = 0; s < 6; s++) {
    els.push(<line key={`s${s}`} x1={a === 0 ? padL - 6 : x0} y1={y(s)} x2={x1} y2={y(s)} stroke="var(--string)" strokeWidth={0.8 + s * 0.35} />)
  }

  // primeiro a escala (atrás), depois o acorde (na frente)
  const scaleEls: ReactNode[] = []
  const chordEls: ReactNode[] = []
  for (const p of allPositions(maxFret)) {
    if (!visible(p.string, p.fret)) continue
    const ci = chordPcs.indexOf(p.pc)
    const inScale = scale.includes(p.pc)
    const cx = mid(p.fret)
    const cy = y(p.string)
    const k = `${p.string}-${p.fret}`

    if (nextPcs.includes(p.pc)) {
      chordEls.push(<circle key={`g${k}`} cx={cx} cy={cy} r={big + 5} fill="none" stroke="var(--next)" strokeWidth={3} opacity={0.85} />)
    }

    if (ci < 0) {
      if (onlyChord || !inScale) continue
      if (labels === 'notas') {
        scaleEls.push(
          <g key={`d${k}`}>
            <circle cx={cx} cy={cy} r={big - 5} fill="var(--scale)" />
            <text x={cx} y={cy + 4} textAnchor="middle" className="fb-lab dim">{KEYS[p.pc]}</text>
          </g>,
        )
      } else {
        scaleEls.push(<circle key={`d${k}`} cx={cx} cy={cy} r={small} fill="var(--scale)" />)
      }
      continue
    }

    const isRoot = ci === 0
    const lab = labels === 'graus' ? degreeName(chord.semitones[ci]) : labels === 'notas' ? noteName(chord, p.pc) : ''
    chordEls.push(
      <g key={`d${k}`}>
        <circle cx={cx} cy={cy} r={big} fill={isRoot ? 'var(--root)' : 'var(--accent)'} />
        {lab && <text x={cx} y={cy + (focus ? 5 : 4)} textAnchor="middle" className={focus ? 'fb-lab big' : 'fb-lab'}>{lab}</text>}
      </g>,
    )
  }

  return (
    <div className={focus ? 'board-wrap' : 'board-wrap full'}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Braço da guitarra">
        {els}
        {scaleEls}
        {chordEls}
      </svg>
    </div>
  )
})
