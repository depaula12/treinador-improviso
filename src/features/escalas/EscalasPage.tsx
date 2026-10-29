import { useState } from 'react'
import { Exercises } from './Exercises'
import { NoteQuiz } from './NoteQuiz'

export function EscalasPage() {
  const [view, setView] = useState<'exercicios' | 'onde'>('exercicios')
  return (
    <div className="stack">
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'exercicios'} onClick={() => setView('exercicios')}>Exercícios</button>
        <button type="button" role="tab" aria-selected={view === 'onde'} onClick={() => setView('onde')}>Onde está a nota?</button>
      </div>
      {view === 'exercicios' ? <Exercises /> : <NoteQuiz />}
    </div>
  )
}
