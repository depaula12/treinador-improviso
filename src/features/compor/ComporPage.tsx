import { useMemo, useState } from 'react'
import { engine } from '../../audio/engine'
import { mainShapes, findShapes } from '../../core/chord-shapes'
import { movesFor, romanIn, sectionStarts, type Move } from '../../core/compose'
import { keyLabel, keyShort } from '../../core/progressions'
import { songFromCifra } from '../../core/song'
import { KEYS, parseChord } from '../../core/theory'
import { matchQuality, voicingsFor } from '../../core/voicings'
import { ChordDiagram } from '../../ui/ChordDiagram'
import { togglePlay, useImproviso } from '../improviso/store'
import { useSongs } from '../musicas/store'
import { useCompose, type ComposeSection } from './store'

const SECTION_NAMES = ['Verso', 'Pré-refrão', 'Refrão', 'Ponte', 'Solo', 'Final']

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

export function ComporPage({ go }: Props) {
  const { root, minor, sections, cur, set } = useCompose()
  const [alt, setAlt] = useState<Record<string, number>>({})
  const [playing, setPlaying] = useState<string | null>(null)
  const key = { root, minor }
  const sec = sections[Math.min(cur, sections.length - 1)] ?? sections[0]
  const last = sec.chords.length ? parseChord(sec.chords[sec.chords.length - 1]) : null
  // a seção está vazia: o "último acorde" é o fim da seção anterior (a música continua)
  const prevLast = useMemo(() => {
    if (last) return last
    for (let i = cur - 1; i >= 0; i--) {
      const ch = sections[i].chords
      if (ch.length) return parseChord(ch[ch.length - 1])
    }
    return null
  }, [last, cur, sections])
  const moves = useMemo(() => (sec.chords.length ? movesFor(key, last) : []), [root, minor, sec.chords.join(' ')])
  const starts = useMemo(() => sectionStarts(key, sec.name), [root, minor, sec.name])
  const all = sections.flatMap((s) => s.chords)
  const unique = [...new Set(all)]

  const editSection = (i: number, patch: Partial<ComposeSection>) =>
    set({ sections: sections.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  const add = (chords: string[]) => editSection(cur, { chords: [...sec.chords, ...chords] })

  async function listen(id: string, chords: string[]) {
    const cs = chords.flatMap((s) => {
      const c = parseChord(s)
      return c ? [c] : []
    })
    if (!cs.length) return
    setPlaying(id)
    const dur = await engine.previewChords(cs, useImproviso.getState().mix)
    window.setTimeout(() => setPlaying((p) => (p === id ? null : p)), dur * 1000)
  }

  /** Carrega a composição como progressão digitada no Improviso (tom e escala do tom escolhido). */
  function loadIntoBase() {
    if (!all.length) return false
    useImproviso.getState().set({
      progId: 'custom',
      customText: all.join(' '),
      key: KEYS[root],
      keyMinor: minor,
      scaleId: minor ? 'pentMin' : 'pentMaj',
    })
    return true
  }

  async function saveAsSong() {
    if (!all.length) return
    const title = prompt('Nome da música:', 'Minha composição')
    if (!title?.trim()) return
    const song = songFromCifra({
      title: title.trim(),
      artist: '',
      key: keyShort(KEYS[root], minor),
      capo: 0,
      sections: sections.filter((s) => s.chords.length).map((s) => ({ name: s.name, bars: s.chords.map((c) => [c]) })),
      skipped: [],
    })
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
              onChange={(e) => set({ root: parseInt(e.target.value, 10), minor: e.target.value.endsWith('m') })}
            >
              <optgroup label="Maiores">
                {KEYS.map((k, i) => <option key={k} value={`${i}`}>{keyLabel(k, false)}</option>)}
              </optgroup>
              <optgroup label="Menores">
                {KEYS.map((k, i) => <option key={`${k}m`} value={`${i}m`}>{keyLabel(k, true)}</option>)}
              </optgroup>
            </select>
          </label>
          <button type="button" className="link" onClick={() => confirm('Começar uma composição nova? A atual será apagada.') && set({ sections: [{ name: 'Verso', chords: [] }], cur: 0 })}>começar de novo</button>
        </div>
      </div>

      <div className="compose">
        <div className="stack">
          <section className="card stack-sm" aria-label="Sua progressão">
            <div className="row-between">
              <span className="tag" style={{ margin: 0 }}>Sua progressão · {keyLabel(KEYS[root], minor)}</span>
              <div className="row">
                <button type="button" className="btn" disabled={!all.length} onClick={() => listen('tudo', all)}>{playing === 'tudo' ? 'Tocando…' : '▶ Ouvir tudo'}</button>
                <button type="button" className="play" disabled={!all.length} onClick={() => { if (loadIntoBase() && useImproviso.getState().status === 'idle') void togglePlay() }}>Tocar com a base</button>
              </div>
            </div>
            {sections.map((s, i) => (
              <div key={i} className={`compose-sec${i === cur ? ' cur' : ''}`} onClick={() => set({ cur: i })}>
                <div className="row-between">
                  <input
                    className="sec-title"
                    value={s.name}
                    aria-label="Nome da seção"
                    onChange={(e) => editSection(i, { name: e.target.value })}
                    onFocus={() => set({ cur: i })}
                  />
                  <div className="row" onClick={(e) => e.stopPropagation()}>
                    {s.chords.length > 0 && <button type="button" className="link" onClick={() => listen(`sec${i}`, s.chords)}>{playing === `sec${i}` ? 'tocando…' : 'ouvir'}</button>}
                    {s.chords.length > 0 && <button type="button" className="link" onClick={() => editSection(i, { chords: [...s.chords, s.chords[s.chords.length - 1]] })}>+ compasso</button>}
                    {s.chords.length > 0 && <button type="button" className="link" onClick={() => editSection(i, { chords: s.chords.slice(0, -1) })}>desfazer</button>}
                    {sections.length > 1 && (
                      <button type="button" className="link" onClick={() => set({ sections: sections.filter((_, k) => k !== i), cur: Math.max(0, Math.min(cur, sections.length - 2)) })}>apagar seção</button>
                    )}
                  </div>
                </div>
                {s.chords.length ? (
                  <div className="cells">
                    {s.chords.map((c, k) => (
                      <span key={k} className="cell compose-cell" title={romanIn(key, c)}>
                        <span>{c}<small className="beats">{romanIn(key, c)}</small></span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="muted hint">{i === cur ? 'Escolha por onde começar ao lado.' : 'Vazia. Clique para escolher esta seção.'}</p>
                )}
              </div>
            ))}
            <div className="row">
              <span className="tag" style={{ margin: 0 }}>Nova seção</span>
              {SECTION_NAMES.map((n) => (
                <button key={n} type="button" className="chip" onClick={() => set({ sections: [...sections, { name: n, chords: [] }], cur: sections.length })}>+ {n}</button>
              ))}
            </div>
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
              <h2 style={{ fontSize: '1.3rem' }}>{sec.chords.length ? 'E agora?' : `Como começar ${sec.name.toLowerCase()}?`}</h2>
              <p className="muted hint">
                {sec.chords.length
                  ? <>Depois de <b className="mono">{sec.chords[sec.chords.length - 1]}</b> ({romanIn(key, sec.chords[sec.chords.length - 1])}), escolha o efeito que você quer. Ouça antes de usar.</>
                  : prevLast ? <>A seção anterior terminou em <b className="mono">{prevLast.symbol}</b>.</> : 'Escolha o primeiro acorde.'}
              </p>
            </div>
            {!sec.chords.length && (
              <div className="moves">
                {starts.map((st) => (
                  <div key={st.label} className="move">
                    <b className="move-label">{st.label}</b>
                    <span className="move-chords">{st.chords.join(' → ')}<small className="mono"> {st.romans}</small></span>
                    <span className="move-why">{st.why}</span>
                    <div className="row">
                      <button type="button" className="chip" onClick={() => listen(st.label, prevLast ? [prevLast.symbol, ...st.chords] : st.chords)}>{playing === st.label ? 'tocando…' : '▶ ouvir'}</button>
                      <button type="button" className="chip" aria-pressed onClick={() => add(st.chords)}>+ usar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {sec.chords.length > 0 && (
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
                        <button type="button" className="chip" onClick={() => listen(id, [sec.chords[sec.chords.length - 1], ...o.chords])}>{playing === id ? 'tocando…' : '▶ ouvir'}</button>
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
