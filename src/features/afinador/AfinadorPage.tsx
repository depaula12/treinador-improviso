import { useMemo, useState } from 'react'
import type { InputFrame } from '../../audio/input'
import { positionsOf } from '../../core/pitch'
import { parseChord, type ChordInfo } from '../../core/theory'
import { ChordStability } from '../../ui/ChordStability'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { ChromaBars, InputPanel, useGuitarInput } from '../../ui/InputPanel'

const EMPTY: ChordInfo = { symbol: '', tonic: 'C', root: 0, semitones: [], notes: [], minor: false }
const NO_SCALE: number[] = []

function Needle({ cents }: { cents: number | null }) {
  const inTune = cents !== null && Math.abs(cents) <= 5
  return (
    <div className="needle">
      <div className="needle-scale">
        <span>−50</span>
        <span>0</span>
        <span>+50</span>
      </div>
      <div className="needle-track">
        <div className="needle-center" />
        {cents !== null && <div className={`needle-dot${inTune ? ' ok' : ''}`} style={{ left: `${50 + cents}%` }} />}
      </div>
      <div className={`needle-msg${inTune ? ' ok' : ''}`}>
        {cents === null ? ' ' : inTune ? 'Afinado' : cents < 0 ? `${-cents} cents abaixo: aperte a tarraxa` : `${cents} cents acima: afrouxe a tarraxa`}
      </div>
    </div>
  )
}

function ChordView({ frame }: { frame: InputFrame | null }) {
  const chord = frame?.chord ?? null
  const info = chord ? parseChord(chord.symbol) : null
  const alts = (frame?.guesses ?? []).filter((g) => g.symbol !== chord?.symbol).slice(0, 2)
  return (
    <>
      <section className="panel tuner">
        <div className="tuner-note">{chord ? chord.symbol : <span className="muted">—</span>}</div>
        <div className="mono muted center">
          {info ? info.notes.join('  ') : frame ? 'Toque um acorde e deixe soar' : 'Entrada desligada'}
        </div>
        {alts.length > 0 && chord && <div className="muted hint center">Também pode ser: {alts.map((a) => a.symbol).join(' ou ')}</div>}
        <ChromaBars chroma={frame?.chroma ?? null} chord={chord} />
        <ChordStability />
      </section>
      <section>
        <div className="tag">Notas do acorde no braço</div>
        <Fretboard maxFret={12} scale={NO_SCALE} chord={info ?? EMPTY} onlyChord labels="graus" />
      </section>
    </>
  )
}

export function AfinadorPage() {
  const [mode, setMode] = useState<'nota' | 'acorde'>('nota')
  const [frame, setFrame] = useState<InputFrame | null>(null)
  const io = useGuitarInput(setFrame)

  const note = frame?.note ?? null
  const marks: Mark[] = useMemo(
    () => (note ? positionsOf(note.midi, 15).map((p) => ({ ...p, kind: 'current' as const, label: note.name })) : []),
    // só muda quando muda a nota (o nome vem da nota), não a cada leitura de cents
    [note?.midi],
  )

  return (
    <div className="stack">
      <InputPanel io={io} peak={frame?.peak ?? -Infinity} />

      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'nota'} onClick={() => setMode('nota')}>Nota (afinador)</button>
        <button type="button" role="tab" aria-selected={mode === 'acorde'} onClick={() => setMode('acorde')}>Acorde</button>
      </div>

      {mode === 'acorde' ? (
        <ChordView frame={frame} />
      ) : (
        <>
          <section className="panel tuner">
            <div className="tuner-note">
              {note ? (
                <>
                  {note.name}
                  <small>{note.octave}</small>
                </>
              ) : (
                <span className="muted">—</span>
              )}
            </div>
            <div className="mono muted center">{note ? `${note.freq.toFixed(1)} Hz` : io.active ? 'Toque uma nota' : 'Entrada desligada'}</div>
            <Needle cents={note ? note.cents : null} />
          </section>

          <section>
            <div className="tag">Onde essa nota está no braço</div>
            <Fretboard maxFret={15} scale={NO_SCALE} chord={EMPTY} labels="nenhum" marks={marks} />
          </section>
        </>
      )}
    </div>
  )
}
