import { useCallback, useEffect, useRef, useState } from 'react'

// O que você toca, visível: cada nota pulsa no braço com a cor do veredito e entra numa trilha
// das últimas notas. Usado no Improviso (alvo / acorde / escala / fora) e nas Escalas
// (certo / fora do tempo / outra oitava / errado).

export type HitTone = 'alvo' | 'acorde' | 'escala' | 'fora' | 'certo' | 'tempo' | 'oitava' | 'errado'

export const TONE_LABEL: Record<HitTone, string> = {
  alvo: 'alvo',
  acorde: 'acorde',
  escala: 'escala',
  fora: 'fora',
  certo: 'certo',
  tempo: 'fora do tempo',
  oitava: 'outra oitava',
  errado: 'errado',
}

export interface HeardMark {
  id: number
  string: number
  fret: number
  tone: HitTone
  /** nome da nota (A, C#…) */
  label: string
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
/** Nome da nota com a grafia do tom (C# em Lá maior, Db em Fá menor). */
export const spellPc = (pc: number, flats: boolean) => (flats ? FLAT : SHARP)[((pc % 12) + 12) % 12]

/** quanto tempo a nota fica acesa no braço (ms); a animação do CSS dura o mesmo */
export const HEARD_LIFE = 1600
const TRAIL = 12

/** Notas acesas no braço (somem sozinhas) e a trilha das últimas notas. */
export function useHeard() {
  const [marks, setMarks] = useState<HeardMark[]>([])
  const [trail, setTrail] = useState<HeardMark[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const add = useCallback((m: HeardMark) => {
    // no máximo 6 acesas ao mesmo tempo: frase rápida não vira um borrão
    setMarks((ms) => [...ms.slice(-5), m])
    setTrail((ts) => [...ts.slice(-(TRAIL - 1)), m])
    const t = window.setTimeout(() => setMarks((ms) => ms.filter((x) => x.id !== m.id)), HEARD_LIFE)
    timers.current.push(t)
    if (timers.current.length > 40) timers.current.splice(0, 20)
  }, [])
  const clear = useCallback(() => {
    setMarks([])
    setTrail([])
  }, [])
  return { marks, trail, add, clear }
}

/** As últimas notas tocadas, da mais antiga (esquerda, apagando) para a mais nova. */
export function NoteTrail({ items, empty }: { items: HeardMark[]; empty: string }) {
  if (!items.length) return <div className="trail empty"><span className="muted hint">{empty}</span></div>
  return (
    <div className="trail" aria-label="Últimas notas tocadas">
      {items.map((m, k) => (
        <span key={m.id} className={`hit t-${m.tone}`} style={{ opacity: 0.35 + (0.65 * (k + 1)) / items.length }} title={TONE_LABEL[m.tone]}>
          <b>{m.label}</b>
          <small>{TONE_LABEL[m.tone]}</small>
        </span>
      ))}
    </div>
  )
}

/** Barra empilhada com a proporção de cada veredito. */
export function ToneBar({ parts }: { parts: { tone: HitTone; n: number; label: string }[] }) {
  const total = parts.reduce((s, p) => s + p.n, 0)
  return (
    <div className="tone-bar-wrap">
      <div className="tone-bar" aria-hidden>
        {total > 0 && parts.map((p) => (p.n ? <i key={p.tone} className={`t-${p.tone}`} style={{ flexGrow: p.n }} /> : null))}
      </div>
      <div className="tone-legend">
        {parts.map((p) => (
          <span key={p.tone} className={`t-${p.tone}`}><i />{p.label} <b>{p.n}</b></span>
        ))}
      </div>
    </div>
  )
}
