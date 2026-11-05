import { useEffect, useMemo, useRef, useState } from 'react'
import { engine } from '../../audio/engine'
import { ALL_OF, DEFAULT_SET, makeQuestion, MODE_HINT, MODE_NAME, toggleItem, type EarQuestion } from '../../core/ear'
import { blocksFor, dateKey, earLabel, type EarMode, type EarPreset } from '../../core/plano'
import { useHoje } from '../hoje/store'
import { useImproviso } from '../improviso/store'
import { Panel } from '../../ui/Panel'
import { useOuvido } from './store'

const MODES: EarMode[] = ['int', 'acorde', 'grau', 'campo']
const DIRS: { v: NonNullable<EarPreset['dir']>; label: string }[] = [
  { v: 'asc', label: 'Subindo' },
  { v: 'desc', label: 'Descendo' },
  { v: 'harm', label: 'Juntas' },
]
const same = (a: EarPreset, b: EarPreset) => a.m === b.m && (a.dir ?? 'asc') === (b.dir ?? 'asc') && a.set.join() === b.set.join()

/** presets de ouvido do plano de hoje (bloco Ouvido ou o teste da semana zero) */
function todaysPresets(): EarPreset[] {
  return blocksFor(new Date()).flatMap((b) => b.ear ?? [])
}

export function OuvidoPage() {
  const { preset, autoNext, pickedOn, set } = useOuvido()
  const logEar = useHoje((s) => s.logEar)
  const todayEar = useHoje((s) => s.days[dateKey(new Date())]?.ear)
  const planned = useMemo(todaysPresets, [])
  // no primeiro uso do dia, começa no conjunto do plano (a menos que você já tenha escolhido outro hoje)
  useEffect(() => {
    const today = dateKey(new Date())
    if (planned.length && pickedOn !== today && !planned.some((p) => same(p, preset))) set({ preset: planned[0] })
  }, [])
  const [q, setQ] = useState<EarQuestion | null>(null)
  const [answered, setAnswered] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [session, setSession] = useState({ c: 0, t: 0, miss: {} as Record<string, number> })
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  async function play(question: EarQuestion) {
    setPlaying(true)
    const dur = await engine.playEar(question.events, useImproviso.getState().mix)
    timers.current.push(window.setTimeout(() => setPlaying(false), dur * 1000))
  }
  function next() {
    const nq = makeQuestion(preset)
    setQ(nq)
    setAnswered(null)
    void play(nq)
  }
  function answer(a: string) {
    if (!q || answered) return
    const ok = a === q.answer
    setAnswered(a)
    logEar(preset.m, ok)
    setSession((s) => ({ c: s.c + (ok ? 1 : 0), t: s.t + 1, miss: ok ? s.miss : { ...s.miss, [q.answer]: (s.miss[q.answer] ?? 0) + 1 } }))
    if (ok && autoNext) timers.current.push(window.setTimeout(next, 900))
  }
  function choose(p: EarPreset) {
    set({ preset: p, pickedOn: dateKey(new Date()) })
    setQ(null)
    setAnswered(null)
  }

  // teclas 1–9 respondem; Enter = próxima / repetir
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, select, textarea')) return
      const n = Number(e.key)
      if (n >= 1 && n <= preset.set.length) answer(preset.set[n - 1])
      else if (e.key === 'Enter') {
        e.preventDefault()
        if (!q || answered) next()
        else void play(q)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pct = session.t ? Math.round((session.c / session.t) * 100) : null
  const worst = Object.entries(session.miss).sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="page">
      <div className="page-head">
        <h1>Ouvido</h1>
        <div className="segmented" role="tablist" aria-label="Modo">
          {MODES.map((m) => (
            <button key={m} type="button" role="tab" aria-selected={preset.m === m} onClick={() => choose({ m, set: DEFAULT_SET[m], ...(m === 'int' ? { dir: 'asc' } : {}) })}>
              {MODE_NAME[m]}
            </button>
          ))}
        </div>
      </div>

      {planned.length > 0 && (
        <Panel id="ouvido-plano" title="Do plano de hoje" bodyClass="chips" summary={planned.map(earLabel).join(' · ')}>
          {planned.map((p, i) => (
            <button key={i} type="button" className="chip" aria-pressed={same(p, preset)} onClick={() => choose(p)}>{earLabel(p)}</button>
          ))}
        </Panel>
      )}

      <div className="ear-grid">
        <section className="card ear-q" aria-live="polite">
          <p className="muted hint" style={{ margin: 0 }}>{MODE_HINT[preset.m]}</p>
          <div className="ear-play">
            {!q || answered ? (
              <button type="button" className="play" onClick={next}>{q ? 'Próxima' : 'Começar'}</button>
            ) : (
              <button type="button" className="btn" onClick={() => void play(q)} disabled={playing}>{playing ? 'Tocando…' : 'Repetir'}</button>
            )}
            <span className="muted mono" style={{ fontSize: 13 }}>Enter · teclas 1–{Math.min(9, preset.set.length)}</span>
          </div>
          <div className="ear-answers" role="group" aria-label="Respostas">
            {preset.set.map((a, i) => {
              const cls = answered ? (a === q?.answer ? 'right' : a === answered ? 'wrong' : '') : ''
              return (
                <button key={a} type="button" className={`ear-ans ${cls}`} disabled={!q || !!answered} onClick={() => answer(a)}>
                  <b>{a}</b>
                  {i < 9 && <small>{i + 1}</small>}
                </button>
              )
            })}
          </div>
          {answered && q && (
            <p className={`ear-verdict ${answered === q.answer ? 'ok' : 'no'}`}>
              <span>{answered === q.answer ? 'Isso.' : <>Era <b>{q.answer}</b>. Ouça de novo antes de seguir.</>}</span>
              {answered !== q.answer && (
                <button type="button" className="link" onClick={() => void play(q)}>ouvir</button>
              )}
            </p>
          )}
        </section>

        <Panel id="ouvido-placar" title="Placar" summary={pct === null ? '—' : `${pct}% · ${session.c} de ${session.t}`}>
          <div className="ear-score">
            <b className={pct === null ? '' : pct >= 85 ? '' : pct >= 65 ? 'mid' : 'low'}>{pct === null ? '—' : `${pct}%`}</b>
            <small className="muted">{session.c} de {session.t} nesta sessão</small>
          </div>
          {MODES.filter((m) => todayEar?.[m]?.t).map((m) => (
            <div key={m} className="row-between muted" style={{ fontSize: 14 }}>
              <span>{MODE_NAME[m]} hoje</span>
              <span className="mono">{todayEar![m]!.c}/{todayEar![m]!.t}</span>
            </div>
          ))}
          {worst.length > 0 && <p className="muted hint" style={{ margin: 0 }}>Mais errados: {worst.map(([k, n]) => `${k} (${n})`).join(', ')}</p>}
          <button type="button" className="link" style={{ justifySelf: 'start' }} onClick={() => setSession({ c: 0, t: 0, miss: {} })}>zerar sessão</button>
        </Panel>
      </div>

      <details className="card more">
        <summary>Escolher o conjunto à mão</summary>
        <div className="stack-sm" style={{ marginTop: 10 }}>
          {preset.m === 'int' && (
            <div className="segmented small" role="group" aria-label="Direção">
              {DIRS.map((d) => (
                <button key={d.v} type="button" aria-pressed={(preset.dir ?? 'asc') === d.v} onClick={() => choose({ ...preset, dir: d.v })}>{d.label}</button>
              ))}
            </div>
          )}
          <div className="chips">
            {ALL_OF[preset.m].map((x) => (
              <button key={x} type="button" className="chip" aria-pressed={preset.set.includes(x)} onClick={() => choose({ ...preset, set: toggleItem(preset.m, preset.set, x) })}>{x}</button>
            ))}
          </div>
          <label className="inline-check">
            <input type="checkbox" checked={autoNext} onChange={(e) => set({ autoNext: e.target.checked })} /> Próxima pergunta sozinha depois de acertar
          </label>
        </div>
      </details>
    </div>
  )
}
