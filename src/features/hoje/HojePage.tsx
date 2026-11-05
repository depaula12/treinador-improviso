import { useState } from 'react'
import { MODE_NAME } from '../../core/ear'
import {
  addDays, blocksFor, dateKey, fromKey, GOALS, phaseOf, PHASES, sprintOf, SPRINTS, sprintStart, type Block, type EarMode,
} from '../../core/plano'
import {
  blockMinutes, clock, dayMinutes, earTotals, journal, lastDays, plannedMinutes, series, shortDate, streak, type DayLog,
} from '../../core/progresso'
import { Panel } from '../../ui/Panel'
import { backupDue } from '../../core/backup'
import { exportAll, lastBackupAt, useDados } from '../dados/dados'
import { useSongs } from '../musicas/store'
import { openBlock } from './open'
import { useHoje } from './store'
import { pauseTimer, resetTimer, startTimer, useTimerLeft } from './timer'

type Tab = 'hoje' | 'plano' | 'progresso'

export function HojePage() {
  const [tab, setTab] = useState<Tab>('hoje')
  return (
    <div className="page">
      <div className="page-head">
        <h1>Treino do dia</h1>
        <div className="segmented" role="tablist">
          {(['hoje', 'plano', 'progresso'] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === 'hoje' ? 'Hoje' : t === 'plano' ? 'Plano' : 'Progresso'}
            </button>
          ))}
        </div>
      </div>
      {tab === 'hoje' && <Today />}
      {tab === 'plano' && <Plan />}
      {tab === 'progresso' && <Progress />}
    </div>
  )
}

// ======================= Hoje =======================

function Today() {
  const realToday = dateKey(new Date())
  const [key, setKey] = useState(realToday)
  const date = fromKey(key)
  const days = useHoje((s) => s.days)
  const day = days[key]
  const { n, day: dayN } = sprintOf(date)
  const sprint = n ? SPRINTS[n - 1] : null
  const phase = n ? phaseOf(n) : null
  const blocks = blocksFor(date)
  const done = dayMinutes(date, day)
  const plan = plannedMinutes(date)
  const seq = streak(days, fromKey(realToday))
  const shift = (d: number) => setKey(dateKey(addDays(date, d)))
  useDados((s) => s.tick)
  const songCount = useSongs((s) => s.songs.length)
  const remind = backupDue(lastBackupAt(), Object.keys(days).length >= 3 || songCount > 0)

  return (
    <>
      {remind && (
        <section className="card hj-backup" role="status">
          <p>{lastBackupAt() ? 'Seu último backup tem mais de duas semanas.' : 'Seu progresso fica só neste navegador.'} Um backup leva um clique e evita perder semanas de registro.</p>
          <div className="row">
            <button type="button" className="link" onClick={() => useDados.getState().set(true)}>saiba mais</button>
            <button type="button" className="btn" onClick={() => void exportAll()}>Exportar agora</button>
          </div>
        </section>
      )}
      <section className="card hj-head">
        <div className="hj-day">
          <button type="button" className="icon-btn" aria-label="Dia anterior" onClick={() => shift(-1)}>‹</button>
          <div>
            <b>{key === realToday ? 'Hoje' : shortDate(date)}</b>
            <span className="muted">{key === realToday ? shortDate(date) : <button type="button" className="link" onClick={() => setKey(realToday)}>voltar para hoje</button>}</span>
          </div>
          <button type="button" className="icon-btn" aria-label="Próximo dia" onClick={() => shift(1)}>›</button>
        </div>
        <div className="hj-where">
          {sprint ? (
            <>
              <span className="tag" style={{ margin: 0 }}>Sprint {n} de 24 · fase {phase?.n} {phase?.name} · dia {dayN} de 14</span>
              <b>{sprint.tema}</b>
            </>
          ) : (
            <>
              <span className="tag" style={{ margin: 0 }}>Semana zero · até domingo 8 nov</span>
              <b>Diagnóstico: grave o seu "antes"</b>
            </>
          )}
        </div>
        <div className="hj-nums">
          <div>
            <b className="mono">{done}<small>/{plan} min</small></b>
            <div className="hj-bar"><i style={{ width: `${Math.min(100, (done / Math.max(1, plan)) * 100)}%` }} /></div>
          </div>
          <div>
            <b className="mono">{seq}</b>
            <small className="muted">{seq === 1 ? 'dia seguido' : 'dias seguidos'}</small>
          </div>
        </div>
      </section>

      {sprint && (
        <Panel id="hoje-alvos" title="Alvos do sprint" bodyClass="hj-targets" summary={`${sprint.alvo.musica} · ${sprint.alvo.conceito} · ${sprint.alvo.tecnica}`}>
          <div className="hj-target"><span className="tag">Música</span><b>{sprint.alvo.musica}</b></div>
          <div className="hj-target"><span className="tag">Conceito</span><b>{sprint.alvo.conceito}</b></div>
          <div className="hj-target"><span className="tag">Técnica</span><b>{sprint.alvo.tecnica}</b></div>
        </Panel>
      )}

      <section className="hj-blocks" aria-label="Roteiro do dia">
        {blocks.map((b, i) => (
          <div key={b.id} className="hj-block-wrap">
            {b.group && b.group !== blocks[i - 1]?.group && (
              <h2 className="hj-group">{b.group === 'A' ? 'Bloco A' : 'Bloco B'} <span className="muted">{blocks.filter((x) => x.group === b.group).reduce((s, x) => s + x.min, 0)} min</span></h2>
            )}
            <BlockCard dateK={key} b={b} day={day} />
          </div>
        ))}
      </section>
    </>
  )
}

function BlockCard({ dateK, b, day }: { dateK: string; b: Block; day: DayLog | undefined }) {
  const log = day?.blocks[b.id]
  const toggle = useHoje((s) => s.toggleBlock)
  const [open, setOpen] = useState(false)
  const t = useTimerLeft(dateK, b.id)
  const spent = blockMinutes(b, log)
  const isToday = dateK === dateKey(new Date())

  return (
    <article className={`card hj-block${log?.done ? ' done' : ''}${t?.running ? ' live' : ''}`}>
      <button type="button" className="hj-check" aria-pressed={!!log?.done} aria-label={log?.done ? `Desmarcar ${b.title}` : `Marcar ${b.title} como feito`} onClick={() => toggle(dateK, b.id)}>
        <svg viewBox="0 0 24 24" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
      <div className="hj-body">
        <div className="hj-title">
          <b>{b.title}</b>
          <span className="muted mono">{spent > 0 && !log?.done ? `${Math.round(spent)}/` : ''}{b.min} min</span>
        </div>
        <p className="hj-line">{b.lines[0]}</p>
        {open && b.lines.slice(1).map((l, i) => <p key={i} className="hj-line muted">{l}</p>)}
        <LogLine b={b} day={day} />
        {b.log === 'close' && (open || log?.done) && <CloseDay dateK={dateK} day={day} />}
        <div className="hj-actions">
          {b.area && isToday && (
            <button type="button" className="btn hj-open" onClick={() => openBlock(dateK, b)}>Abrir {AREA_NAME[b.area]}</button>
          )}
          {isToday && (
            t?.running ? (
              <button type="button" className="btn hj-timer on" onClick={pauseTimer}>
                <span className="mono">{clock(t.left)}</span> Pausar
              </button>
            ) : (
              <button type="button" className="btn hj-timer" onClick={() => startTimer(dateK, b.id, b.min)}>
                {t && t.left > 0 ? <><span className="mono">{clock(t.left)}</span> Continuar</> : t ? 'Terminou' : <>Timer {b.min} min</>}
              </button>
            )
          )}
          {t && !t.running && <button type="button" className="link" onClick={resetTimer}>zerar</button>}
          {(b.lines.length > 1 || b.log === 'close') && (
            <button type="button" className="link" onClick={() => setOpen(!open)}>{open ? 'menos' : 'como fazer'}</button>
          )}
        </div>
      </div>
    </article>
  )
}

const AREA_NAME: Record<string, string> = {
  improviso: 'Improviso', escalas: 'Escalas', acordes: 'Acordes', ouvido: 'Ouvido', musicas: 'Músicas',
  afinador: 'Afinador', teoria: 'a lição', compor: 'Compor', jam: 'Jam', hoje: 'Hoje',
}

/** o que o app registrou sozinho neste bloco */
function LogLine({ b, day }: { b: Block; day: DayLog | undefined }) {
  if (b.log === 'bpm' && day?.bpm) return <p className="hj-logged">Registrado: <b>{day.bpm} bpm</b> com 90%+</p>
  if (b.log === 'imp' && (day?.dentro !== undefined || day?.alvo !== undefined))
    return (
      <p className="hj-logged">
        Registrado: {day.dentro !== undefined && <b>{day.dentro}% dentro</b>}
        {day.dentro !== undefined && day.alvo !== undefined && ' · '}
        {day.alvo !== undefined && <b>{day.alvo}% dos alvos no tempo 1</b>}
      </p>
    )
  if (b.ear && day?.ear) {
    const parts = (Object.keys(day.ear) as EarMode[]).map((m) => `${MODE_NAME[m]} ${day.ear![m]!.c}/${day.ear![m]!.t}`)
    if (parts.length) return <p className="hj-logged">Hoje: <b>{parts.join(' · ')}</b></p>
  }
  return null
}

function CloseDay({ dateK, day }: { dateK: string; day: DayLog | undefined }) {
  const patch = useHoje((s) => s.patchDay)
  return (
    <div className="hj-close">
      <div className="row">
        <span className="tag" style={{ margin: 0 }}>Nota do dia</span>
        <div className="segmented small" role="group" aria-label="Nota do dia">
          {[1, 2, 3, 4, 5].map((r) => (
            <button key={r} type="button" aria-pressed={day?.rating === r} onClick={() => patch(dateK, { rating: day?.rating === r ? undefined : r })}>{r}</button>
          ))}
        </div>
        <label className="inline-check">
          <input type="checkbox" checked={!!day?.rec} onChange={(e) => patch(dateK, { rec: e.target.checked })} /> Gravei
        </label>
      </div>
      <textarea
        className="text hj-note"
        rows={2}
        placeholder="O que travou hoje? (vira prioridade amanhã)"
        value={day?.travou ?? ''}
        onChange={(e) => patch(dateK, { travou: e.target.value })}
      />
    </div>
  )
}

// ======================= Plano =======================

function Plan() {
  const cur = sprintOf(new Date()).n
  const exits = useHoje((s) => s.exits)
  const toggleExit = useHoje((s) => s.toggleExit)
  return (
    <>
      <section className="hj-goals">
        {GOALS.map((g) => (
          <div key={g.when} className="card">
            <span className="tag">Metas até {g.when}</span>
            <ul>{g.items.map((it) => <li key={it}>{it}</li>)}</ul>
          </div>
        ))}
      </section>
      {PHASES.map((p) => (
        <section key={p.n} className="card stack-sm">
          <div>
            <span className="tag" style={{ margin: 0 }}>Fase {p.n} · sprints {p.range[0]}–{p.range[1]}</span>
            <h2>{p.name}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>{p.why}</p>
          </div>
          <div className="hj-sprints">
            {SPRINTS.filter((s) => s.n >= p.range[0] && s.n <= p.range[1]).map((s) => {
              const ex = exits[s.n] ?? []
              const passed = s.saida.filter((_, i) => ex[i]).length
              return (
                <details key={s.n} className={`hj-sprint${s.n === cur ? ' cur' : ''}${s.n < cur ? ' past' : ''}`} open={s.n === cur}>
                  <summary>
                    <span className="mono hj-sn">{s.n}</span>
                    <span className="hj-st">{s.tema}<small className="muted">{shortDate(sprintStart(s.n))}{s.n === cur ? ' · agora' : ''}</small></span>
                    <span className={`mono hj-pass${passed === s.saida.length ? ' all' : ''}`}>{passed}/{s.saida.length}</span>
                  </summary>
                  <div className="hj-sprint-body">
                    <p><b>Música:</b> {s.alvo.musica} · <b>Conceito:</b> {s.alvo.conceito} · <b>Técnica:</b> {s.alvo.tecnica}</p>
                    <span className="tag">Teste de saída</span>
                    {s.saida.map((x, i) => (
                      <label key={i} className="inline-check hj-exit">
                        <input type="checkbox" checked={!!ex[i]} onChange={() => toggleExit(s.n, i)} /> {x}
                      </label>
                    ))}
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

// ======================= Progresso =======================

function Progress() {
  const days = useHoje((s) => s.days)
  const today = new Date()
  const last = lastDays(days, today, 28)
  const week = last.slice(-7)
  const weekMin = week.reduce((s, d) => s + d.min, 0)
  const maxMin = Math.max(240, ...last.map((d) => d.min))
  const bpm = series(days, 'bpm')
  const dentro = series(days, 'dentro')
  const alvo = series(days, 'alvo')
  const ear = earTotals(days)
  const earWeek = earTotals(days, week.map((d) => d.key))
  const notes = journal(days).slice(0, 14)

  return (
    <>
      <section className="hj-tiles">
        <div className="card"><span className="tag">Sequência</span><b className="mono">{streak(days, today)}</b><small className="muted">dias</small></div>
        <div className="card"><span className="tag">Últimos 7 dias</span><b className="mono">{(weekMin / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b><small className="muted">horas de {Math.round(week.reduce((s, d) => s + d.plan, 0) / 60)} planejadas</small></div>
        <div className="card"><span className="tag">Técnica</span><b className="mono">{bpm.at(-1)?.v ?? '—'}</b><small className="muted">bpm limpo mais recente{bpm.length > 1 ? ` (começou em ${bpm[0].v})` : ''}</small></div>
        <div className="card"><span className="tag">Improviso</span><b className="mono">{dentro.at(-1) ? `${dentro.at(-1)!.v}%` : '—'}</b><small className="muted">notas dentro{alvo.at(-1) ? ` · ${alvo.at(-1)!.v}% alvos` : ''}</small></div>
      </section>

      <section className="card stack-sm">
        <div className="row-between">
          <span className="tag" style={{ margin: 0 }}>Minutos por dia · 28 dias</span>
          <span className="muted mono" style={{ fontSize: 13 }}>linha = plano</span>
        </div>
        <div className="hj-chart" role="img" aria-label={`Minutos praticados nos últimos 28 dias; total ${last.reduce((s, d) => s + d.min, 0)} minutos`}>
          {last.map((d) => (
            <div key={d.key} className="hj-col" title={`${shortDate(d.date)}: ${d.min} de ${d.plan} min`}>
              <i className="plan" style={{ bottom: `${(d.plan / maxMin) * 100}%` }} />
              <i className={`bar${d.min >= d.plan ? ' full' : ''}`} style={{ height: `${(d.min / maxMin) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="row-between muted mono" style={{ fontSize: 12 }}>
          <span>{shortDate(last[0].date)}</span><span>hoje</span>
        </div>
      </section>

      <div className="hj-two">
        <section className="card stack-sm">
          <span className="tag">Ouvido</span>
          {Object.keys(ear).length === 0 ? (
            <p className="muted hint" style={{ margin: 0 }}>Responda perguntas na área Ouvido e o acerto aparece aqui.</p>
          ) : (
            (Object.keys(ear) as EarMode[]).map((m) => {
              const all = ear[m]!
              const w = earWeek[m]
              const p = Math.round((all.c / all.t) * 100)
              return (
                <div key={m} className="hj-ear">
                  <span>{MODE_NAME[m]}</span>
                  <div className="hj-bar"><i style={{ width: `${p}%` }} /></div>
                  <span className="mono">{p}%<small className="muted"> {w ? `· semana ${Math.round((w.c / w.t) * 100)}%` : ''}</small></span>
                </div>
              )
            })
          )}
        </section>
        <section className="card stack-sm">
          <span className="tag">bpm limpo da técnica</span>
          {bpm.length < 2 ? (
            <p className="muted hint" style={{ margin: 0 }}>Com a guitarra ligada em Escalas, cada volta com 90%+ registra o bpm do dia. A curva aparece a partir do segundo dia.</p>
          ) : (
            <Spark points={bpm.map((b) => b.v)} />
          )}
        </section>
      </div>

      <section className="card stack-sm">
        <span className="tag">Diário</span>
        {notes.length === 0 ? (
          <p className="muted hint" style={{ margin: 0 }}>No bloco "Gravar e registrar", dê uma nota ao dia e escreva o que travou. Aparece aqui.</p>
        ) : (
          <ul className="hj-journal">
            {notes.map((j) => (
              <li key={j.key}>
                <span className="mono muted">{shortDate(j.date)}</span>
                <span>{j.rating ? <b className="mono">{j.rating}/5</b> : null}{j.rec ? <span className="muted"> · gravou</span> : null}</span>
                <span>{j.travou}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function Spark({ points }: { points: number[] }) {
  const lo = Math.min(...points) - 5
  const hi = Math.max(...points) + 5
  const W = 300
  const H = 80
  const xy = points.map((v, i) => [(i / (points.length - 1)) * W, H - ((v - lo) / (hi - lo)) * H])
  return (
    <div className="hj-spark-wrap">
      <div className="hj-spark-axis mono"><span>{hi - 5}</span><span>{lo + 5}</span></div>
      <svg className="hj-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`bpm de ${points[0]} a ${points.at(-1)}`}>
        <polyline points={xy.map((p) => p.join(',')).join(' ')} />
      </svg>
    </div>
  )
}
