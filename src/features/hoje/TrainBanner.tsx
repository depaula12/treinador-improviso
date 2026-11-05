import { clock } from '../../core/progresso'
import { go, useNav } from '../../ui/nav'
import { useHoje } from './store'
import { pauseTimer, startTimer, useTimerLeft } from './timer'
import { blocksFor, fromKey } from '../../core/plano'

/** faixa no topo da área aberta pelo Treino do dia: o que fazer, timer, concluir */
export function TrainBanner() {
  const area = useNav((s) => s.area)
  const active = useHoje((s) => s.active)
  const done = useHoje((s) => (active ? !!s.days[active.date]?.blocks[active.blockId]?.done : false))
  const t = useTimerLeft(active?.date ?? '', active?.blockId ?? '')
  if (!active || active.area !== area) return null
  const block = blocksFor(fromKey(active.date)).find((b) => b.id === active.blockId)

  const finish = () => {
    const s = useHoje.getState()
    if (t?.running) pauseTimer()
    if (!done) s.toggleBlock(active.date, active.blockId)
    s.setActive(null)
    go('hoje')
  }

  return (
    <div className="hj-banner" role="region" aria-label="Bloco do treino do dia">
      <div className="hj-banner-txt">
        <span className="tag" style={{ margin: 0 }}>Treino do dia · {active.title}</span>
        <p>{active.hint}</p>
      </div>
      <div className="hj-banner-act">
        {block && (t?.running ? (
          <button type="button" className="btn hj-timer on" onClick={pauseTimer}><span className="mono">{clock(t.left)}</span> Pausar</button>
        ) : (
          <button type="button" className="btn hj-timer" onClick={() => startTimer(active.date, active.blockId, block.min)}>
            {t && t.left > 0 ? <><span className="mono">{clock(t.left)}</span> Continuar</> : <>Timer {block.min} min</>}
          </button>
        ))}
        <button type="button" className="play" onClick={finish}>{done ? 'Voltar para Hoje' : 'Concluir'}</button>
        <button type="button" className="icon-btn" aria-label="Fechar a faixa" onClick={() => useHoje.getState().setActive(null)}>×</button>
      </div>
    </div>
  )
}
