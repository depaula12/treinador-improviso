// Placar de ponta a ponta, com microfone falso. Edge headless MUDO.
// 1ª parte (0–22 s): Dó#4 (3ª de A7) palhetado a cada 0,7 s: no Blues de 12 em Lá o placar conta
//   "no alvo" no tempo 1, e cada palhetada repetida vira uma nota acesa no braço.
// 2ª parte: uma frase com notas de veredito diferentes (alvo, acorde, escala, fora).
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Uso: npm run build && npm run preview (outro terminal); npm run e2e:placar [url] [print.png]
const url = process.argv[2] ?? 'http://localhost:4173/#improviso'
const shotPath = process.argv[3]
const browser = process.env.CHROME ?? ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync)
if (!browser) throw new Error('Defina CHROME com o caminho do Chrome/Edge')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PORT = 9336
const dir = mkdtempSync(join(tmpdir(), 'e2e-placar-'))
const wav = join(dir, 'cs.wav')
{
  // Dó#4 com harmônicos, com ataques a cada 0,7 s (como alguém tocando a nota repetida)
  const SR = 48000, secs = 40, n = SR * secs
  // frase da 2ª parte: C#4, E4, D4, F4, G4, C4 (0,35 s cada)
  const PHRASE = [61, 64, 62, 65, 67, 60]
  const freqAt = (t) => (t < 22 ? 277.18 : 440 * 2 ** ((PHRASE[Math.floor((t - 22) / 0.35) % PHRASE.length] - 69) / 12))
  let phase = 0
  const buf = Buffer.alloc(44 + n * 2)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8); buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24)
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const period = t < 22 ? 0.7 : 0.35
    const env = 0.2 + 0.8 * Math.exp(-(((t - (t < 22 ? 0 : 22)) % period) * 5))
    phase += (2 * Math.PI * freqAt(t)) / SR
    let v = 0
    ;[1, 0.5, 0.3, 0.2].forEach((h, k) => (v += h * Math.sin(phase * (k + 1))))
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, 0.22 * env * v)) * 32767), 44 + i * 2)
  }
  writeFileSync(wav, buf)
}
const proc = spawn(browser, [
  '--headless=new', '--disable-gpu', '--mute-audio', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(dir, 'p')}`,
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`,
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
  await send('Emulation.setDeviceMetricsOverride', { width: +(process.env.W ?? 1440), height: +(process.env.H ?? 1000), deviceScaleFactor: 1, mobile: +(process.env.W ?? 1440) < 700 })
  await send('Page.navigate', { url })
  await sleep(3000)
  console.log('ouvir:', await ev(`(() => { const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Placar')); b?.click(); return !!b })()`))
  await sleep(1500)
  await ev(`document.querySelector('.play-btn').click(); true`)
  await sleep(19000) // contagem + ~6 compassos a 90 bpm
  const txt = await ev(`document.querySelector('.listen-panel .downbeat')?.textContent`)
  const alvoN = await ev(`document.querySelector('.listen-panel .downbeat b')?.textContent`)
  console.log('tempo 1:', txt)
  const alvo = Number(alvoN ?? 0)
  const ok1 = alvo >= 3
  console.log(ok1 ? '  ✓ conta o alvo (3ª do A7) no tempo 1' : '  ✗ o placar não contou o alvo')
  const notes = await ev(`({ trail: document.querySelectorAll('.trail .hit').length, lit: document.querySelectorAll('.fb-heard').length, pct: document.querySelector('.big-pct')?.textContent })`)
  console.log('por nota:', JSON.stringify(notes))
  const ok2 = notes.trail >= 8 && notes.lit >= 1
  console.log(ok2 ? '  ✓ cada palhetada repetida vira uma nota acesa e entra na trilha' : '  ✗ as notas tocadas não apareceram')
  // 2ª parte: a frase variada (espera até ela chegar; o áudio falso começa quando a entrada liga)
  let tones = []
  for (let k = 0; k < 50 && tones.length < 3; k++) {
    await sleep(500)
    if (process.env.DEBUG) console.log(k, await ev(`[...document.querySelectorAll('.trail .hit b')].slice(-4).map(b => b.textContent).join(' ')`))
    tones = await ev(`[...new Set([...document.querySelectorAll('.trail .hit')].map(h => h.className.match(/t-(\\w+)/)?.[1]))]`)
  }
  const names = await ev(`[...document.querySelectorAll('.trail .hit b')].map(b => b.textContent).join(' ')`)
  console.log('frase:', names, '| vereditos:', tones.join(', '))
  const ok3 = tones.length >= 3
  console.log(ok3 ? '  ✓ notas diferentes ganham vereditos diferentes' : '  ✗ vereditos não variaram')
  process.exitCode = ok1 && ok2 && ok3 ? 0 : 1
  const bars = await ev(`document.querySelector('.now-card .mono')?.textContent`)
  console.log('posição:', bars)
  if (shotPath) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(shotPath, Buffer.from(r.result.data, 'base64')) }
  await ev(`document.querySelector('.play-btn').click(); true`)
  ws.close()
} finally {
  proc.kill()
}
