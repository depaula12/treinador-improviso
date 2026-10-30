import { useMemo, useState } from 'react'
import { findShapes, mainShapes, type Shape } from '../../core/chord-shapes'
import { posKey } from '../../core/scales'
import { parseChord, KEYS, type ChordInfo } from '../../core/theory'
import { FORM_LABEL, formulaName, matchQuality, QUALITIES, symbolOf, voicingsFor } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { Fretboard } from '../../ui/Fretboard'

const NO_SCALE: number[] = []

function shapeCaption(v: Shape): string {
  const where = v.position === 0 ? 'Cordas soltas' : `Casa ${v.position}`
  const extra = v.omitted.length ? ` · sem ${v.omitted.map((s) => formulaName(s, v.quality)).join(', ')}` : ''
  return `${where} · ${v.fingers} dedo${v.fingers === 1 ? '' : 's'}${v.barre ? ' (pestana)' : ''}${extra}`
}

export function Decoder() {
  const [text, setText] = useState('Bm7')
  const [labels, setLabels] = useState<'graus' | 'notas'>('graus')
  const [showAll, setShowAll] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const chord = useMemo(() => parseChord(text), [text])
  const quality = chord ? matchQuality(chord) : null
  const voicings = chord && quality && chord.bass === undefined ? voicingsFor(quality.id, chord.root) : []
  const shapes = useMemo(() => (chord ? findShapes(chord) : []), [chord])
  const main = useMemo(() => mainShapes(shapes), [shapes])
  const listed = showAll ? shapes : main
  const pickedShape = shapes.find((v) => v.frets.join(',') === picked) ?? null
  // braço: só o desenho escolhido, ou todas as notas do acorde (com o baixo invertido, se houver)
  const only = useMemo(
    () => (pickedShape ? new Set(pickedShape.frets.flatMap((f, i) => (f === null ? [] : [posKey(5 - i, f)]))) : null),
    [pickedShape],
  )
  const shown: ChordInfo | null = chord && chord.bass !== undefined && !chord.semitones.some((s) => (chord.root + s) % 12 === chord.bass)
    ? { ...chord, semitones: [...chord.semitones, (chord.bass - chord.root + 12) % 12], notes: [...chord.notes, KEYS[chord.bass]] }
    : chord
  const labelSelect = (
    <select aria-label="Rótulos" value={labels} onChange={(e) => setLabels(e.target.value as 'graus' | 'notas')}>
      <option value="graus">Graus</option>
      <option value="notas">Notas</option>
    </select>
  )

  return (
    <div className="stack">
      <section className="panel decoder-input">
        <label>
          Digite uma cifra
          <input className="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="ex.: F#7, Am7b5, E9, D/F#" spellCheck={false} autoCapitalize="off" />
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
        <section className="panel"><p>Não reconheci essa cifra. Tente algo como <b>A7</b>, <b>Dm</b>, <b>G7M</b>, <b>Bm7b5</b>, <b>E9</b> ou <b>D/F#</b>.</p></section>
      ) : (
        <>
          <section className="panel decoder-info">
            <div className="chord-big accent">{chord.symbol}</div>
            <dl>
              <dt>Tipo</dt>
              <dd>{quality?.name ?? 'Fora do banco do quiz'}{chord.bass !== undefined ? ` · baixo em ${KEYS[chord.bass]}` : ''}</dd>
              <dt>Fórmula</dt>
              <dd className="mono">{chord.semitones.map((s) => formulaName(s, quality?.id)).join('  ')}</dd>
              <dt>Notas</dt>
              <dd className="mono">{chord.notes.join('  ')}</dd>
            </dl>
          </section>

          {voicings.length > 0 && (
            <section className="panel">
              <div className="row-between">
                <div className="tag">Desenhos do banco (os do quiz)</div>
                {labelSelect}
              </div>
              <div className="diagrams">
                {voicings.map((v) => (
                  <ChordDiagram key={v.form} voicing={v} labels={labels} caption={FORM_LABEL[v.form]} />
                ))}
              </div>
            </section>
          )}

          <section className="panel">
            <div className="row-between">
              <div className="tag">Formas no braço</div>
              <div className="chips">
                <button type="button" className="chip" aria-pressed={!showAll} onClick={() => setShowAll(false)}>Principais ({main.length})</button>
                <button type="button" className="chip" aria-pressed={showAll} onClick={() => setShowAll(true)}>Todas ({shapes.length})</button>
                {!voicings.length && labelSelect}
              </div>
            </div>
            {listed.length ? (
              <div className="diagrams">
                {listed.map((v) => {
                  const k = v.frets.join(',')
                  return (
                    <button key={k} type="button" className="shape-pick" aria-pressed={picked === k} onClick={() => setPicked(picked === k ? null : k)}>
                      <ChordDiagram voicing={v} labels={labels} hideName caption={shapeCaption(v)} />
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="muted">Não achei forma tocável (até 4 dedos, 4 casas) para esse acorde. As notas dele no braço estão abaixo.</p>
            )}
            <p className="muted hint">Clique num desenho para ver onde ele fica no braço.</p>
          </section>

          <section>
            <div className="tag">{pickedShape ? `Desenho escolhido: ${shapeCaption(pickedShape)}` : 'Notas do acorde no braço'}</div>
            <Fretboard maxFret={15} scale={NO_SCALE} chord={shown!} onlyChord labels={labels} only={only} />
          </section>
        </>
      )}
    </div>
  )
}
