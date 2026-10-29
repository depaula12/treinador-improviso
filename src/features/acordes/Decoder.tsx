import { useMemo, useState } from 'react'
import { parseChord, KEYS } from '../../core/theory'
import { FORM_LABEL, formulaName, matchQuality, QUALITIES, symbolOf, voicingsFor } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { Fretboard } from '../../ui/Fretboard'

const NO_SCALE: number[] = []

export function Decoder() {
  const [text, setText] = useState('Bm7')
  const [labels, setLabels] = useState<'graus' | 'notas'>('graus')
  const chord = useMemo(() => parseChord(text), [text])
  const quality = chord ? matchQuality(chord) : null
  const voicings = chord && quality ? voicingsFor(quality.id, chord.root) : []

  return (
    <div className="stack">
      <section className="panel decoder-input">
        <label>
          Digite uma cifra
          <input className="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="ex.: F#7, Cadd9, Bm7" spellCheck={false} autoCapitalize="off" />
        </label>
        <div className="quick">
          <span className="tag">ou escolha</span>
          <select aria-label="Fundamental" value={chord ? KEYS[chord.root] : 'C'} onChange={(e) => setText(symbolOf(KEYS.indexOf(e.target.value), quality ?? QUALITIES[1]))}>
            {KEYS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <div className="chips">
            {QUALITIES.map((q) => (
              <button key={q.id} type="button" className="chip" aria-pressed={quality?.id === q.id} onClick={() => setText(symbolOf(chord?.root ?? 0, q))}>
                {q.suffix || 'maior'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {!chord ? (
        <section className="panel"><p>Não reconheci essa cifra. Tente algo como <b>A7</b>, <b>Dm</b>, <b>G7M</b> ou <b>Esus4</b>.</p></section>
      ) : (
        <>
          <section className="panel decoder-info">
            <div className="chord-big accent">{chord.symbol}</div>
            <dl>
              <dt>Tipo</dt>
              <dd>{quality?.name ?? 'Fora do banco da v1'}</dd>
              <dt>Fórmula</dt>
              <dd className="mono">{chord.semitones.map((s) => formulaName(s, quality?.id)).join('  ')}</dd>
              <dt>Notas</dt>
              <dd className="mono">{chord.notes.join('  ')}</dd>
            </dl>
          </section>

          <section className="panel">
            <div className="row-between">
              <div className="tag">Desenhos</div>
              <select aria-label="Rótulos" value={labels} onChange={(e) => setLabels(e.target.value as 'graus' | 'notas')}>
                <option value="graus">Graus</option>
                <option value="notas">Notas</option>
              </select>
            </div>
            {voicings.length ? (
              <div className="diagrams">
                {voicings.map((v) => (
                  <ChordDiagram key={v.form} voicing={v} labels={labels} caption={FORM_LABEL[v.form]} />
                ))}
              </div>
            ) : (
              <p className="muted">Esse tipo de acorde ainda não tem desenhos no banco (entra na v2). As notas dele no braço estão abaixo.</p>
            )}
          </section>

          <section>
            <div className="tag">Notas do acorde no braço</div>
            <Fretboard maxFret={12} scale={NO_SCALE} chord={chord} onlyChord labels={labels} />
          </section>
        </>
      )}
    </div>
  )
}
