import { useEffect, useRef, useState, type ReactNode } from 'react'
import { create } from 'zustand'

/**
 * Janelas do próprio app no lugar de prompt()/confirm() do navegador (que destoam do visual e são
 * bloqueados no app instalado do iPhone). Uso: `if (await confirmDialog({...}))` ou `await promptDialog({...})`.
 */
interface Choice {
  label: string
  value: string
  kind?: 'primary' | 'danger' | 'plain'
}

interface Req {
  title: string
  body?: ReactNode
  /** campo de texto (prompt) */
  input?: { label: string; value?: string; placeholder?: string }
  choices: Choice[]
  resolve: (v: string | null) => void
}

const useDialog = create<{ req: Req | null; open: (r: Req) => void; close: () => void }>((set) => ({
  req: null,
  open: (req) => set({ req }),
  close: () => set({ req: null }),
}))

function ask(r: Omit<Req, 'resolve'>): Promise<string | null> {
  return new Promise((resolve) => useDialog.getState().open({ ...r, resolve }))
}

/** confirmação: true = confirmou */
export async function confirmDialog(o: { title: string; body?: ReactNode; ok?: string; cancel?: string; danger?: boolean }): Promise<boolean> {
  const v = await ask({
    title: o.title,
    body: o.body,
    choices: [{ label: o.cancel ?? 'Cancelar', value: 'no', kind: 'plain' }, { label: o.ok ?? 'Confirmar', value: 'yes', kind: o.danger ? 'danger' : 'primary' }],
  })
  return v === 'yes'
}

/** texto: devolve o que foi digitado (sem espaços nas pontas) ou null se cancelou / vazio */
export async function promptDialog(o: { title: string; label: string; value?: string; placeholder?: string; ok?: string; body?: ReactNode }): Promise<string | null> {
  const v = await ask({
    title: o.title,
    body: o.body,
    input: { label: o.label, value: o.value, placeholder: o.placeholder },
    choices: [{ label: 'Cancelar', value: '\u0000', kind: 'plain' }, { label: o.ok ?? 'Salvar', value: '\u0001', kind: 'primary' }],
  })
  return v && v !== '\u0000' && v.trim() ? v.trim() : null
}

/** várias opções: devolve o `value` escolhido ou null */
export const chooseDialog = (o: { title: string; body?: ReactNode; choices: Choice[] }) => ask(o)

/** montado uma vez no App */
export function DialogHost() {
  const { req, close } = useDialog()
  const [text, setText] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!req) return
    setText(req.input?.value ?? '')
    const prev = document.activeElement as HTMLElement | null
    // foco no campo ou no botão principal
    window.setTimeout(() => (box.current?.querySelector('input, .dlg-actions .primary, .dlg-actions button:last-child') as HTMLElement | null)?.focus(), 0)
    return () => prev?.focus?.()
  }, [req])
  if (!req) return null
  const done = (c: Choice | null) => {
    const v = c === null ? null : req.input && c.value === '\u0001' ? text : c.value
    close()
    req.resolve(v)
  }
  const primary = req.choices.find((c) => c.kind !== 'plain') ?? req.choices[req.choices.length - 1]
  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && done(null)}>
      <div
        ref={box}
        className="dlg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') done(null)
          if (e.key === 'Enter' && (req.input ? text.trim() : true) && (e.target as HTMLElement).tagName !== 'BUTTON') done(primary)
        }}
      >
        <h2 id="dlg-title">{req.title}</h2>
        {req.body && <div className="dlg-body">{req.body}</div>}
        {req.input && (
          <label className="dlg-input">
            {req.input.label}
            <input className="text" value={text} placeholder={req.input.placeholder} onChange={(e) => setText(e.target.value)} />
          </label>
        )}
        <div className="dlg-actions">
          {req.choices.map((c) => (
            <button
              key={c.value}
              type="button"
              className={c.kind === 'primary' ? 'play primary' : c.kind === 'danger' ? 'btn danger' : 'btn'}
              disabled={!!req.input && c.value === '\u0001' && !text.trim()}
              onClick={() => done(c)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
