import { useEffect, useMemo, useRef, useState } from 'react'
import { SCALES, scalePcs } from '../../core/scales'
import { KEYS, type ChordInfo } from '../../core/theory'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { drawWeighted, NEW_BOX, type Grade } from '../acordes/leitner'
import { fretsOf, noteCards, noteLabel, pcAt, STRING_NAME, type NoteCard } from './note-quiz'
import { useEscalas } from './store'

const EMPTY: ChordInfo = { symbol: '', tonic: 'C', root: 0, semitones: [], notes: [], minor: false }
const NO_SCALE: number[] = []
const FAST_MS = 3000
const MAX_FRET = 12

export function NoteQuiz() {
  const { scaleId, key, onlyScaleNotes, quizStats, recordQuiz, set } = useEscalas()
  const scale = SCALES.find((x) => x.id === scaleId) ?? SCALES[0]
  const pcs = useMemo(
    () => (onlyScaleNotes ? scalePcs(scale, KEYS.indexOf(key)) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]),
    [onlyScaleNotes, scale, key],
  )
  const cards = useMemo(() => noteCards(pcs), [pcs])
  const [card, setCard] = useState<NoteCard | null>(null)
  const [pick, setPick] = useState<{ string: number; fret: number } | null>(null)
  const started = useRef(0)
  const last = useRef<string | undefined>(undefined)

  function next() {
    const c = drawWeighted(cards, (x) => x.key, useEscalas.getState().quizStats, last.current)
    last.current = c.key
    setCard(c)
    setPick(null)
    started.current = performance.now()
  }
  // novo sorteio quando a escala ou o filtro mudam
  useEffect(next, [cards])

  if (!card) return null
  const answered = pick !== null
  const right = answered && pick.string === card.string && pcAt(pick.string, pick.fret) === card.pc

  function choose(string: number, fret: number) {
    if (answered || !card) return
    setPick({ string, fret })
    const ok = string === card.string && pcAt(string, fret) === card.pc
    const g: Grade = !ok ? 'errei' : performance.now() - started.current <= FAST_MS ? 'rapido' : 'lento'
    recordQuiz(card.key, g)
  }

  const marks: Mark[] = []
  if (answered) {
    if (!right) marks.push({ ...pick, kind: 'wrong', label: noteLabel(pcAt(pick.string, pick.fret)) })
    for (const f of fretsOf(card.string, card.pc, MAX_FRET)) marks.push({ string: card.string, fret: f, kind: 'right', label: noteLabel(card.pc) })
  }

  const mastered = cards.filter((c) => (quizStats[c.key]?.box ?? NEW_BOX) >= 4).length

  return (
    <div className="stack">
      <section className="panel quiz">
        <div className="row-between">
          <span className="muted">Dominadas: {mastered} de {cards.length}</span>
          <label className="inline-check">
            <input type="checkbox" checked={onlyScaleNotes} onChange={(e) => set({ onlyScaleNotes: e.target.checked })} /> Só notas de {scale.name.toLowerCase()} em {key}
          </label>
        </div>
        <p className="prompt">
          Onde está o <b>{noteLabel(card.pc)}</b> na <b>{STRING_NAME[card.string]}</b>?
        </p>
        <p className="muted hint center">Clique na casa. Vale qualquer oitava até a casa {MAX_FRET}.</p>
      </section>

      <Fretboard maxFret={MAX_FRET} scale={NO_SCALE} chord={EMPTY} labels="nenhum" marks={marks} onPick={choose} />

      {answered && (
        <div className="feedback">
          <p>{right ? 'Certo!' : `Não: essa casa é ${noteLabel(pcAt(pick.string, pick.fret))}${pick.string !== card.string ? ', e em outra corda' : ''}.`}</p>
          <button type="button" className="play" onClick={next} autoFocus>Próxima</button>
        </div>
      )}
    </div>
  )
}
