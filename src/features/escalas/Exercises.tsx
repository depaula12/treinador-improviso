import { useEffect, useMemo, useState } from 'react'
import { engine, type StepPos } from '../../audio/engine'
import { buildExercise, EXERCISES, type ExerciseId } from '../../core/exercises'
import { degreeName } from '../../core/fretboard-model'
import { boxPositions, boxRange, SCALES } from '../../core/scales'
import { KEYS, type ChordInfo } from '../../core/theory'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { useImproviso } from '../improviso/store'
import { useEscalas, type Display } from './store'

const NO_SCALE: number[] = []
const PER_BEAT = [
  { v: 1, label: 'Semínimas (1 por tempo)' },
  { v: 2, label: 'Colcheias (2 por tempo)' },
  { v: 3, label: 'Tercinas (3 por tempo)' },
  { v: 4, label: 'Semicolcheias (4 por tempo)' },
] as const

const toggle = (xs: number[], x: number) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x].sort())

export function Exercises() {
  const s = useEscalas()
  const [step, setStep] = useState<StepPos | null>(null)
  const [playing, setPlaying] = useState(false)
  const [reveal, setReveal] = useState(false)

  const scale = SCALES.find((x) => x.id === s.scaleId) ?? SCALES[0]
  const keyPc = KEYS.indexOf(s.key)
  // nenhum box marcado: usa o 1 (memo para não recriar a sequência a cada render)
  const boxes = useMemo(() => (s.boxes.length ? s.boxes : [1]), [s.boxes])
  const seq = useMemo(() => buildExercise(s.exercise, scale, keyPc, boxes), [s.exercise, scale, keyPc, boxes])
  const midi = useMemo(() => seq.map((n) => n.midi), [seq])
  const only = useMemo(() => {
    const all = new Set<string>()
    for (const b of boxes) for (const k of boxPositions(scale, keyPc, b)) all.add(k)
    return all
  }, [boxes, scale, keyPc])
  const [lo, hi] = useMemo(() => {
    const rs = boxes.map((b) => boxRange(scale, keyPc, b))
    return [Math.min(...rs.map((r) => r[0])), Math.max(...rs.map((r) => r[1]))]
  }, [boxes, scale, keyPc])
  // até ~8 casas cabe na janela de foco; mais que isso, braço inteiro
  const win: [number, number] | null = hi - lo <= 8 ? [lo, hi] : null

  // a escala desenhada como "acorde": tônica em vermelho, graus da escala como rótulo
  const shown: ChordInfo = useMemo(() => {
    const semis = s.display === 'tudo' || reveal ? scale.semitones : s.display === 'fundamentais' ? [0] : []
    return { symbol: '', tonic: s.key, root: keyPc, semitones: semis, notes: semis.map((x) => KEYS[(keyPc + x) % 12]), minor: false }
  }, [s.display, reveal, scale, keyPc, s.key])

  const cur = step && step.index >= 0 ? seq[step.index] : null
  const nxt = step && step.index >= 0 ? seq[(step.index + 1) % seq.length] : null
  const showMarks = s.display !== 'esconder' || reveal
  const marks: Mark[] = []
  if (cur && showMarks) {
    if (nxt && (nxt.string !== cur.string || nxt.fret !== cur.fret)) marks.push({ string: nxt.string, fret: nxt.fret, kind: 'next' })
    marks.push({ string: cur.string, fret: cur.fret, kind: 'current', label: degreeName(cur.degree) })
  }

  useEffect(() => {
    engine.onStep = (p) => {
      setStep(p)
      if (!p) setPlaying(false)
    }
    return () => {
      // saiu da aba: para o exercício, mas não a base do Improviso
      if (engine.mode === 'exercise') engine.stop()
      engine.onStep = null
    }
  }, [])

  const cfg = { bpm: s.bpm, perBeat: s.perBeat, notes: midi, sound: s.sound, countIn: s.countIn }
  // mudou o exercício com ele tocando: recomeça já com a sequência nova
  useEffect(() => {
    if (playing) engine.playExercise({ ...cfg, countIn: false })
  }, [midi, s.perBeat, s.sound])
  useEffect(() => {
    if (playing) engine.setBpm(s.bpm)
  }, [s.bpm, playing])

  async function toggleplay() {
    if (playing) {
      engine.stop()
      return
    }
    await engine.start(useImproviso.getState().mix)
    engine.playExercise(cfg)
    setPlaying(true)
  }

  const bpm = (d: number) => s.set({ bpm: Math.min(200, Math.max(40, s.bpm + d)) })
  const ex = EXERCISES.find((e) => e.id === s.exercise)!

  return (
    <div className="stack">
      <section className="panel stack-sm">
        <div className="grid-3">
          <label>
            Escala
            <select value={s.scaleId} onChange={(e) => s.set({ scaleId: e.target.value })}>
              {SCALES.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
          <label>
            Tom
            <select value={s.key} onChange={(e) => s.set({ key: e.target.value })}>
              {KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            Exercício
            <select value={s.exercise} onChange={(e) => s.set({ exercise: e.target.value as ExerciseId })}>
              {EXERCISES.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row-wrap">
          <div>
            <div className="tag">Desenhos</div>
            <div className="chips">
              {[1, 2, 3, 4, 5].map((b) => (
                <button key={b} type="button" className="chip" aria-pressed={s.boxes.includes(b)} onClick={() => s.set({ boxes: toggle(s.boxes, b) })}>
                  Box {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="tag">Mostrar</div>
            <div className="segmented small" role="group" aria-label="Exibição">
              {(['tudo', 'fundamentais', 'esconder'] as Display[]).map((d) => (
                <button key={d} type="button" aria-pressed={s.display === d} onClick={() => { s.set({ display: d }); setReveal(false) }}>
                  {d === 'tudo' ? 'Tudo' : d === 'fundamentais' ? 'Só tônicas' : 'Esconder'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid-3">
          <label>
            Ritmo
            <select value={s.perBeat} onChange={(e) => s.set({ perBeat: +e.target.value as 1 | 2 | 3 | 4 })}>
              {PER_BEAT.map((p) => (
                <option key={p.v} value={p.v}>{p.label}</option>
              ))}
            </select>
          </label>
          <div className="checks end">
            <label><input type="checkbox" checked={s.sound} onChange={(e) => s.set({ sound: e.target.checked })} /> Tocar as notas</label>
            <label><input type="checkbox" checked={s.countIn} onChange={(e) => s.set({ countIn: e.target.checked })} /> Contagem</label>
          </div>
        </div>
        <p className="muted hint">{ex.hint} {seq.length} notas por volta.</p>
      </section>

      <section className="board">
        <Fretboard
          maxFret={win ? 17 : Math.min(17, hi + 1)}
          scale={NO_SCALE}
          chord={shown}
          labels="graus"
          only={only}
          window={win}
          marks={marks}
        />
        <div className="board-bar">
          <span className="muted">
            {step?.index === -1 ? `Contagem: ${step.count}` : cur ? `Nota ${step!.index + 1} de ${seq.length}` : `${scale.name} em ${s.key}`}
          </span>
          {s.display === 'esconder' && (
            <button type="button" className="chip" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>
              {reveal ? 'Esconder de novo' : 'Revelar'}
            </button>
          )}
        </div>
      </section>

      <section className="transport">
        <div className="bpm-ctl">
          <button type="button" onClick={() => bpm(-5)} aria-label="Diminuir andamento">−</button>
          <span className="mono">{s.bpm}<small> bpm</small></span>
          <button type="button" onClick={() => bpm(5)} aria-label="Aumentar andamento">+</button>
        </div>
        <button className="play big" type="button" aria-pressed={playing} onClick={toggleplay}>
          {playing ? 'Parar' : 'Começar'}
        </button>
      </section>

      <Presets />
    </div>
  )
}

function Presets() {
  const { presets, savePreset, loadPreset, deletePreset } = useEscalas()
  return (
    <section className="panel stack-sm">
      <div className="row-between">
        <div className="tag">Treinos salvos</div>
        <button
          type="button"
          className="chip"
          onClick={() => {
            const name = prompt('Nome do treino (ex.: "Segunda: pentatônica box 1–2")')
            if (name?.trim()) savePreset(name.trim())
          }}
        >
          + Salvar este treino
        </button>
      </div>
      {presets.length === 0 ? (
        <p className="muted hint">Salve combinações que você usa sempre. Um conjunto delas vira o seu plano da semana.</p>
      ) : (
        <div className="chips">
          {presets.map((p) => (
            <span key={p.id} className="preset">
              <button type="button" className="chip" onClick={() => loadPreset(p.id)}>{p.name}</button>
              <button type="button" className="preset-del" aria-label={`Apagar ${p.name}`} onClick={() => confirm(`Apagar "${p.name}"?`) && deletePreset(p.id)}>×</button>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}
