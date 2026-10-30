// Imprime docs/guia/guia.html em PDF com Chrome/Edge headless (DevTools Protocol), com rodapé paginado.
// Uso: node docs/guia/gerar-guia.mjs && node docs/guia/imprimir-pdf.mjs [saida.pdf]
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const out = process.argv[2] ?? join(here, 'guia-do-iniciante.pdf')
const PORT = 9335
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser =
  process.env.CHROME ??
  ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync)
if (!browser) throw new Error('Defina CHROME com o caminho do Chrome/Edge')

const proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'guia-'))}`, 'about:blank'], { stdio: 'ignore' })
try {
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/json/version`)
      break
    } catch {
      await sleep(250)
    }
  }
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    pending.get(m.id)?.(m)
    pending.delete(m.id)
  })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

  await send('Page.enable')
  await send('Page.navigate', { url: pathToFileURL(join(here, 'guia.html')).href })
  await sleep(4000) // fontes do Google e imagens
  await send('Runtime.evaluate', { expression: 'document.fonts.ready', awaitPromise: true })
  const footer = `<div style="width:100%;font:8px sans-serif;color:#8a8f96;text-align:center;padding:0 15mm">
    Guia do Treinador de Improviso · treinador-improviso.vercel.app · <span class="pageNumber"></span>/<span class="totalPages"></span></div>`
  const r = await send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: footer,
  })
  if (!r.result?.data) throw new Error(`falhou: ${JSON.stringify(r.error ?? r)}`)
  writeFileSync(out, Buffer.from(r.result.data, 'base64'))
  console.log('ok', out)
  ws.close()
} finally {
  proc.kill()
}
