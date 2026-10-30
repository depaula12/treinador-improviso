// Escalas conferidas pelo áudio, de ponta a ponta. Edge headless MUDO, microfone falso.
// O microfone toca a pentatônica menor de Lá (box 1) subindo, nota por nota (0,8 s cada).
// No modo "espera por você" o exercício só anda quando a nota certa soa: depois de ~9 s
// ele deve estar umas 10 notas à frente, todas marcadas como certas.
// Uso: npm run build && npm run preview (outro terminal); npm run e2e:escalas [url] [print.png]
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const url = process.argv[2] ?? 'http://localhost:4173/'
const shotPath = process.argv[3]
const browser = process.env.CHROME ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync)
if (!browser) throw new Error('Defina CHROME com o caminho do Chrome/Edge')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PORT = 9337
const dir = mkdtempSync(join(tmpdir(), 'e2e-escalas-'))
const wav = join(dir, 'pent.wav')
// box 1 de Lá menor pentatônica, subindo (6ª corda casa 5 até a 1ª casa 8)
const UP = [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72]
{
  const SR = 48000, NOTE = 0.8, lead = 1.5, secs = lead + UP.length * NOTE + 2, n = Math.round(SR * secs)
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR - lead
    const k = Math.floor(t / NOTE)
    let v = 0
    if (t >= 0 && k < UP.length) {
      const f = 440 * 2 ** ((UP[k] - 69) / 12)
      phase += (2 * Math.PI * f) / SR
      const env = Math.exp(-((t % NOTE) * 2.5))
      ;[1, 0.5, 0.3, 0.2].forEach((h, j) => (v += h * Math.sin(phase * (j + 1))))
      v *= env
    }
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, 0.25 * v)) * 32767), 44 + i * 2)
  }
  writeFileSync(wav, buf)
}
const proc = spawn(browser, [
  '--headless=new', '--disable-gpu', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(dir, 'p')}`,
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}%noloop`,
  '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' })
try {
  for (let i = 0; i < 40; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); break } catch { await sleep(250) } }
  const tab = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value
  await send('Emulation.setDeviceMetricsOverride', { width: +(process.env.W ?? 1440), height: +(process.env.H ?? 1100), deviceScaleFactor: 1, mobile: +(process.env.W ?? 1440) < 700 })
  await send('Page.navigate', { url })
  await sleep(2500)
  // treino padrão: pentatônica menor de Lá, box 1, subir e descer, modo "espera"
  await ev(`localStorage.removeItem('escalas-v1'); true`)
  await send('Page.reload')
  await sleep(2500)
  await ev(`[...document.querySelectorAll('.nav-btn')].find(b => b.textContent.trim() === 'Escalas').click(); true`)
  await sleep(800)
  if (process.env.MODE === 'metronomo') {
    // no metrônomo: semínimas a 75 bpm (0,8 s por nota, como o áudio); só confere que os vereditos aparecem
    await ev(`localStorage.setItem('escalas-v1', JSON.stringify({ state: { perBeat: 1, bpm: 75, countIn: false }, version: 0 })); true`)
    await send('Page.reload')
    await sleep(2500)
    await ev(`[...document.querySelectorAll('.nav-btn')].find(b => b.textContent.trim() === 'Escalas').click(); true`)
    await sleep(800)
    await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Conferir o que eu toco')).click(); true`)
    // o áudio falso começa 1,5 s depois de ligar a entrada: o play no mesmo instante alinha o tempo
    await sleep(Number(process.env.DELAY ?? 1500))
    await ev(`document.querySelector('.play-btn').click(); true`)
    await sleep(9500)
    const m = await ev(`({ cfg: [...document.querySelectorAll('.cfg-row select')].map(s => s.value).join('/') + ' bpm ' + document.querySelector('.player .bpm, .player-bpm, .player b')?.textContent, pos: document.querySelector('.ex-top .mono')?.textContent, vereditos: [...document.querySelectorAll('.seq span.v')].map(s => s.className.match(/v-(\\w+)/)[1]).join(' ') })`)
    console.log('no metrônomo:', JSON.stringify(m))
    const okM = (m.vereditos ?? '').split(' ').filter(Boolean).length >= 6
    console.log(okM ? '  ✓ cada nota do exercício recebe um veredito' : '  ✗ sem vereditos no metrônomo')
    if (shotPath) { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(shotPath, Buffer.from(s.result.data, 'base64')) }
    await ev(`document.querySelector('.play-btn').click(); true`)
    process.exitCode = okM ? 0 : 1
    ws.close()
    proc.kill()
    process.exit(process.exitCode)
  }
  await ev(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Espera por você').click(); true`)
  await sleep(300)
  // Começar (liga a guitarra sozinho e espera a 1ª nota)
  await ev(`document.querySelector('.play-btn').click(); true`)
  await sleep(10500)
  const r = await ev(`({
    pos: document.querySelector('.ex-top .mono')?.textContent,
    certas: document.querySelectorAll('.seq span.v-certo').length,
    erradas: document.querySelectorAll('.seq span.v-errado, .seq span.v-oitava, .seq span.v-tempo').length,
    acesas: document.querySelectorAll('.fb-heard').length,
  })`)
  console.log('modo espera:', JSON.stringify(r))
  const idx = Number(r.pos?.match(/nota (\d+)/)?.[1] ?? 0)
  const ok = idx >= 8 && r.certas >= 7 && r.erradas <= 1
  console.log(ok ? '  ✓ anda a cada nota certa e marca como certa' : '  ✗ o exercício não acompanhou as notas tocadas')
  if (shotPath) { const s = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(shotPath, Buffer.from(s.result.data, 'base64')) }
  process.exitCode = ok ? 0 : 1
  ws.close()
} finally {
  proc.kill()
}
