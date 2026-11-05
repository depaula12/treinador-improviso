import { Component, type ErrorInfo, type ReactNode } from 'react'
import { exportAll } from '../features/dados/dados'

/**
 * Rede de segurança: registro local dos últimos erros (localStorage `log-v1`, no máximo 50) e uma
 * tela de recuperação por área, com "Exportar meus dados" para nunca perder nada num erro.
 */
export interface LogEntry {
  at: number
  kind: 'render' | 'error' | 'promise' | 'console'
  area?: string
  msg: string
  stack?: string
}

const KEY = 'log-v1'
const MAX = 50

export function readLog(): LogEntry[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function logError(e: Omit<LogEntry, 'at'>) {
  try {
    const list = [...readLog(), { ...e, msg: e.msg.slice(0, 500), stack: e.stack?.slice(0, 2000), at: Date.now() }].slice(-MAX)
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* sem armazenamento: só não registra */
  }
}

export function clearLog() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* idem */
  }
}

const VERSION = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'

export function errorDetails(entries: LogEntry[]) {
  return [
    `solonely ${VERSION} · ${navigator.userAgent}`,
    ...entries.map((e) => `[${new Date(e.at).toISOString()}] ${e.kind}${e.area ? ` (${e.area})` : ''}: ${e.msg}${e.stack ? `\n${e.stack}` : ''}`),
  ].join('\n\n')
}

/** erros soltos (fora do React) e promessas rejeitadas: instalado uma vez em main.tsx */
export function installErrorLog() {
  window.addEventListener('error', (ev) => logError({ kind: 'error', msg: ev.message || String(ev.error), stack: ev.error?.stack }))
  window.addEventListener('unhandledrejection', (ev) => {
    const r = ev.reason as Error | string
    logError({ kind: 'promise', msg: typeof r === 'string' ? r : r?.message ?? String(r), stack: typeof r === 'string' ? undefined : r?.stack })
  })
  const orig = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    logError({ kind: 'console', msg: args.map((a) => (a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a))).join(' ') })
    orig(...args)
  }
}

interface Props {
  /** nome da área (aparece no registro) */
  area: string
  children: ReactNode
}

/** Erro numa área: só ela mostra a tela de recuperação; o resto do app continua funcionando. */
export class ErrorBoundary extends Component<Props, { error: Error | null; copied: boolean }> {
  state = { error: null as Error | null, copied: false }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError({ kind: 'render', area: this.props.area, msg: error.message, stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}` })
  }

  render() {
    const { error, copied } = this.state
    if (!error) return this.props.children
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(errorDetails([{ at: Date.now(), kind: 'render', area: this.props.area, msg: error.message, stack: error.stack }]))
        this.setState({ copied: true })
      } catch {
        /* sem permissão de área de transferência */
      }
    }
    return (
      <section className="card err-card" role="alert">
        <h2>Algo deu errado nesta tela</h2>
        <p>Seus dados estão guardados. Tente de novo; se continuar, recarregue a página. Antes, se quiser, exporte um backup.</p>
        <p className="muted mono err-msg">{error.message}</p>
        <div className="row">
          <button type="button" className="play" onClick={() => this.setState({ error: null, copied: false })}>Tentar de novo</button>
          <button type="button" className="btn" onClick={() => location.reload()}>Recarregar</button>
          <button type="button" className="btn" onClick={() => void exportAll()}>Exportar meus dados</button>
          <button type="button" className="link" onClick={() => void copy()}>{copied ? 'detalhes copiados' : 'copiar detalhes do erro'}</button>
        </div>
      </section>
    )
  }
}
