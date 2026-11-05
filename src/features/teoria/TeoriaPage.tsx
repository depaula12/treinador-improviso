import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { engine } from '../../audio/engine'
import { dueKeys, fromKey, LESSONS, lessonById, qKey, realize, type Fig, type Lesson, type Question, type Step } from '../../core/licoes'
import { blocksFor, dateKey, sprintOf } from '../../core/plano'
import { boxPositions, posKey, SCALES } from '../../core/scales'
import { KEYS, type ChordInfo } from '../../core/theory'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { go } from '../../ui/nav'
import { useHoje } from '../hoje/store'
import { useImproviso } from '../improviso/store'
import { useTeoria } from './store'

export function TeoriaPage() {
  const open = useTeoria((s) => s.open)
  const lesson = open && open !== 'revisao' ? lessonById(open) : undefined
  if (open === 'revisao') return <ReviewView />
  if (lesson) return <LessonView key={lesson.id} lesson={lesson} />
  return <LessonList />
}

// ======================= lista =======================

function LessonList() {
  const { done, rev, set } = useTeoria()
  const today = dateKey(new Date())
  const due = dueKeys(rev, today)
  const todays = blocksFor(new Date()).map((b) => b.licao).filter(Boolean) as string[]
  const cur = sprintOf(new Date()).n
  const groups = useMemo(() => {
    const m = new Map<number, Lesson[]>()
    for (const l of LESSONS) m.set(l.sprint, [...(m.get(l.sprint) ?? []), l])
    return [...m.entries()]
  }, [])

  return (
    <div className="page">
      <div className="page-head">
        <h1>Teoria</h1>
      </div>

      <div className="th-top">
        {todays.length > 0 && (
          <section className="card th-today">
            <span className="tag" style={{ margin: 0 }}>Lição de hoje</span>
            {todays.map((id) => {
              const l = lessonById(id)!
              return (
                <button key={id} type="button" className="th-item big" onClick={() => set({ open: id })}>
                  <b>{l.title}</b>
                  <span className="muted">{l.min} min{done[id] ? ` · feita: ${done[id].score}/${done[id].total}` : ''}</span>
                </button>
              )
            })}
          </section>
        )}
        <section className="card th-rev">
          <span className="tag" style={{ margin: 0 }}>Revisão</span>
          {due.length ? (
            <>
              <p style={{ margin: 0 }}><b className="mono">{due.length}</b> {due.length === 1 ? 'pergunta que você errou volta' : 'perguntas que você errou voltam'} hoje.</p>
              <button type="button" className="play" onClick={() => set({ open: 'revisao' })}>Revisar</button>
            </>
          ) : (
            <p className="muted hint">Nada para revisar hoje. O que você errar nas lições volta aqui no dia seguinte, depois em 2, 4 e 8 dias.</p>
          )}
        </section>
      </div>

      {groups.map(([n, ls]) => (
        <section key={n} className="card stack-sm">
          <span className="tag" style={{ margin: 0 }}>{n === 0 ? 'Semana zero' : `Sprint ${n}`}{n === cur ? ' · agora' : ''}</span>
          <div className="th-list">
            {ls.map((l) => (
              <button key={l.id} type="button" className={`th-item${done[l.id] ? ' done' : ''}`} onClick={() => set({ open: l.id })}>
                <span className="th-dot" aria-hidden>{done[l.id] ? '✓' : ''}</span>
                <span className="th-name">
                  <b>{l.title}</b>
                  <small className="muted">{l.min} min{done[l.id] ? ` · ${done[l.id].score}/${done[l.id].total} na última vez` : ''}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
      <p className="muted hint">As lições dos próximos sprints entram aos poucos, sempre algumas semanas antes de você chegar neles.</p>
    </div>
  )
}

// ======================= lição =======================

function LessonView({ lesson }: { lesson: Lesson }) {
  const { set, finish, answer } = useTeoria()
  const [round, setRound] = useState(0)
  const questions = useMemo(() => lesson.quiz.map((q, i) => ({ key: qKey(lesson.id, i), q: realize(q) })), [lesson, round])
  const [over, setOver] = useState<number | null>(null)

  const onFinish = (score: number) => {
    finish(lesson.id, score, questions.length)
    setOver(score)
    // marca o bloco de teoria de hoje como feito
    const today = dateKey(new Date())
    const b = blocksFor(new Date()).find((x) => x.licao === lesson.id)
    const h = useHoje.getState()
    if (b && !h.days[today]?.blocks[b.id]?.done) h.toggleBlock(today, b.id)
  }

  return (
    <div className="page lesson">
      <div className="lesson-head">
        <button type="button" className="link" onClick={() => set({ open: null })}>‹ Todas as lições</button>
        <span className="tag" style={{ margin: 0 }}>{lesson.sprint === 0 ? 'Semana zero' : `Sprint ${lesson.sprint}`} · {lesson.min} min</span>
        <h1>{lesson.title}</h1>
      </div>

      <article className="card lesson-body">
        {lesson.steps.map((s, i) => <StepView key={i} step={s} />)}
      </article>

      <section className="card stack-sm">
        <span className="tag" style={{ margin: 0 }}>Confira o que ficou</span>
        {over === null ? (
          <QuizRun key={round} items={questions} onAnswer={answer} onFinish={onFinish} />
        ) : (
          <div className="th-end">
            <b className={`mono ${over === questions.length ? 'ok' : over >= questions.length * 0.6 ? 'mid' : 'low'}`}>{over}/{questions.length}</b>
            <p style={{ margin: 0 }}>
              {over === questions.length ? 'Tudo certo. Agora toque o que leu.' : 'As que você errou voltam na revisão a partir de amanhã.'}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={() => { setOver(null); setRound((r) => r + 1) }}>Responder de novo</button>
              {useHoje.getState().active?.area === 'teoria' ? (
                <button type="button" className="play" onClick={() => { useHoje.getState().setActive(null); go('hoje') }}>Voltar para Hoje</button>
              ) : (
                <button type="button" className="play" onClick={() => set({ open: null })}>Outras lições</button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

/** **negrito** dentro do texto */
function rich(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))
}

function StepView({ step }: { step: Step }) {
  switch (step.t) {
    case 'p':
      return <p className="ls-p">{rich(step.text)}</p>
    case 'lista':
      return <ul className="ls-list">{step.items.map((it, i) => <li key={i}>{rich(it)}</li>)}</ul>
    case 'tente':
      return <div className="ls-call try"><span className="tag">Na guitarra</span><p>{rich(step.text)}</p></div>
    case 'dica':
      return <div className="ls-call tip"><span className="tag">Dica</span><p>{rich(step.text)}</p></div>
    case 'ouvir':
      return <Listen items={step.items} />
    case 'braco':
      return <FigView fig={step.fig} caption={step.caption} />
  }
}

function Listen({ items }: { items: Extract<Step, { t: 'ouvir' }>['items'] }) {
  const [on, setOn] = useState<number | null>(null)
  const play = async (i: number) => {
    setOn(i)
    const dur = await engine.playEar(items[i].events, useImproviso.getState().mix)
    window.setTimeout(() => setOn((x) => (x === i ? null : x)), dur * 1000)
  }
  return (
    <div className="ls-listen">
      <span className="tag" style={{ margin: 0 }}>Ouça</span>
      {items.map((it, i) => (
        <button key={i} type="button" className="chip" aria-pressed={on === i} onClick={() => void play(i)}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M8 5v14l11-7z" /></svg>
          {it.label}
        </button>
      ))}
    </div>
  )
}

function FigView({ fig, caption }: { fig: Fig; caption?: string }) {
  const chord: ChordInfo = {
    symbol: '', tonic: '', root: fig.root, minor: false,
    semitones: fig.semis,
    notes: fig.names ?? fig.semis.map((x) => KEYS[(fig.root + x) % 12]),
  }
  const only = useMemo(() => {
    if (fig.pos) return new Set(fig.pos.map(([s, f]) => posKey(s - 1, f)))
    if (fig.box) {
      const sc = SCALES.find((x) => x.id === fig.box!.scaleId)!
      return new Set([...boxPositions(sc, fig.root, fig.box.box)].filter((k) => {
        const f = Number(k.split(':')[1])
        return f >= fig.frets[0] && f <= fig.frets[1]
      }))
    }
    return null
  }, [fig])
  const marks: Mark[] = (fig.marks ?? []).map((m) => ({ string: m.s - 1, fret: m.f, kind: 'right', label: m.label }))
  const focus = fig.frets[1] - fig.frets[0] <= 8
  return (
    <figure className={`ls-fig${focus ? ' focus' : ''}`}>
      <Fretboard
        maxFret={Math.max(12, fig.frets[1])}
        window={focus ? fig.frets : null}
        scale={[]}
        chord={chord}
        labels={fig.labels}
        only={only}
        marks={marks}
      />
      {caption && <figcaption className="muted">{caption}</figcaption>}
    </figure>
  )
}

// ======================= perguntas =======================

interface Item {
  key: string
  q: Question
}

function QuizRun({ items, onAnswer, onFinish }: { items: Item[]; onAnswer: (key: string, ok: boolean) => void; onFinish: (score: number) => void }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const it = items[i]
  if (!it) return null
  const choose = (o: string) => {
    if (picked) return
    setPicked(o)
    const ok = o === it.q.answer
    if (ok) setScore((s) => s + 1)
    onAnswer(it.key, ok)
  }
  const next = () => {
    if (i + 1 >= items.length) onFinish(score)
    else {
      setI(i + 1)
      setPicked(null)
    }
  }
  return (
    <div className="th-quiz">
      <div className="row-between">
        <span className="muted mono" style={{ fontSize: 13 }}>pergunta {i + 1} de {items.length}</span>
      </div>
      <p className="th-q">{it.q.q}</p>
      <div className="th-opts" role="group" aria-label="Respostas">
        {it.q.options.map((o) => (
          <button key={o} type="button" className={`th-opt${picked ? (o === it.q.answer ? ' right' : o === picked ? ' wrong' : '') : ''}`} disabled={!!picked} onClick={() => choose(o)}>{o}</button>
        ))}
      </div>
      {picked && (
        <div className={`th-why ${picked === it.q.answer ? 'ok' : 'no'}`}>
          <b>{picked === it.q.answer ? 'Certo.' : 'Não foi dessa vez.'}</b> {it.q.why}
          <div><button type="button" className="play" onClick={next}>{i + 1 >= items.length ? 'Ver resultado' : 'Próxima'}</button></div>
        </div>
      )}
    </div>
  )
}

function ReviewView() {
  const { rev, set, answer } = useTeoria()
  const [items] = useState<Item[]>(() =>
    dueKeys(rev, dateKey(new Date()))
      .slice(0, 10)
      .map((key) => {
        const f = fromKey(key)!
        return { key, q: realize(f.lesson.quiz[f.index]) }
      }),
  )
  const [over, setOver] = useState<number | null>(null)
  return (
    <div className="page lesson">
      <div className="lesson-head">
        <button type="button" className="link" onClick={() => set({ open: null })}>‹ Todas as lições</button>
        <h1>Revisão</h1>
      </div>
      <section className="card stack-sm">
        {items.length === 0 ? (
          <p className="muted">Nada para revisar hoje.</p>
        ) : over === null ? (
          <QuizRun items={items} onAnswer={answer} onFinish={setOver} />
        ) : (
          <div className="th-end">
            <b className="mono">{over}/{items.length}</b>
            <p style={{ margin: 0 }}>As que acertou voltam mais espaçadas; acertando 4 vezes seguidas, saem da revisão.</p>
            <div><button type="button" className="play" onClick={() => set({ open: null })}>Voltar às lições</button></div>
          </div>
        )}
      </section>
    </div>
  )
}
