import { useMemo, useRef, useState } from 'react'
import type { InputFrame } from '../../audio/input'
import { degreeName } from '../../core/fretboard-model'
import { nearestGuide } from '../../core/guide'
import { estimateKey, tonicHints, weightsFromChords, type KeyGuess } from '../../core/key'
import { romanOf, scaleForKey, suggestNext } from '../../core/next-chords'
import { SCALES, scalePcs } from '../../core/scales'
import { KEYS, parseChord, type ChordInfo } from '../../core/theory'
import { matchQuality, voicingsFor } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { ChordStability } from '../../ui/ChordStability'
import { Fretboard, type Mark } from '../../ui/Fretboard'
import { InputPanel, useGuitarInput } from '../../ui/InputPanel'

interface HistItem {
  symbol: string
  start: number
  ms: number
}

const EMPTY: ChordInfo = { symbol: '', tonic: 'C', root: 0, semitones: [], notes: [], minor: false }
const ALL_KEYS: KeyGuess[] = KEYS.flatMap((k, root) => [
  { root, mode: 'major' as const, score: 0, name: `${k} maior` },
  { root, mode: 'minor' as const, score: 0, name: `${k} menor` },
])
// janela do histórico usada para estimar o tom
const WINDOW = 12
// ponto de partida para o alvo quando ainda não ouviu nenhuma nota: meio do braço, 3ª corda casa 7
const MID_REF = 55 + 7

export function JamPage() {
  const [frame, setFrame] = useState<InputFrame | null>(null)
  const [history, setHistory] = useState<HistItem[]>([])
  const [locked, setLocked] = useState<string>('auto')
  const [preview, setPreview] = useState<string | null>(null)
  const lastNote = useRef<{ midi: number; at: number } | null>(null)
  const lastPaint = useRef({ at: 0, chord: '', note: -1 })

  const io = useGuitarInput((f) => {
    const now = performance.now()
    // a tela inteira (braço + diagramas) só redesenha quando muda acorde/nota, ou a ~8×/s pelo medidor
    const lp = lastPaint.current
    const chordKey = f?.chord?.symbol ?? ''
    const noteKey = f?.note?.midi ?? -1
    if (!f || chordKey !== lp.chord || noteKey !== lp.note || now - lp.at > 120) {
      lastPaint.current = { at: now, chord: chordKey, note: noteKey }
      setFrame(f)
    }
    if (!f) return
    if (f.note) lastNote.current = { midi: f.note.midi, at: now }
    const sym = f.chord?.symbol
    if (!sym) return
    setHistory((h) => {
      const last = h[h.length - 1]
      if (last && last.symbol === sym) {
        // mesmo acorde: só atualiza a duração
        const ms = now - last.start
        return ms - last.ms > 250 ? [...h.slice(0, -1), { ...last, ms }] : h
      }
      return [...h, { symbol: sym, start: now, ms: 0 }].slice(-40)
    })
  })

  const recent = history.slice(-WINDOW)
  const guesses = useMemo(() => {
    const hs = recent.map((h) => ({ symbol: h.symbol, ms: Math.max(500, h.ms) }))
    return hs.length ? estimateKey(weightsFromChords(hs), tonicHints(hs)) : []
  }, [recent.map((h) => `${h.symbol}:${Math.round(h.ms / 1000)}`).join()])
  const key = locked === 'auto' ? guesses[0] : ALL_KEYS.find((k) => k.name === locked)
  // empate técnico: mostra o segundo candidato para o usuário escolher
  const rival = locked === 'auto' && guesses[1] && guesses[0].score - guesses[1].score < 0.06 ? guesses[1] : null

  const current = frame?.chord ? parseChord(frame.chord.symbol) : history.length ? parseChord(history[history.length - 1].symbol) : null
  const suggestions = current && key ? suggestNext(current, key) : []
  const shown = (preview && parseChord(preview)) || current

  const scaleId = key ? scaleForKey(key, current) : 'pentMin'
  const scale = SCALES.find((s) => s.id === scaleId)!
  const pcs = key ? scalePcs(scale, key.root) : []

  // alvo: nota-guia (3ª/7ª) do acorde mais perto da última nota que você tocou
  const ref = lastNote.current && performance.now() - lastNote.current.at < 4000 ? lastNote.current.midi : MID_REF
  const target = shown ? nearestGuide(shown, ref, 0, 12) : null
  const nextTarget = !preview && suggestions[0] && target ? nearestGuide(parseChord(suggestions[0].symbol)!, target.midi, 0, 12) : null
  const marks: Mark[] = []
  if (nextTarget) marks.push({ string: nextTarget.string, fret: nextTarget.fret, kind: 'next' })
  if (target) marks.push({ string: target.string, fret: target.fret, kind: 'current', label: degreeName(target.interval) })

  return (
    <div className="stack">
      <InputPanel io={io} peak={frame?.peak ?? -Infinity}>
        <ChordStability />
      </InputPanel>

      <section className="panel jam-now">
        <div>
          <div className="tag">Você está tocando</div>
          <div className="now-chord">{current ? current.symbol : <span className="muted">—</span>}</div>
          <div className="mono muted">
            {current && key ? `${romanOf(current, key)} em ${key.name}` : io.active ? 'Toque um acorde e deixe soar' : 'Ative a entrada para começar'}
          </div>
        </div>
        <div className="jam-key">
          <div className="tag">Tom</div>
          <select value={locked} onChange={(e) => setLocked(e.target.value)} aria-label="Tom">
            <option value="auto">Automático{guesses[0] ? `: ${guesses[0].name}` : ''}</option>
            {ALL_KEYS.map((k) => (
              <option key={k.name} value={k.name}>{k.name}</option>
            ))}
          </select>
          {rival && (
            <button type="button" className="link" onClick={() => setLocked(rival.name)}>
              Ou é {rival.name}? Fixar
            </button>
          )}
        </div>
      </section>

      {suggestions.length > 0 && (
        <section className="panel">
          <div className="row-between">
            <div className="tag">Próximos acordes que soam bem</div>
            {preview && <button type="button" className="link" onClick={() => setPreview(null)}>voltar ao acorde atual</button>}
          </div>
          <div className="suggestions">
            {suggestions.map((sg, i) => {
              const c = parseChord(sg.symbol)
              const q = c ? matchQuality(c) : null
              const v = q && c ? voicingsFor(q.id, c.root)[0] : null
              return (
                <button key={sg.symbol} type="button" className="suggestion" aria-pressed={preview === sg.symbol} onClick={() => setPreview(preview === sg.symbol ? null : sg.symbol)}>
                  <span className="sg-name">{sg.symbol}</span>
                  <span className="mono muted">{sg.roman}{i === 0 ? ' · mais comum' : ''}</span>
                  {v && <ChordDiagram voicing={v} hideName labels="graus" />}
                </button>
              )
            })}
          </div>
          <p className="muted hint">Clique num acorde para ver as notas dele no braço antes de trocar.</p>
        </section>
      )}

      <section className="board">
        <Fretboard maxFret={12} scale={pcs} chord={shown ?? EMPTY} labels="graus" marks={marks} />
        {target && shown && (
          <p className="guide-line">
            <span className="guide-dot" /> Alvo para improvisar: <b>{target.interval === 3 || target.interval === 4 ? '3ª' : '7ª'} de {shown.symbol}</b>
            {nextTarget && suggestions[0] ? <> · anel azul: aonde ir se trocar para {suggestions[0].symbol}</> : null}
          </p>
        )}
        <div className="legend center-legend">
          <span><i style={{ background: 'var(--root)' }} />Fundamental</span>
          <span><i style={{ background: 'var(--tone)' }} />Notas do acorde</span>
          <span><i className="dot" />{scale.name}{key ? ` de ${KEYS[key.root]}` : ''}</span>
        </div>
      </section>

      {history.length > 0 && (
        <section className="panel">
          <div className="row-between">
            <div className="tag">O que você tocou</div>
            <button type="button" className="link" onClick={() => { setHistory([]); setLocked('auto') }}>limpar</button>
          </div>
          <div className="bars jam-history">
            {history.slice(-16).map((h, i) => {
              const c = parseChord(h.symbol)
              return (
                <span key={`${h.start}-${i}`} title={c && key ? romanOf(c, key) : ''}>{h.symbol}</span>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
