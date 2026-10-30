import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addScore, EMPTY_SCORE, played, scoreDownbeat, type DownbeatResult, type HeardNote, type Score } from '../../core/feedback'
import { ListenChip, useGuitarInput } from '../../ui/InputPanel'
import { useShallow } from 'zustand/react/shallow'
import { engine, STYLES } from '../../audio/engine'
import { degreeName } from '../../core/fretboard-model'
import { guideLine } from '../../core/guide'
import { keyLabel, keyShort, parseProgression, progressionFor, PROGRESSIONS, realize } from '../../core/progressions'
import { AUTO_SCALE, boxPositions, boxRange, chordScale, SCALES, scalePcs } from '../../core/scales'
import { KEYS, parseChord, type ChordInfo } from '../../core/theory'
import { Fretboard, type LabelMode, type Mark } from '../../ui/Fretboard'
import { drawRestriction, RESTRICTIONS } from './restrictions'
import { useImproviso } from './store'

interface Change {
  beat: number
  chord: ChordInfo
}

const BOX_OPTIONS = [1, 2, 3, 4, 5, 0]
// largura de um compasso na faixa da progressão (cartão + espaço) e onde fica a linha "agora"
const BAR_W = 122
const HIT_X = 96

// ---------- pedaços que acompanham o tempo: só eles re-renderizam a cada batida ----------

function Beats() {
  const beat = useImproviso((st) => st.pos?.beat ?? -1)
  const bar = useImproviso((st) => st.pos?.bar ?? -1)
  return (
    <div className="beats" aria-hidden>
      {[0, 1, 2, 3].map((b) => (
        <span key={b} className={bar < 0 && beat < 0 ? '' : b === beat ? 'on' : b < beat ? 'past' : ''} />
      ))}
    </div>
  )
}

function CountIn() {
  const beat = useImproviso((st) => st.pos?.beat)
  return <div className="now-chord count">{beat === undefined ? '…' : beat + 1}</div>
}

/** Faixa da progressão andando até a linha "agora" (estilo Yousician), um cartão por compasso. */
function Lane({ labels, playing }: { labels: { name: string; sub: string }[]; playing: boolean }) {
  const pos = useImproviso((st) => st.pos)
  const bpm = useImproviso((st) => st.bpm)
  const track = useRef<HTMLDivElement>(null)
  const prev = useRef(-1)
  const n = labels.length
  // posição em tempos dentro da volta; na contagem e parado, fica no compasso 1
  const p = playing && pos && pos.bar >= 0 ? (pos.bar % n) * 4 + pos.beat : 0
  const cur = playing && pos && pos.bar >= 0 ? pos.bar % n : 0

  useLayoutEffect(() => {
    const el = track.current
    if (!el) return
    // três cópias da progressão: a do meio passa pela linha; antes e depois ficam à vista
    const x = (beats: number) => `translateX(${HIT_X - (n + beats / 4) * BAR_W}px)`
    const moving = playing && pos && pos.bar >= 0
    if (!moving || p < prev.current) {
      // parado ou deu a volta: pula sem animar (as cópias são iguais, ninguém percebe)
      el.style.transition = 'none'
      el.style.transform = x(p)
      void el.offsetWidth
    }
    if (moving) {
      // anda até o próximo tempo durante este tempo: movimento contínuo
      el.style.transition = `transform ${60 / bpm}s linear`
      el.style.transform = x(p + 1)
    }
    prev.current = p
  }, [p, playing, pos, bpm, n])

  const all = [...labels, ...labels, ...labels]
  return (
    <div className="lane">
      <div className="lane-track" ref={track}>
        {all.map((l, i) => (
          <div key={i} className={`lane-bar${i % n === cur ? ' cur' : ''}`}>
            <b>{l.name}</b>
            <small>{l.sub}</small>
          </div>
        ))}
      </div>
      <div className="lane-hit" aria-hidden />
    </div>
  )
}

/** Quanto falta para a troca: texto e barrinha que enche a cada tempo. */
function NextWhen({ ahead, midBar }: { ahead: number; midBar: Change | null }) {
  const beat = Math.max(0, useImproviso((st) => st.pos?.beat ?? 0))
  const playing = useImproviso((st) => st.status === 'playing' && (st.pos?.bar ?? -1) >= 0)
  const total = midBar ? midBar.beat : ahead * 4
  const done = playing ? (midBar ? beat : beat + 1) : 0
  const text = midBar
    ? `no tempo ${midBar.beat + 1}`
    : ahead === 1
      ? beat === 3 && playing ? 'no próximo tempo' : 'no próximo compasso'
      : `em ${ahead} compassos`
  return (
    <>
      <span className="next-when">{text}</span>
      <div className="next-meter" aria-hidden><i style={{ width: `${Math.min(100, Math.max(4, (done / total) * 100))}%` }} /></div>
    </>
  )
}

export function ImprovisoPage() {
  // tudo menos a posição; a página inteira só re-renderiza na troca de compasso
  const s = useImproviso(useShallow(({ pos: _pos, ...rest }) => rest))
  const bar = useImproviso((st) => st.pos?.bar ?? -1)
  const lastBeat = useImproviso((st) => st.pos?.beat === 3)

  const custom = s.progId === 'custom'
  const songMode = s.progId === 'song' && !!s.song
  // só a música (troca no meio do compasso) precisa re-renderizar a cada tempo
  const songBeat = useImproviso((st) => (songMode ? Math.max(0, st.pos?.beat ?? 0) : 0))
  const prog = PROGRESSIONS.find((p) => p.id === s.progId) ?? PROGRESSIONS[0]
  const style = STYLES.find((x) => x.id === s.styleId) ?? STYLES[0]
  // "acompanha o acorde": os desenhos (boxes) seguem a pentatônica do tom; as notas mostradas são
  // as do modo de cada acorde (calculado mais abaixo, quando o acorde da vez é conhecido)
  const autoScale = s.scaleId === AUTO_SCALE
  const boxPent = s.keyMinor || s.progId.startsWith('blues') ? 'pentMin' : 'pentMaj'
  const scale = SCALES.find((x) => x.id === (autoScale ? boxPent : s.scaleId)) ?? SCALES[0]
  const restriction = RESTRICTIONS.find((r) => r.id === s.restrictionId) ?? RESTRICTIONS[0]
  const typed = useMemo(() => parseProgression(s.customText), [s.customText])
  const typedOk = typed.chords.length > 0
  // música: o acorde do tempo 1 de cada compasso + as trocas no meio dele
  const songBars = useMemo(() => {
    if (!songMode) return null
    const bars = s.song!.bars
      .map((b) => b.flatMap((g) => {
        const chord = parseChord(g.chord)
        return chord ? [{ beat: g.beat, chord }] : []
      }))
      .filter((b) => b.length && b[0].beat === 0)
    return bars.length ? bars : null
  }, [songMode, s.song])
  // digitada vazia: mantém a de 12 compassos no braço, mas o play fica desabilitado
  const chords = useMemo(
    () => (songBars ? songBars.map((b) => b[0].chord) : custom && typedOk ? typed.chords : realize(prog, s.key)),
    [songBars, custom, typedOk, typed, prog, s.key],
  )
  const changes = useMemo(() => songBars?.map((b) => b.slice(1)), [songBars])
  const keyPc = KEYS.indexOf(s.key)
  const pcs = useMemo(() => scalePcs(scale, keyPc), [scale, keyPc])

  // a restrição "só box N" manda no foco; senão vale o desenho escolhido. O braço é sempre inteiro:
  // a box fica destacada e só as notas dela aparecem.
  const box = restriction.box ?? s.focusBox
  const range = useMemo<[number, number] | null>(() => (box ? boxRange(scale, keyPc, box) : null), [box, scale, keyPc])
  const only = useMemo(() => (box ? boxPositions(scale, keyPc, box) : null), [box, scale, keyPc])
  // notas-guia: um alvo por compasso dentro da região visível, em linha suave
  const guide = useMemo(
    () => (s.guide ? guideLine(chords, range ? range[0] : 0, range ? range[1] : Math.min(12, s.maxFret)) : []),
    [s.guide, chords, range, s.maxFret],
  )

  // ---------- placar de notas-alvo: o app ouve a guitarra e confere o tempo 1 de cada compasso ----------
  const heard = useRef<HeardNote[]>([])
  const io = useGuitarInput((f) => {
    if (!f?.note) return
    const t = performance.now() / 1000
    heard.current.push({ midi: f.note.midi, t })
    // só os últimos 3 s interessam
    while (heard.current.length && heard.current[0].t < t - 3) heard.current.shift()
  })
  const [score, setScore] = useState<Score>(EMPTY_SCORE)
  const [lastHit, setLastHit] = useState<DownbeatResult | null>(null)
  const playingNow = s.status === 'playing'
  useEffect(() => {
    if (!io.active || !playingNow || bar < 0 || !s.guide) return
    // esta posição chega na hora em que o tempo 1 sai na caixa de som
    const downbeat = performance.now() / 1000
    const idx = bar % chords.length
    const tg = guide[idx]
    const ch = chords[idx]
    const chordPcs = ch.semitones.map((x) => (ch.root + x) % 12)
    const id = window.setTimeout(() => {
      const r = scoreDownbeat(heard.current, downbeat, tg ? tg.midi % 12 : null, chordPcs)
      setScore((sc) => addScore(sc, r))
      setLastHit(r)
    }, 360)
    return () => window.clearTimeout(id)
  }, [bar, io.active, playingNow])

  // configuração lida pelo motor a cada compasso: mudanças entram no próximo compasso
  useEffect(() => {
    engine.config = { chords, changes, style, bpm: s.bpm, loop: s.loop, countIn: s.countIn, fillEvery: s.fillEvery }
  }, [chords, changes, style, s.bpm, s.loop, s.countIn, s.fillEvery])
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

  function chooseProg(id: string) {
    if (id === 'custom') {
      // tom da escala = fundamental do primeiro acorde digitado (menor se ele for menor)
      const first = typed.chords[0]
      s.set({ progId: id, ...(first ? { key: KEYS[first.root], keyMinor: first.minor } : {}) })
      return
    }
    if (id === 'song') {
      s.set({ progId: id })
      return
    }
    const p = PROGRESSIONS.find((x) => x.id === id)!
    s.set({ progId: id, key: p.defaultKey, keyMinor: !!p.minor, styleId: p.defaultStyle, scaleId: p.defaultScale })
  }

  /**
   * Tom maior ou menor. Numa progressão pronta, troca a base para a versão do outro modo
   * (Blues de 12 ↔ Blues menor); a escala do braço acompanha quando não combina mais.
   */
  function chooseKey(key: string, minor: boolean) {
    const patch: Parameters<typeof s.set>[0] = { key, keyMinor: minor }
    if (!custom && !songMode) {
      const p = progressionFor(s.progId, minor)
      if (p.id !== s.progId) patch.progId = p.id
    }
    if (minor && (s.scaleId === 'pentMaj' || s.scaleId === 'major')) patch.scaleId = 'pentMin'
    if (!minor && s.scaleId === 'minor') patch.scaleId = 'pentMaj'
    s.set(patch)
  }

  // % : ao trocar para uma progressão mais curta no meio, o motor ainda manda o compasso antigo
  const i = Math.max(0, bar) % chords.length
  // troca dentro do compasso (música): o acorde vigente no tempo atual e a próxima troca dele
  const inBar = changes?.[i] ?? []
  const passed = inBar.filter((c) => c.beat <= songBeat)
  const coming = inBar.find((c) => c.beat > songBeat) ?? null
  const now = passed.length ? passed[passed.length - 1].chord : chords[i]
  const next = coming ? coming.chord : chords[(i + 1) % chords.length]
  // próxima troca de fato: o primeiro acorde diferente do atual e quantos compassos faltam
  let ahead = 1
  while (ahead < chords.length && chords[(i + ahead) % chords.length].symbol === now.symbol) ahead++
  const change = next.symbol !== now.symbol ? next : chords[(i + ahead) % chords.length]
  if (next.symbol !== now.symbol) ahead = 1
  const playing = s.status === 'playing'
  const counting = playing && bar < 0
  // brilho no próximo acorde no último tempo antes da troca
  const showNext = playing && !counting && (coming ? coming.beat - songBeat === 1 : lastBeat) && next.symbol !== now.symbol
  // o alvo é do acorde do tempo 1; depois de uma troca no meio do compasso ele não vale mais
  const target = passed.length ? undefined : guide[i]
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
  const progName = songMode ? s.song!.title : custom ? 'Progressão digitada' : prog.name

  const laneLabels = useMemo(
    () => chords.map((c, idx) => ({
      name: [c.symbol, ...(changes?.[idx] ?? []).map((g) => g.chord.symbol)].join(' '),
      sub: `compasso ${idx + 1}`,
    })),
    [chords, changes],
  )
  const midBarChange = coming && coming.chord.symbol !== now.symbol ? coming : null
  // escala mostrada: a escolhida, ou o modo do acorde da vez ("acompanha o acorde")
  const shownScale = autoScale ? chordScale(now, { root: keyPc, minor: s.keyMinor }) : scale
  const shownPcs = useMemo(() => (autoScale ? scalePcs(shownScale, now.root) : pcs), [autoScale, shownScale, now.root, pcs])
  const shownOnly = useMemo(() => {
    if (!autoScale || !box) return only
    // as notas do modo do acorde, dentro do mesmo desenho (box) da pentatônica do tom
    const rel = shownPcs.map((p) => (p - keyPc + 12) % 12)
    return boxPositions({ id: 'acorde', name: '', semitones: rel, pent: scale.pent }, keyPc, box)
  }, [autoScale, box, only, shownPcs, keyPc, scale.pent])
  const scaleLabel = autoScale ? `${shownScale.name.split(' (')[0]} de ${now.tonic} (acompanha o acorde)` : `${scale.name} de ${s.key}`
  // o player (em qualquer área) mostra o acorde da vez
  useEffect(() => {
    if (useImproviso.getState().now !== now.symbol) useImproviso.getState().set({ now: now.symbol })
  }, [now.symbol])

  return (
    <div className="page">
      <section className="stage" aria-live="polite">
        <div className="card now-card">
          <span className="tag">{counting ? 'Contagem' : 'Agora'}</span>
          {counting ? <CountIn /> : <div className="now-chord">{now.symbol}</div>}
          <span className="muted mono">compasso {i + 1} de {chords.length}</span>
          <Beats />
        </div>
        <div className="card lane-card">
          <div className="lane-head">
            <span className="tag">{progName}</span>
            <span className="tag">{keyShort(s.key, s.keyMinor)} · {style.name}</span>
          </div>
          <Lane labels={laneLabels} playing={playing} />
        </div>
        <div className="card next-card">
          <span className="tag">Próxima troca</span>
          <div className="next-chord">{counting ? now.symbol : change.symbol}</div>
          {!counting && change.symbol !== now.symbol ? <NextWhen ahead={ahead} midBar={midBarChange} /> : <span className="next-when">mesmo acorde</span>}
        </div>
      </section>

      <section className="neck-band">
        <div className="neck-tools">
          <div className="segmented" role="group" aria-label="Região do braço">
            {BOX_OPTIONS.map((n) => (
              <button key={n} type="button" aria-pressed={box === n} disabled={!!restriction.box} onClick={() => s.set({ focusBox: n })}>
                {n ? `Box ${n}` : 'Todo'}
              </button>
            ))}
          </div>
          <button type="button" className="chip" aria-pressed={s.guide} onClick={() => s.set({ guide: !s.guide })}>Alvos sugeridos</button>
          <button type="button" className="chip" aria-pressed={s.onlyChord || !!restriction.onlyChord} disabled={!!restriction.onlyChord} onClick={() => s.set({ onlyChord: !s.onlyChord })}>
            Só notas do acorde
          </button>
          <div className="segmented hide-phone" role="group" aria-label="Rótulos">
            {(['graus', 'notas', 'nenhum'] as LabelMode[]).map((l) => (
              <button key={l} type="button" aria-pressed={s.labels === l} onClick={() => s.set({ labels: l })}>
                {l === 'graus' ? 'Graus' : l === 'notas' ? 'Notas' : 'Nenhum'}
              </button>
            ))}
          </div>
          <ListenChip io={io} label="Placar: ouvir minha guitarra" />
          <span className="muted mono hide-phone" style={{ marginLeft: 'auto', fontSize: 13 }}>{scaleLabel} · tom {keyShort(s.key, s.keyMinor)}</span>
        </div>
        <Fretboard
          maxFret={s.maxFret}
          scale={shownPcs}
          chord={now}
          next={showNext ? next : null}
          onlyChord={s.onlyChord || restriction.onlyChord}
          labels={s.labels}
          only={shownOnly}
          strings={restriction.strings}
          band={range}
          marks={marks}
        />
        <div className="neck-cap">
          {target ? (
            <span>
              <span className="guide-dot" />Alvo: <b>{degreeName(target.interval) === '3' || degreeName(target.interval) === 'b3' ? '3ª' : '7ª'} de {now.symbol}</b> ({targetName}). Chegue nela no tempo 1.
            </span>
          ) : (
            <span className="muted">{s.guide ? 'Sem alvo neste trecho.' : 'Alvos sugeridos desligados.'}</span>
          )}
          <div className="legend">
            <span><i style={{ background: 'var(--root)' }} />Fundamental</span>
            <span><i style={{ background: 'var(--accent)' }} />Acorde</span>
            <span><i className="dot" />Escala</span>
            <span><i className="tgt" />Alvo</span>
            <span><i className="ring" />Próximo</span>
          </div>
        </div>
        {io.active && (
          <div className="neck-cap" aria-live="polite">
            {!s.guide ? (
              <span className="muted">Ligue os alvos sugeridos para contar o placar.</span>
            ) : played(score) + score.silencio === 0 ? (
              <span className="muted">{playingNow ? 'Pouse na nota-alvo no tempo 1 de cada compasso.' : 'Toque a base: o placar confere o tempo 1 de cada compasso.'}</span>
            ) : (
              <span className="score">
                Placar:
                <span className="alvo"><b>{score.alvo}</b> no alvo</span>
                <span><b>{score.acorde}</b> em outra nota do acorde</span>
                <span className="fora"><b>{score.fora}</b> fora</span>
                <span className="muted">({played(score)} compassos tocados{score.silencio ? `, ${score.silencio} em silêncio` : ''})</span>
                {lastHit && lastHit !== 'silencio' && <span className={`last-hit ${lastHit}`}>{lastHit === 'alvo' ? 'no alvo!' : lastHit === 'acorde' ? 'nota do acorde' : 'fora'}</span>}
              </span>
            )}
            <button type="button" className="link" onClick={() => { setScore(EMPTY_SCORE); setLastHit(null) }}>zerar placar</button>
          </div>
        )}
      </section>

      <div className="imp-bottom">
        <section className="card stack-sm" aria-label="Base">
          <span className="tag">Base</span>
          <div className="base-grid">
            <label className="wide">
              Progressão
              <select value={s.progId} onChange={(e) => chooseProg(e.target.value)}>
                {PROGRESSIONS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="custom">Digitar progressão…</option>
                {s.song && <option value="song">Música: {s.song.title}</option>}
              </select>
            </label>
            <label>
              {custom || songMode ? 'Tom da escala' : 'Tom'}
              <select
                value={`${s.key}${s.keyMinor ? 'm' : ''}`}
                onChange={(e) => {
                  const minor = e.target.value.endsWith('m')
                  chooseKey(minor ? e.target.value.slice(0, -1) : e.target.value, minor)
                }}
              >
                <optgroup label="Maiores">
                  {KEYS.map((k) => (
                    <option key={k} value={k}>{keyLabel(k, false)}</option>
                  ))}
                </optgroup>
                <optgroup label="Menores">
                  {KEYS.map((k) => (
                    <option key={`${k}m`} value={`${k}m`}>{keyLabel(k, true)}</option>
                  ))}
                </optgroup>
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
            {custom && (
              <label className="full">
                Acordes (1 por compasso; A7*4 repete 4 vezes)
                <input className="text" value={s.customText} onChange={(e) => s.set({ customText: e.target.value })} spellCheck={false} autoCapitalize="off" />
                {typed.invalid.length > 0 && <span className="error">Não reconheci: {typed.invalid.join(', ')}</span>}
                {!typedOk && <span className="error">Digite pelo menos um acorde.</span>}
              </label>
            )}
            <label className="wide">
              Escala no braço
              <select value={s.scaleId} onChange={(e) => s.set({ scaleId: e.target.value })}>
                <option value={AUTO_SCALE}>Acompanha o acorde (mixolídio no 7, dórico no m7…)</option>
                <optgroup label="Escalas">
                  {SCALES.filter((x) => !x.id.startsWith('arp')).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Arpejos">
                  {SCALES.filter((x) => x.id.startsWith('arp')).map((x) => (
                    <option key={x.id} value={x.id}>{x.name}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label>
              Virada a cada
              <select value={s.fillEvery} onChange={(e) => s.set({ fillEvery: +e.target.value as 4 | 8 })}>
                <option value={4}>4 compassos</option>
                <option value={8}>8 compassos</option>
              </select>
            </label>
            <label>
              Braço até a casa
              <select value={s.maxFret} onChange={(e) => s.set({ maxFret: +e.target.value })}>
                <option value={12}>12</option>
                <option value={15}>15</option>
                <option value={17}>17</option>
              </select>
            </label>
            <label className="full">
              Andamento <span className="mono" style={{ textTransform: 'none' }}>{s.bpm} bpm</span>
              <input type="range" min={50} max={180} step={1} value={s.bpm} onChange={(e) => s.set({ bpm: +e.target.value })} />
            </label>
          </div>
          <div className="checks">
            <label><input type="checkbox" checked={s.countIn} onChange={(e) => s.set({ countIn: e.target.checked })} /> Contagem de entrada</label>
            <label><input type="checkbox" checked={s.loop} onChange={(e) => s.set({ loop: e.target.checked })} /> Loop</label>
            <label><input type="checkbox" checked={s.humanize} onChange={(e) => s.set({ humanize: e.target.checked })} /> Humanização</label>
          </div>
        </section>

        <section className="card stack-sm" aria-label="Restrição e compassos">
          <div className="row-between">
            <span className="tag">Restrição</span>
            <button type="button" className="chip" onClick={() => s.set({ restrictionId: drawRestriction(s.restrictionId).id })}>Sortear</button>
          </div>
          <select aria-label="Restrição" value={s.restrictionId} onChange={(e) => s.set({ restrictionId: e.target.value })}>
            {RESTRICTIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.text}</option>
            ))}
          </select>
          {restriction.id !== 'nenhuma' && <p className="rule">{restriction.text}</p>}
          <span className="tag">Compassos</span>
          <div className="bars-grid" role="list" aria-label="Compassos">
            {chords.map((c, idx) => (
              <span key={idx} role="listitem" className={playing && idx === bar % chords.length ? 'on' : ''}>
                {c.symbol}{changes?.[idx]?.map((g) => ` ${g.chord.symbol}`).join('')}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
