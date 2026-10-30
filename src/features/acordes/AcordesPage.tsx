import { useEffect, useMemo, useState } from 'react'
import { songChords } from '../../core/song'
import { FORM_LABEL, QUALITIES, type FormKind } from '../../core/voicings'
import { useSongs } from '../musicas/store'
import { songCards } from './quiz-model'
import { Decoder } from './Decoder'
import { Quiz } from './Quiz'
import { useAcordes, type QuizMode } from './store'

const MODES: { id: QuizMode; label: string }[] = [
  { id: 'cifra-desenho', label: 'Cifra → desenho' },
  { id: 'desenho-cifra', label: 'Desenho → cifra' },
  { id: 'cifra-notas', label: 'Cifra → notas' },
  { id: 'cronometrado', label: 'Cronometrado (com a guitarra)' },
]

const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x])

export function AcordesPage() {
  const [view, setView] = useState<'consultar' | 'treinar'>('treinar')
  const { mode, qualities, forms, songId, set, resetStats } = useAcordes()
  const { songs, load } = useSongs()
  useEffect(() => void load(), [load])
  const song = songs.find((s) => s.id === songId) ?? null
  const chords = useMemo(() => (song ? songChords(song) : null), [song])
  const skipped = useMemo(() => (chords ? songCards(mode, chords, forms).skipped : []), [chords, mode, forms])

  return (
    <div className="stack">
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'treinar'} onClick={() => setView('treinar')}>Treinar</button>
        <button type="button" role="tab" aria-selected={view === 'consultar'} onClick={() => setView('consultar')}>Consultar / decodificar</button>
      </div>

      {view === 'consultar' ? (
        <Decoder />
      ) : (
        <>
          <section className="panel stack-sm">
            <label>
              Modo
              <select value={mode} onChange={(e) => set({ mode: e.target.value as QuizMode })}>
                {MODES.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </label>
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
              <div>
                <div className="tag">Tipos de acorde</div>
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
                <div className="tag">Formas</div>
                <div className="chips">
                  {(['6', '5', 'aberto'] as FormKind[]).map((f) => (
                    <button key={f} type="button" className="chip" aria-pressed={forms.includes(f)} onClick={() => set({ forms: toggle(forms, f) })}>
                      {FORM_LABEL[f]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
          <Quiz songChords={chords} />
          <p className="foot">
            O que você erra ou demora aparece mais vezes. O progresso fica salvo neste aparelho.{' '}
            <button type="button" className="link" onClick={() => confirm('Zerar o progresso dos acordes?') && resetStats()}>Zerar progresso</button>
          </p>
        </>
      )}
    </div>
  )
}
