import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AudioInput, guessGuitarInput, listInputs, type InputFrame } from '../audio/input'
import { trackerOptions, useInputSettings } from '../audio/input-settings'
import { KEYS, parseChord } from '../core/theory'
import type { ChordGuess, Chroma } from '../core/chroma'

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
      <div className="row-between">
        <span className="tag" style={{ margin: 0 }}>Nível · <span className={`meter-msg ${state}`} style={{ textTransform: 'none', letterSpacing: 0 }}>{msg}</span></span>
        <span className="mono muted" style={{ fontSize: 12 }}>{Number.isFinite(peak) ? `${peak.toFixed(0)} dB` : '—'}</span>
      </div>
      <div className="meter-bar">
        <div className="meter-zone" style={{ left: `${pct(GOOD_LO)}%`, width: `${pct(GOOD_HI) - pct(GOOD_LO)}%` }} />
        <div className={`meter-fill ${state}`} style={{ width: `${pct(peak)}%` }} />
      </div>
    </div>
  )
}

/** Barras com a energia das 12 notas; as notas do acorde detectado ficam em destaque. */
export function ChromaBars({ chroma, chord }: { chroma: Chroma | null; chord: ChordGuess | null }) {
  const tones = chord ? (parseChord(chord.symbol)?.semitones ?? []).map((s) => (chord.root + s) % 12) : []
  return (
    <div className="chroma" aria-label="Energia de cada nota">
      {KEYS.map((k, pc) => (
        <div key={k} className="chroma-col">
          <div className="chroma-bar">
            <div className={`chroma-fill${tones.includes(pc) ? (pc === chord?.root ? ' root' : ' tone') : ''}`} style={{ height: `${(chroma?.[pc] ?? 0) * 100}%` }} />
          </div>
          <span className="mono">{k}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Captura da guitarra: escolhe a entrada (acha o Cube Baby sozinho), liga/desliga,
 * aplica os ajustes de estabilidade e entrega cada leitura para `onFrame`.
 */
export function useGuitarInput(onFrame: (f: InputFrame | null) => void) {
  const input = useRef<AudioInput | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const [active, setActive] = useState('')
  const [error, setError] = useState('')
  const settings = useInputSettings()
  const cb = useRef(onFrame)
  cb.current = onFrame

  useEffect(() => {
    void listInputs().then((d) => {
      setDevices(d)
      setDeviceId((cur) => cur || guessGuitarInput(d)?.deviceId || '')
    })
    return () => input.current?.close()
  }, [])

  // ajustes mudaram com a entrada ligada: aplica na hora
  useEffect(() => {
    input.current?.setChordOptions(trackerOptions(settings))
  }, [settings.stability, settings.minHoldSec])

  async function start(id = deviceId): Promise<void> {
    setError('')
    try {
      input.current ??= new AudioInput()
      input.current.setChordOptions(trackerOptions(useInputSettings.getState()))
      const label = await input.current.start(id || undefined, (f) => cb.current(f))
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
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'O navegador não deu acesso ao áudio. Clique no cadeado ao lado do endereço e permita o microfone.'
          : `Não consegui abrir a entrada (${e instanceof Error ? e.message : String(e)}).`,
      )
    }
  }

  function stop() {
    input.current?.stop()
    setActive('')
    cb.current(null)
  }

  return { devices, deviceId, setDeviceId, active, error, start, stop }
}

interface PanelProps {
  io: ReturnType<typeof useGuitarInput>
  peak: number
  children?: ReactNode
}

/** Faixa compacta no topo: entrada, Ativar/Desligar, medidor de nível, ajustes extras e mensagens. */
export function InputPanel({ io, peak, children }: PanelProps) {
  return (
    <section className="card input-strip" aria-label="Entrada de áudio">
      <label>
        Entrada de áudio
        <select
          value={io.deviceId}
          onChange={(e) => {
            io.setDeviceId(e.target.value)
            if (io.active) void io.start(e.target.value)
          }}
        >
          {io.devices.length === 0 && <option value="">Entrada padrão</option>}
          {io.devices.map((d, i) => (
            <option key={d.deviceId || i} value={d.deviceId}>{d.label || `Entrada ${i + 1} (dê permissão para ver o nome)`}</option>
          ))}
        </select>
      </label>
      <button type="button" className="play" aria-pressed={!!io.active} onClick={() => (io.active ? io.stop() : void io.start())}>
        {io.active ? 'Desligar' : 'Ativar'}
      </button>
      <LevelMeter peak={peak} />
      <div className="extra">{children}</div>
      <div className="msgs">
        {io.error ? (
          <p className="error">{io.error}</p>
        ) : io.active ? (
          <p className="muted hint">Ouvindo: {io.active}</p>
        ) : (
          <p className="muted hint">
            Ligue a guitarra no Cube Baby e o Cube Baby no PC pelo cabo USB. Ao ativar, o navegador pede acesso ao "microfone": é o Cube Baby.
            Use o som limpo, sem distorção.
          </p>
        )}
      </div>
    </section>
  )
}
