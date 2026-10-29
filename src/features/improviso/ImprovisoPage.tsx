import { useEffect, useMemo, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { engine, STYLES } from '../../audio/engine'
import { degreeName } from '../../core/fretboard-model'
import { guideLine } from '../../core/guide'
import { parseProgression, PROGRESSIONS, realize } from '../../core/progressions'
import { boxPositions, boxRange, SCALES, scalePcs } from '../../core/scales'
import { KEYS } from '../../core/theory'
import { Fretboard, type LabelMode, type Mark } from '../../ui/Fretboard'
import { Mixer } from '../../ui/Mixer'
import { drawRestriction, RESTRICTIONS } from './restrictions'
import { useImproviso } from './store'

// Componentes pequenos que acompanham o tempo: só eles re-renderizam a cada batida.
function BeatDots() {
  const beat = useImproviso((st) => st.pos?.beat ?? -1)
  return (
    <div className="beats" aria-hidden>
      {[0, 1, 2, 3].map((b) => (
        <span key={b} className={beat === b ? 'on' : ''} />
      ))}
    </div>
  )
}

function CountIn() {
  const beat = useImproviso((st) => st.pos?.beat)
  return <div className="now-chord count">{beat === undefined ? '…' : beat + 1}</div>
}

const BOX_OPTIONS = [1, 2, 3, 4, 5, 0]

export function ImprovisoPage() {
  // tudo menos a posição; a página inteira só re-renderiza na troca de compasso
  const s = useImproviso(useShallow(({ pos: _pos, ...rest }) => rest))
  const bar = useImproviso((st) => st.pos?.bar ?? -1)
  const lastBeat = useImproviso((st) => st.pos?.beat === 3)
  const settings = useRef<HTMLDialogElement>(null)

  const custom = s.progId === 'custom'
  const prog = PROGRESSIONS.find((p) => p.id === s.progId) ?? PROGRESSIONS[0]
  const style = STYLES.find((x) => x.id === s.styleId) ?? STYLES[0]
  const scale = SCALES.find((x) => x.id === s.scaleId) ?? SCALES[0]
  const restriction = RESTRICTIONS.find((r) => r.id === s.restrictionId) ?? RESTRICTIONS[0]
  const typed = useMemo(() => parseProgression(s.customText), [s.customText])
  const typedOk = typed.chords.length > 0
  // digitada vazia: mantém a de 12 compassos no braço, mas o play fica desabilitado
  const chords = useMemo(
    () => (custom && typedOk ? typed.chords : realize(prog, s.key)),
    [custom, typedOk, typed, prog, s.key],
  )
  const keyPc = KEYS.indexOf(s.key)
  const pcs = useMemo(() => scalePcs(scale, keyPc), [scale, keyPc])

  // a restrição "só box N" manda no foco; senão vale o desenho escolhido
  const box = restriction.box ?? s.focusBox
  const win = useMemo<[number, number] | null>(() => (box ? boxRange(scale, keyPc, box) : null), [box, scale, keyPc])
  const only = useMemo(() => (restriction.box ? boxPositions(scale, keyPc, restriction.box) : null), [restriction.box, scale, keyPc])
  // notas-guia: um alvo por compasso dentro da região visível, em linha suave
  const guide = useMemo(
    () => (s.guide ? guideLine(chords, win ? win[0] : 0, win ? win[1] : Math.min(12, s.maxFret)) : []),
    [s.guide, chords, win, s.maxFret],
  )

  // configuração lida pelo motor a cada compasso: mudanças entram no próximo compasso
  useEffect(() => {
    engine.config = { chords, style, bpm: s.bpm, loop: s.loop, countIn: s.countIn, fillEvery: s.fillEvery }
  }, [chords, style, s.bpm, s.loop, s.countIn, s.fillEvery])
  useEffect(() => engine.setBpm(s.bpm), [s.bpm])
  useEffect(() => engine.setMix(s.mix), [s.mix])
  useEffect(() => engine.setHumanize(s.humanize), [s.humanize])
  useEffect(() => {
    // baixa os samples já na abertura, para o play responder na hora
    void engine.load(useImproviso.getState().mix)
    engine.onPosition = (pos) => {
      useImproviso.getState().set(pos ? { pos } : { pos: null, status: 'idle' })
    }
    return () => engine.stop()
  }, [])

  async function toggle() {
    if (s.status === 'playing') {
      engine.stop()
      s.set({ status: 'idle', pos: null })
      return
    }
    s.set({ status: 'loading' })
    await engine.start(s.mix)
    engine.setMix(useImproviso.getState().mix)
    engine.setHumanize(s.humanize)
    engine.play()
    s.set({ status: 'playing' })
  }

  function chooseProg(id: string) {
    if (id === 'custom') {
      // tom da escala = fundamental do primeiro acorde digitado
      const first = typed.chords[0]
      s.set({ progId: id, ...(first ? { key: KEYS[first.root] } : {}) })
      return
    }
    const p = PROGRESSIONS.find((x) => x.id === id)!
    s.set({ progId: id, key: p.defaultKey, styleId: p.defaultStyle, scaleId: p.defaultScale })
  }

  // % : ao trocar para uma progressão mais curta no meio, o motor ainda manda o compasso antigo
  const i = Math.max(0, bar) % chords.length
  const now = chords[i]
  const next = chords[(i + 1) % chords.length]
  // próxima troca de fato: o primeiro acorde diferente do atual e quantos compassos faltam
  let ahead = 1
  while (ahead < chords.length && chords[(i + ahead) % chords.length].symbol === now.symbol) ahead++
  const change = chords[(i + ahead) % chords.length]
  const counting = s.status === 'playing' && bar < 0
  const playing = s.status === 'playing'
  // brilho no próximo acorde no último tempo antes da troca
  const showNext = playing && !counting && lastBeat && next.symbol !== now.symbol
  const target = guide[i]
  const nextTarget = guide[(i + 1) % chords.length]
  const marks = useMemo<Mark[]>(() => {
    if (!target) return []
    const m: Mark[] = [{ string: target.string, fret: target.fret, kind: 'current', label: degreeName(target.interval) }]
    if (showNext && nextTarget && (nextTarget.string !== target.string || nextTarget.fret !== target.fret)) {
      m.unshift({ string: nextTarget.string, fret: nextTarget.fret, kind: 'next' })
    }
    return m
  }, [target, nextTarget, showNext])
  const targetName = target ? now.notes[now.semitones.findIndex((x) => x % 12 === target.interval)] : ''
  const bpm = (d: number) => s.set({ bpm: Math.min(180, Math.max(50, s.bpm + d)) })
  const progName = custom ? 'Progressão digitada' : prog.name

  return (
    <div className="stage">
      <button type="button" className="summary" onClick={() => settings.current?.showModal()}>
        <span>{progName} · {s.key} · {style.name} · {scale.name}</span>
        <span className="summary-cta">Ajustes</span>
      </button>

      <section className="now-next" aria-live="polite">
        <div>
          <div className="tag">{counting ? 'Contagem' : 'Agora'}</div>
          {counting ? <CountIn /> : <div className="now-chord">{now.symbol}</div>}
        </div>
        <div className="next">
          <div className="tag">Próxima troca</div>
          <div className="next-chord">{counting ? now.symbol : change.symbol}</div>
          {!counting && change.symbol !== now.symbol && (
            <div className="next-when">{ahead === 1 ? 'no próximo compasso' : `em ${ahead} compassos`}</div>
          )}
        </div>
        <BeatDots />
      </section>

      <section className="board">
        <Fretboard
          maxFret={s.maxFret}
          scale={pcs}
          chord={now}
          next={showNext ? next : null}
          onlyChord={s.onlyChord || restriction.onlyChord}
          labels={s.labels}
          only={only}
          strings={restriction.strings}
          window={win}
          marks={marks}
        />
        {target && (
          <p className="guide-line">
            <span className="guide-dot" /> Alvo: <b>{degreeName(target.interval) === '3' || degreeName(target.interval) === 'b3' ? '3ª' : '7ª'} de {now.symbol}</b> ({targetName}). Chegue nela no tempo 1.
          </p>
        )}
        <div className="board-bar">
          <div className="segmented small" role="group" aria-label="Região do braço">
            {BOX_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={box === n}
                disabled={!!restriction.box}
                onClick={() => s.set({ focusBox: n })}
              >
                {n ? `Box ${n}` : 'Todo'}
              </button>
            ))}
          </div>
          <button type="button" className="chip" aria-pressed={s.guide} onClick={() => s.set({ guide: !s.guide })}>
            Alvos sugeridos
          </button>
          <div className="legend">
            <span><i style={{ background: 'var(--root)' }} />Fundamental</span>
            <span><i style={{ background: 'var(--accent)' }} />Acorde</span>
            <span><i className="dot" />Escala</span>
            <span><i className="ring" />Próximo</span>
          </div>
        </div>
      </section>

      <section className="transport">
        <div className="bpm-ctl">
          <button type="button" onClick={() => bpm(-5)} aria-label="Diminuir andamento">−</button>
          <span className="mono">{s.bpm}<small> bpm</small></span>
          <button type="button" onClick={() => bpm(5)} aria-label="Aumentar andamento">+</button>
        </div>
        <button
          className="play big"
          type="button"
          aria-pressed={playing}
          disabled={s.status === 'loading' || (custom && !typedOk && !playing)}
          onClick={toggle}
        >
          {s.status === 'loading' ? 'Carregando…' : playing ? 'Parar' : 'Tocar'}
        </button>
      </section>

      <div className="bars" role="list" aria-label="Compassos">
        {chords.map((c, idx) => (
          <span key={idx} role="listitem" className={idx === bar ? 'on' : ''}>{c.symbol}</span>
        ))}
      </div>

      {restriction.id !== 'nenhuma' && (
        <p className="rule-line">
          <span className="tag">Restrição</span> {restriction.text}
        </p>
      )}

      <dialog ref={settings} className="sheet" onClick={(e) => e.target === e.currentTarget && settings.current?.close()}>
        <div className="sheet-body">
          <div className="row-between">
            <h2>Ajustes</h2>
            <button type="button" className="close" onClick={() => settings.current?.close()} aria-label="Fechar">✕</button>
          </div>

          <fieldset>
            <legend>Base</legend>
            <label>
              Progressão
              <select value={s.progId} onChange={(e) => chooseProg(e.target.value)}>
                {PROGRESSIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="custom">Digitar progressão…</option>
              </select>
            </label>
            {custom && (
              <label>
                Acordes (1 por compasso; A7*4 repete 4 vezes)
                <input className="text" value={s.customText} onChange={(e) => s.set({ customText: e.target.value })} spellCheck={false} autoCapitalize="off" />
                {typed.invalid.length > 0 && <span className="error">Não reconheci: {typed.invalid.join(', ')}</span>}
                {!typedOk && <span className="error">Digite pelo menos um acorde.</span>}
              </label>
            )}
            <div className="grid-2">
              <label>
                {custom ? 'Tom da escala' : 'Tom'}
                <select value={s.key} onChange={(e) => s.set({ key: e.target.value })}>
                  {KEYS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label>
                Estilo
                <select value={s.styleId} onChange={(e) => s.set({ styleId: e.target.value })}>
                  {STYLES.map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Andamento <span className="mono">{s.bpm} bpm</span>
              <input type="range" min={50} max={180} step={1} value={s.bpm} onChange={(e) => s.set({ bpm: +e.target.value })} />
            </label>
            <div className="checks">
              <label><input type="checkbox" checked={s.countIn} onChange={(e) => s.set({ countIn: e.target.checked })} /> Contagem de entrada</label>
              <label><input type="checkbox" checked={s.loop} onChange={(e) => s.set({ loop: e.target.checked })} /> Loop</label>
              <label><input type="checkbox" checked={s.humanize} onChange={(e) => s.set({ humanize: e.target.checked })} /> Humanização</label>
            </div>
            <label>
              Virada a cada
              <select value={s.fillEvery} onChange={(e) => s.set({ fillEvery: +e.target.value as 4 | 8 })}>
                <option value={4}>4 compassos</option>
                <option value={8}>8 compassos</option>
              </select>
            </label>
          </fieldset>

          <fieldset>
            <legend>Braço</legend>
            <label>
              Escala
              <select value={s.scaleId} onChange={(e) => s.set({ scaleId: e.target.value })}>
                {SCALES.map((x) => (
                  <option key={x.id} value={x.id}>{x.name}</option>
                ))}
              </select>
            </label>
            <div className="grid-2">
              <label>
                Rótulos
                <select value={s.labels} onChange={(e) => s.set({ labels: e.target.value as LabelMode })}>
                  <option value="graus">Graus do acorde</option>
                  <option value="notas">Nomes das notas</option>
                  <option value="nenhum">Nenhum</option>
                </select>
              </label>
              <label>
                Braço todo até a casa
                <select value={s.maxFret} onChange={(e) => s.set({ maxFret: +e.target.value })}>
                  <option value={12}>12</option>
                  <option value={15}>15</option>
                  <option value={17}>17</option>
                </select>
              </label>
            </div>
            <div className="checks">
              <label><input type="checkbox" checked={s.onlyChord} onChange={(e) => s.set({ onlyChord: e.target.checked })} /> Só notas do acorde</label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Restrição</legend>
            <div className="rule-pick">
              <select aria-label="Restrição" value={s.restrictionId} onChange={(e) => s.set({ restrictionId: e.target.value })}>
                {RESTRICTIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.text}</option>
                ))}
              </select>
              <button type="button" className="chip" onClick={() => s.set({ restrictionId: drawRestriction(s.restrictionId).id })}>Sortear</button>
            </div>
          </fieldset>

          <fieldset>
            <legend>Mixer</legend>
            <Mixer mix={s.mix} onChange={s.setChannel} />
          </fieldset>
        </div>
      </dialog>
    </div>
  )
}
