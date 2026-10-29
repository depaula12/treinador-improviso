import type { Instrument, MixState } from '../audio/engine'

const LABELS: Record<Instrument, string> = {
  drums: 'Bateria',
  bass: 'Baixo',
  piano: 'Piano',
  guitar: 'Violão',
}

interface Props {
  mix: MixState
  onChange: (inst: Instrument, patch: Partial<MixState[Instrument]>) => void
}

export function Mixer({ mix, onChange }: Props) {
  return (
    <div className="mixer">
      {(Object.keys(LABELS) as Instrument[]).map((inst) => (
        <div key={inst} className={`strip${mix[inst].on ? '' : ' off'}`}>
          <button
            type="button"
            className="toggle"
            aria-pressed={mix[inst].on}
            onClick={() => onChange(inst, { on: !mix[inst].on })}
          >
            {LABELS[inst]}
          </button>
          <input
            type="range"
            min={-30}
            max={6}
            step={1}
            value={mix[inst].volume}
            aria-label={`Volume ${LABELS[inst]}`}
            onChange={(e) => onChange(inst, { volume: +e.target.value })}
          />
          <span className="mono">{mix[inst].volume > 0 ? '+' : ''}{mix[inst].volume} dB</span>
        </div>
      ))}
    </div>
  )
}
