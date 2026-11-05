import { useRef, useState } from 'react'
import { chooseDialog } from '../../ui/Dialog'
import { applyImport, exportAll, lastBackupAt, previewImport, readBackupFile, useDados } from './dados'

const fmt = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

/** janela "Seus dados": exportar e importar o backup */
export function DadosPanel() {
  const { open, set } = useDados()
  useDados((s) => s.tick)
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!open) return null
  const last = lastBackupAt()

  async function doExport() {
    setBusy(true)
    try {
      const r = await exportAll()
      setMsg({ ok: true, text: `Backup baixado (${r.songs} ${r.songs === 1 ? 'música' : 'músicas'} e todo o progresso). Guarde o arquivo no Drive ou no PC.` })
    } catch {
      setMsg({ ok: false, text: 'Não consegui gerar o arquivo. Tente de novo.' })
    } finally {
      setBusy(false)
    }
  }

  async function doImport(f: File) {
    setMsg(null)
    const r = await readBackupFile(f)
    if (!r.ok) {
      setMsg({ ok: false, text: r.error })
      return
    }
    const p = await previewImport(r.backup)
    const when = r.backup.exportedAt ? new Date(r.backup.exportedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'data desconhecida'
    const v = await chooseDialog({
      title: 'Importar este backup?',
      body: (
        <>
          <p>Backup de <b>{when}</b>.</p>
          <ul>
            <li>Repertório: {p.added} {p.added === 1 ? 'música nova' : 'músicas novas'}, {p.updated} {p.updated === 1 ? 'atualizada' : 'atualizadas'} (nenhuma é apagada).</li>
            <li>Progresso: {p.stores} {p.stores === 1 ? 'área' : 'áreas'} no arquivo (plano do dia, teoria, quizzes, escalas…).</li>
          </ul>
          <p className="muted">Substituir o progresso troca o deste navegador pelo do arquivo.</p>
        </>
      ),
      choices: [
        { label: 'Cancelar', value: 'no', kind: 'plain' },
        { label: 'Só as músicas', value: 'songs', kind: 'plain' },
        { label: 'Músicas e progresso', value: 'all', kind: 'primary' },
      ],
    })
    if (v !== 'songs' && v !== 'all') return
    setBusy(true)
    try {
      await applyImport(r.backup, v === 'all')
    } catch (e) {
      setBusy(false)
      setMsg({ ok: false, text: (e as Error).message })
    }
  }

  return (
    <div className="dlg-back" onMouseDown={(e) => e.target === e.currentTarget && set(false)}>
      <div className="dlg dados" role="dialog" aria-modal="true" aria-labelledby="dados-title" onKeyDown={(e) => e.key === 'Escape' && set(false)}>
        <h2 id="dados-title">Seus dados</h2>
        <p className="dlg-body">
          Tudo o que você faz no solonely (repertório, plano do dia, teoria, quizzes, escalas) fica <b>só neste navegador</b>.
          Limpar os dados de navegação apaga tudo. Faça um backup de vez em quando e guarde o arquivo.
        </p>
        <p className="muted hint">{last ? `Último backup: ${fmt(last)}.` : 'Você ainda não fez nenhum backup neste navegador.'}</p>
        <div className="dados-actions">
          <button type="button" className="play" disabled={busy} onClick={() => void doExport()}>Exportar tudo</button>
          <button type="button" className="btn" disabled={busy} onClick={() => file.current?.click()}>Importar backup…</button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void doImport(f) }} />
        </div>
        {msg && <p className={`dados-msg ${msg.ok ? 'ok' : 'no'}`} role="status">{msg.text}</p>}
        <p className="muted hint">Também serve para levar tudo para outro computador ou para o celular: exporte num, importe no outro.</p>
        <div className="dlg-actions"><button type="button" className="btn" onClick={() => set(false)}>Fechar</button></div>
      </div>
    </div>
  )
}
