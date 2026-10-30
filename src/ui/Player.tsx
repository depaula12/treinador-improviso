import { useEffect, useMemo, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { STYLES } from '../audio/engine'
import { keyShort, parseProgression, PROGRESSIONS } from '../core/progressions'
import { SCALES } from '../core/scales'
import { togglePlay, useImproviso } from '../features/improviso/store'
import { Mixer } from './Mixer'
import { usePlayerSlot } from './player-slot'

const LABELS = { drums: 'Bateria', bass: 'Baixo', piano: 'Piano', guitar: 'Violão' } as const

const PlayIcon = ({ playing }: { playing: boolean }) =>
  playing ? (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M7 4.5v15l13-7.5z" /></svg>
  )

/** O acorde da vez na base, como "capa" do player. */
function ArtChord({ fallback }: { fallback: string }) {
  const now = useImproviso((s) => s.now)
  return <span className={`art${now.length > 3 ? ' small' : ''}`}>{now || fallback}</span>
}

/**
 * Player fixo embaixo, em todas as áreas: tocar/parar, andamento, contagem, loop e mixer da base.
 * A barra de espaço toca/para (fora de campos de texto).
 */
export function Player() {
  // tudo menos a posição: o player não re-renderiza a cada tempo
  const s = useImproviso(useShallow(({ pos: _pos, ...rest }) => rest))
  const { slot, spaceTaken } = usePlayerSlot()
  const [mixOpen, setMixOpen] = useState(false)

  const custom = s.progId === 'custom'
  const typedOk = useMemo(() => !custom || parseProgression(s.customText).chords.length > 0, [custom, s.customText])
  const prog = PROGRESSIONS.find((p) => p.id === s.progId)
  const style = STYLES.find((x) => x.id === s.styleId) ?? STYLES[0]
  const scale = SCALES.find((x) => x.id === s.scaleId) ?? SCALES[0]
  const title = s.progId === 'song' && s.song ? s.song.title : custom ? 'Progressão digitada' : `${prog?.name ?? ''} em ${keyShort(s.key, s.keyMinor)}`
  const playing = s.status === 'playing'

  const toggle = slot ? slot.onToggle : () => void togglePlay()
  const isPlaying = slot ? slot.playing : playing
  const canPlay = slot ? true : s.status !== 'loading' && (typedOk || playing)
  const bpm = slot ? slot.bpm : s.bpm
  const changeBpm = (d: number) => (slot ? slot.onBpm(d) : s.set({ bpm: Math.min(180, Math.max(50, s.bpm + d)) }))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || usePlayerSlot.getState().spaceTaken) return
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, button, [contenteditable]')) return
      e.preventDefault()
      const cur = usePlayerSlot.getState().slot
      if (cur) cur.onToggle()
      else if (useImproviso.getState().status !== 'loading') void togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <footer className="player">
      <div className="now-loaded">
        {slot ? <span className="art">{slot.art}</span> : <ArtChord fallback={s.key} />}
        <div className="now-loaded-txt">
          <div className="t">{slot ? slot.title : title}</div>
          <div className="s">{slot ? slot.sub : `${style.name} · ${s.scaleId === 'auto' ? 'escala acompanha o acorde' : scale.name}`}</div>
        </div>
      </div>

      <div className="transport">
        {!slot && (
          <button type="button" className="icon-btn opt-hide" aria-pressed={s.countIn} title="Contagem de entrada" aria-label="Contagem de entrada" onClick={() => s.set({ countIn: !s.countIn })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
          </button>
        )}
        <div className="bpm-ctl">
          <button type="button" onClick={() => changeBpm(-5)} aria-label="Mais lento">−</button>
          <span className="mono">{bpm}<small> bpm</small></span>
          <button type="button" onClick={() => changeBpm(5)} aria-label="Mais rápido">+</button>
        </div>
        <button type="button" className="play-btn" aria-label={isPlaying ? 'Parar' : 'Tocar'} aria-pressed={isPlaying} disabled={!canPlay} onClick={toggle}>
          {!slot && s.status === 'loading' ? <span className="spin" aria-hidden /> : <PlayIcon playing={isPlaying} />}
        </button>
        {!slot && (
          <button type="button" className="icon-btn opt-hide" aria-pressed={s.loop} title="Loop" aria-label="Loop" onClick={() => s.set({ loop: !s.loop })}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></svg>
          </button>
        )}
        {!spaceTaken && <span className="kbd hide-phone" title="Atalho: barra de espaço toca e para">espaço</span>}
      </div>

      <div className="mix">
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => (
          <button key={k} type="button" className={`ch hide-phone${s.mix[k].on ? ' on' : ''}`} aria-pressed={s.mix[k].on} onClick={() => s.setChannel(k, { on: !s.mix[k].on })}>
            <i />{LABELS[k]}
          </button>
        ))}
        <button type="button" className="icon-btn" aria-label="Mixer" aria-expanded={mixOpen} title="Mixer" onClick={() => setMixOpen(!mixOpen)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>
        </button>
        {mixOpen && (
          <div className="mix-pop" role="dialog" aria-label="Mixer">
            <div className="row-between"><span className="tag">Mixer da base</span><button type="button" className="link" onClick={() => setMixOpen(false)}>fechar</button></div>
            <Mixer mix={s.mix} onChange={s.setChannel} />
          </div>
        )}
      </div>
    </footer>
  )
}
