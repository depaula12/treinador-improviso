import { useEffect, useMemo, useRef, useState } from 'react'
import { STYLES } from '../../audio/engine'
import { parseCifra } from '../../core/cifra'
import {
  deleteBar, deleteSection, duplicateBar, duplicateSection, flatBars, mergeNext, setBar, songChords, songFromCifra,
  soundingKey, splitBar, transposeChord, type Song,
} from '../../core/song'
import { useAcordes } from '../acordes/store'
import { togglePlay, useImproviso } from '../improviso/store'
import { loadIntoImproviso, useSongs } from './store'

interface Props {
  /** abre outra área */
  go: (area: 'improviso' | 'acordes') => void
}

export function MusicasPage({ go }: Props) {
  const { songs, loaded, openId, load, open } = useSongs()
  const [importing, setImporting] = useState(false)
  useEffect(() => void load(), [load])
  const song = songs.find((s) => s.id === openId) ?? null

  if (importing) return <Importer onDone={(id) => { setImporting(false); if (id) open(id) }} />
  if (song) return <SongEditor song={song} go={go} />

  return (
    <div className="stack">
      <section className="panel row-between">
        <div>
          <div className="tag">Seu repertório</div>
          <p className="hint muted">Cole a cifra de uma música e ela vira base de treino, com a grade de compassos editável.</p>
        </div>
        <button type="button" className="play" onClick={() => setImporting(true)}>Importar cifra</button>
      </section>
      {loaded && !songs.length && <p className="muted center">Nenhuma música ainda. Comece importando uma cifra.</p>}
      <div className="song-list">
        {songs.map((s) => (
          <button key={s.id} type="button" className="song-card" onClick={() => open(s.id)}>
            <b>{s.title}</b>
            <span className="muted">{s.artist || '—'}</span>
            <span className="mono muted">{soundingKey(s)} · {s.bpm} bpm · {flatBars(s).length} compassos</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------- importar ----------

function Importer({ onDone }: { onDone: (id: string | null) => void }) {
  const [text, setText] = useState('')
  const save = useSongs((s) => s.save)
  const parsed = useMemo(() => (text.trim() ? parseCifra(text) : null), [text])
  const bars = parsed?.sections.reduce((n, s) => n + s.bars.length, 0) ?? 0

  async function confirm() {
    if (!parsed || !bars) return
    const song = songFromCifra(parsed)
    await save(song)
    onDone(song.id)
  }

  return (
    <div className="stack">
      <section className="panel stack-sm">
        <div className="row-between">
          <div className="tag">Importar cifra</div>
          <button type="button" className="link" onClick={() => onDone(null)}>voltar</button>
        </div>
        <p className="hint muted">
          No Cifra Club, selecione a cifra inteira (do título até o fim), copie e cole aqui. Pode vir com letra e
          tablatura: o app pega só os acordes e as seções. Cada acorde vira um compasso; depois você acerta na grade.
        </p>
        <textarea className="cifra-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={'Tom: Am\n\n[Intro] Am  G  F  E7\n\n[Primeira Parte]\nAm           G\n(letra)…'} spellCheck={false} />
      </section>

      {parsed && (
        <section className="panel stack-sm">
          <div className="tag">O que eu entendi</div>
          <p className="hint">
            <b>{parsed.title || 'Sem título'}</b>{parsed.artist ? ` · ${parsed.artist}` : ''} · tom {parsed.key ?? 'estimado pelos acordes'}
            {parsed.capo ? ` · capotraste na ${parsed.capo}ª (a base toca no tom real)` : ''} · {bars} compassos
          </p>
          {parsed.sections.map((s, i) => (
            <div key={i} className="sec-preview">
              <span className="sec-name">{s.name}</span>
              <span className="mono">{s.bars.map((b) => b.join(' ')).join('  ')}</span>
            </div>
          ))}
          {parsed.skipped.length > 0 && <p className="hint muted">Ficaram de fora (só tablatura ou letra): {parsed.skipped.join(', ')}.</p>}
          {!bars && <p className="error">Não achei acordes nesse texto.</p>}
          <div>
            <button type="button" className="play" disabled={!bars} onClick={confirm}>Salvar música</button>
          </div>
        </section>
      )}
    </div>
  )
}

// ---------- editor + cifra rolando ----------

interface Sel {
  section: number
  bar: number
}

function SongEditor({ song, go }: { song: Song } & Props) {
  const { save, remove, open } = useSongs()
  const [sel, setSel] = useState<Sel | null>(null)
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)
  const loadedId = useImproviso((s) => (s.progId === 'song' ? s.song?.id : null))
  const status = useImproviso((s) => s.status)
  const pos = useImproviso((s) => s.pos)
  const isLoaded = loadedId === song.id
  const playing = isLoaded && status === 'playing'
  const flat = useMemo(() => flatBars(song), [song])
  const current = playing && pos && pos.bar >= 0 ? pos.bar % flat.length : -1
  const grid = useRef<HTMLDivElement>(null)

  // cifra rolando: mantém o compasso atual na tela
  useEffect(() => {
    if (current < 0) return
    grid.current?.querySelector('.cell.on')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [current])

  const update = (s: Song | null) => s && void save({ ...s, updatedAt: Date.now() })
  const selBar = sel ? song.sections[sel.section]?.bars[sel.bar] : undefined
  // juntou/separou/transpôs: o campo de edição acompanha o compasso selecionado
  const selText = selBar?.map((c) => transposeChord(c, song.transpose)).join(' ') ?? ''
  useEffect(() => setDraft(selText), [selText])

  function pick(section: number, bar: number) {
    setBad(false)
    if (sel?.section === section && sel.bar === bar) return setSel(null)
    // o campo mostra o tom em que está tocando; ao salvar, volta para o tom escrito
    setSel({ section, bar })
  }

  function edit(section: number, bar: number) {
    const written = draft.split(/\s+/).filter(Boolean).map((c) => transposeChord(c, -song.transpose)).join(' ')
    const r = setBar(song, section, bar, written)
    setBad(!r)
    if (r) update(r)
  }

  async function playHere() {
    if (!isLoaded) loadIntoImproviso(song)
    await togglePlay()
  }

  const nowBar = current >= 0 ? flat[current] : null
  const nextBar = current >= 0 ? flat[(current + 1) % flat.length] : null
  const beat = pos?.beat ?? 0
  const nowChord = nowBar ? (nowBar.chords[1] && beat >= 2 ? nowBar.chords[1] : nowBar.chords[0]) : null
  const nextChord = nowBar && nowBar.chords[1] && beat < 2 ? nowBar.chords[1] : nextBar?.chords[0]
  let idx = -1

  return (
    <div className="stack">
      <section className="panel stack-sm">
        <div className="row-between">
          <button type="button" className="link" onClick={() => { open(null); setSel(null) }}>← todas as músicas</button>
          <button type="button" className="link" onClick={() => confirm(`Apagar "${song.title}"?`) && void remove(song.id)}>apagar música</button>
        </div>
        <div className="grid-2">
          <label>Título<input className="text" value={song.title} onChange={(e) => update({ ...song, title: e.target.value })} /></label>
          <label>Artista<input className="text" value={song.artist} onChange={(e) => update({ ...song, artist: e.target.value })} /></label>
        </div>
        <div className="song-ctl">
          <label>
            Tom
            <div className="stepper">
              <button type="button" onClick={() => update({ ...song, transpose: song.transpose - 1 })} aria-label="Meio tom abaixo">−</button>
              <span className="mono">{soundingKey(song)}</span>
              <button type="button" onClick={() => update({ ...song, transpose: song.transpose + 1 })} aria-label="Meio tom acima">+</button>
            </div>
          </label>
          <label>
            Andamento
            <div className="stepper">
              <button type="button" onClick={() => update({ ...song, bpm: Math.max(50, song.bpm - 5) })} aria-label="Mais lento">−</button>
              <span className="mono">{song.bpm}</span>
              <button type="button" onClick={() => update({ ...song, bpm: Math.min(180, song.bpm + 5) })} aria-label="Mais rápido">+</button>
            </div>
          </label>
          <label>
            Estilo
            <select value={song.styleId} onChange={(e) => update({ ...song, styleId: e.target.value })}>
              {STYLES.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
        </div>
        {song.transpose !== 0 && (
          <p className="hint muted">Cifra escrita em {song.key}; tocando {song.transpose > 0 ? '+' : ''}{song.transpose} semitom(s), em {soundingKey(song)}. Os acordes abaixo já estão no tom novo.</p>
        )}
        <p className="hint muted">Acordes da música: <span className="mono">{songChords(song).join('  ')}</span></p>
        <div className="chips">
          <button type="button" className="play" onClick={playHere} disabled={status === 'loading'}>
            {status === 'loading' && isLoaded ? 'Carregando…' : playing ? 'Parar' : 'Tocar a cifra'}
          </button>
          <button type="button" className="chip" onClick={() => { loadIntoImproviso(song); go('improviso') }}>Improvisar sobre ela</button>
          <button type="button" className="chip" onClick={() => { useAcordes.getState().set({ songId: song.id }); go('acordes') }}>Treinar os acordes dela</button>
        </div>
      </section>

      {nowChord && (
        <section className="now-next roll">
          <div>
            <div className="tag">Agora</div>
            <div className="now-chord">{nowChord}</div>
          </div>
          <div className="next">
            <div className="tag">Depois</div>
            <div className="next-chord">{nextChord}</div>
          </div>
        </section>
      )}

      <section className="stack-sm" ref={grid}>
        {song.sections.map((sec, si) => (
          <div key={si} className="panel sec">
            <div className="row-between">
              <input
                className="sec-title"
                value={sec.name}
                aria-label="Nome da seção"
                onChange={(e) => update({ ...song, sections: song.sections.map((x, i) => (i === si ? { ...x, name: e.target.value } : x)) })}
              />
              <div className="chips">
                <button type="button" className="link" onClick={() => update(duplicateSection(song, si))}>repetir seção</button>
                <button type="button" className="link" onClick={() => { setSel(null); update(deleteSection(song, si)) }}>apagar seção</button>
              </div>
            </div>
            <div className="cells">
              {sec.bars.map((_, bi) => {
                idx++
                const chords = flat[idx]?.chords ?? []
                const on = idx === current
                const selected = sel?.section === si && sel.bar === bi
                return (
                  <button key={bi} type="button" className={`cell${on ? ' on' : ''}${chords.length > 1 ? ' split' : ''}`} aria-pressed={selected} onClick={() => pick(si, bi)}>
                    {chords.map((c, k) => (
                      <span key={k}>{c}</span>
                    ))}
                  </button>
                )
              })}
            </div>
            {sel?.section === si && selBar && (
              <div className="bar-tools">
                <span className="tag">Compasso {sel.bar + 1}</span>
                <form onSubmit={(e) => { e.preventDefault(); edit(si, sel.bar) }}>
                  <input className="text" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Acordes do compasso (1 ou 2)" spellCheck={false} autoCapitalize="off" />
                  <button type="submit" className="chip">Trocar</button>
                </form>
                {bad && <span className="error">Use 1 ou 2 cifras válidas, separadas por espaço.</span>}
                <div className="chips">
                  {selBar.length === 1 && sec.bars[sel.bar + 1]?.length === 1 && (
                    <button type="button" className="chip" onClick={() => update(mergeNext(song, si, sel.bar))}>Juntar com o próximo (2+2)</button>
                  )}
                  {selBar.length === 2 && <button type="button" className="chip" onClick={() => update(splitBar(song, si, sel.bar))}>Separar em 2 compassos</button>}
                  <button type="button" className="chip" onClick={() => update(duplicateBar(song, si, sel.bar))}>Repetir compasso</button>
                  <button type="button" className="chip" onClick={() => { setSel(null); update(deleteBar(song, si, sel.bar)) }}>Apagar</button>
                </div>
              </div>
            )}
          </div>
        ))}
        <p className="hint muted center">Clique num compasso para juntar (2 acordes no mesmo compasso), separar, repetir ou apagar.</p>
      </section>
    </div>
  )
}
