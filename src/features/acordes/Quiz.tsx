import { useEffect, useRef, useState } from 'react'
import { FORM_LABEL, formulaName, qualityById } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { drawWeighted, NEW_BOX, type Grade } from './leitner'
import { makeQuestion, type Card, type Question } from './quiz-model'
import { useAcordes } from './store'

// múltipla escolha: acertar em até 4 s conta como "rápido"
const FAST_MS = 4000

const typing = (e: KeyboardEvent) => !!(e.target as HTMLElement).closest('input, textarea, select')

/**
 * Pergunta da vez. Teclado: 1–4 respondem, Enter vai para a próxima; no cronometrado,
 * Enter revela e 1/2/3 = errei / acertei lento / acertei rápido.
 */
export function Quiz({ cards, emptyMsg }: { cards: Card[]; emptyMsg: string }) {
  const { mode, stats, record } = useAcordes()
  const [q, setQ] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [count, setCount] = useState(0)
  const started = useRef(0)
  const lastKey = useRef<string | undefined>(undefined)

  function next() {
    if (!cards.length) return setQ(null)
    const card = drawWeighted(cards, (c) => c.key, useAcordes.getState().stats, lastKey.current)
    lastKey.current = card.key
    setQ(makeQuestion(mode, card))
    setPicked(null)
    setRevealed(false)
    setElapsed(0)
    setCount((c) => c + 1)
    started.current = performance.now()
  }

  // novo sorteio quando o filtro ou o modo mudam
  useEffect(next, [cards])

  // cronômetro do quiz cronometrado
  useEffect(() => {
    if (mode !== 'cronometrado' || revealed || !q) return
    const id = setInterval(() => setElapsed(performance.now() - started.current), 100)
    return () => clearInterval(id)
  }, [mode, revealed, q])

  function choose(i: number) {
    if (picked !== null || !q) return
    setPicked(i)
    const ms = performance.now() - started.current
    const g: Grade = i !== q.answer ? 'errei' : ms <= FAST_MS ? 'rapido' : 'lento'
    record(q.card.key, g)
  }

  function grade(g: Grade) {
    record(q!.card.key, g)
    next()
  }

  function reveal() {
    setElapsed(performance.now() - started.current)
    setRevealed(true)
  }

  // atalhos de teclado (lidos por ref: o listener é registrado uma vez)
  const keys = useRef({ choose, next, grade, reveal, q, picked, revealed, mode })
  keys.current = { choose, next, grade, reveal, q, picked, revealed, mode }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return
      const k = keys.current
      if (!k.q) return
      const n = Number(e.key)
      if (k.mode === 'cronometrado') {
        if (e.key === 'Enter' && !k.revealed) k.reveal()
        else if (k.revealed && n >= 1 && n <= 3) k.grade((['errei', 'lento', 'rapido'] as Grade[])[n - 1])
        else return
      } else if (k.picked === null && n >= 1 && n <= k.q.options.length) k.choose(n - 1)
      else if (k.picked !== null && e.key === 'Enter') k.next()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!q) {
    return (
      <section className="card quiz">
        <p className="center muted">{emptyMsg}</p>
      </section>
    )
  }

  const formLabel = mode === 'cifra-notas' ? '' : FORM_LABEL[q.card.form]
  const answered = picked !== null

  return (
    <section className="card quiz" aria-live="polite">
      <div className="row-between">
        <span className="muted">Pergunta {count} de hoje</span>
        <span className="muted mono">Caixa {stats[q.card.key]?.box ?? NEW_BOX}/5</span>
      </div>

      {mode === 'cronometrado' ? (
        <>
          <p className="prompt">
            Toque <b>{q.symbol}</b>
            <span className="prompt-sub">{q.card.form !== 'aberto' ? formLabel.toLowerCase() : 'forma aberta'}</span>
          </p>
          <div className={`timer mono${elapsed > 8000 ? ' late' : ''}`}>{(elapsed / 1000).toFixed(1)} s</div>
          {!revealed ? (
            <button type="button" className="play" style={{ justifySelf: 'center' }} onClick={reveal}>Revelar</button>
          ) : (
            <>
              <div className="diagrams">{q.voicing && <ChordDiagram voicing={q.voicing} caption={formLabel} />}</div>
              <div className="grades">
                <button type="button" className="grade bad" onClick={() => grade('errei')}>Errei</button>
                <button type="button" className="grade" onClick={() => grade('lento')}>Acertei, lento</button>
                <button type="button" className="grade good" onClick={() => grade('rapido')}>Acertei rápido</button>
              </div>
            </>
          )}
          <p className="keys-hint">
            Teclado: <span className="kbd">Enter</span> revela · <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> dão a nota
          </p>
        </>
      ) : (
        <>
          {mode === 'desenho-cifra' ? (
            <>
              <p className="prompt">Que acorde é este?</p>
              <div className="diagrams">{q.voicing && <ChordDiagram voicing={q.voicing} hideName labels={answered ? 'graus' : 'nenhum'} />}</div>
            </>
          ) : (
            <p className="prompt">
              {mode === 'cifra-desenho' ? <>Qual é o desenho de <b>{q.symbol}</b></> : <>Quais são as notas de <b>{q.symbol}</b>?</>}
              {mode === 'cifra-desenho' && <span className="prompt-sub">{formLabel.toLowerCase()}</span>}
            </p>
          )}

          <div className={mode === 'cifra-desenho' ? 'options diagrams' : 'options'}>
            {q.options.map((o, i) => {
              const state = !answered ? '' : i === q.answer ? ' right' : i === picked ? ' wrong' : ''
              return (
                <button key={i} type="button" className={`option${state}`} onClick={() => choose(i)} disabled={answered}>
                  <span className="kbd">{i + 1}</span>
                  {o.voicing ? <ChordDiagram voicing={o.voicing} hideName={!answered} labels={answered ? 'graus' : 'nenhum'} /> : <span className="mono">{o.label}</span>}
                </button>
              )
            })}
          </div>

          {answered ? (
            <div className="feedback">
              <p>
                {picked === q.answer ? 'Certo!' : 'Não foi dessa vez.'} <b>{q.symbol}</b> = {qualityById(q.card.quality).pcs.map((s) => formulaName(s, q.card.quality)).join(' ')} ({q.notes.join(' ')})
              </p>
              <button type="button" className="play" onClick={next} autoFocus>Próxima</button>
            </div>
          ) : (
            <p className="keys-hint">
              Responda com o mouse ou as teclas <span className="kbd">1</span> <span className="kbd">2</span> <span className="kbd">3</span> <span className="kbd">4</span> · <span className="kbd">Enter</span> próxima
            </p>
          )}
        </>
      )}
    </section>
  )
}
