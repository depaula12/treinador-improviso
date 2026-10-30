import { useEffect, useMemo, useRef, useState } from 'react'
import { engine, STYLES } from '../../audio/engine'
import { mainShapes, findShapes } from '../../core/chord-shapes'
import {
  DURATIONS, compositionSong, duplicateChord, insertChords, keyName, moveChord, newSection, playSequence,
  removeChord, replaceChord, totalBars, transposeSections, updateChord, type CompSection, type Place,
} from '../../core/compose-doc'
import { movesFor, romanIn, sectionStarts, type Move } from '../../core/compose'
import { keyLabel } from '../../core/progressions'
import { toPlayBars } from '../../core/song'
import { KEYS, parseChord } from '../../core/theory'
import { matchQuality, voicingsFor } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { togglePlay, useImproviso } from '../improviso/store'
import { useSongs } from '../musicas/store'
import { useCompose } from './store'

const SECTION_NAMES = ['Verso', 'Pré-refrão', 'Refrão', 'Ponte', 'Solo', 'Final']
/** id da composição quando ela é a base do Improviso */
const BASE_ID = 'compor'

interface Props {
  go: (area: 'improviso' | 'musicas') => void
}

/** Desenho mais simples do acorde: o do banco, senão a forma gerada mais natural. */
function easyVoicing(sym: string) {
  const c = parseChord(sym)
  if (!c) return null
  const q = matchQuality(c)
  if (q) return voicingsFor(q.id, c.root)[0] ?? null
  return mainShapes(findShapes(c))[0] ?? null
}

const durLabel = (beats: number) => DURATIONS.find((d) => d.beats === beats)?.label ?? `${beats / 4}`
const same = (a: Place | null, b: Place) => !!a && a.sec === b.sec && a.idx === b.idx
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('input, select, textarea')

/** Campo de cifra: Enter confirma; avisa quando a cifra não é reconhecida. */
function ChordField({ label, placeholder, initial = '', onSubmit }: { label: string; placeholder: string; initial?: string; onSubmit: (sym: string) => void }) {
  const [text, setText] = useState(initial)
  const [bad, setBad] = useState(false)
  useEffect(() => setText(initial), [initial])
  return (
    <form
      className="chord-field"
      onSubmit={(e) => {
        e.preventDefault()
        const sym = text.trim()
        if (!sym) return
        if (!parseChord(sym)) return setBad(true)
        onSubmit(sym)
        setText(initial)
      }}
    >
      <input
        className={`text${bad ? ' bad' : ''}`}
        value={text}
        placeholder={placeholder}
        aria-label={label}
        aria-invalid={bad}
        onChange={(e) => { setText(e.target.value); setBad(false) }}
      />
      <button type="submit" className="chip">{label}</button>
    </form>
  )
}

export function ComporPage({ go }: Props) {
  const { root, minor, sections, cur, bpm, styleId, set } = useCompose()
  const [alt, setAlt] = useState<Record<string, number>>({})
  const [playing, setPlaying] = useState<string | null>(null)
  const [sel, setSel] = useState<Place | null>(null)
  const [drop, setDrop] = useState<Place | null>(null)
  const drag = useRef<Place | null>(null)
  const key = { root, minor }
  const curSec = Math.min(cur, sections.length - 1)
  const sec = sections[curSec] ?? sections[0]
  // a seleção pode ter ficado para trás (apagou o acorde, recarregou)
  const selected = sel && sections[sel.sec]?.chords[sel.idx] ? sel : null
  const selChord = selected ? sections[selected.sec].chords[selected.idx] : null

  // as opções valem para o acorde selecionado; sem seleção, para o último da seção
  const ref: Place | null = selected ?? (sec.chords.length ? { sec: curSec, idx: sec.chords.length - 1 } : null)
  const refSym = ref ? sections[ref.sec].chords[ref.idx].symbol : null
  const refChord = refSym ? parseChord(refSym) : null
  // a seção está vazia: o "último acorde" é o fim da seção anterior (a música continua)
  const prevLast = useMemo(() => {
    for (let i = curSec - 1; i >= 0; i--) {
      const ch = sections[i].chords
      if (ch.length) return parseChord(ch[ch.length - 1].symbol)
    }
    return null
  }, [curSec, sections])
  const moves = useMemo(() => (refChord ? movesFor(key, refChord) : []), [root, minor, refSym])
  const starts = useMemo(() => sectionStarts(key, sec.name), [root, minor, sec.name])
  const all = playSequence(sections)
  const unique = [...new Set(all.map((c) => c.symbol))]
  const styleName = STYLES.find((x) => x.id === styleId)?.name ?? ''

  const put = (next: CompSection[], nextSel: Place | null = selected) => {
    set({ sections: next })
    setSel(nextSel)
  }
  /** Insere depois da referência (ou no fim da seção atual) e seleciona o último inserido. */
  function add(symbols: string[]) {
    const at: Place = ref ? { sec: ref.sec, idx: ref.idx + 1 } : { sec: curSec, idx: sec.chords.length }
    const ok = symbols.filter((s) => parseChord(s))
    if (!ok.length) return
    put(insertChords(sections, at.sec, at.idx, ok), selected ? { sec: at.sec, idx: at.idx + ok.length - 1 } : null)
  }
  function remove(p: Place) {
    const left = sections[p.sec].chords.length - 1
    put(removeChord(sections, p), left > 0 ? { sec: p.sec, idx: Math.min(p.idx, left - 1) } : null)
  }
  function move(from: Place, to: Place) {
    const r = moveChord(sections, from, to)
    set({ sections: r.sections, cur: to.sec })
    setSel(r.at)
  }

  /** Tom novo: com acordes na tela, a composição inteira vai junto (transpõe). */
  function changeKey(newRoot: number, newMinor: boolean) {
    const n = newRoot - root
    set({ root: newRoot, minor: newMinor, sections: transposeSections(sections, n, keyName(root, minor)) })
  }

  // atalhos com um acorde selecionado: ← → anda, Delete apaga, Esc solta
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const n = sections[selected.sec].chords.length
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.shiftKey) {
          const to = e.key === 'ArrowLeft' ? selected.idx - 1 : selected.idx + 2
          if (to >= 0 && to <= n) move(selected, { sec: selected.sec, idx: to })
        } else {
          setSel({ sec: selected.sec, idx: Math.max(0, Math.min(n - 1, selected.idx + (e.key === 'ArrowLeft' ? -1 : 1))) })
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        remove(selected)
      } else if (e.key === 'Escape') {
        setSel(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  async function listen(id: string, items: { symbol: string; beats?: number }[]) {
    const cs = items.flatMap((x) => {
      const chord = parseChord(x.symbol)
      // ½ compasso = 0,6 s, 1 compasso = 1,2 s: a prévia mantém a proporção sem demorar
      return chord ? [{ chord, sec: x.beats ? x.beats * 0.3 : 1.1 }] : []
    })
    if (!cs.length) return
    setPlaying(id)
    const dur = await engine.previewChords(cs, useImproviso.getState().mix)
    window.setTimeout(() => setPlaying((p) => (p === id ? null : p)), dur * 1000)
  }

  const baseBars = useMemo(() => toPlayBars(all.map((c) => ({ chord: c.symbol, beats: c.beats }))), [all.map((c) => `${c.symbol}:${c.beats}`).join()])
  /** A composição vira a base do Improviso (com durações, andamento, estilo e escala do tom). */
  function loadIntoBase() {
    if (!all.length) return false
    useImproviso.getState().set({
      progId: 'song',
      song: { id: BASE_ID, title: 'Sua composição', bars: baseBars },
      key: KEYS[root],
      keyMinor: minor,
      scaleId: minor ? 'pentMin' : 'pentMaj',
      bpm,
      styleId,
    })
    return true
  }
  // já é a base: mexer aqui muda o que está tocando (entra no próximo compasso)
  useEffect(() => {
    const imp = useImproviso.getState()
    if (imp.progId !== 'song' || imp.song?.id !== BASE_ID || !all.length) return
    imp.set({ song: { id: BASE_ID, title: 'Sua composição', bars: baseBars }, bpm, styleId, key: KEYS[root], keyMinor: minor })
  }, [baseBars, bpm, styleId, root, minor])
  const isBase = useImproviso((s) => s.progId === 'song' && s.song?.id === BASE_ID)
  const basePlaying = useImproviso((s) => s.status !== 'idle') && isBase

  async function saveAsSong() {
    if (!all.length) return
    const title = prompt('Nome da música:', 'Minha composição')
    if (!title?.trim()) return
    const song = compositionSong({ title: title.trim(), key: keyName(root, minor), bpm, styleId, sections })
    await useSongs.getState().save(song)
    useSongs.getState().open(song.id)
    go('musicas')
  }

  const pickAlt = (m: Move) => m.options[(alt[m.id] ?? 0) % m.options.length]

  return (
    <div className="page">
      <div className="page-head">
        <h1>Compor</h1>
        <div className="row">
          <label className="inline-label">
            Tom
            <select
              value={`${root}${minor ? 'm' : ''}`}
              title={all.length ? 'Trocar o tom transpõe a composição inteira' : undefined}
              onChange={(e) => changeKey(parseInt(e.target.value, 10), e.target.value.endsWith('m'))}
            >
              <optgroup label="Maiores">
                {KEYS.map((k, i) => <option key={k} value={`${i}`}>{keyLabel(k, false)}</option>)}
              </optgroup>
              <optgroup label="Menores">
                {KEYS.map((k, i) => <option key={`${k}m`} value={`${i}m`}>{keyLabel(k, true)}</option>)}
              </optgroup>
            </select>
          </label>
          <label className="inline-label">
            BPM
            <input
              type="number"
              className="text bpm-input"
              min={40}
              max={220}
              value={bpm}
              onChange={(e) => set({ bpm: Math.max(40, Math.min(220, +e.target.value || 90)) })}
            />
          </label>
          <label className="inline-label">
            Levada
            <select value={styleId} onChange={(e) => set({ styleId: e.target.value })}>
              {STYLES.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="link"
            onClick={() => {
              if (!confirm('Começar uma composição nova? A atual será apagada.')) return
              set({ sections: [newSection('Verso')], cur: 0 })
              setSel(null)
            }}
          >
            começar de novo
          </button>
        </div>
      </div>

      <div className="compose">
        <div className="stack">
          <section className="card stack-sm" aria-label="Sua progressão">
            <div className="row-between">
              <span className="tag" style={{ margin: 0 }}>
                Sua progressão · {keyLabel(KEYS[root], minor)}{all.length ? ` · ${totalBars(sections)} compassos` : ''}
              </span>
              <div className="row">
                <button type="button" className="btn" disabled={!all.length} onClick={() => listen('tudo', all)}>{playing === 'tudo' ? 'Tocando…' : '▶ Ouvir tudo'}</button>
                <button
                  type="button"
                  className="play"
                  disabled={!all.length}
                  onClick={() => {
                    if (basePlaying) return void togglePlay()
                    if (loadIntoBase() && useImproviso.getState().status === 'idle') void togglePlay()
                  }}
                >
                  {basePlaying ? 'Parar a base' : 'Tocar com a base'}
                </button>
              </div>
            </div>
            {basePlaying && <p className="hint muted">Tocando em loop ({styleName}, {bpm} bpm). O que você mudar entra no próximo compasso.</p>}

            {sections.map((s, i) => (
              <div
                key={s.id}
                className={`compose-sec${i === curSec ? ' cur' : ''}`}
                onClick={() => { set({ cur: i }); setSel(null) }}
                onDragOver={(e) => { if (drag.current) { e.preventDefault(); setDrop({ sec: i, idx: s.chords.length }) } }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (drag.current) move(drag.current, drop ?? { sec: i, idx: s.chords.length })
                  drag.current = null
                  setDrop(null)
                }}
              >
                <div className="row-between">
                  <input
                    className="sec-title"
                    value={s.name}
                    aria-label="Nome da seção"
                    onChange={(e) => set({ sections: sections.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })}
                    onFocus={() => set({ cur: i })}
                  />
                  <div className="row" onClick={(e) => e.stopPropagation()}>
                    {s.chords.length > 0 && <button type="button" className="link" onClick={() => listen(`sec${i}`, s.chords)}>{playing === `sec${i}` ? 'tocando…' : 'ouvir'}</button>}
                    {s.chords.length > 0 && (
                      <button
                        type="button"
                        className="link"
                        title="Repete a seção logo abaixo"
                        onClick={() => set({ sections: [...sections.slice(0, i + 1), newSection(s.name, s.chords.map((c) => ({ ...c, id: `${c.id}-c${Date.now()}` }))), ...sections.slice(i + 1)], cur: i + 1 })}
                      >
                        repetir
                      </button>
                    )}
                    {sections.length > 1 && (
                      <button type="button" className="link" onClick={() => { set({ sections: sections.filter((_, k) => k !== i), cur: Math.max(0, Math.min(cur, sections.length - 2)) }); setSel(null) }}>apagar seção</button>
                    )}
                  </div>
                </div>
                {s.chords.length ? (
                  <div className="cells comp-cells">
                    {s.chords.map((c, k) => {
                      const p = { sec: i, idx: k }
                      return (
                        <button
                          key={c.id}
                          type="button"
                          draggable
                          className={`cell comp-cell${same(drop, p) ? ' drop-before' : ''}${c.symbol.length > 6 - (c.beats < 4 ? 2 : 0) ? ' long' : ''}`}
                          style={{ gridColumn: `span ${Math.max(1, Math.round(c.beats / 2))}` }}
                          aria-pressed={same(selected, p)}
                          aria-label={`${c.symbol}, ${durLabel(c.beats)} compasso`}
                          onClick={(e) => {
                            e.stopPropagation()
                            set({ cur: i })
                            setSel(same(selected, p) ? null : p)
                          }}
                          onDragStart={(e) => {
                            drag.current = p
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', c.symbol)
                          }}
                          onDragEnd={() => { drag.current = null; setDrop(null) }}
                          onDragOver={(e) => {
                            if (!drag.current) return
                            e.preventDefault()
                            e.stopPropagation()
                            // metade direita da célula: solta depois dela
                            const r = e.currentTarget.getBoundingClientRect()
                            setDrop({ sec: i, idx: e.clientX > r.left + r.width / 2 ? k + 1 : k })
                          }}
                        >
                          <span>
                            {c.symbol}
                            <small className="beats">{romanIn(key, c.symbol)}{c.beats !== 4 ? ` · ${durLabel(c.beats)}` : ''}</small>
                          </span>
                        </button>
                      )
                    })}
                    {drop && drag.current && drop.sec === i && drop.idx === s.chords.length && <span className="drop-end" aria-hidden />}
                  </div>
                ) : (
                  <p className="muted hint">{i === curSec ? 'Escolha por onde começar ao lado ou digite um acorde.' : 'Vazia. Clique para escolher esta seção.'}</p>
                )}

                {selected && selChord && selected.sec === i && (
                  <div className="bar-tools comp-tools" onClick={(e) => e.stopPropagation()}>
                    <b className="comp-sel">{selChord.symbol}</b>
                    <div className="segmented" role="group" aria-label="Duração">
                      {DURATIONS.map((d) => (
                        <button key={d.beats} type="button" aria-pressed={selChord.beats === d.beats} title={`${d.label} compasso`} onClick={() => put(updateChord(sections, selected, { beats: d.beats }))}>
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <span className="muted hint">compasso</span>
                    <div className="row">
                      <button type="button" className="chip" disabled={selected.idx === 0} title="Mover para a esquerda (Shift+←)" onClick={() => move(selected, { sec: i, idx: selected.idx - 1 })}>◀</button>
                      <button type="button" className="chip" disabled={selected.idx === s.chords.length - 1} title="Mover para a direita (Shift+→)" onClick={() => move(selected, { sec: i, idx: selected.idx + 2 })}>▶</button>
                      <button type="button" className="chip" onClick={() => put(duplicateChord(sections, selected), { sec: i, idx: selected.idx + 1 })}>duplicar</button>
                      <button type="button" className="chip" onClick={() => listen('sel', [{ symbol: selChord.symbol }])}>ouvir</button>
                      <button type="button" className="chip danger" title="Apagar (Delete)" onClick={() => remove(selected)}>apagar</button>
                    </div>
                    <ChordField key={selChord.id} label="trocar" placeholder="outra cifra" initial={selChord.symbol} onSubmit={(sym) => put(replaceChord(sections, selected, sym))} />
                  </div>
                )}

                {i === curSec && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <ChordField
                      label={selected && selected.sec === i ? `+ depois de ${selChord!.symbol}` : '+ acorde'}
                      placeholder="digite: F#m7, Bb7M(9)…"
                      onSubmit={(sym) => add([sym])}
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="row">
              <span className="tag" style={{ margin: 0 }}>Nova seção</span>
              {SECTION_NAMES.map((n) => (
                <button key={n} type="button" className="chip" onClick={() => { set({ sections: [...sections, newSection(n)], cur: sections.length }); setSel(null) }}>+ {n}</button>
              ))}
            </div>
            <p className="hint muted">Clique num acorde para mudar a duração, trocar, mover ou apagar; arraste para reordenar.</p>
          </section>

          {unique.length > 0 && (
            <section className="card stack-sm" aria-label="Desenhos dos acordes">
              <span className="tag" style={{ margin: 0 }}>Como tocar os acordes</span>
              <div className="diagrams">
                {unique.map((c) => {
                  const v = easyVoicing(c)
                  return v ? <ChordDiagram key={c} voicing={{ ...v, symbol: c }} labels="graus" caption={romanIn(key, c)} /> : null
                })}
              </div>
            </section>
          )}

          <section className="card row-between">
            <span className="muted hint">Gostou? Leve a progressão para treinar e para a banda.</span>
            <div className="row">
              <button type="button" className="btn" disabled={!all.length} onClick={() => { if (loadIntoBase()) go('improviso') }}>Improvisar sobre ela</button>
              <button type="button" className="btn" disabled={!all.length} onClick={saveAsSong}>Salvar como música</button>
            </div>
          </section>
        </div>

        <aside className="stack" aria-label="E agora?">
          <div className="card stack-sm">
            <div>
              <h2 style={{ fontSize: '1.3rem' }}>{refSym ? 'E agora?' : `Como começar ${sec.name.toLowerCase()}?`}</h2>
              <p className="muted hint">
                {refSym
                  ? <>Depois de <b className="mono">{refSym}</b> ({romanIn(key, refSym)}){selected ? ' (o selecionado)' : ''}, escolha o efeito que você quer. Ouça antes de usar.</>
                  : prevLast ? <>A seção anterior terminou em <b className="mono">{prevLast.symbol}</b>.</> : 'Escolha o primeiro acorde.'}
              </p>
            </div>
            {!refSym && (
              <div className="moves">
                {starts.map((st) => (
                  <div key={st.label} className="move">
                    <b className="move-label">{st.label}</b>
                    <span className="move-chords">{st.chords.join(' → ')}<small className="mono"> {st.romans}</small></span>
                    <span className="move-why">{st.why}</span>
                    <div className="row">
                      <button type="button" className="chip" onClick={() => listen(st.label, (prevLast ? [prevLast.symbol, ...st.chords] : st.chords).map((symbol) => ({ symbol })))}>{playing === st.label ? 'tocando…' : '▶ ouvir'}</button>
                      <button type="button" className="chip" aria-pressed onClick={() => add(st.chords)}>+ usar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {refSym && (
              <div className="moves">
                {moves.map((m) => {
                  const o = pickAlt(m)
                  const id = `${m.id}:${o.chords.join()}`
                  return (
                    <div key={m.id} className={`move mood-${m.id}`}>
                      <b className="move-label">{m.label}</b>
                      <span className="move-feel">{m.feel}</span>
                      <span className="move-chords">{o.chords.join(' → ')}<small className="mono"> {o.romans}</small></span>
                      <span className="move-why">{o.why}</span>
                      <div className="row">
                        <button type="button" className="chip" onClick={() => listen(id, [refSym, ...o.chords].map((symbol) => ({ symbol })))}>{playing === id ? 'tocando…' : '▶ ouvir'}</button>
                        <button type="button" className="chip" aria-pressed onClick={() => add(o.chords)}>+ usar</button>
                        {m.options.length > 1 && (
                          <button type="button" className="link" onClick={() => setAlt({ ...alt, [m.id]: (alt[m.id] ?? 0) + 1 })}>outra opção</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="muted hint">São tendências da música pop, rock e blues, não regras: confie no seu ouvido.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}
