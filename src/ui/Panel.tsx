import type { ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Quais painéis o usuário minimizou (por id). Lembrado entre visitas. */
interface PanelsState {
  collapsed: Record<string, boolean>
  toggle: (id: string) => void
}

export const usePanels = create<PanelsState>()(
  persist(
    (set) => ({
      collapsed: {},
      toggle: (id) => set((s) => ({ collapsed: { ...s.collapsed, [id]: !s.collapsed[id] } })),
    }),
    { name: 'paineis-v1' },
  ),
)

interface Props {
  /** chave única do painel (guarda se está minimizado) */
  id: string
  title: string
  /** resumo de uma linha mostrado quando minimizado (ex.: "Pentatônica menor · A · Box 1") */
  summary?: ReactNode
  /** algo que fica à vista no cabeçalho mesmo aberto (ex.: um botão "Sortear") */
  extra?: ReactNode
  /** só quando minimizado: o controle que precisa continuar à mão (ex.: Ativar a entrada) */
  minExtra?: ReactNode
  className?: string
  /** classe do conteúdo (layout: stack-sm, check-bar…) */
  bodyClass?: string
  label?: string
  children: ReactNode
}

/**
 * Cartão que dá para minimizar: aberto por padrão, um clique no cabeçalho recolhe e deixa só o
 * título e o resumo. Para configurações que não são 100% necessárias durante a prática.
 */
export function Panel({ id, title, summary, extra, minExtra, className = '', bodyClass = 'stack-sm', label, children }: Props) {
  const min = usePanels((s) => !!s.collapsed[id])
  const toggle = usePanels((s) => s.toggle)
  return (
    <section className={`card panel-min${min ? ' is-min' : ''} ${className}`} aria-label={label ?? title}>
      <div className="pm-head">
        <button type="button" className="pm-toggle" aria-expanded={!min} onClick={() => toggle(id)} title={min ? 'Mostrar' : 'Minimizar'}>
          <span className="tag pm-title">{title}</span>
          {min && summary ? <span className="pm-sum">{summary}</span> : null}
          <svg className="pm-chev" viewBox="0 0 24 24" aria-hidden><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {min ? minExtra : extra}
      </div>
      {!min && <div className={`pm-body ${bodyClass}`}>{children}</div>}
    </section>
  )
}
