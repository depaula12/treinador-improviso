import { useEffect, useRef, useState } from 'react'
import { engine } from '../../audio/engine'
import { voicingMidi } from '../../core/chord-bank'
import { chordMatches } from '../../core/feedback'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { ListenChip, useGuitarInput } from '../../ui/InputPanel'
import { useImproviso } from '../improviso/store'
import { NEW_BOX, type Grade } from './leitner'
import { drawItem, makeQuestion, type Item, type Question } from './quiz-model'
import { useAcordes } from './store'

// múltipla escolha: acertar em até 4 s conta como "rápido"
const FAST_MS = 4000
// cronometrado (mão no braço, conferido pelo áudio): até 5 s é "rápido"
const TIMED_FAST_MS = 5000
// itens recentes que não voltam logo
const RECENT = 6

const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest('input, textarea, select')

interface SessionResult {
  right: number
  wrong: number
  missed: { label: string; key: string }[]
}

/**
 * Pergunta da vez. Teclado: 1–4 respondem, Enter vai para a próxima, O ouve a resposta;
 * no cronometrado, Enter revela e 1/2/3 = errei / acertei lento / acertei rápido.
 */
export function Quiz({ items, emptyMsg }: { items: Item[]; emptyMsg: string }) {
  const { stats, record, sessionLen } = useAcordes()
  const [q, setQ] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  /** graus no desenho: a corda clicada */
  const [pickedString, setPickedString] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [count, setCount] = useState(0)
  const [session, setSession] = useState<SessionResult>({ right: 0, wrong: 0, missed: [] })
  const [done, setDone] = useState(false)
  const [playing, setPlaying] = useState<string | null>(null)
  const started = useRef(0)
  const recent = useRef<string[]>([])
  const last = useRef<{ quality?: string; root?: number }>({})

  function next() {
    if (!items.length) return setQ(null)
    if (sessionLen && count >= sessionLen) return setDone(true)
    const item = drawItem(items, useAcordes.getState().stats, recent.current, last.current.quality)
    recent.current = [...recent.current, item.key].slice(-RECENT)
    const question = makeQuestion(item, last.current.root)
    last.current = { quality: item.quality, root: question.root }
    setQ(question)
    setPicked(null)
    setPickedString(null)
    setRevealed(false)
    setElapsed(0)
    setHeardMs(null)
    setCount((c) => c + 1)
    started.current = performance.now()
  }

  function restart() {
    setSession({ right: 0, wrong: 0, missed: [] })
    setCount(0)
    setDone(false)
    recent.current = []
  }

  // novo sorteio quando o filtro ou o modo mudam (e ao recomeçar a sessão)
  useEffect(() => {
    restart()
  }, [items])
  useEffect(() => {
    if (!done && count === 0) next()
  }, [count, done, items])

  // cronômetro do quiz cronometrado
  useEffect(() => {
    if (q?.type !== 'cronometrado' || revealed) return
    const id = setInterval(() => setElapsed(performance.now() - started.current), 100)
    return () => clearInterval(id)
  }, [q, revealed])

  function tally(ok: boolean) {
    setSession((s) => ({
      right: s.right + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
      missed: ok || !q ? s.missed : [...s.missed, { label: `${q.symbol} · ${q.sub ?? q.prompt}`, key: q.item.key }].slice(-12),
    }))
  }

  function choose(i: number) {
    if (picked !== null || !q) return
    setPicked(i)
    const ms = performance.now() - started.current
    const ok = i === q.answer
    record(q.item.key, !ok ? 'errei' : ms <= FAST_MS ? 'rapido' : 'lento')
    tally(ok)
  }

  function chooseString(s: number) {
    if (pickedString !== null || !q?.answerStrings) return
    setPickedString(s)
    const ok = q.answerStrings.includes(s)
    const ms = performance.now() - started.current
    record(q.item.key, !ok ? 'errei' : ms <= FAST_MS ? 'rapido' : 'lento')
    tally(ok)
  }

  // cronometrado conferido pelo áudio: quando o acorde ouvido é o pedido, o app para o relógio e dá a nota
  const [heardMs, setHeardMs] = useState<number | null>(null)
  function grade(g: Grade) {
    // o áudio já deu a nota desta pergunta: só passa para a próxima
    if (heardMs === null && q) {
      record(q.item.key, g)
      tally(g !== 'errei')
    }
    next()
  }
  function reveal() {
    setElapsed(performance.now() - started.current)
    setRevealed(true)
  }
  const audioRef = useRef({ q, revealed })
  audioRef.current = { q, revealed }
  const io = useGuitarInput((f) => {
    const a = audioRef.current
    const sym = f?.chord?.symbol
    if (!sym || a.q?.type !== 'cronometrado' || a.revealed) return
    if (!chordMatches(sym, a.q.symbol)) return
    const ms = performance.now() - started.current
    audioRef.current = { ...a, revealed: true }
    setElapsed(ms)
    setRevealed(true)
    setHeardMs(ms)
    record(a.q.item.key, ms <= TIMED_FAST_MS ? 'rapido' : 'lento')
    tally(true)
    window.setTimeout(() => keys.current.next(), 1800)
  })

  async function listen(id: string, groups: number[][]) {
    if (!groups.length) return
    setPlaying(id)
    const dur = await engine.playShapes(groups, useImproviso.getState().mix)
    window.setTimeout(() => setPlaying((p) => (p === id ? null : p)), dur * 1000)
  }

  const answered = q ? (q.type === 'grau-no-desenho' ? pickedString !== null : q.type === 'cronometrado' ? revealed : picked !== null) : false

  // atalhos de teclado (lidos por ref: o listener é registrado uma vez)
  const keys = useRef({ choose, next, grade, reveal, listen, q, picked, revealed, answered })
  keys.current = { choose, next, grade, reveal, listen, q, picked, revealed, answered }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return
      const k = keys.current
      if (!k.q) return
      const n = Number(e.key)
      if (e.key.toLowerCase() === 'o' && k.answered) k.listen('resposta', k.q.listen)
      else if (k.q.type === 'cronometrado') {
        if (e.key === 'Enter' && !k.revealed) k.reveal()
        else if (k.revealed && n >= 1 && n <= 3) k.grade((['errei', 'lento', 'rapido'] as Grade[])[n - 1])
        else return
      } else if (k.q.type !== 'grau-no-desenho' && k.picked === null && n >= 1 && n <= k.q.options.length) k.choose(n - 1)
      else if (k.answered && e.key === 'Enter') k.next()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (done) {
    const total = session.right + session.wrong
    return (
      <section className="card quiz" aria-live="polite">
        <h2 className="center">Sessão concluída</h2>
        <div className="session-score">
          <b>{session.right}</b><span>de {total} certas</span>
          <span className="muted">{total ? Math.round((session.right / total) * 100) : 0}%</span>
        </div>
        {session.missed.length > 0 && (
          <div className="stack-sm">
            <span className="tag" style={{ margin: 0 }}>Para revisar (vão aparecer mais vezes)</span>
            <div className="chips">{session.missed.map((m, i) => <span key={i} className="chip">{m.label}</span>)}</div>
          </div>
        )}
        <button type="button" className="play" style={{ justifySelf: 'center' }} onClick={restart} autoFocus>Nova sessão</button>
      </section>
    )
  }

  if (!q) {
    return (
      <section className="card quiz">
        <p className="center muted">{emptyMsg}</p>
      </section>
    )
  }

  const right = q.type === 'grau-no-desenho' ? pickedString !== null && q.answerStrings!.includes(pickedString) : picked === q.answer
  const stringMarks = q.type === 'grau-no-desenho' && pickedString !== null
    ? Object.fromEntries([...q.answerStrings!.map((s) => [s, 'right'] as const), ...(q.answerStrings!.includes(pickedString) ? [] : [[pickedString, 'wrong'] as const])])
    : undefined

  return (
    <section className="card quiz" aria-live="polite">
      <div className="row-between">
        <span className="muted">
          {sessionLen ? `Pergunta ${count} de ${sessionLen}` : `Pergunta ${count}`}
          {session.right + session.wrong > 0 && <> · <span className="good-txt">{session.right} certas</span></>}
        </span>
        <span className="muted mono">Caixa {stats[q.item.key]?.box ?? NEW_BOX}/5</span>
      </div>

      <p className="prompt">
        {q.type === 'cronometrado' || q.type === 'cifra-desenho' || q.type === 'nota-do-grau' || q.type === 'cifra-notas' || q.type === 'grau-no-desenho' || q.type === 'comparar'
          ? highlight(q.prompt, q.symbol)
          : q.prompt}
        {q.sub && <span className="prompt-sub">{q.sub}</span>}
      </p>

      {q.type === 'cronometrado' && (
        <>
          <div className={`timer mono${elapsed > 8000 ? ' late' : ''}`}>{(elapsed / 1000).toFixed(1)} s</div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <ListenChip io={io} label="Conferir pelo áudio" />
          </div>
          {!revealed ? (
            <button type="button" className="play" style={{ justifySelf: 'center' }} onClick={reveal}>{io.active ? 'Revelar (desisti)' : 'Revelar'}</button>
          ) : (
            <>
              {heardMs !== null && <p className="heard">Ouvi {q.symbol} em {(heardMs / 1000).toFixed(1)} s: {heardMs <= TIMED_FAST_MS ? 'rápido!' : 'certo, mas lento'}. Próximo em instantes…</p>}
              <div className="diagrams">{q.voicing && <ChordDiagram voicing={q.voicing} caption={q.sub} />}</div>
              {heardMs === null && (
                <div className="grades">
                  <button type="button" className="grade bad" onClick={() => grade('errei')}>Errei</button>
                  <button type="button" className="grade" onClick={() => grade('lento')}>Acertei, lento</button>
                  <button type="button" className="grade good" onClick={() => grade('rapido')}>Acertei rápido</button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {(q.type === 'desenho-cifra' || q.type === 'grau-no-desenho') && q.voicing && (
        <div className="diagrams">
          <div className="chord-diagram big">
            <ChordDiagram
              voicing={q.voicing}
              hideName={q.type === 'desenho-cifra'}
              labels={answered ? 'graus' : 'nenhum'}
              neutral={q.type === 'grau-no-desenho' && !answered}
              onPick={q.type === 'grau-no-desenho' && !answered ? chooseString : undefined}
              marks={stringMarks}
            />
          </div>
        </div>
      )}

      {q.options.length > 0 && (
        <div className={q.type === 'cifra-desenho' ? 'options diagrams' : 'options'}>
          {q.options.map((o, i) => {
            const state = picked === null ? '' : i === q.answer ? ' right' : i === picked ? ' wrong' : ''
            return (
              <button key={i} type="button" className={`option${state}`} onClick={() => choose(i)} disabled={picked !== null}>
                <span className="kbd">{i + 1}</span>
                {o.voicing ? <ChordDiagram voicing={o.voicing} hideName={picked === null} labels={picked !== null ? 'graus' : 'nenhum'} /> : <span className="opt-label">{o.label}</span>}
              </button>
            )
          })}
        </div>
      )}

      {answered && q.type !== 'cronometrado' && (
        <div className="feedback">
          <p><b className={right ? 'good-txt' : 'bad-txt'}>{right ? 'Certo!' : 'Não foi dessa vez.'}</b> {q.explain}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn" onClick={() => listen('resposta', q.listen)}>
              {playing === 'resposta' ? 'Tocando…' : q.type === 'comparar' ? '▶ Ouvir os dois' : '▶ Ouvir a resposta'}
            </button>
            {q.type === 'cifra-desenho' && picked !== null && picked !== q.answer && q.options[picked].voicing && (
              <button type="button" className="btn" onClick={() => listen('sua', [voicingMidi(q.options[picked].voicing!)])}>
                {playing === 'sua' ? 'Tocando…' : '▶ Ouvir a que você escolheu'}
              </button>
            )}
            <button type="button" className="play" onClick={next} autoFocus>Próxima</button>
          </div>
        </div>
      )}

      {!answered && q.type !== 'cronometrado' && (
        <p className="keys-hint">
          {q.type === 'grau-no-desenho'
            ? 'Clique na bolinha certa do desenho.'
            : <>Responda com o mouse ou as teclas <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> <span className="kbd">4</span> · depois <span className="kbd">O</span> ouve e <span className="kbd">Enter</span> passa</>}
        </p>
      )}
      {q.type === 'cronometrado' && (
        <p className="keys-hint">
          {io.active
            ? 'Toque o acorde e deixe soar: o app confere o acorde (não a posição no braço).'
            : <>Teclado: <span className="kbd">Enter</span> revela · <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> dão a nota</>}
        </p>
      )}
    </section>
  )
}

/** Destaca o nome do acorde dentro da frase da pergunta. */
function highlight(text: string, symbol: string) {
  const i = text.lastIndexOf(symbol)
  if (i < 0) return text
  return <>{text.slice(0, i)}<b>{symbol}</b>{text.slice(i + symbol.length)}</>
}
