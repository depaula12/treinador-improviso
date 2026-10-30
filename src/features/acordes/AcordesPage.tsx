import { useEffect, useMemo, useState } from 'react'
import { songChords } from '../../core/song'
import { KEYS } from '../../core/theory'
import { FORM_LABEL, QUALITIES, qualityById, type FormKind } from '../../core/voicings'
import { useSongs } from '../musicas/store'
import { Decoder } from './Decoder'
import { NEW_BOX } from './leitner'
import { buildCards, songCards, type Card } from './quiz-model'
import { Quiz } from './Quiz'
import { useAcordes, type QuizMode } from './store'

const MODES: { id: QuizMode; label: string }[] = [
  { id: 'cifra-desenho', label: 'Cifra → desenho' },
  { id: 'desenho-cifra', label: 'Desenho → cifra' },
  { id: 'cifra-notas', label: 'Cifra → notas' },
  { id: 'cronometrado', label: 'Cronometrado (com a guitarra)' },
]
const FORM_SHORT: Record<FormKind, string> = { '6': '6ª corda', '5': '5ª corda', aberto: 'aberta' }

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

const cardName = (c: Card) => {
  const q = qualityById(c.quality)
  return c.root === null ? `${q.suffix || 'maior'}` : KEYS[c.root] + q.suffix
}

/** Progresso do que está no treino: dominados, caixas da repetição espaçada e os mais difíceis. */
function Progress({ cards }: { cards: Card[] }) {
  const { stats, resetStats } = useAcordes()
  const boxes = [1, 2, 3, 4, 5].map((b) => cards.filter((c) => (stats[c.key]?.box ?? NEW_BOX) === b).length)
  const most = Math.max(1, ...boxes)
  const mastered = boxes[3] + boxes[4]
  const hard = cards
    .filter((c) => stats[c.key]?.seen)
    .sort((a, b) => stats[a.key].box - stats[b.key].box || stats[a.key].right / stats[a.key].seen - stats[b.key].right / stats[b.key].seen)
    .slice(0, 4)
  return (
    <section className="card stack-sm" aria-label="Progresso">
      <div>
        <span className="tag">Dominados</span>
        <div className="stat-big">{mastered} <small>de {cards.length}</small></div>
      </div>
      <div>
        <span className="tag">Caixas (repetição espaçada)</span>
        <div className="leit" aria-label={`Caixas: ${boxes.join(', ')}`}>
          {boxes.map((n, i) => (
            <div key={i} className={i >= 3 ? 'hi' : ''} style={{ height: `${(n / most) * 100}%` }} title={`Caixa ${i + 1}: ${n}`} />
          ))}
        </div>
        <div className="leit-l"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
      </div>
      <div>
        <span className="tag">Mais difíceis</span>
        {hard.length ? (
          <div className="hard">
            {hard.map((c) => (
              <div key={c.key}><b>{cardName(c)}</b><span className="muted mono">{FORM_SHORT[c.form]} · {stats[c.key].right}/{stats[c.key].seen}</span></div>
            ))}
          </div>
        ) : (
          <p className="hint muted">Aparece aqui depois das primeiras respostas.</p>
        )}
      </div>
      <p className="foot">
        O que você erra ou demora aparece mais vezes. Fica salvo neste aparelho.{' '}
        <button type="button" className="link" onClick={() => confirm('Zerar o progresso dos acordes?') && resetStats()}>Zerar progresso</button>
      </p>
    </section>
  )
}

export function AcordesPage() {
  const [view, setView] = useState<'consultar' | 'treinar'>('treinar')
  const { mode, qualities, forms, songId, set } = useAcordes()
  const { songs, load } = useSongs()
  useEffect(() => void load(), [load])
  const song = songs.find((s) => s.id === songId) ?? null
  const chords = useMemo(() => (song ? songChords(song) : null), [song])
  const fromSong = useMemo(() => (chords ? songCards(mode, chords, forms) : null), [chords, mode, forms])
  const cards = useMemo(() => fromSong?.cards ?? buildCards(mode, qualities, forms), [fromSong, mode, qualities, forms])

  return (
    <div className="page">
      <div className="page-head">
        <h1>Acordes</h1>
        <div className="segmented" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'treinar'} onClick={() => setView('treinar')}>Treinar</button>
          <button type="button" role="tab" aria-selected={view === 'consultar'} onClick={() => setView('consultar')}>Consultar</button>
        </div>
      </div>

      {view === 'consultar' ? (
        <Decoder />
      ) : (
        <div className="three">
          <section className="card cfg" aria-label="Configurar o treino">
            <div className="field">
              <span className="tag">Modo</span>
              <div className="vseg" role="group" aria-label="Modo">
                {MODES.map((m) => (
                  <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => set({ mode: m.id })}>{m.label}</button>
                ))}
              </div>
            </div>
            {songs.length > 0 && (
              <label>
                Acordes
                <select value={song ? song.id : ''} onChange={(e) => set({ songId: e.target.value || null })}>
                  <option value="">Por tipo (escolha abaixo)</option>
                  {songs.map((s) => (
                    <option key={s.id} value={s.id}>Só os da música: {s.title}</option>
                  ))}
                </select>
              </label>
            )}
            {song ? (
              <p className="hint">
                <span className="mono">{chords!.join('  ')}</span>
                {fromSong!.skipped.length > 0 && <span className="muted"> · fora do quiz (sem desenho no banco): {fromSong!.skipped.join(', ')}. Veja em Consultar.</span>}
              </p>
            ) : (
              <div>
                <span className="tag">Tipos</span>
                <div className="chips">
                  {QUALITIES.map((q) => (
                    <button key={q.id} type="button" className="chip" aria-pressed={qualities.includes(q.id)} onClick={() => set({ qualities: toggle(qualities, q.id) })}>
                      {q.suffix || 'maior'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode !== 'cifra-notas' && (
              <div>
                <span className="tag">Formas</span>
                <div className="chips">
                  {(['6', '5', 'aberto'] as FormKind[]).map((f) => (
                    <button key={f} type="button" className="chip" aria-pressed={forms.includes(f)} title={FORM_LABEL[f]} onClick={() => set({ forms: toggle(forms, f) })}>
                      {FORM_SHORT[f]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <Quiz
            cards={cards}
            emptyMsg={song ? 'Nenhum acorde desta música tem desenho nas formas escolhidas.' : 'Escolha pelo menos um tipo de acorde e uma forma.'}
          />

          <Progress cards={cards} />
        </div>
      )}
    </div>
  )
}
