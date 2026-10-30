import { memo, useEffect, useRef, type ReactNode } from 'react'
import { allPositions, degreeName, fretFractions, INLAYS } from '../core/fretboard-model'
import { posKey } from '../core/scales'
import { KEYS, type ChordInfo } from '../core/theory'
import type { HeardMark } from './heard'

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
  /** marcações por cima das notas (exercício e quiz) */
  marks?: Mark[]
  /** torna as casas clicáveis */
  onPick?: (string: number, fret: number) => void
  /** faixa destacada no braço inteiro (a box escolhida), [primeira, última casa] */
  band?: [number, number] | null
  /** notas que você tocou: pulsam por cima de tudo com a cor do veredito */
  heard?: HeardMark[]
}

export interface Mark {
  string: number
  fret: number
  kind: 'current' | 'next' | 'right' | 'wrong'
  label?: string
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
export const Fretboard = memo(function Fretboard({ maxFret, scale, chord, next, onlyChord, labels = 'graus', only, strings, window: win, marks, onPick, band, heard }: Props) {
  const focus = !!win
  const a = win ? win[0] : 0
  const b = win ? win[1] : maxFret
  // foco mais estreito: no celular as bolinhas e rótulos ficam legíveis.
  // Braço inteiro: de ponta a ponta da tela, alto o bastante para ler com a guitarra no colo.
  const W = focus ? 440 : 1600
  const H = focus ? 270 : 340
  const padL = focus ? 34 : 16
  const padR = 12
  const top = focus ? 30 : 34
  const bottom = focus ? 48 : 58
  const openW = a === 0 ? (focus ? 40 : 46) : 0
  const x0 = padL + openW
  const x1 = W - padR
  const firstWire = a === 0 ? 0 : a - 1
  const fr = fretFractions(maxFret)
  const wire = (f: number) => (focus ? x0 + ((f - firstWire) / (b - firstWire)) * (x1 - x0) : x0 + fr[f] * (x1 - x0))
  const mid = (f: number) => (f === 0 ? padL + openW / 2 - 4 : (wire(f - 1) + wire(f)) / 2)
  const step = (H - top - bottom) / 5
  const y = (s: number) => top + s * step
  const big = focus ? 16 : 22
  const small = focus ? 5.5 : 7.5
  // rótulos: no braço inteiro o SVG é largo e encolhe na tela, então as letras são maiores
  const labCls = focus ? 'fb-lab big' : 'fb-lab xl'
  const labDy = focus ? 5 : 7
  const inBand = (f: number) => !!band && f >= band[0] && f <= band[1]

  const chordPcs = chord.semitones.map((s) => (chord.root + s) % 12)
  const nextPcs = next ? next.semitones.map((s) => (next.root + s) % 12) : []
  const visible = (s: number, f: number) =>
    f >= a && f <= b && (!only || only.has(posKey(s, f))) && (!strings || strings.includes(s))

  const els: ReactNode[] = []
  els.push(<rect key="wood" x={x0} y={top - 12} width={x1 - x0} height={H - top - bottom + 24} rx={3} fill="var(--wood)" />)

  if (band && !focus) {
    const bx0 = band[0] === 0 ? padL : wire(band[0] - 1)
    const bx1 = wire(band[1])
    els.push(
      <rect key="band" x={bx0} y={top - 12} width={bx1 - bx0} height={H - top - bottom + 24} rx={6} className="fb-band" />,
    )
  }
  const inlay = (f: number, cy: number, k: string) =>
    els.push(<circle key={k} cx={mid(f)} cy={cy} r={focus ? 6 : 8} fill="var(--inlay)" />)
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
    els.push(<text key={`n${f}`} x={mid(f)} y={H - (focus ? 10 : 12)} textAnchor="middle" className={`fb-num ${focus ? 'big' : 'xl'}${inBand(f) ? ' in' : ''}`}>{f}</text>)
  }
  for (let s = 0; s < 6; s++) {
    els.push(<line key={`s${s}`} x1={a === 0 ? padL - 6 : x0} y1={y(s)} x2={x1} y2={y(s)} stroke="var(--string)" strokeWidth={focus ? 0.8 + s * 0.35 : 1.2 + s * 0.5} />)
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
      chordEls.push(<circle key={`g${k}`} cx={cx} cy={cy} r={big + 6} fill="none" stroke="var(--next)" strokeWidth={focus ? 3 : 4} opacity={0.85} />)
    }

    if (ci < 0) {
      if (onlyChord || !inScale) continue
      if (labels === 'notas') {
        scaleEls.push(
          <g key={`d${k}`}>
            <circle cx={cx} cy={cy} r={big - 5} fill="var(--scale)" />
            <text x={cx} y={cy + (focus ? 4 : 6)} textAnchor="middle" className={focus ? 'fb-lab dim' : 'fb-lab dim xl'}>{KEYS[p.pc]}</text>
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
        {lab && <text x={cx} y={cy + labDy} textAnchor="middle" className={labCls}>{lab}</text>}
      </g>,
    )
  }

  const markEls = (marks ?? [])
    .filter((m) => m.fret >= a && m.fret <= b)
    .map((m) => {
      const cx = mid(m.fret)
      const cy = y(m.string)
      const k = `m${m.string}-${m.fret}-${m.kind}`
      if (m.kind === 'next') return <circle key={k} cx={cx} cy={cy} r={big + 6} fill="none" stroke="var(--next)" strokeWidth={focus ? 3 : 4} />
      const fill = m.kind === 'current' ? 'var(--fg)' : m.kind === 'right' ? 'var(--good)' : 'var(--root)'
      return (
        <g key={k}>
          {m.kind === 'current' && !focus && <circle cx={cx} cy={cy} r={big + 12} fill="rgb(255 255 255 / .16)" />}
          <circle cx={cx} cy={cy} r={big + 2} fill={fill} />
          {m.label && <text x={cx} y={cy + labDy} textAnchor="middle" className={`${labCls} inv`}>{m.label}</text>}
        </g>
      )
    })

  // o que você tocou: anel com a cor do veredito, nome da nota e um halo que some sozinho (CSS)
  const heardEls = (heard ?? [])
    .filter((m) => m.fret >= a && m.fret <= b)
    .map((m) => (
      <g key={`heard${m.id}`} className={`fb-heard t-${m.tone}`} transform={`translate(${mid(m.fret)} ${y(m.string)})`}>
        <g className="pop">
          <circle r={big + 16} className="halo" />
          <circle r={big + 3} className="ring" strokeWidth={focus ? 3.5 : 5} />
          <text y={labDy} textAnchor="middle" className={`${labCls} hl`}>{m.label}</text>
        </g>
      </g>
    ))

  // celular: o braço inteiro rola de lado; mantém a box à vista
  const wrap = useRef<HTMLDivElement>(null)
  const bandX = band && !focus ? (band[0] === 0 ? 0 : wire(band[0] - 1)) / W : null
  useEffect(() => {
    const el = wrap.current
    if (!el || bandX === null) return
    // só dá para rolar quando o braço tem largura (a área pode estar montada escondida):
    // rola na primeira vez que aparece e quando a box muda
    let done = false
    const go = () => {
      if (done || !el.clientWidth) return
      done = true
      if (el.scrollWidth > el.clientWidth) el.scrollTo({ left: Math.max(0, bandX * el.scrollWidth - 24) })
    }
    const ro = new ResizeObserver(go)
    ro.observe(el)
    go()
    return () => ro.disconnect()
  }, [bandX])

  // áreas clicáveis: uma por corda × casa
  const hits: ReactNode[] = []
  if (onPick) {
    for (let s = 0; s < 6; s++) {
      for (let f = a; f <= b; f++) {
        const x0c = f === 0 ? padL - 10 : wire(f - 1)
        const x1c = f === 0 ? x0 : wire(f)
        hits.push(
          <rect key={`h${s}-${f}`} x={x0c} y={y(s) - step / 2} width={x1c - x0c} height={step} fill="transparent" className="fb-hit" onClick={() => onPick(s, f)} />,
        )
      }
    }
  }

  return (
    <div className={focus ? 'board-wrap' : 'board-wrap full'} ref={wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Braço da guitarra">
        {els}
        {scaleEls}
        {chordEls}
        {markEls}
        {heardEls}
        {hits}
      </svg>
    </div>
  )
})
