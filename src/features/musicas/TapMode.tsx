import { useEffect, useMemo, useRef, useState } from 'react'
import { timedChords, writtenSequence, type Song, type SongTiming } from '../../core/song'
import { bpmFromTaps, quantizeChanges } from '../../core/tap'
import { usePlayerSlot } from '../../ui/player-slot'

type Step = 'tempo' | 'trocas' | 'pronto'

/**
 * Marcar as trocas ouvindo a gravação original: 1) bate no tempo para achar o BPM;
 * 2) volta a gravação ao início e bate quando cada acorde entra. Espaço ou o botão grande.
 */
export function TapMode({ song, onDone }: { song: Song; onDone: (t: SongTiming | null) => void }) {
  const [step, setStep] = useState<Step>('tempo')
  const [beatTaps, setBeatTaps] = useState<number[]>([])
  const [changes, setChanges] = useState<number[]>([])
  const [end, setEnd] = useState<number | null>(null)
  // acordes no tom em que a música toca (o que se ouve na gravação)
  const seq = useMemo(() => timedChords({ ...song, useTiming: false }).map((t) => t.chord), [song])
  const bpm = bpmFromTaps(beatTaps.slice(-12))
  const [pulse, setPulse] = useState(0)
  // o atalho de teclado é registrado uma vez: lê o estado por refs
  const stepRef = useRef(step)
  stepRef.current = step
  const changesRef = useRef<number[]>([])
  const seqLen = useRef(seq.length)
  seqLen.current = seq.length

  function tap(t: number) {
    setPulse((p) => p + 1)
    if (stepRef.current === 'tempo') {
      setBeatTaps((b) => [...b, t])
    } else if (stepRef.current === 'trocas') {
      const c = changesRef.current
      if (c.length < seqLen.current) {
        changesRef.current = [...c, t]
        setChanges(changesRef.current)
      } else {
        // depois do último acorde, a próxima batida marca o fim
        setEnd(t)
        setStep('pronto')
      }
    }
  }
  function undo() {
    if (stepRef.current === 'trocas') {
      changesRef.current = changesRef.current.slice(0, -1)
      setChanges(changesRef.current)
    }
    if (stepRef.current === 'tempo') setBeatTaps((b) => b.slice(0, -1))
  }
  function restart() {
    changesRef.current = []
    setChanges([])
    setEnd(null)
    setStep('trocas')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement).closest('input, textarea, select')) return
      if (e.code === 'Space') {
        e.preventDefault()
        tap(e.timeStamp)
      } else if (e.code === 'Backspace') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    // enquanto marca, o espaço é a batida: o player não toca/para com ele
    usePlayerSlot.getState().set({ spaceTaken: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      usePlayerSlot.getState().set({ spaceTaken: false })
    }
  }, [])

  const result = useMemo(() => {
    if (step !== 'pronto' || !bpm) return null
    const q = quantizeChanges(changes, end, bpm)
    // parou antes do fim da música: o resto fica com 1 compasso por acorde
    const beats = [...q.beats, ...seq.slice(q.beats.length).map(() => 4)]
    return { beats, bpm: q.bpm }
  }, [step, changes, end, bpm, seq])

  const idx = changes.length
  const done = idx >= seq.length

  return (
    <section className="panel stack-sm tap-mode">
      <div className="row-between">
        <div className="tag">Marcar tempos com a gravação</div>
        <button type="button" className="link" onClick={() => onDone(null)}>cancelar</button>
      </div>

      {step === 'tempo' && (
        <>
          <p className="hint">
            <b>1.</b> Coloque a música original para tocar (Spotify, YouTube…) e bata no tempo, junto com a
            bateria, pelo menos 8 vezes. Use a <b>barra de espaço</b> ou o botão abaixo.
          </p>
          <button type="button" key={pulse} className="tap-pad flash" onPointerDown={(e) => tap(e.timeStamp)}>
            {bpm ? <><span className="mono">{Math.round(bpm)}</span><small>bpm</small></> : 'Bata no tempo'}
          </button>
          <div className="chips">
            <button type="button" className="play" disabled={beatTaps.length < 6 || !bpm} onClick={() => setStep('trocas')}>Continuar</button>
            <button type="button" className="chip" onClick={() => { setBeatTaps([0, 60000 / song.bpm, 120000 / song.bpm]); setStep('trocas') }}>
              Pular (usar {song.bpm} bpm)
            </button>
          </div>
        </>
      )}

      {step === 'trocas' && (
        <>
          <p className="hint">
            <b>2.</b> Volte a gravação para o início e bata <b>no momento em que cada acorde entra</b>, começando pelo
            primeiro. Errou? <b>Backspace</b> desfaz a última batida. A grade precisa estar na ordem da gravação
            (repita ou apague seções antes, se precisar).
          </p>
          <button type="button" key={pulse} className="tap-pad flash" onPointerDown={(e) => tap(e.timeStamp)}>
            {done ? (
              <span className="tap-next">Fim da música</span>
            ) : (
              <>
                <small>{idx === 0 ? 'primeiro acorde' : 'próxima troca'}</small>
                <span className="tap-next">{seq[idx]}</span>
              </>
            )}
          </button>
          <p className="mono muted center">
            {seq.slice(idx + 1, idx + 9).join('  ')}
            {!done && ` · ${idx}/${seq.length}`}
          </p>
          <div className="chips">
            <button type="button" className="chip" onClick={undo} disabled={!idx}>Desfazer</button>
            <button type="button" className="chip" disabled={idx < 2} onClick={() => setStep('pronto')}>
              {done ? 'Concluir sem marcar o fim' : 'Concluir aqui (o resto fica 1 compasso cada)'}
            </button>
          </div>
        </>
      )}

      {step === 'pronto' && result && (
        <>
          <p className="hint">
            <b>{result.bpm} bpm</b> · duração de cada acorde em tempos (4 = um compasso):
          </p>
          <div className="tap-result">
            {seq.map((c, i) => (
              <span key={i}>{c}<small>{result.beats[i]}</small></span>
            ))}
          </div>
          <div className="chips">
            <button
              type="button"
              className="play"
              onClick={() => onDone({ beats: result.beats, sequence: writtenSequence(song), bpm: result.bpm })}
            >
              Salvar tempos
            </button>
            <button type="button" className="chip" onClick={restart}>Refazer as trocas</button>
          </div>
        </>
      )}
    </section>
  )
}
