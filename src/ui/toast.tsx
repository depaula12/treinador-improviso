import { useEffect } from 'react'
import { create } from 'zustand'

/** Aviso curto no canto da tela ("Música salva", "Não consegui carregar os sons…"). */
interface Toast {
  id: number
  text: string
  kind: 'ok' | 'error'
}

const useToasts = create<{ list: Toast[]; push: (t: Omit<Toast, 'id'>) => void; drop: (id: number) => void }>((set) => ({
  list: [],
  push: (t) => set((s) => ({ list: [...s.list.slice(-2), { ...t, id: Date.now() + Math.random() }] })),
  drop: (id) => set((s) => ({ list: s.list.filter((x) => x.id !== id) })),
}))

export const toast = (text: string, kind: Toast['kind'] = 'ok') => useToasts.getState().push({ text, kind })

function Item({ t }: { t: Toast }) {
  const drop = useToasts((s) => s.drop)
  useEffect(() => {
    const id = window.setTimeout(() => drop(t.id), t.kind === 'error' ? 7000 : 3200)
    return () => window.clearTimeout(id)
  }, [t, drop])
  return (
    <div className={`toast ${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
      <span>{t.text}</span>
      <button type="button" aria-label="Fechar aviso" onClick={() => drop(t.id)}>×</button>
    </div>
  )
}

export function ToastHost() {
  const list = useToasts((s) => s.list)
  return <div className="toasts">{list.map((t) => <Item key={t.id} t={t} />)}</div>
}
