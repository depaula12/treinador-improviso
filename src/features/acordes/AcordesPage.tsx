import { useEffect, useMemo, useState } from 'react'
import { KIND_LABEL, type ShapeKind } from '../../core/chord-bank'
import { songChords } from '../../core/song'
import { KEYS } from '../../core/theory'
import { qualityById } from '../../core/voicings'
import { useSongs } from '../musicas/store'
import { Panel, usePanels } from '../../ui/Panel'
import { Decoder } from './Decoder'
import { NEW_BOX } from './leitner'
import { buildItems, LEVELS, QUESTION_LABEL, SHAPE_TYPES, songTargets, type Item, type QuestionType, type QuizMode } from './quiz-model'
import { Quiz } from './Quiz'
import { useAcordes } from './store'

const TYPES = Object.keys(QUESTION_LABEL) as QuestionType[]
// os tipos de acorde em grupos, do mais simples ao mais "colorido"
const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Básicos', ids: ['5', 'maj', 'm', '7', 'm7'] },
  { label: 'Cores', ids: ['7M', 'sus2', 'sus4', 'add9'] },
  { label: 'Jazz, bossa e blues', ids: ['6', '9', '7#9', 'm7b5', 'dim7'] },
]
const KINDS: ShapeKind[] = ['aberta', 'pestana', 'movel', 'triade']

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])
const qLabel = (id: string) => qualityById(id).suffix || 'maior'

/** Nome curto de um item, para a lista dos mais difíceis. */
function itemName(i: Item): string {
  const q = qLabel(i.quality)
  const root = i.root !== undefined ? KEYS[i.root] : ''
  if (i.card) return `${root}${root ? qualityById(i.quality).suffix : q} · ${i.card.label.split(' · ')[0]}`
  if (i.type === 'comparar') return `${qLabel(i.from!)} → ${q}`
  return `${root}${root ? qualityById(i.quality).suffix : q} (${QUESTION_LABEL[i.type].split(' ')[0].toLowerCase()})`
}

/** Progresso do que está no treino: dominados, caixas da repetição espaçada e os mais difíceis. */
function Progress({ items }: { items: Item[] }) {
  const { stats, resetStats } = useAcordes()
  const boxes = [1, 2, 3, 4, 5].map((b) => items.filter((c) => (stats[c.key]?.box ?? NEW_BOX) === b).length)
  const most = Math.max(1, ...boxes)
  const mastered = boxes[3] + boxes[4]
  const hard = items
    .filter((c) => stats[c.key]?.seen)
    .sort((a, b) => stats[a.key].box - stats[b.key].box || stats[a.key].right / stats[a.key].seen - stats[b.key].right / stats[b.key].seen)
    .slice(0, 5)
  return (
    <Panel id="acordes-progresso" title="Progresso" summary={`${mastered} de ${items.length} dominados`}>
      <div>
        <span className="tag">Dominados</span>
        <div className="stat-big">{mastered} <small>de {items.length}</small></div>
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
              <div key={c.key}><b>{itemName(c)}</b><span className="muted mono">{stats[c.key].right}/{stats[c.key].seen}</span></div>
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
    </Panel>
  )
}

export function AcordesPage() {
  const cfgMin = usePanels((p) => !!p.collapsed['acordes-config'])
  const progMin = usePanels((p) => !!p.collapsed['acordes-progresso'])
  const [view, setView] = useState<'consultar' | 'treinar'>('treinar')
  const { mode, qualities, kinds, level, mixTypes, sessionLen, songId, set } = useAcordes()
  const { songs, load } = useSongs()
  useEffect(() => void load(), [load])
  const song = songs.find((s) => s.id === songId) ?? null
  const chords = useMemo(() => (song ? songChords(song) : null), [song])
  const skipped = useMemo(() => (chords ? songTargets(chords).skipped : []), [chords])
  const types: QuestionType[] = mode === 'misturado' ? mixTypes : [mode]
  const items = useMemo(
    () => buildItems({ types, qualities, kinds, songChords: chords }),
    [types.join(), qualities.join(), kinds.join(), chords?.join()],
  )
  const usesShapes = types.some((t) => SHAPE_TYPES.includes(t))

  const pickLevel = (l: 1 | 2 | 3 | 4) => set({ level: l, qualities: LEVELS[l].qualities, kinds: LEVELS[l].kinds })

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
        <div className={`three${cfgMin ? ' cfg-min' : ''}${progMin ? ' prog-min' : ''}`}>
          <Panel id="acordes-config" title="Configurar o treino" bodyClass="cfg" summary={`${level ? `Nível ${level}` : 'Personalizado'} · ${mode === 'misturado' ? 'Misturado' : QUESTION_LABEL[mode].split(' (')[0]}${song ? ` · ${song.title}` : ''}`}>
            <div className="field">
              <span className="tag">Nível</span>
              <div className="segmented" role="group" aria-label="Nível">
                {([1, 2, 3, 4] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={level === l} onClick={() => pickLevel(l)}>{l}</button>
                ))}
              </div>
              <span className="level-desc">{level ? LEVELS[level].label : 'Personalizado: os tipos e formas que você marcou abaixo'}</span>
            </div>

            <div className="field">
              <span className="tag">Modo</span>
              <div className="vseg" role="group" aria-label="Modo">
                {(['misturado', ...TYPES] as QuizMode[]).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => set({ mode: m })}>
                    {m === 'misturado' ? 'Misturado (vários tipos de pergunta)' : QUESTION_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
            {mode === 'misturado' && (
              <div className="field">
                <span className="tag">Entram no misturado</span>
                <div className="chips">
                  {TYPES.filter((t) => t !== 'cronometrado').map((t) => (
                    <button key={t} type="button" className="chip" aria-pressed={mixTypes.includes(t)} onClick={() => set({ mixTypes: toggle(mixTypes, t) })}>
                      {QUESTION_LABEL[t].split(' (')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                {skipped.length > 0 && <span className="muted"> · fora do quiz (sem desenho no banco): {skipped.join(', ')}. Veja em Consultar.</span>}
              </p>
            ) : (
              <div className="field">
                <span className="tag">Tipos de acorde</span>
                {GROUPS.map((g) => (
                  <div key={g.label} className="chip-group">
                    <small>{g.label}</small>
                    <div className="chips">
                      {g.ids.map((id) => (
                        <button key={id} type="button" className="chip" aria-pressed={qualities.includes(id)} title={qualityById(id).name} onClick={() => set({ qualities: toggle(qualities, id), level: 0 })}>
                          {qLabel(id)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {usesShapes && (
              <div className="field">
                <span className="tag">Formas</span>
                <div className="chips">
                  {KINDS.map((k) => (
                    <button key={k} type="button" className="chip" aria-pressed={kinds.includes(k)} onClick={() => set({ kinds: toggle(kinds, k), level: 0 })}>
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label>
              Sessão
              <select value={sessionLen} onChange={(e) => set({ sessionLen: +e.target.value as 0 | 10 | 20 | 50 })}>
                <option value={10}>10 perguntas</option>
                <option value={20}>20 perguntas</option>
                <option value={50}>50 perguntas</option>
                <option value={0}>Sem fim</option>
              </select>
            </label>
            <p className="hint muted">{items.length} perguntas possíveis com esta escolha.</p>
          </Panel>

          <Quiz
            items={items}
            emptyMsg={song ? 'Nenhum acorde desta música tem desenho nas formas escolhidas.' : 'Escolha pelo menos um tipo de acorde, uma forma e um tipo de pergunta.'}
          />

          <Progress items={items} />
        </div>
      )}
    </div>
  )
}
