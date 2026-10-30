import { useEffect, useMemo, useRef, useState } from 'react'
import { engine, type StepPos } from '../../audio/engine'
import { buildExercise, EXERCISES, type ExerciseId } from '../../core/exercises'
import { degreeName } from '../../core/fretboard-model'
import { boxPositions, boxRange, SCALES } from '../../core/scales'
import { KEYS, type ChordInfo } from '../../core/theory'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { usePlayerSlot } from '../../ui/player-slot'
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
  const rhythm = PER_BEAT.find((p) => p.v === s.perBeat)!.label.split(' ')[0].toLowerCase()

  // o player fixo embaixo vira o transporte do exercício enquanto esta tela está aberta
  const toggleRef = useRef(toggleplay)
  toggleRef.current = toggleplay
  useEffect(() => {
    usePlayerSlot.getState().set({
      slot: {
        art: 'Ex',
        title: `Exercício: ${ex.name.toLowerCase()}`,
        sub: `${scale.name} em ${s.key} · box ${boxes.join(', ')} · ${rhythm}`,
        bpm: s.bpm,
        playing,
        onToggle: () => void toggleRef.current(),
        onBpm: bpm,
      },
    })
  }, [ex.name, scale.name, s.key, boxes, rhythm, s.bpm, playing])
  useEffect(() => () => usePlayerSlot.getState().set({ slot: null }), [])

  // sequência visível: no máximo 24 notas em volta da atual
  const curIdx = step && step.index >= 0 ? step.index : -1
  const from = seq.length > 24 ? Math.max(0, Math.min(seq.length - 24, curIdx - 8)) : 0
  const seqShown = seq.slice(from, from + 24)

  return (
    <>
      <section className="card stack-sm">
        <div className="cfg-row">
          <label>
            Escala
            <select value={s.scaleId} onChange={(e) => s.set({ scaleId: e.target.value })}>
              <optgroup label="Escalas">
                {SCALES.filter((x) => !x.id.startsWith('arp')).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </optgroup>
              <optgroup label="Arpejos (notas do acorde)">
                {SCALES.filter((x) => x.id.startsWith('arp')).map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </optgroup>
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
          <label>
            Ritmo
            <select value={s.perBeat} onChange={(e) => s.set({ perBeat: +e.target.value as 1 | 2 | 3 | 4 })}>
              {PER_BEAT.map((p) => (
                <option key={p.v} value={p.v}>{p.label}</option>
              ))}
            </select>
          </label>
          <div>
            <div className="tag">Mostrar</div>
            <div className="segmented small" role="group" aria-label="Exibição">
              {(['tudo', 'fundamentais', 'esconder'] as Display[]).map((d) => (
                <button key={d} type="button" aria-pressed={s.display === d} onClick={() => { s.set({ display: d }); setReveal(false) }}>
                  {d === 'tudo' ? 'Tudo' : d === 'fundamentais' ? 'Tônicas' : 'Esconder'}
                </button>
              ))}
            </div>
          </div>
          <div className="checks" style={{ flexDirection: 'column', gap: 4 }}>
            <label><input type="checkbox" checked={s.sound} onChange={(e) => s.set({ sound: e.target.checked })} /> Tocar as notas</label>
            <label><input type="checkbox" checked={s.countIn} onChange={(e) => s.set({ countIn: e.target.checked })} /> Contagem</label>
          </div>
        </div>
        <div className="row-between">
          <div className="row">
            <span className="tag" style={{ margin: 0 }}>Desenhos</span>
            {[1, 2, 3, 4, 5].map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={s.boxes.includes(b)} onClick={() => s.set({ boxes: toggle(s.boxes, b) })}>
                Box {b}
              </button>
            ))}
          </div>
          <span className="muted hint">{ex.hint} {seq.length} notas por volta.</span>
        </div>
      </section>

      <div className="ex-top">
        <section className="card stack-sm" aria-label="Sequência">
          <div className="row-between">
            <span className="tag" style={{ margin: 0 }}>Sequência</span>
            <span className="muted mono">
              {step?.index === -1 ? `contagem: ${step.count}` : cur ? `nota ${step!.index + 1} de ${seq.length}` : `${scale.name} em ${s.key}`}
            </span>
          </div>
          <div className="seq">
            {seqShown.map((n, k) => {
              const idx = from + k
              const hide = !showMarks && idx !== curIdx
              return (
                <span key={idx} className={idx === curIdx ? 'on' : idx < curIdx ? 'done' : ''}>
                  {hide ? '·' : KEYS[n.midi % 12]}
                </span>
              )
            })}
            {from + 24 < seq.length && <span>…</span>}
          </div>
        </section>
        <section className="card now-note" aria-live="polite">
          <span className="tag">Agora</span>
          <b>{cur && showMarks ? KEYS[cur.midi % 12] : '—'}</b>
          <span className="muted mono">{cur && showMarks ? `${cur.string + 1}ª corda, casa ${cur.fret}` : playing ? 'escondido' : 'aperte Começar'}</span>
        </section>
      </div>

      <section className="neck-band">
        <Fretboard maxFret={Math.max(12, Math.min(17, hi + 1))} scale={NO_SCALE} chord={shown} labels="graus" only={only} band={[lo, hi]} marks={marks} />
        <div className="neck-cap">
          <span><span className="guide-dot" />nota atual · <span className="guide-ring" />próxima</span>
          <div className="row">
            {s.display === 'esconder' && (
              <button type="button" className="chip" aria-pressed={reveal} onClick={() => setReveal(!reveal)}>
                {reveal ? 'Esconder de novo' : 'Revelar'}
              </button>
            )}
            <span className="muted mono">casas {lo}–{hi}</span>
          </div>
        </div>
      </section>

      <Presets />
    </>
  )
}

function Presets() {
  const { presets, savePreset, loadPreset, deletePreset } = useEscalas()
  return (
    <section className="card row-between">
      <div className="presets">
        <span className="tag" style={{ margin: 0 }}>Treinos salvos</span>
        {presets.length === 0 ? (
          <span className="muted hint">Salve combinações que você usa sempre. Um conjunto delas vira o seu plano da semana.</span>
        ) : (
          presets.map((p) => (
            <span key={p.id} className="preset">
              <button type="button" className="chip" onClick={() => loadPreset(p.id)}>{p.name}</button>
              <button type="button" className="preset-del" aria-label={`Apagar ${p.name}`} onClick={() => confirm(`Apagar "${p.name}"?`) && deletePreset(p.id)}>×</button>
            </span>
          ))
        )}
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          const name = prompt('Nome do treino (ex.: "Segunda: pentatônica box 1–2")')
          if (name?.trim()) savePreset(name.trim())
        }}
      >
        + Salvar este treino
      </button>
    </section>
  )
}
