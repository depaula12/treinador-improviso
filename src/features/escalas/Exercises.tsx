import { useEffect, useMemo, useRef, useState } from 'react'
import { engine, type StepPos } from '../../audio/engine'
import { buildExercise, EXERCISES, type ExerciseId } from '../../core/exercises'
import { judgeStep, nextBpm, placeNote, stepScore, type HeardNote, type StepVerdict } from '../../core/feedback'
import { degreeName } from '../../core/fretboard-model'
import { boxPositions, boxRange, SCALES } from '../../core/scales'
import { keyUsesFlats } from '../../core/song'
import { KEYS, type ChordInfo } from '../../core/theory'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { spellPc, TONE_LABEL, useHeard, type HitTone } from '../../ui/heard'
import { ListenChip, useGuitarInput } from '../../ui/InputPanel'
import { Panel } from '../../ui/Panel'
import { usePlayerSlot } from '../../ui/player-slot'
import { useImproviso } from '../improviso/store'
import { useHoje } from '../hoje/store'
import { useEscalas, type Display, type Pace } from './store'

const NO_SCALE: number[] = []
const PER_BEAT = [
  { v: 1, label: 'Semínimas (1 por tempo)' },
  { v: 2, label: 'Colcheias (2 por tempo)' },
  { v: 3, label: 'Tercinas (3 por tempo)' },
  { v: 4, label: 'Semicolcheias (4 por tempo)' },
] as const
/**
 * A nota é percebida um pouco depois da palhetada (o detector precisa de alguns ciclos da corda).
 * Esse atraso médio sai da conta do tempo, para "no tempo" querer dizer no tempo de verdade.
 */
const DETECT_LAG = 0.045

const toggle = (xs: number[], x: number) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x].sort())

interface LoopResult {
  score: number
  /** atraso médio (ms, + = atrasado) das notas certas */
  avgMs: number | null
  bpm: number
  /** o andamento mudou sozinho (speed trainer) */
  bpmTo?: number
}

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
  const flats = keyUsesFlats(s.key)

  // a escala desenhada como "acorde": tônica em vermelho, graus da escala como rótulo
  const shown: ChordInfo = useMemo(() => {
    const semis = s.display === 'tudo' || reveal ? scale.semitones : s.display === 'fundamentais' ? [0] : []
    return { symbol: '', tonic: s.key, root: keyPc, semitones: semis, notes: semis.map((x) => KEYS[(keyPc + x) % 12]), minor: false }
  }, [s.display, reveal, scale, keyPc, s.key])

  // ---------- conferência pelo áudio ----------
  const wait = s.pace === 'espera'
  const lit = useHeard()
  const onsets = useRef<HeardNote[]>([])
  /** vereditos da volta em andamento (metrônomo) ou do modo "espera" */
  const [verdicts, setVerdicts] = useState<(StepVerdict | undefined)[]>([])
  const [last, setLast] = useState<LoopResult | null>(null)
  const loopNo = useRef(0)
  const loopResults = useRef(new Map<number, StepVerdict[]>())
  const offsets = useRef<number[]>([])
  const timers = useRef<number[]>([])
  const [waitIdx, setWaitIdx] = useState(0)
  const [waiting, setWaiting] = useState(false)
  const firstTry = useRef(true)

  const io = useGuitarInput((f) => {
    const e = f?.onset
    if (!e) return
    const t = e.t / 1000
    onsets.current.push({ midi: e.midi, t })
    while (onsets.current.length && onsets.current[0].t < t - 4) onsets.current.shift()
    // a nota pulsa no braço na hora; o veredito de tempo vem na sequência, logo depois
    const curIdx = wait ? waitIdx : step && step.index >= 0 ? step.index : -1
    const cur = curIdx >= 0 ? seq[curIdx] : null
    const nxt = curIdx >= 0 ? seq[(curIdx + 1) % seq.length] : null
    const hit = [cur, nxt].find((n) => n && n.midi === e.midi)
    const octave = !hit && [cur, nxt].find((n) => n && n.midi % 12 === e.midi % 12)
    const tone: HitTone = !cur ? 'escala' : hit ? 'certo' : octave ? 'oitava' : 'errado'
    const place = hit ? { string: hit.string, fret: hit.fret } : placeNote(e.midi, { band: [lo, hi] })
    if (place) lit.add({ id: e.id, ...place, tone, label: spellPc(e.midi, flats) })
    if (wait && waiting && cur) onWaitNote(e.midi, cur.midi, curIdx)
  })

  function resetCheck() {
    timers.current.forEach((x) => window.clearTimeout(x))
    timers.current = []
    loopResults.current.clear()
    loopNo.current = 0
    offsets.current = []
    setVerdicts([])
    lit.clear()
  }

  /** fim de uma volta: nota, atraso médio e, com o speed trainer, o andamento novo */
  function finishLoop(arr: StepVerdict[], len: number) {
    const all = Array.from({ length: len }, (_, k) => arr[k] ?? 'faltou')
    const score = stepScore(all)
    const offs = offsets.current
    const avgMs = offs.length ? Math.round(offs.reduce((a, b) => a + b, 0) / offs.length) : null
    offsets.current = []
    const st = useEscalas.getState()
    const to = st.autoBpm ? nextBpm(st.bpm, score) : st.bpm
    setLast({ score, avgMs, bpm: st.bpm, bpmTo: to !== st.bpm ? to : undefined })
    // Treino do dia: volta limpa (90%+) registra o bpm do dia
    if (score >= 90) useHoje.getState().logBpm(st.bpm)
    if (to !== st.bpm) st.set({ bpm: to })
  }

  /** passo do metrônomo: guarda a hora e confere a nota um pouco depois (a janela precisa passar) */
  const onStepRef = useRef<(p: StepPos | null) => void>(() => {})
  onStepRef.current = (p) => {
    setStep(p)
    if (!p) {
      setPlaying(false)
      return
    }
    if (!io.active || p.index < 0 || wait) return
    if (p.index === 0 && loopResults.current.has(loopNo.current)) {
      loopNo.current++
      setVerdicts([])
    }
    const no = loopNo.current
    if (!loopResults.current.has(no)) loopResults.current.set(no, [])
    const idx = p.index
    const at = performance.now() / 1000
    const stepSec = 60 / useEscalas.getState().bpm / useEscalas.getState().perBeat
    const expected = seq[idx].midi
    const len = seq.length
    const delay = (Math.min(0.22, stepSec * 0.5) + DETECT_LAG + 0.06) * 1000
    timers.current.push(
      window.setTimeout(() => {
        const notes = onsets.current.map((n) => ({ midi: n.midi, t: n.t - DETECT_LAG }))
        const r = judgeStep(notes, expected, at, stepSec)
        const arr = loopResults.current.get(no) ?? []
        arr[idx] = r.verdict
        if (r.offsetMs !== null && (r.verdict === 'certo' || r.verdict === 'tempo')) offsets.current.push(r.offsetMs)
        if (no === loopNo.current) setVerdicts([...arr])
        if (idx === len - 1) {
          finishLoop(arr, len)
          loopResults.current.delete(no)
        }
      }, delay),
    )
  }

  /** modo "espera por você": acertou a nota, anda; errou, fica e marca */
  function onWaitNote(heard: number, expected: number, idx: number) {
    const sameNote = heard === expected
    const sameName = heard % 12 === expected % 12
    if (!sameNote && !sameName) {
      firstTry.current = false
      return
    }
    const v: StepVerdict = !firstTry.current ? 'tempo' : sameNote ? 'certo' : 'oitava'
    firstTry.current = true
    const arr = [...verdicts]
    arr[idx] = v
    if (s.sound) void engine.previewNote(expected, useImproviso.getState().mix)
    if (idx === seq.length - 1) {
      // volta completa: nota (acertos de primeira) e recomeça
      const all = seq.map((_, k) => arr[k] ?? 'faltou')
      setLast({ score: stepScore(all), avgMs: null, bpm: s.bpm })
      setVerdicts([])
      setWaitIdx(0)
    } else {
      setVerdicts(arr)
      setWaitIdx(idx + 1)
    }
  }

  const curIdx = wait ? (waiting ? waitIdx : -1) : step && step.index >= 0 ? step.index : -1
  const cur = curIdx >= 0 ? seq[curIdx] : null
  const nxt = curIdx >= 0 ? seq[(curIdx + 1) % seq.length] : null
  const showMarks = s.display !== 'esconder' || reveal
  const marks: Mark[] = []
  if (cur && showMarks) {
    if (nxt && (nxt.string !== cur.string || nxt.fret !== cur.fret)) marks.push({ string: nxt.string, fret: nxt.fret, kind: 'next' })
    marks.push({ string: cur.string, fret: cur.fret, kind: 'current', label: degreeName(cur.degree) })
  }

  useEffect(() => {
    engine.onStep = (p) => onStepRef.current(p)
    return () => {
      // saiu da aba: para o exercício, mas não a base do Improviso
      if (engine.mode === 'exercise') engine.stop()
      engine.onStep = null
      timers.current.forEach((x) => window.clearTimeout(x))
    }
  }, [])

  const cfg = { bpm: s.bpm, perBeat: s.perBeat, notes: midi, sound: s.sound, countIn: s.countIn }
  // mudou o exercício com ele tocando: recomeça já com a sequência nova
  useEffect(() => {
    resetCheck()
    setWaitIdx(0)
    if (playing) engine.playExercise({ ...cfg, countIn: false })
  }, [midi, s.perBeat, s.sound])
  useEffect(() => {
    if (playing) engine.setBpm(s.bpm)
  }, [s.bpm, playing])
  // trocou o modo: para o que estava rodando
  useEffect(() => {
    if (playing) engine.stop()
    setWaiting(false)
    setWaitIdx(0)
    resetCheck()
    setLast(null)
  }, [s.pace])

  async function toggleplay() {
    if (wait) {
      if (waiting) {
        setWaiting(false)
        return
      }
      // o modo "espera" só anda ouvindo a guitarra
      if (!io.active) await io.start()
      resetCheck()
      setLast(null)
      firstTry.current = true
      setWaitIdx(0)
      setWaiting(true)
      return
    }
    if (playing) {
      engine.stop()
      return
    }
    resetCheck()
    setLast(null)
    try {
      await engine.start(useImproviso.getState().mix)
    } catch {
      return // o aviso já apareceu (engine.onError)
    }
    engine.playExercise(cfg)
    setPlaying(true)
  }

  const bpm = (d: number) => s.set({ bpm: Math.min(200, Math.max(40, s.bpm + d)) })
  const ex = EXERCISES.find((e) => e.id === s.exercise)!
  const rhythm = PER_BEAT.find((p) => p.v === s.perBeat)!.label.split(' ')[0].toLowerCase()
  const running = wait ? waiting : playing

  // o player fixo embaixo vira o transporte do exercício enquanto esta tela está aberta
  const toggleRef = useRef(toggleplay)
  toggleRef.current = toggleplay
  useEffect(() => {
    usePlayerSlot.getState().set({
      slot: {
        art: 'Ex',
        title: `Exercício: ${ex.name.toLowerCase()}`,
        sub: `${scale.name} em ${s.key} · box ${boxes.join(', ')} · ${wait ? 'espera por você' : rhythm}`,
        bpm: s.bpm,
        playing: running,
        onToggle: () => void toggleRef.current(),
        onBpm: bpm,
      },
    })
  }, [ex.name, scale.name, s.key, boxes, rhythm, s.bpm, running, wait])
  useEffect(() => () => usePlayerSlot.getState().set({ slot: null }), [])

  // sequência visível: no máximo 24 notas em volta da atual
  const from = seq.length > 24 ? Math.max(0, Math.min(seq.length - 24, curIdx - 8)) : 0
  const seqShown = seq.slice(from, from + 24)
  const lastVerdict = [...verdicts].reverse().find(Boolean)
  const done = verdicts.filter(Boolean) as StepVerdict[]
  const liveScore = done.length ? stepScore(done) : null

  return (
    <>
      <Panel id="escalas-treino" title="Treino" summary={`${scale.name} · ${s.key} · ${ex.name} · ${s.boxes.length ? `box ${s.boxes.join(', ')}` : 'sem box'} · ${s.bpm} bpm`}>
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
        <details className="more">
          <summary>Mais ajustes <span className="muted">{PER_BEAT.find((p) => p.v === s.perBeat)?.label} · {s.display === 'tudo' ? 'mostra tudo' : s.display === 'fundamentais' ? 'só tônicas' : 'escondido'}</span></summary>
          <div className="cfg-row more-body">
            <label>
              Ritmo
              <select value={s.perBeat} disabled={wait} onChange={(e) => s.set({ perBeat: +e.target.value as 1 | 2 | 3 | 4 })}>
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
              <label><input type="checkbox" checked={s.countIn} disabled={wait} onChange={(e) => s.set({ countIn: e.target.checked })} /> Contagem</label>
            </div>
          </div>
          <Presets />
        </details>
      </Panel>

      <Panel id="escalas-ouvir" title="Conferir pelo áudio" bodyClass="check-bar" summary={io.active ? `ouvindo${last ? ` · última volta ${last.score}%` : ''}` : 'guitarra desligada'}>
        <ListenChip io={io} label="Conferir o que eu toco" />
        <div className="segmented small" role="group" aria-label="Andamento">
          {(['metronomo', 'espera'] as Pace[]).map((p) => (
            <button key={p} type="button" aria-pressed={s.pace === p} onClick={() => s.set({ pace: p })}>
              {p === 'metronomo' ? 'No metrônomo' : 'Espera por você'}
            </button>
          ))}
        </div>
        {!wait && (
          <label className="inline-check" title="Volta com 90% ou mais: +5 bpm. Abaixo de 70%: −5 bpm.">
            <input type="checkbox" checked={s.autoBpm} onChange={(e) => s.set({ autoBpm: e.target.checked })} /> Subir o bpm sozinho
          </label>
        )}
        <span className="check-msg muted hint">
          {!io.active
            ? wait
              ? 'No modo "espera", a próxima nota só acende quando você acerta a atual. Ligue a guitarra e aperte Começar.'
              : 'Ligue a guitarra para o app conferir cada nota: certa, fora do tempo ou errada.'
            : wait
              ? waiting ? 'Toque a nota acesa. Sem pressa: ela só muda quando você acertar.' : 'Aperte Começar (ou espaço).'
              : playing ? 'Conferindo cada nota no tempo.' : 'Aperte Começar: o app confere cada nota com o metrônomo.'}
        </span>
        {last && (
          <span className={`loop-score ${last.score >= 90 ? 'good' : last.score >= 70 ? 'mid' : 'bad'}`}>
            <b>{last.score}%</b>
            <small>
              última volta{last.avgMs !== null ? ` · ${Math.abs(last.avgMs) < 15 ? 'no tempo' : `${Math.abs(last.avgMs)} ms ${last.avgMs > 0 ? 'atrasado' : 'adiantado'}`}` : ''}
              {last.bpmTo ? ` · ${last.bpmTo > last.bpm ? 'subiu' : 'desceu'} para ${last.bpmTo} bpm` : ''}
            </small>
          </span>
        )}
      </Panel>

      <div className="ex-top">
        <section className="card stack-sm" aria-label="Sequência">
          <div className="row-between">
            <span className="tag" style={{ margin: 0 }}>Sequência</span>
            <span className="muted mono">
              {!wait && step?.index === -1
                ? `contagem: ${step.count}`
                : cur
                  ? `nota ${curIdx + 1} de ${seq.length}${liveScore !== null ? ` · ${liveScore}% nesta volta` : ''}`
                  : `${scale.name} em ${s.key}`}
            </span>
          </div>
          <div className="seq">
            {seqShown.map((n, k) => {
              const idx = from + k
              const hide = !showMarks && idx !== curIdx
              const v = verdicts[idx]
              return (
                <span key={idx} className={`${idx === curIdx ? 'on' : idx < curIdx ? 'done' : ''}${v ? ` v v-${v}` : ''}`} title={v ? TONE_LABEL[v === 'faltou' ? 'errado' : v] : undefined}>
                  {hide ? '·' : spellPc(n.midi, flats)}
                </span>
              )
            })}
            {from + 24 < seq.length && <span>…</span>}
          </div>
          {io.active && (
            <div className="seq-legend">
              <span className="t-certo"><i className="dot-key" /> certa</span>
              <span className="t-tempo"><i className="dot-key" /> {wait ? 'na 2ª tentativa' : 'fora do tempo'}</span>
              <span className="t-oitava"><i className="dot-key" /> outra oitava</span>
              <span className="t-errado"><i className="dot-key" /> errada ou faltou</span>
            </div>
          )}
        </section>
        <section className={`card now-note${lastVerdict && io.active ? ` flash-${lastVerdict}` : ''}`} aria-live="polite">
          <span className="tag">Agora</span>
          <b>{cur && showMarks ? spellPc(cur.midi, flats) : '—'}</b>
          <span className="muted mono">{cur && showMarks ? `${cur.string + 1}ª corda, casa ${cur.fret}` : running ? 'escondido' : 'aperte Começar'}</span>
        </section>
      </div>

      <section className="neck-band">
        <Fretboard
          maxFret={Math.max(12, Math.min(17, hi + 1))}
          scale={NO_SCALE}
          chord={shown}
          labels="graus"
          only={only}
          band={[lo, hi]}
          marks={marks}
          heard={io.active ? lit.marks : undefined}
        />
        <div className="neck-cap">
          <span>
            <span className="guide-dot" />nota atual · <span className="guide-ring" />próxima
            {io.active && <> · <span className="dot-key t-certo" /> o que você tocou</>}
          </span>
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

    </>
  )
}

function Presets() {
  const { presets, savePreset, loadPreset, deletePreset } = useEscalas()
  return (
    <section className="row-between presets-row">
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
