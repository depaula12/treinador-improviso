import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioInput, guessGuitarInput, listInputs, type InputFrame } from '../../audio/input'
import { positionsOf } from '../../core/pitch'
import type { ChordInfo } from '../../core/theory'
import { Fretboard, type Mark } from '../../ui/Fretboard'

const EMPTY: ChordInfo = { symbol: '', tonic: 'C', root: 0, semitones: [], notes: [], minor: false }
const NO_SCALE: number[] = []
// faixa de nível boa para a detecção (pico em dBFS)
const GOOD_LO = -24
const GOOD_HI = -6

function LevelMeter({ peak }: { peak: number }) {
  // −60 dB … 0 dB → 0–100%
  const pct = (db: number) => Math.max(0, Math.min(100, ((db + 60) / 60) * 100))
  const state = peak > -3 ? 'hot' : peak >= GOOD_LO ? 'good' : peak > -60 ? 'low' : 'off'
  const msg = { hot: 'Alto demais: abaixe o volume', good: 'Nível bom', low: 'Baixo: suba o volume do Cube Baby', off: 'Sem sinal' }[state]
  return (
    <div className="meter">
      <div className="meter-bar">
        <div className="meter-zone" style={{ left: `${pct(GOOD_LO)}%`, width: `${pct(GOOD_HI) - pct(GOOD_LO)}%` }} />
        <div className={`meter-fill ${state}`} style={{ width: `${pct(peak)}%` }} />
      </div>
      <div className="row-between">
        <span className={`meter-msg ${state}`}>{msg}</span>
        <span className="mono muted">{Number.isFinite(peak) ? `${peak.toFixed(0)} dB` : '—'}</span>
      </div>
    </div>
  )
}

function Needle({ cents }: { cents: number | null }) {
  if (cents === null) {
    return (
      <div className="needle">
        <div className="needle-scale"><span>−50</span><span>0</span><span>+50</span></div>
        <div className="needle-track"><div className="needle-center" /></div>
        <div className="needle-msg">&nbsp;</div>
      </div>
    )
  }
  const inTune = Math.abs(cents) <= 5
  return (
    <div className="needle">
      <div className="needle-scale">
        <span>−50</span>
        <span>0</span>
        <span>+50</span>
      </div>
      <div className="needle-track">
        <div className="needle-center" />
        <div className={`needle-dot${inTune ? ' ok' : ''}`} style={{ left: `${50 + cents}%` }} />
      </div>
      <div className={`needle-msg${inTune ? ' ok' : ''}`}>
        {inTune ? 'Afinado' : cents < 0 ? `${-cents} cents abaixo: aperte a tarraxa` : `${cents} cents acima: afrouxe a tarraxa`}
      </div>
    </div>
  )
}

export function AfinadorPage() {
  const input = useRef<AudioInput | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [active, setActive] = useState('')
  const [error, setError] = useState('')
  const [frame, setFrame] = useState<InputFrame | null>(null)

  useEffect(() => {
    void listInputs().then((d) => {
      setDevices(d)
      setDeviceId((cur) => cur || guessGuitarInput(d)?.deviceId || '')
    })
    return () => input.current?.close()
  }, [])

  async function start(id = deviceId) {
    setError('')
    try {
      input.current ??= new AudioInput()
      const label = await input.current.start(id || undefined, setFrame)
      // com a permissão dada, os nomes aparecem: escolhe o Cube Baby se ainda não estava escolhido
      const d = await listInputs()
      setDevices(d)
      const guitar = guessGuitarInput(d)
      if (!id && guitar && guitar.label !== label) {
        setDeviceId(guitar.deviceId)
        return start(guitar.deviceId)
      }
      setActive(label || 'entrada padrão')
    } catch (e) {
      setActive('')
      setError(e instanceof Error && e.name === 'NotAllowedError'
        ? 'O navegador não deu acesso ao áudio. Clique no cadeado ao lado do endereço e permita o microfone.'
        : `Não consegui abrir a entrada (${e instanceof Error ? e.message : String(e)}).`)
    }
  }

  function stop() {
    input.current?.stop()
    setActive('')
    setFrame(null)
  }

  const note = frame?.note ?? null
  const marks: Mark[] = useMemo(
    () => (note ? positionsOf(note.midi, 15).map((p) => ({ ...p, kind: 'current' as const, label: note.name })) : []),
    // só muda quando muda a nota (o nome vem da nota), não a cada leitura de cents
    [note?.midi],
  )

  return (
    <div className="stack">
      <section className="panel stack-sm">
        <div className="rule-pick">
          <label>
            Entrada de áudio
            <select value={deviceId} onChange={(e) => { setDeviceId(e.target.value); if (active) void start(e.target.value) }}>
              {devices.length === 0 && <option value="">Entrada padrão</option>}
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Entrada ${i + 1} (dê permissão para ver o nome)`}</option>
              ))}
            </select>
          </label>
          <button type="button" className="play" aria-pressed={!!active} onClick={() => (active ? stop() : void start())}>
            {active ? 'Desligar' : 'Ativar'}
          </button>
        </div>
        {active && <p className="muted hint">Ouvindo: {active}</p>}
        {error && <p className="error">{error}</p>}
        {!active && !error && (
          <p className="muted hint">
            Ligue a guitarra no Cube Baby e o Cube Baby no PC pelo cabo USB. Ao ativar, o navegador pede acesso ao "microfone": é o Cube Baby.
            Use o som limpo, sem distorção.
          </p>
        )}
        <LevelMeter peak={frame?.peak ?? -Infinity} />
      </section>

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
        <div className="mono muted center">{note ? `${note.freq.toFixed(1)} Hz` : active ? 'Toque uma nota' : 'Entrada desligada'}</div>
        <Needle cents={note ? note.cents : null} />
      </section>

      <section>
        <div className="tag">Onde essa nota está no braço</div>
        <Fretboard maxFret={15} scale={NO_SCALE} chord={EMPTY} labels="nenhum" marks={marks} />
      </section>
    </div>
  )
}
