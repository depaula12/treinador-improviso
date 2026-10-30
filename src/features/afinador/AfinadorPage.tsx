import { useMemo, useState } from 'react'
import type { InputFrame } from '../../audio/input'
import { positionsOf } from '../../core/pitch'
import { parseChord, type ChordInfo } from '../../core/theory'
import { ChordStability } from '../../ui/ChordStability'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { ChromaBars, InputPanel, useGuitarInput } from '../../ui/InputPanel'

const EMPTY: ChordInfo = { symbol: '', tonic: 'C', root: 0, semitones: [], notes: [], minor: false }
const NO_SCALE: number[] = []
// cordas soltas da 6ª para a 1ª (MIDI) e seus nomes
const OPEN = [40, 45, 50, 55, 59, 64]
const OPEN_NAME = ['E', 'A', 'D', 'G', 'B', 'E']

/** Ponteiro em arco, −50 a +50 cents; verde dentro de ±5. */
function Gauge({ cents }: { cents: number | null }) {
  const inTune = cents !== null && Math.abs(cents) <= 5
  // ±50 cents = ±80° a partir do topo
  const a = ((cents ?? 0) / 50) * 80 * (Math.PI / 180)
  const tip = { x: 200 + 150 * Math.sin(a), y: 200 - 150 * Math.cos(a) }
  const zone = (deg: number) => ({ x: 200 + 160 * Math.sin((deg * Math.PI) / 180), y: 200 - 160 * Math.cos((deg * Math.PI) / 180) })
  const z0 = zone(-8)
  const z1 = zone(8)
  return (
    <div className="stack-sm">
      <svg className="gauge" viewBox="0 0 400 226" role="img" aria-label={cents === null ? 'Sem nota' : `${cents} cents`}>
        <path d="M40 200 A160 160 0 0 1 360 200" fill="none" stroke="var(--panel-3)" strokeWidth="18" strokeLinecap="round" />
        <path d={`M${z0.x} ${z0.y} A160 160 0 0 1 ${z1.x} ${z1.y}`} fill="none" stroke="var(--good)" strokeWidth="18" />
        <g fontFamily="Fraunces, Georgia, serif" fontSize="14" fill="var(--muted)" textAnchor="middle">
          <text x="40" y="222">−50</text>
          <text x="200" y="26">0</text>
          <text x="360" y="222">+50</text>
        </g>
        {cents !== null && (
          <line x1="200" y1="200" x2={tip.x} y2={tip.y} stroke={inTune ? 'var(--good)' : 'var(--fg)'} strokeWidth="5" strokeLinecap="round" style={{ transition: 'all 80ms linear' }} />
        )}
        <circle cx="200" cy="200" r="10" fill="var(--fg)" />
      </svg>
      <div className={`gauge-msg${inTune ? ' ok' : ''}`}>
        {cents === null ? ' ' : inTune ? 'Afinado' : cents < 0 ? `${-cents} cents abaixo: aperte a tarraxa` : `${cents} cents acima: afrouxe a tarraxa`}
      </div>
    </div>
  )
}

/** As 6 cordas soltas: acende a que você está afinando. */
function StringsRef({ midi, inTune }: { midi: number | null; inTune: boolean }) {
  // a corda mais perto da nota tocada (até 2 semitons: afinação, não melodia)
  let near = -1
  if (midi !== null) {
    let best = 3
    OPEN.forEach((m, i) => {
      if (Math.abs(midi - m) < best) {
        best = Math.abs(midi - m)
        near = i
      }
    })
  }
  return (
    <div className="strings-ref" aria-label="Cordas soltas">
      {OPEN.map((m, i) => {
        const ok = i === near && midi === m && inTune
        return (
          <span key={i} className={ok ? 'ok' : i === near ? 'near' : ''}>
            <b>{OPEN_NAME[i]}</b>
            <small>{6 - i}ª{ok ? ' ✓' : ''}</small>
          </span>
        )
      })}
    </div>
  )
}

function ChordView({ frame }: { frame: InputFrame | null }) {
  const chord = frame?.chord ?? null
  const info = chord ? parseChord(chord.symbol) : null
  const alts = (frame?.guesses ?? []).filter((g) => g.symbol !== chord?.symbol).slice(0, 2)
  return (
    <>
      <div className="tuner-split">
        <section className="card tuner" aria-live="polite">
          <div className="tuner-note">{chord ? chord.symbol : <span className="muted">—</span>}</div>
          <div className="mono muted">{info ? info.notes.join('  ') : frame ? 'Toque um acorde e deixe soar' : 'Entrada desligada'}</div>
          {alts.length > 0 && chord && <div className="muted hint">Também pode ser: {alts.map((a) => a.symbol).join(' ou ')}</div>}
        </section>
        <section className="card stack-sm">
          <span className="tag" style={{ margin: 0 }}>Notas que o app está ouvindo</span>
          <ChromaBars chroma={frame?.chroma ?? null} chord={chord} />
          <ChordStability />
        </section>
      </div>
      <section className="neck-band">
        <div className="neck-cap"><span className="tag">Notas do acorde no braço</span></div>
        <Fretboard maxFret={15} scale={NO_SCALE} chord={info ?? EMPTY} onlyChord labels="graus" />
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
  const inTune = !!note && Math.abs(note.cents) <= 5

  return (
    <div className="page">
      <InputPanel io={io} peak={frame?.peak ?? -Infinity}>
        <div className="segmented" role="tablist" aria-label="Modo">
          <button type="button" role="tab" aria-selected={mode === 'nota'} onClick={() => setMode('nota')}>Nota</button>
          <button type="button" role="tab" aria-selected={mode === 'acorde'} onClick={() => setMode('acorde')}>Acorde</button>
        </div>
      </InputPanel>

      {mode === 'acorde' ? (
        <ChordView frame={frame} />
      ) : (
        <>
          <div className="tuner-split">
            <section className="card tuner" aria-live="polite">
              <div className={`tuner-note${inTune ? ' ok' : ''}`}>
                {note ? (
                  <>
                    {note.name}
                    <small>{note.octave}</small>
                  </>
                ) : (
                  <span className="muted">—</span>
                )}
              </div>
              <div className="mono muted">
                {note ? `${note.freq.toFixed(1)} Hz · ${note.cents > 0 ? '+' : ''}${note.cents} cents` : io.active ? 'Toque uma nota' : 'Entrada desligada'}
              </div>
            </section>
            <section className="card stack-sm" style={{ alignContent: 'center' }}>
              <Gauge cents={note ? note.cents : null} />
              <StringsRef midi={note ? note.midi : null} inTune={inTune} />
            </section>
          </div>

          <section className="neck-band">
            <div className="neck-cap"><span className="tag">{note ? `Onde está o ${note.name} no braço` : 'Onde a nota tocada está no braço'}</span></div>
            <Fretboard maxFret={15} scale={NO_SCALE} chord={EMPTY} labels="nenhum" marks={marks} />
          </section>
        </>
      )}
    </div>
  )
}
