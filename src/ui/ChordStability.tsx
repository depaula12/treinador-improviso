import type { Stability } from '../core/chroma'
import { useInputSettings } from '../audio/input-settings'

const LABEL: Record<Stability, string> = { rapida: 'Rápida', equilibrada: 'Equilibrada', estavel: 'Estável' }

/** Ajustes de como o acorde detectado troca na tela (compartilhado por Afinador e Jam). */
export function ChordStability() {
  const { stability, minHoldSec, set } = useInputSettings()
  return (
    <div className="row-wrap stability">
      <div>
        <div className="tag">Troca de acorde</div>
        <div className="segmented small" role="group" aria-label="Estabilidade">
          {(Object.keys(LABEL) as Stability[]).map((k) => (
            <button key={k} type="button" aria-pressed={stability === k} onClick={() => set({ stability: k })}>
              {LABEL[k]}
            </button>
          ))}
        </div>
      </div>
      <label className="hold">
        Tempo mínimo entre trocas <span className="mono">{minHoldSec.toFixed(1)} s</span>
        <input type="range" min={0.2} max={3} step={0.1} value={minHoldSec} onChange={(e) => set({ minHoldSec: +e.target.value })} />
      </label>
    </div>
  )
}
