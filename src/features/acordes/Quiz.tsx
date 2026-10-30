import { useEffect, useMemo, useRef, useState } from 'react'
import { FORM_LABEL, formulaName, qualityById } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { drawWeighted, NEW_BOX, type Grade } from './leitner'
import { buildCards, makeQuestion, songCards, type Question } from './quiz-model'
import { useAcordes } from './store'

// múltipla escolha: acertar em até 4 s conta como "rápido"
const FAST_MS = 4000

/** `songChords`: treina só os acordes dessa música (em vez dos tipos escolhidos). */
export function Quiz({ songChords }: { songChords?: string[] | null }) {
  const { mode, qualities, forms, stats, record } = useAcordes()
  const cards = useMemo(
    () => (songChords ? songCards(mode, songChords, forms).cards : buildCards(mode, qualities, forms)),
    [mode, qualities, forms, songChords],
  )
  const [q, setQ] = useState<Question | null>(null)
  const [picked, setPicked] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
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

  if (!q) {
    return (
      <section className="panel">
        <p>{songChords ? 'Nenhum acorde desta música tem desenho nas formas escolhidas.' : 'Escolha pelo menos um tipo de acorde e uma forma.'}</p>
      </section>
    )
  }

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

  const mastered = cards.filter((c) => (stats[c.key]?.box ?? NEW_BOX) >= 4).length
  const formLabel = mode === 'cifra-notas' ? '' : FORM_LABEL[q.card.form]
  const answered = picked !== null

  return (
    <section className="panel quiz">
      <div className="row-between">
        <span className="muted">Dominados: {mastered} de {cards.length}</span>
        <span className="muted">Caixa {stats[q.card.key]?.box ?? NEW_BOX}/5</span>
      </div>

      {mode === 'cronometrado' ? (
        <>
          <p className="prompt">Toque <b>{q.symbol}</b>{q.card.form !== 'aberto' ? <> com <b>{formLabel.toLowerCase()}</b></> : <> na <b>forma aberta</b></>}</p>
          <div className={`timer mono${elapsed > 8000 ? ' late' : ''}`}>{(elapsed / 1000).toFixed(1)} s</div>
          {!revealed ? (
            <button type="button" className="play" onClick={() => { setElapsed(performance.now() - started.current); setRevealed(true) }}>
              Revelar
            </button>
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
              {mode === 'cifra-desenho' ? <>Qual é o desenho de <b>{q.symbol}</b> ({formLabel.toLowerCase()})?</> : <>Quais são as notas de <b>{q.symbol}</b>?</>}
            </p>
          )}

          <div className={mode === 'cifra-desenho' ? 'options diagrams' : 'options'}>
            {q.options.map((o, i) => {
              const state = !answered ? '' : i === q.answer ? ' right' : i === picked ? ' wrong' : ''
              return (
                <button key={i} type="button" className={`option${state}`} onClick={() => choose(i)} disabled={answered}>
                  {o.voicing ? <ChordDiagram voicing={o.voicing} hideName={!answered} labels={answered ? 'graus' : 'nenhum'} /> : <span className="mono">{o.label}</span>}
                </button>
              )
            })}
          </div>

          {answered && (
            <div className="feedback">
              <p>
                {picked === q.answer ? 'Certo!' : 'Não foi dessa vez.'} <b>{q.symbol}</b> = {qualityById(q.card.quality).pcs.map((s) => formulaName(s, q.card.quality)).join(' ')} ({q.notes.join(' ')})
              </p>
              <button type="button" className="play" onClick={next} autoFocus>Próxima</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
