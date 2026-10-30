// Teste ponta a ponta da Jam livre num navegador de verdade (Chrome/Edge headless):
// gera um blues sintético (A7 D7 A7 E7), entrega como se fosse o microfone, liga a entrada pelo
// DevTools Protocol e confere acordes, tom e sugestões. Uso:
//   npm run build && npm run preview     (em outro terminal)
//   npm run e2e                          (ou: node scripts/e2e-jam.mjs <url> [print.png])
// Navegador: variável CHROME, senão procura Edge/Chrome nos caminhos padrão.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = process.argv[2] ?? 'http://localhost:4173/#jam'
const shotPath = process.argv[3]
const PORT = 9334
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- áudio: acordes de guitarra sintéticos, 3 s cada ----------
function strumWav(file) {
  const SR = 48000
  const LOW = [40, 45, 50, 55, 59, 64]
  const SHAPES = { A7: [null, 0, 2, 0, 2, 0], D7: [null, null, 0, 2, 1, 2], E7: [0, 2, 0, 1, 0, 0] }
  const seq = ['A7', 'D7', 'A7', 'E7']
  const DUR = 3
  const total = SR * DUR * seq.length
  const buf = new Float32Array(total)
  seq.forEach((name, ci) => {
    SHAPES[name].forEach((f, s) => {
      if (f === null) return
      const freq = 440 * 2 ** ((LOW[s] + f - 69) / 12)
      const delay = Math.floor(s * 0.015 * SR)
      for (let i = 0; i < DUR * SR - delay; i++) {
        const t = i / SR
        let v = 0
        ;[1, 0.6, 0.4, 0.25, 0.15].forEach((h, k) => (v += h * Math.sin(2 * Math.PI * freq * (k + 1) * t) * Math.exp(-t * k * 0.6)))
        buf[ci * DUR * SR + delay + i] += 0.12 * Math.exp(-t * 0.9) * v
      }
    })
  })
  const data = Buffer.alloc(44 + total * 2)
  data.write('RIFF', 0); data.writeUInt32LE(36 + total * 2, 4); data.write('WAVE', 8)
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22)
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 2, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34)
  data.write('data', 36); data.writeUInt32LE(total * 2, 40)
  for (let i = 0; i < total; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2)
  writeFileSync(file, data)
}

const browser =
  process.env.CHROME ??
  [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find(existsSync)
if (!browser) throw new Error('Navegador não encontrado: defina CHROME com o caminho do Chrome/Edge')

const dir = mkdtempSync(join(tmpdir(), 'e2e-jam-'))
const wav = join(dir, 'blues.wav')
strumWav(wav)
const proc = spawn(browser, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(dir, 'profile')}`,
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`,
  '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' })

let failed = false
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
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, userGesture: true })).result?.result?.value

  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1250, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url })
  await sleep(2500)
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Ativar')?.click()`)
  await sleep(14000) // uma volta e pouco da sequência

  // só o histórico da Jam (o Improviso fica montado escondido e também tem uma lista de compassos)
  const history = await evaluate(`[...document.querySelectorAll('.jam-history span')].map(s => s.textContent).join(' ')`)
  const key = await evaluate(`document.querySelector('.jam-key select')?.selectedOptions[0]?.textContent`)
  const sugg = await evaluate(`[...document.querySelectorAll('.sg-name')].map(s => s.textContent).join(' ')`)
  console.log('histórico:', history)
  console.log('tom:', key)
  console.log('sugestões:', sugg)

  const check = (ok, msg) => {
    console.log(ok ? '  ✓' : '  ✗', msg)
    if (!ok) failed = true
  }
  check(/A7 D7 A7 E7/.test(history ?? ''), 'reconhece a sequência A7 D7 A7 E7')
  check(/A maior/.test(key ?? ''), 'estima o tom Lá maior')
  check((sugg ?? '').split(' ').some((s) => ['A7', 'D7', 'E7'].includes(s)), 'sugere acordes do blues em Lá')

  if (shotPath) {
    const shot = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(shotPath, Buffer.from(shot.result.data, 'base64'))
  }
  ws.close()
} finally {
  proc.kill()
}
process.exit(failed ? 1 : 0)
