// Gera docs/guia/guia.html (fonte do PDF do guia do iniciante).
// Diagramas calculados: notas pela afinação padrão, para não haver desenho errado.
// Uso: node docs/guia/gerar-guia.mjs  (depois o PDF é impresso pelo Chrome/Edge headless)
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const shots = (name) => pathToFileURL(join(here, '..', 'screenshots', name)).href

// ---------- teoria mínima para os diagramas ----------
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const OPEN = { 1: 64, 2: 59, 3: 55, 4: 50, 5: 45, 6: 40 } // corda (1 = Mi agudo) -> MIDI
const pcAt = (s, f) => (OPEN[s] + f) % 12
const DEG = { 0: '1', 1: 'b2', 2: '2', 3: 'b3', 4: '3', 5: '4', 6: 'b5', 7: '5', 8: 'b6', 9: '6', 10: 'b7', 11: '7' }

const COLOR = { root: '#c0392b', tone: '#d9822b', scale: '#7d848c', target: '#1d2126', next: '#1f8a9c', plain: '#5b6470' }

/** Braço horizontal (1ª corda em cima, como na tablatura). dots: {s, f, label, kind} */
function fretboard({ lo = 0, hi = 12, dots = [], width = 660, numbers = true, caption = '', narrow = false }) {
  const openW = lo === 0 ? 34 : 0
  const padL = 26
  const padR = 10
  const top = 18
  const step = 22
  const H = top + step * 5 + 34
  const first = lo === 0 ? 0 : lo - 1
  const x0 = padL + openW
  const x1 = width - padR
  const wire = (f) => x0 + ((f - first) / (hi - first)) * (x1 - x0)
  const mid = (f) => (f === 0 ? padL + openW / 2 - 4 : (wire(f - 1) + wire(f)) / 2)
  const y = (s) => top + (s - 1) * step
  let svg = `<svg viewBox="0 0 ${width} ${H}" class="fb" xmlns="http://www.w3.org/2000/svg">`
  svg += `<rect x="${x0}" y="${top - 9}" width="${x1 - x0}" height="${step * 5 + 18}" rx="3" fill="#efe6da"/>`
  for (const f of [3, 5, 7, 9, 15]) if (f > Math.max(lo, 0) - 1 && f <= hi && f >= Math.max(1, lo)) svg += `<circle cx="${mid(f)}" cy="${top + step * 2.5}" r="4" fill="#d8cbb8"/>`
  if (12 >= Math.max(1, lo) && 12 <= hi) svg += `<circle cx="${mid(12)}" cy="${top + step * 1.5}" r="4" fill="#d8cbb8"/><circle cx="${mid(12)}" cy="${top + step * 3.5}" r="4" fill="#d8cbb8"/>`
  for (let f = first; f <= hi; f++) svg += `<line x1="${wire(f)}" y1="${top - 9}" x2="${wire(f)}" y2="${top + step * 5 + 9}" stroke="${f === 0 ? '#3b3b3b' : '#b5a893'}" stroke-width="${f === 0 ? 5 : 1.5}"/>`
  for (let s = 1; s <= 6; s++) svg += `<line x1="${lo === 0 ? padL - 4 : x0}" y1="${y(s)}" x2="${x1}" y2="${y(s)}" stroke="#8c8072" stroke-width="${0.6 + (s - 1) * 0.3}"/>`
  for (let s = 1; s <= 6; s++) svg += `<text x="6" y="${y(s) + 4}" class="sn">${s}</text>`
  if (numbers) for (let f = Math.max(1, lo); f <= hi; f++) svg += `<text x="${mid(f)}" y="${H - 10}" text-anchor="middle" class="fn">${f}</text>`
  for (const d of dots) {
    if (d.f < lo || d.f > hi) continue
    const c = COLOR[d.kind ?? 'plain']
    const r = d.kind === 'scale' && !d.label ? 4.5 : 9
    if (d.kind === 'next') svg += `<circle cx="${mid(d.f)}" cy="${y(d.s)}" r="12" fill="none" stroke="${c}" stroke-width="2.5"/>`
    else svg += `<circle cx="${mid(d.f)}" cy="${y(d.s)}" r="${r}" fill="${c}"/>`
    if (d.label) svg += `<text x="${mid(d.f)}" y="${y(d.s) + 3.6}" text-anchor="middle" class="dl">${d.label}</text>`
  }
  svg += '</svg>'
  return `<figure class="fig${narrow ? ' narrow' : ''}">${svg}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
}

/** Diagrama vertical de acorde. frets: da 6ª para a 1ª corda (null = abafada). */
function chord(name, frets, note = '', rename = {}) {
  const W = 120
  const left = 22
  const top = 34
  const sw = (W - left - 12) / 5
  const fh = 22
  const pressed = frets.filter((f) => f !== null && f > 0)
  const maxF = pressed.length ? Math.max(...pressed) : 0
  const base = maxF <= 4 ? 1 : Math.min(...pressed)
  const rows = 4
  const H = top + rows * fh + 10
  const rootPc = pcAt(6 - frets.findIndex((f) => f !== null), frets.find((f) => f !== null))
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="cd" xmlns="http://www.w3.org/2000/svg">`
  if (base === 1) svg += `<rect x="${left}" y="${top - 4}" width="${sw * 5}" height="4" fill="#1d2126"/>`
  else svg += `<text x="${left - 6}" y="${top + fh / 2 + 4}" text-anchor="end" class="fn">${base}</text>`
  for (let i = 0; i <= rows; i++) svg += `<line x1="${left}" x2="${left + sw * 5}" y1="${top + i * fh}" y2="${top + i * fh}" stroke="#9aa0a6" stroke-width="1"/>`
  for (let i = 0; i < 6; i++) svg += `<line x1="${left + i * sw}" x2="${left + i * sw}" y1="${top}" y2="${top + rows * fh}" stroke="#9aa0a6" stroke-width="${1 + (5 - i) * 0.2}"/>`
  frets.forEach((f, i) => {
    const s = 6 - i
    const x = left + i * sw
    if (f === null) {
      svg += `<text x="${x}" y="${top - 12}" text-anchor="middle" class="mk">×</text>`
      return
    }
    const raw = DEG[(pcAt(s, f) - rootPc + 12) % 12]
    // extensões: o 2 de um acorde com sétima se chama 9, o 6 se chama 13
    const deg = rename[raw] ?? raw
    const isRoot = deg === '1'
    if (f === 0) {
      svg += `<circle cx="${x}" cy="${top - 15}" r="5" fill="none" stroke="${isRoot ? COLOR.root : '#1d2126'}" stroke-width="1.6"/>`
      svg += `<text x="${x}" y="${top - 24}" text-anchor="middle" class="od">${deg}</text>`
      return
    }
    const cy = top + (f - base + 0.5) * fh
    svg += `<circle cx="${x}" cy="${cy}" r="8" fill="${isRoot ? COLOR.root : COLOR.tone}"/><text x="${x}" y="${cy + 3.3}" text-anchor="middle" class="dl">${deg}</text>`
  })
  svg += '</svg>'
  return `<figure class="chord"><div class="cname">${name}</div>${svg}${note ? `<figcaption>${note}</figcaption>` : ''}</figure>`
}

// ---------- dados dos diagramas ----------
const naturals = []
for (let s = 1; s <= 6; s++) for (let f = 0; f <= 12; f++) {
  const n = NAMES[pcAt(s, f)]
  if (!n.includes('#')) naturals.push({ s, f, label: n, kind: n === 'A' ? 'root' : 'plain' })
}

// box 1 da pentatônica menor de Lá (casas 5–8), com graus
const box1 = [
  [6, 5], [6, 8], [5, 5], [5, 7], [4, 5], [4, 7], [3, 5], [3, 7], [2, 5], [2, 8], [1, 5], [1, 8],
].map(([s, f]) => {
  const deg = DEG[(pcAt(s, f) - 9 + 12) % 12]
  return { s, f, label: deg, kind: deg === '1' ? 'root' : 'tone' }
})
const box1Blues = [...box1, ...[[5, 6], [3, 8], [2, 4]].map(([s, f]) => ({ s, f, label: 'b5', kind: 'next' }))]
  .flatMap((d) => (d.kind === 'next' ? [d, { s: d.s, f: d.f, label: 'b5', kind: 'scale' }] : [d]))

// A7 no box 1: notas do acorde (vermelho/laranja) sobre a escala
const a7tones = { 9: '1', 1: '3', 4: '5', 7: 'b7' }
const a7over = []
for (let s = 1; s <= 6; s++) for (let f = 4; f <= 8; f++) {
  const pc = pcAt(s, f)
  if (a7tones[pc]) a7over.push({ s, f, label: a7tones[pc], kind: pc === 9 ? 'root' : 'tone' })
  else if ([9, 0, 2, 4, 7].includes(pc)) a7over.push({ s, f, kind: 'scale' })
}
// alvo: 3ª de A7 (C#) na 3ª corda casa 6 -> b7 de D7 (C) na 3ª corda casa 5
const guide = [
  ...box1.map((d) => ({ ...d, label: '', kind: 'scale' })),
  { s: 3, f: 6, label: 'C#', kind: 'target' },
  { s: 3, f: 5, label: '', kind: 'next' },
]

// ---------- HTML ----------
const css = `
@page { size: A4; margin: 15mm 15mm 17mm; }
:root { --fg:#1d2126; --muted:#5f6872; --line:#dfe3e7; --accent:#c76a12; --root:#c0392b; --soft:#fbf6ef; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; font: 10.5pt/1.55 'IBM Plex Sans', system-ui, sans-serif; color: var(--fg); }
h1, h2, h3 { font-family: 'Fraunces', Georgia, serif; line-height: 1.1; margin: 0; }
h2 { font-size: 24pt; font-variation-settings: 'SOFT' 50; letter-spacing: -.005em; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2px solid var(--accent); break-after: avoid; }
h3 { font-size: 14pt; margin: 6mm 0 2mm; color: var(--accent); break-after: avoid; }
p { margin: 0 0 2.5mm; }
ul, ol { margin: 0 0 3mm; padding-left: 5mm; }
li { margin-bottom: 1mm; }
b { font-weight: 600; }
section { break-before: page; }
section.flow { break-before: auto; }
.kicker { font: 600 9pt 'Fraunces', Georgia, serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.lead { font-size: 11.5pt; color: #333; }
.box { border: 1px solid var(--line); border-left: 4px solid var(--accent); background: var(--soft); padding: 3mm 4mm; border-radius: 2mm; margin: 3mm 0; break-inside: avoid; }
.box.tip { border-left-color: #1f8a9c; background: #f1f8f9; }
.box.warn { border-left-color: var(--root); background: #fbf0ee; }
.box .t { font: 700 10pt 'Fraunces', Georgia, serif; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 1mm; }
.fig { margin: 2.5mm auto; break-inside: avoid; text-align: center; max-width: 88%; }
.fig svg { width: 100%; height: auto; }
.fig.narrow { max-width: 70%; }
.shot.small img { width: 58%; }
figcaption { font-size: 8.5pt; color: var(--muted); margin-top: 1mm; }
.fb .sn, .fb .fn, .cd .fn { font: 500 8px 'IBM Plex Mono', monospace; fill: #6b7280; }
.dl { font: 700 7.5px 'IBM Plex Mono', monospace; fill: #fff; }
.mk { font: 500 11px 'IBM Plex Mono', monospace; fill: #6b7280; }
.od { font: 600 7px 'IBM Plex Mono', monospace; fill: #6b7280; }
.chords { display: flex; flex-wrap: wrap; gap: 2mm 3mm; justify-content: center; margin: 2mm 0; break-inside: avoid; }
.chord { margin: 0; width: 23mm; text-align: center; }
.chord svg { width: 100%; }
.cname { font: 700 13pt 'Fraunces', Georgia, serif; }
.shot { margin: 2mm 0 3mm; break-inside: avoid; text-align: center; }
.shot img { width: 74%; border-radius: 2mm; border: 1px solid #ccc; }
.shot.half img { width: 52%; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9.5pt; break-inside: avoid; }
table.dense { font-size: 8.8pt; }
table.dense td, table.dense th { padding: 1.1mm 1.6mm; }
th, td { border-bottom: 1px solid var(--line); padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
th { font: 700 9pt 'Fraunces', Georgia, serif; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); border-bottom: 2px solid var(--line); }
.grid12 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; margin: 3mm 0; break-inside: avoid; }
.grid12 div { border: 1px solid var(--line); border-radius: 1.5mm; padding: 2mm; font: 700 13pt 'Fraunces', Georgia, serif; display: flex; justify-content: space-between; }
.grid12 small { font: 500 7.5pt 'IBM Plex Mono', monospace; color: var(--muted); }
.grid12 .iv { background: #fdf1e3; } .grid12 .v { background: #fbe4e1; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.tag { display: inline-block; font: 600 8pt 'IBM Plex Mono', monospace; background: #eef0f2; border-radius: 1mm; padding: 0 1.5mm; }
.ui { font: 600 9pt 'IBM Plex Mono', monospace; background: #f1ede6; border: 1px solid #e2d8c8; border-radius: 1mm; padding: 0 1.2mm; white-space: nowrap; }
.legend { display: flex; gap: 4mm; justify-content: center; font-size: 8.5pt; color: var(--muted); flex-wrap: wrap; }
.legend i { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; margin-right: 1mm; vertical-align: -0.4mm; }
.cover { height: 262mm; display: flex; flex-direction: column; justify-content: space-between; break-before: auto; }
.cover h1 { font-size: 46pt; font-variation-settings: 'SOFT' 60; letter-spacing: -.01em; }
.brand { font: 700 30pt 'Fraunces', Georgia, serif; letter-spacing: -.02em; margin-bottom: 8mm; }
.brand span { color: var(--accent); }
.cover h1 span { color: var(--accent); }
.cover .sub { font-size: 14pt; color: #444; max-width: 140mm; margin-top: 5mm; }
.toc { columns: 2; column-gap: 8mm; font-size: 10pt; }
.toc li { break-inside: avoid; }
.check li { list-style: none; margin-left: -5mm; }
.check li::before { content: '☐ '; color: var(--accent); }
.prio { font: 700 8pt 'IBM Plex Mono', monospace; padding: 0.3mm 1.5mm; border-radius: 1mm; color: #fff; }
.p1 { background: #c0392b; } .p2 { background: #d9822b; } .p3 { background: #7d848c; }
.ex { border: 1.5px dashed #c9b79c; border-radius: 2.5mm; padding: 3mm 4mm 2mm; margin: 4mm 0; background: #fffdf9; break-inside: avoid; }
.ex .t { font: 700 12pt 'Fraunces', Georgia, serif; color: var(--accent); margin-bottom: 1.5mm; }
.ex .t small { font: 500 8.5pt 'IBM Plex Sans', sans-serif; color: var(--muted); margin-left: 2mm; }
.ex ol { margin-bottom: 1.5mm; }
.ex li { margin-bottom: 1.4mm; }
.ex .app { font-size: 9.5pt; border-top: 1px solid #eee3d3; padding-top: 1.5mm; margin-top: 1mm; }
.blank { display: inline-block; min-width: 18mm; border-bottom: 1px solid #b9ab95; height: 3.5mm; vertical-align: -0.6mm; }
.answers { columns: 2; column-gap: 7mm; font-size: 9pt; }
.answers h3 { font-size: 11.5pt; margin: 3mm 0 1mm; break-after: avoid; }
.answers ol { margin-bottom: 1.5mm; }
.answers li { margin-bottom: .6mm; }
.cols2 { columns: 2; column-gap: 7mm; }
`

const L = (c) => `<i style="background:${c}"></i>`
const legend = `<div class="legend"><span>${L(COLOR.root)}fundamental (1)</span><span>${L(COLOR.tone)}notas do acorde/desenho</span><span>${L(COLOR.scale)}outras notas da escala</span><span>${L(COLOR.target)}alvo sugerido</span><span><i style="border:2px solid ${COLOR.next}"></i>próximo</span></div>`

// ---------- exercícios: cada um guarda a resposta para o gabarito no fim ----------
const answers = []
const blank = '<span class="blank"></span>'
const noteAt = (s, f) => NAMES[pcAt(s, f)]
/** qs: [pergunta, resposta]; app: como treinar o mesmo assunto no solonely. */
function ex(part, qs, app = '', title = 'Exercícios') {
  answers.push({ part, a: qs.map((q) => q[1]) })
  return `<div class="ex"><div class="t">${title}<small>respostas na Parte 15</small></div><ol>${qs.map((q) => `<li>${q[0]}</li>`).join('')}</ol>${app ? `<div class="app"><b>No app:</b> ${app}</div>` : ''}</div>`
}
const renderAnswers = () =>
  answers.map((g) => `<h3>${g.part}</h3><ol>${g.a.map((a) => `<li>${a}</li>`).join('')}</ol>`).join('')

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Guia do solonely.</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,400..800,0..100&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600;700&display=swap">
<style>${css}</style></head><body>

<div class="cover">
  <div>
    <div class="brand">solonely<span>.</span></div>
    <div class="kicker">Guia do iniciante · edição 2</div>
    <h1>Do zero ao <span>improviso</span></h1>
    <p class="sub">Como usar o solonely. para evoluir na guitarra: a teoria explicada sem complicação (com exercícios e gabarito), a harmonia para compor, um plano de estudo para 2 horas por dia e os próximos passos do app.</p>
  </div>
  ${fretboard({ lo: 4, hi: 9, dots: a7over, caption: 'A7 sobre a pentatônica menor de Lá (box 1): o tipo de "mapa" que o app mostra enquanto a base toca.' })}
  <div>
    <h3 style="margin-top:0">Neste guia</h3>
    <ol class="toc">
      <li>Antes de começar: equipamento e as 7 áreas</li>
      <li>Notas e o braço</li>
      <li>Intervalos e graus (1, 3, 5, b7, 9…)</li>
      <li>Acordes: tríades, tétrades e extensões</li>
      <li>Escalas, modos e arpejos</li>
      <li>Tom, campo harmônico e o blues de 12</li>
      <li>Harmonia para compor</li>
      <li>Ritmo, levadas e estilos</li>
      <li>Notas-alvo: o segredo do improviso</li>
      <li>Conhecendo cada área do app</li>
      <li>Plano de evolução em 4 fases</li>
      <li>Rotina diária de 2 horas</li>
      <li>Erros comuns e como saber que evoluiu</li>
      <li>Glossário</li>
      <li>Respostas dos exercícios</li>
      <li>Próximos passos do software</li>
    </ol>
    <p style="margin-top:4mm"><b>App:</b> treinador-improviso.vercel.app</p>
  </div>
</div>

<section>
  <div class="kicker">Parte 1</div>
  <h2>Antes de começar</h2>
  <p class="lead">O app faz três papéis: <b>banda de apoio</b> (toca a base para você), <b>mapa</b> (mostra no braço para onde mirar) e <b>ouvido</b> (escuta sua guitarra e diz o que você tocou). Você não precisa saber teoria para começar: o mapa mostra; a teoria deste guia explica <i>por que</i> funciona.</p>

  <h3>Como montar o som</h3>
  <table>
    <tr><th>Para quê</th><th>Ligação</th><th>Observação</th></tr>
    <tr><td><b>Praticar com a base</b> (Improviso, Escalas)</td><td>Guitarra → Cube Baby (som da guitarra)<br>PC/celular → fone ou caixinha <b>com fio</b> (som da base)</td><td>Bluetooth atrasa a base ~0,2 s e atrapalha o tempo.</td></tr>
    <tr><td><b>O app ouvir você</b> (Afinador, Jam livre)</td><td>Guitarra → Cube Baby → <b>cabo USB de dados</b> → PC</td><td>No Windows ele aparece como "Linha (USB-Audio)". Cabo só de carga não funciona.</td></tr>
    <tr><td>Celular sem cabo</td><td>Microfone do celular perto do Cube Baby (30–50 cm)</td><td>Funciona, mas pior que o USB. Ambiente silencioso.</td></tr>
  </table>
  <div class="box tip"><div class="t">Som limpo para o app ouvir</div>Distorção e fuzz embaralham as notas. Para Afinador e Jam livre, use timbre limpo. Para improvisar com a base, use o timbre que quiser: aí é o seu ouvido que julga.</div>

  <h3>Como abrir o app</h3>
  <ul>
    <li><b>Mais fácil:</b> abra <span class="ui">treinador-improviso.vercel.app</span> no navegador (no celular: menu → Adicionar à tela inicial).</li>
    <li><b>No PC, versão de desenvolvimento:</b> PowerShell na pasta do projeto → <span class="ui">npm.cmd run dev</span> → <span class="ui">localhost:5173</span>.</li>
  </ul>

  <h3>O app tem 7 áreas</h3>
  <table>
    <tr><th>Área</th><th>Serve para</th><th>Você precisa de</th></tr>
    <tr><td><b>Improviso</b></td><td>Tocar livre sobre uma base, com o braço mostrando notas do acorde e alvos. Com a guitarra ligada, um placar conta quantas vezes você acertou o alvo.</td><td>Fone/caixinha (e o Cube Baby para o placar)</td></tr>
    <tr><td><b>Músicas</b></td><td>Colar a cifra das músicas da banda e transformar em base, cifra rolando e quiz.</td><td>A cifra (copiada do Cifra Club, por exemplo)</td></tr>
    <tr><td><b>Compor</b></td><td>Montar progressões pelo efeito (tensão, energia, melancolia…), em Pop/Rock, Blues ou Bossa/Jazz, ouvir e salvar.</td><td>Fone/caixinha</td></tr>
    <tr><td><b>Acordes</b></td><td>Quiz com centenas de perguntas: desenhos, graus, notas, o que muda de um acorde para outro, níveis 1–4.</td><td>Nada (ou a guitarra no cronometrado)</td></tr>
    <tr><td><b>Escalas</b></td><td>Desenhos (boxes), modos e arpejos com metrônomo; quiz "onde está a nota".</td><td>Fone/caixinha</td></tr>
    <tr><td><b>Jam livre</b></td><td>Você toca; o app reconhece acorde e tom e sugere o próximo acorde e o alvo.</td><td>Cube Baby no USB</td></tr>
    <tr><td><b>Afinador</b></td><td>Afinar e ver que nota/acorde você está tocando.</td><td>Cube Baby no USB</td></tr>
  </table>
  <div class="box"><div class="t">Como navegar</div>O <b>menu lateral</b> leva às áreas (no celular ele vira uma barra embaixo). O <b>player fixo</b> no rodapé tem tocar/parar, andamento, contagem, loop e mixer em todas as telas; a <b>barra de espaço</b> toca e para.</div>
</section>

<section>
  <div class="kicker">Parte 2 · Teoria mínima</div>
  <h2>Notas e o braço</h2>
  <p>A música ocidental usa <b>12 notas</b> que se repetem em ciclos (oitavas):</p>
  <p style="text-align:center;font:600 12pt 'IBM Plex Mono',monospace">C · C# · D · D# · E · F · F# · G · G# · A · A# · B · (C de novo)</p>
  <ul>
    <li>Nomes em português: C = Dó, D = Ré, E = Mi, F = Fá, G = Sol, A = Lá, B = Si.</li>
    <li><b>#</b> (sustenido) sobe meia nota; <b>b</b> (bemol) desce. C# e Db são a <b>mesma nota</b> com dois nomes.</li>
    <li>Entre <b>E e F</b> e entre <b>B e C</b> não existe nota preta: elas ficam "coladas".</li>
  </ul>
  <div class="box"><div class="t">A regra de ouro do braço</div><b>Cada casa = meia nota (um semitom).</b> Andar 1 casa sobe meia nota; 2 casas, uma nota inteira (um tom). Na <b>casa 12</b> tudo se repete uma oitava acima.</div>
  <p>As cordas soltas, da mais grossa (6ª) para a mais fina (1ª), são <b>E A D G B E</b> (Mi Lá Ré Sol Si Mi). Frase para decorar: <i>"<b>E</b>u <b>A</b>mo <b>D</b>oce <b>G</b>elado <b>B</b>em <b>E</b>stimado"</i>.</p>
  ${fretboard({ lo: 0, hi: 12, dots: naturals, caption: 'Mapa das notas naturais (sem # nem b) até a casa 12. Em vermelho, todos os Lá (A). Corda 1 = Mi agudo, em cima, como na tablatura.' })}
  <h3>Por onde começar a decorar</h3>
  <ol>
    <li><b>Cordas 6 e 5</b> primeiro: são onde ficam as fundamentais dos acordes com pestana. Na 6ª: E(0) F(1) G(3) A(5) B(7) C(8) D(10) E(12). Na 5ª: A(0) B(2) C(3) D(5) E(7) F(8) G(10) A(12).</li>
    <li>A <b>1ª corda é igual à 6ª</b> (as duas são Mi).</li>
    <li>Truque da <b>oitava</b>: a mesma nota fica 2 cordas acima e 2 casas à frente (da 6ª para a 4ª, da 5ª para a 3ª). Exemplo: Lá na 6ª casa 5 → Lá na 4ª casa 7.</li>
  </ol>
  <div class="box tip"><div class="t">No app</div><span class="ui">Escalas → Onde está a nota?</span> faz exatamente esse treino: pergunta "onde está o Lá na 3ª corda?" e você clica no braço, ou toca a nota na guitarra (com o Cube Baby ligado). Desmarque "Só notas de…" para treinar todas as notas.</div>
  ${ex('Parte 2 · Notas e o braço', [
    [`Que nota é: 6ª corda casa 3 ${blank} · 5ª casa 7 ${blank} · 4ª casa 4 ${blank} · 3ª casa 2 ${blank} · 2ª casa 1 ${blank} · 1ª casa 7 ${blank}`,
      `${noteAt(6, 3)} · ${noteAt(5, 7)} · ${noteAt(4, 4)} · ${noteAt(3, 2)} · ${noteAt(2, 1)} · ${noteAt(1, 7)}`],
    [`Em que casa está o Dó (C) na 6ª corda? ${blank} E na 5ª? ${blank}`, '6ª corda: casa 8 · 5ª corda: casa 3'],
    [`Truque da oitava: o Lá da 6ª corda casa 5 aparece de novo na 4ª corda, casa ${blank}. O Ré da 5ª casa 5 aparece na 3ª corda, casa ${blank}.`, '4ª corda casa 7 (A) · 3ª corda casa 7 (D)'],
    [`C# e Db são a mesma nota? ${blank} Que nota fica 1 casa acima de E? ${blank} E 1 casa acima de B? ${blank}`, 'Sim (mesma casa, dois nomes) · F (não existe E#) · C'],
    [`Na casa 12 de qualquer corda soa a mesma nota da corda solta, só que ${blank}.`, 'uma oitava acima (mais aguda)'],
  ], '<span class="ui">Escalas → Onde está a nota?</span>, 3 rodadas de 20 perguntas por dia até acertar 90% em menos de 3 s cada.')}
</section>

<section>
  <div class="kicker">Parte 3 · Teoria mínima</div>
  <h2>Intervalos e graus</h2>
  <p><b>Intervalo</b> é a distância entre duas notas. Em vez de decorar nomes de notas em cada tom, músicos pensam em <b>graus</b>: a posição de cada nota em relação à "nota de casa" (a <b>fundamental</b>, grau 1). O app mostra esses números dentro das bolinhas.</p>
  <table>
    <tr><th>Grau</th><th>Distância da fundamental</th><th>Em Lá (A)</th><th>Som / função</th></tr>
    <tr><td><b>1</b></td><td>0 (a própria)</td><td>A</td><td>Casa, repouso total.</td></tr>
    <tr><td><b>b3</b></td><td>3 casas</td><td>C</td><td>Som menor, triste ou "blues".</td></tr>
    <tr><td><b>3</b></td><td>4 casas</td><td>C#</td><td>Som maior, alegre. Define se o acorde é maior.</td></tr>
    <tr><td><b>4</b></td><td>5 casas</td><td>D</td><td>Tensão que "quer" voltar para a 3.</td></tr>
    <tr><td><b>b5</b></td><td>6 casas</td><td>Eb</td><td>A "blue note": tempero do blues, de passagem.</td></tr>
    <tr><td><b>5</b></td><td>7 casas</td><td>E</td><td>Estável, neutro, encorpa.</td></tr>
    <tr><td><b>6</b></td><td>9 casas</td><td>F#</td><td>Doce, típico de pop e country.</td></tr>
    <tr><td><b>b7</b></td><td>10 casas</td><td>G</td><td>Som de blues/rock: deixa o acorde "com gingado".</td></tr>
    <tr><td><b>7</b></td><td>11 casas</td><td>G#</td><td>Sofisticado, jazzístico (acorde 7M).</td></tr>
  </table>
  <div class="box"><div class="t">Por que pensar em graus</div>Um desenho de dedos com <b>graus</b> funciona em qualquer tom: é só deslizar o desenho pelo braço. A fundamental muda, os graus continuam no mesmo lugar relativo. É por isso que o app escreve 1, 3, b7 e não só os nomes das notas.</div>
  <h3>Depois da oitava: 9, 11 e 13</h3>
  <p>Quando um acorde já tem 1, 3, 5 e 7, as notas que sobram ganham nomes "depois da oitava": a <b>2 vira 9</b>, a <b>4 vira 11</b> e a <b>6 vira 13</b>. É a mesma nota, só que pensada uma oitava acima, por cima do acorde. São as <b>extensões</b>, as "cores" da bossa e do jazz (Parte 4).</p>
  <table class="dense">
    <tr><th>Extensão</th><th>Igual a</th><th>Em Dó (C)</th><th>Cifra típica</th><th>Som</th></tr>
    <tr><td><b>9</b></td><td>2</td><td>D</td><td>C7M(9), Am7(9), G7(9)</td><td>Abre e ilumina o acorde</td></tr>
    <tr><td><b>b9</b></td><td>b2</td><td>Db</td><td>G7(b9)</td><td>Tensão dramática (dominante em tom menor)</td></tr>
    <tr><td><b>#9</b></td><td>b3 sobre acorde maior</td><td>D# (= Eb)</td><td>E7(#9), "o acorde do Hendrix"</td><td>Maior e menor ao mesmo tempo: blues-rock</td></tr>
    <tr><td><b>11</b></td><td>4</td><td>F</td><td>Am7(11)</td><td>Aberto, moderno (bom em acordes menores)</td></tr>
    <tr><td><b>13</b></td><td>6</td><td>A</td><td>G7(13)</td><td>Doce e suave sobre o dominante (bossa)</td></tr>
  </table>
  ${ex('Parte 3 · Intervalos e graus', [
    [`Quantas casas da fundamental até: b3 ${blank} · 3 ${blank} · 5 ${blank} · b7 ${blank} · 7 ${blank}`, '3 · 4 · 7 · 10 · 11'],
    [`Em Mi (E), que nota é: 3 ${blank} · b3 ${blank} · 5 ${blank} · b7 ${blank}`, 'G# · G · B · D'],
    [`Em Sol (G): b7 ${blank} · 7 ${blank} · 6 ${blank} · 9 ${blank}`, 'F · F# · E · A'],
    [`Que grau é F# em relação a D? ${blank} · C em relação a A? ${blank} · Bb em relação a C? ${blank} · E em relação a D? ${blank}`, '3 (terça maior) · b3 (terça menor) · b7 · 9 (ou 2)'],
    [`Por que G7(13) e G6 têm a mesma nota extra (E)? ${blank}`, 'Porque a 13 é a 6 uma oitava acima: em G, as duas são E. No G7(13) ela vem por cima do acorde com sétima; no G6 não há sétima.'],
  ], '<span class="ui">Acordes → Treinar</span>, modo <span class="ui">Nota de cada grau</span>, nível 1. Quando passar de 80%, níveis 2, 3 e 4 (entram m7, 7M e, no 4, os acordes 6, 9 e de jazz).')}
</section>

<section>
  <div class="kicker">Parte 4 · Teoria mínima</div>
  <h2>Acordes: como são montados</h2>
  <p>Acorde é um conjunto de notas tocadas juntas. Quase todos nascem de <b>empilhar graus</b> a partir da fundamental:</p>
  <table>
    <tr><th>Tipo</th><th>Cifra</th><th>Graus</th><th>Em Lá</th><th>Som</th></tr>
    <tr><td>Power chord</td><td>A5</td><td>1 · 5</td><td>A E</td><td>Neutro, pesado (rock com distorção)</td></tr>
    <tr><td>Maior</td><td>A</td><td>1 · 3 · 5</td><td>A C# E</td><td>Alegre, aberto</td></tr>
    <tr><td>Menor</td><td>Am</td><td>1 · b3 · 5</td><td>A C E</td><td>Triste, sério</td></tr>
    <tr><td>Dominante (sétima)</td><td>A7</td><td>1 · 3 · 5 · b7</td><td>A C# E G</td><td>Blues, tensão que pede resolução</td></tr>
    <tr><td>Menor com sétima</td><td>Am7</td><td>1 · b3 · 5 · b7</td><td>A C E G</td><td>Suave, funk/soul</td></tr>
    <tr><td>Sétima maior</td><td>A7M</td><td>1 · 3 · 5 · 7</td><td>A C# E G#</td><td>Sonhador, bossa/jazz</td></tr>
    <tr><td>Suspensos</td><td>Asus2 / Asus4</td><td>1 · 2 · 5 / 1 · 4 · 5</td><td>A B E / A D E</td><td>"Em suspenso", sem ser maior nem menor</td></tr>
  </table>
  <div class="box"><div class="t">A diferença entre maior e menor é UMA nota</div>A <b>3ª</b> decide: com a 3 (4 casas) é maior; com a b3 (3 casas) é menor. Compare os desenhos de A e Am abaixo: só uma bolinha muda.</div>
  <h3>Os primeiros acordes para decorar (abertos)</h3>
  <div class="chords">
    ${chord('E', [0, 2, 2, 1, 0, 0])}${chord('A', [null, 0, 2, 2, 2, 0])}${chord('D', [null, null, 0, 2, 3, 2])}${chord('G', [3, 2, 0, 0, 0, 3])}${chord('C', [null, 3, 2, 0, 1, 0])}
  </div>
  <div class="chords">
    ${chord('Em', [0, 2, 2, 0, 0, 0])}${chord('Am', [null, 0, 2, 2, 1, 0])}${chord('Dm', [null, null, 0, 2, 3, 1])}
  </div>
  <h3>Os acordes do blues (com sétima)</h3>
  <div class="chords">
    ${chord('A7', [null, 0, 2, 0, 2, 0])}${chord('D7', [null, null, 0, 2, 1, 2])}${chord('E7', [0, 2, 0, 1, 0, 0])}${chord('A5', [null, 0, 2, 2, null, null], 'power chord')}${chord('E5', [0, 2, 2, null, null, null], 'power chord')}
  </div>
  <h3>Formas móveis: um desenho, 12 acordes</h3>
  <p>Com pestana, o mesmo desenho vira qualquer acorde: a fundamental fica na <b>6ª</b> ou na <b>5ª corda</b>, e você desliza até a nota que quer. Exemplo: o desenho de Fá na casa 1 vira Sol na casa 3, Lá na casa 5.</p>
  <div class="chords">
    ${chord('F (6ª corda)', [1, 3, 3, 2, 1, 1], 'casa 1 = F · 3 = G · 5 = A')}${chord('Fm (6ª)', [1, 3, 3, 1, 1, 1])}${chord('F7 (6ª)', [1, 3, 1, 2, 1, 1])}${chord('Bb (5ª corda)', [null, 1, 3, 3, 3, 1], 'casa 1 = Bb · 3 = C · 5 = D')}${chord('Bbm (5ª)', [null, 1, 3, 3, 2, 1])}
  </div>
  <h3>Tétrades e extensões: os acordes "coloridos"</h3>
  <p>Na bossa, no jazz e no soul quase todo acorde tem sétima (<b>tétrade</b> = 4 notas) e muitos ganham uma extensão. Em cifra brasileira, a sétima maior se escreve <b>7M</b> e as extensões vão entre parênteses.</p>
  <table class="dense">
    <tr><th>Cifra (em Dó)</th><th>Nome</th><th>Graus</th><th>Notas</th><th>Onde aparece</th></tr>
    <tr><td><b>C6</b></td><td>com sexta</td><td>1 3 5 6</td><td>C E G A</td><td>Pop antigo, bossa, blues de big band</td></tr>
    <tr><td><b>C6(9)</b> (ou C6/9)</td><td>sexta e nona</td><td>1 3 5 6 9</td><td>C E G A D</td><td>A tônica típica da bossa</td></tr>
    <tr><td><b>C7M(9)</b></td><td>sétima maior e nona</td><td>1 3 5 7 9</td><td>C E G B D</td><td>Tônica sofisticada</td></tr>
    <tr><td><b>Cm7(9)</b></td><td>menor com sétima e nona</td><td>1 b3 5 b7 9</td><td>C Eb G Bb D</td><td>ii7 do ii–V, soul</td></tr>
    <tr><td><b>C9</b> = C7(9)</td><td>dominante com nona</td><td>1 3 5 b7 9</td><td>C E G Bb D</td><td>Funk, blues, R&amp;B</td></tr>
    <tr><td><b>C7(13)</b></td><td>dominante com 13</td><td>1 3 b7 13</td><td>C E Bb A</td><td>Bossa (a 5 costuma sair)</td></tr>
    <tr><td><b>C7(#9)</b></td><td>dominante com nona aumentada</td><td>1 3 b7 #9</td><td>C E Bb D#</td><td>Blues-rock</td></tr>
    <tr><td><b>Cm6</b></td><td>menor com sexta</td><td>1 b3 5 6</td><td>C Eb G A</td><td>Tônica menor da bossa</td></tr>
    <tr><td><b>Cm7(b5)</b> (ou Cø)</td><td>meio-diminuto</td><td>1 b3 b5 b7</td><td>C Eb Gb Bb</td><td>ii do ii–V em tom menor</td></tr>
    <tr><td><b>Cº7</b></td><td>diminuto</td><td>1 b3 b5 6 (bb7)</td><td>C Eb Gb A</td><td>Passagem entre dois acordes</td></tr>
  </table>
  <div class="chords">
    ${chord('C7M', [null, 3, 2, 0, 0, 0])}${chord('Am7', [null, 0, 2, 0, 1, 0])}${chord('Dm7', [null, null, 0, 2, 1, 1])}${chord('G7', [3, 2, 0, 0, 0, 1])}${chord('C6(9)', [null, 3, 2, 2, 3, 3], '', { 2: '9' })}
  </div>
  <div class="chords">
    ${chord('Dm7(9)', [null, 5, 3, 5, 5, 5], '', { 2: '9' })}${chord('G7(13)', [3, null, 3, 4, 5, null], '', { 6: '13' })}${chord('E7(#9)', [null, 7, 6, 7, 8, null], '', { b3: '#9' })}${chord('Bm7(b5)', [null, 2, 3, 2, 3, null])}${chord('C#º7', [null, 4, 5, 3, 5, null])}
  </div>
  <div class="box"><div class="t">Regra de guitarrista: o que pode sair</div>Seis cordas, quatro dedos: nos acordes de 5 ou mais notas, a <b>5ª justa costuma sair</b> (ela não muda o "tipo" do acorde). A <b>3ª e a 7ª nunca saem</b>: são elas que dizem se o acorde é maior, menor ou dominante. O gerador de desenhos do app segue essa regra.</div>
  <h3>Tríades nas cordas agudas e inversões</h3>
  <p>Uma tríade (1 3 5) pode ser tocada só em 3 cordas vizinhas, e com qualquer nota embaixo: com a <b>fundamental</b> no baixo (estado fundamental), com a <b>3ª</b> (1ª inversão) ou com a <b>5ª</b> (2ª inversão). Na cifra, a nota do baixo vem depois da barra: <b>C/E</b> é Dó com Mi no baixo. Tríades pequenas soam limpas por cima da banda e ensinam o braço inteiro; o quiz de Acordes tem as três inversões em três grupos de cordas.</p>
  <div class="box tip"><div class="t">No app</div><span class="ui">Acordes → Consultar</span>: digite qualquer cifra e veja graus, notas e <b>todas as formas tocáveis</b> no braço. <span class="ui">Acordes → Treinar</span>: escolha o <b>nível</b> (1 = abertos básicos … 3 = formas pelo braço e tríades, 4 = tudo, com os acordes de jazz) ou monte o seu marcando tipos e formas. Use <span class="ui">▶ Ouvir a resposta</span> para ligar o desenho ao som.</div>
  ${ex('Parte 4 · Acordes', [
    [`Escreva as notas: D ${blank} · Dm ${blank} · D7 ${blank} · Dm7 ${blank} · D7M ${blank}`, 'D F# A · D F A · D F# A C · D F A C · D F# A C#'],
    [`Que acorde é: C E G Bb ${blank} · A C E G ${blank} · F A C E ${blank} · B D F A ${blank} · E G# B D F# ${blank}`, 'C7 · Am7 · F7M · Bm7(b5) · E9 (= E7(9))'],
    [`O que muda (qual nota, quanto) de C para Cm? ${blank} De C7 para C7M? ${blank} De Am7 para Am7(b5)? ${blank}`, 'a 3ª desce meio tom (E → Eb) · a b7 sobe meio tom (Bb → B) · a 5ª desce meio tom (E → Eb)'],
    [`Num G7(13) com 4 notas, qual nota provavelmente saiu? ${blank} Por quê? ${blank}`, 'A 5ª (D), e às vezes a 9ª (A): não mudam o tipo do acorde; a 3ª (B) e a b7 (F) ficam'],
    [`C/E: qual nota está no baixo? ${blank} Que inversão é? ${blank} E C/G? ${blank}`, 'E (a 3ª) · 1ª inversão · G no baixo: 2ª inversão'],
    [`Monte Gº7 a partir de G subindo de 3 em 3 casas: ${blank}. Por que Gº7, Bbº7, C#º7 e Eº7 têm as mesmas notas? ${blank}`, 'G Bb Db E (Fb) · o diminuto divide a oitava em 4 partes iguais (3 casas cada): qualquer nota dele pode ser a fundamental'],
  ], '<span class="ui">Acordes → Treinar</span>, modo <span class="ui">Misturado</span>, nível 2, sessão de 20. Os tipos <span class="ui">Graus no desenho</span> e <span class="ui">O que muda</span> treinam exatamente estas perguntas.')}
</section>

<section>
  <div class="kicker">Parte 5 · Teoria mínima</div>
  <h2>Escalas e desenhos (boxes)</h2>
  <p><b>Escala</b> é um conjunto de notas que "combinam" num tom. Para blues e rock, a mais útil de todas é a <b>pentatônica menor</b>: só 5 notas, quase impossível de soar errado.</p>
  <table>
    <tr><th>Escala</th><th>Graus</th><th>Em Lá</th><th>Usar em</th></tr>
    <tr><td><b>Pentatônica menor</b></td><td>1 · b3 · 4 · 5 · b7</td><td>A C D E G</td><td>Blues, rock, quase tudo "com atitude"</td></tr>
    <tr><td><b>Blues</b></td><td>pentatônica menor + b5</td><td>A C D <b>Eb</b> E G</td><td>Blues; a b5 é tempero de passagem</td></tr>
    <tr><td><b>Pentatônica maior</b></td><td>1 · 2 · 3 · 5 · 6</td><td>A B C# E F#</td><td>Pop, country, rock alegre</td></tr>
    <tr><td>Maior</td><td>1 2 3 4 5 6 7</td><td>A B C# D E F# G#</td><td>Base de toda a teoria tonal</td></tr>
    <tr><td>Menor natural</td><td>1 2 b3 4 5 b6 b7</td><td>A B C D E F G</td><td>Rock e baladas em tom menor</td></tr>
  </table>
  <h3>O box 1: o desenho mais famoso da guitarra</h3>
  <p>As 5 notas se espalham pelo braço todo, mas os guitarristas decoram em <b>5 desenhos</b> (boxes) que se encaixam um no outro. O <b>box 1</b> começa na fundamental da 6ª corda: em Lá, na casa 5. São duas notas por corda.</p>
  ${fretboard({ lo: 4, hi: 9, dots: box1, narrow: true, caption: 'Pentatônica menor de Lá, box 1 (casas 5–8). Os números são os graus. Em vermelho, as fundamentais (Lá).' })}
  ${fretboard({ lo: 3, hi: 9, dots: box1Blues, narrow: true, caption: 'A mesma região com a b5 (Eb) da escala blues, marcada com anel: use de passagem, não para parar em cima.' })}
  <div class="box"><div class="t">Os 5 boxes em Lá</div>Box 1: casas 5–8 · Box 2: 7–10 · Box 3: 9–13 · Box 4: 12–15 (ou 0–3) · Box 5: 2–5 (ou 14–17). Mudou o tom? O desenho é o mesmo, só muda a casa de partida. Em Mi, o box 1 começa na casa 0 (corda solta).</div>
  <div class="box tip"><div class="t">No app</div><span class="ui">Escalas → Exercícios</span>, Box 1, <span class="ui">Subir e descer</span>, a 60 bpm em colcheias. Siga a bolinha branca. Quando sair sem erro 3 vezes seguidas, suba 5 bpm.</div>
  <h3>Modos: a mesma escala maior, outra "casa"</h3>
  <p>Um <b>modo</b> é a escala maior começando em outra nota. Muda a nota de repouso e, com ela, o clima. Os dois mais úteis para blues e rock mudam <b>uma nota só</b> em relação a uma escala que você já conhece:</p>
  <table class="dense">
    <tr><th>Escala</th><th>Graus</th><th>Em Lá</th><th>Compara com</th><th>Use sobre</th></tr>
    <tr><td><b>Mixolídio</b></td><td>1 2 3 4 5 6 b7</td><td>A B C# D E F# G</td><td>a maior com b7</td><td>Acorde 7 (A7): o som "maior com gingado"</td></tr>
    <tr><td><b>Dórico</b></td><td>1 2 b3 4 5 6 b7</td><td>A B C D E F# G</td><td>a menor natural com 6</td><td>Acorde m7 (Am7): menor sem drama, funk e rock (Santana)</td></tr>
    <tr><td><b>Menor harmônica</b></td><td>1 2 b3 4 5 b6 7</td><td>A B C D E F G#</td><td>a menor natural com 7</td><td>O V7 de um tom menor (E7 em Lá menor): som "árabe/flamenco"</td></tr>
    <tr><td><b>Blues maior</b></td><td>1 2 b3 3 5 6</td><td>A B C C# E F#</td><td>pentatônica maior + b3</td><td>Blues "alegre", country, B.B. King</td></tr>
  </table>
  <h3>Arpejos: o acorde tocado nota por nota</h3>
  <p><b>Arpejo</b> é tocar só as notas do acorde, uma de cada vez. Se você conhece o arpejo de cada acorde, sabe onde estão as notas-alvo (Parte 9) em qualquer lugar do braço. O app tem arpejos maior (1 3 5), menor (1 b3 5), 7 (1 3 5 b7), m7 (1 b3 5 b7) e 7M (1 3 5 7).</p>
  <div class="box tip"><div class="t">No app: a escala que acompanha o acorde</div>No <span class="ui">Improviso</span>, a escala <span class="ui">acompanha o acorde</span> troca sozinha: mixolídio no acorde 7, dórico no m7, menor natural na tônica menor. É o jeito mais fácil de ouvir a diferença entre os modos.</div>
  ${ex('Parte 5 · Escalas', [
    [`Pentatônica menor de Mi: ${blank} · de Ré: ${blank}`, 'E G A B D · D F G A C'],
    [`Pentatônica maior de Sol: ${blank}. Que pentatônica menor tem as mesmas notas? ${blank}`, 'G A B D E · a de Mi menor (E G A B D): são relativas, mesma "casa" deslocada'],
    [`Escala maior de Ré: ${blank}. Mixolídio de Lá: ${blank}`, 'D E F# G A B C# · A B C# D E F# G'],
    [`Que nota separa o dórico de Lá da menor natural de Lá? ${blank}`, 'A 6: F# no dórico, F na menor natural'],
    [`Que escala combina com: A7 ${blank} · Dm7 ${blank} · E7 em Lá menor ${blank} · Am (tônica) ${blank}`, 'mixolídio de Lá (ou a pentatônica) · dórico de Ré · menor harmônica de Lá (G#) · menor natural ou pentatônica menor de Lá'],
    [`Arpejo de C7M: ${blank} · de Em7: ${blank} · de D7: ${blank}`, 'C E G B · E G B D · D F# A C'],
  ], '<span class="ui">Escalas</span>: escolha <span class="ui">Dórico</span> e depois <span class="ui">Menor natural</span> em Lá, box 1, <span class="ui">Subir e descer</span> com <span class="ui">tocar as notas</span> ligado, e compare o som da 6ª.')}
</section>

<section>
  <div class="kicker">Parte 6 · Teoria mínima</div>
  <h2>Tom, progressão e o blues de 12</h2>
  <p><b>Tom</b> é a "casa" da música: a nota/acorde onde tudo repousa. Os outros acordes recebem números romanos conforme a distância até essa casa: <b>I</b> (casa), <b>IV</b> (5 casas acima), <b>V</b> (7 casas acima). Minúsculo = menor (vi, ii).</p>
  <table>
    <tr><th>Tom</th><th>I</th><th>IV</th><th>V</th><th>vi</th><th>bVII</th></tr>
    <tr><td>Lá</td><td>A</td><td>D</td><td>E</td><td>F#m</td><td>G</td></tr>
    <tr><td>Mi</td><td>E</td><td>A</td><td>B</td><td>C#m</td><td>D</td></tr>
    <tr><td>Sol</td><td>G</td><td>C</td><td>D</td><td>Em</td><td>F</td></tr>
    <tr><td>Dó</td><td>C</td><td>F</td><td>G</td><td>Am</td><td>Bb</td></tr>
  </table>
  <h3>O blues de 12 compassos</h3>
  <p>A progressão mais tocada do blues e do rock antigo. Em Lá, cada caixa é um compasso (4 tempos):</p>
  <div class="grid12">
    ${['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'A7', 'A7', 'E7', 'D7', 'A7', 'E7'].map((c, i) => `<div class="${c === 'D7' ? 'iv' : c === 'E7' ? 'v' : ''}">${c}<small>${i + 1} · ${c === 'A7' ? 'I' : c === 'D7' ? 'IV' : 'V'}</small></div>`).join('')}
  </div>
  <p>Repare no <b>desenho</b>: 4 compassos em casa (I), sai para o IV, volta, vai ao V, passa pelo IV e volta. O último E7 é a <b>virada</b> (turnaround) que empurra de volta para o começo. Quando você sente essa forma, nunca mais se perde.</p>
  <p>O <b>quick change</b> (outra opção no app) só troca o compasso 2 por D7.</p>
  <h3>Campo harmônico: os 7 acordes de um tom</h3>
  <p>Empilhando terças sobre cada nota da escala maior, saem os 7 acordes "da casa". O padrão é sempre o mesmo em qualquer tom: <b>maior, menor, menor, maior, maior, menor, diminuto</b>. Com a sétima (tétrades) também:</p>
  <table class="dense">
    <tr><th>Grau</th><th>I</th><th>ii</th><th>iii</th><th>IV</th><th>V</th><th>vi</th><th>viiº</th></tr>
    <tr><td><b>Dó</b></td><td>C</td><td>Dm</td><td>Em</td><td>F</td><td>G</td><td>Am</td><td>Bº</td></tr>
    <tr><td>tétrades</td><td>C7M</td><td>Dm7</td><td>Em7</td><td>F7M</td><td>G7</td><td>Am7</td><td>Bm7(b5)</td></tr>
    <tr><td><b>Sol</b></td><td>G</td><td>Am</td><td>Bm</td><td>C</td><td>D</td><td>Em</td><td>F#º</td></tr>
    <tr><td><b>Ré</b></td><td>D</td><td>Em</td><td>F#m</td><td>G</td><td>A</td><td>Bm</td><td>C#º</td></tr>
    <tr><td><b>Lá</b></td><td>A</td><td>Bm</td><td>C#m</td><td>D</td><td>E</td><td>F#m</td><td>G#º</td></tr>
    <tr><td><b>Mi</b></td><td>E</td><td>F#m</td><td>G#m</td><td>A</td><td>B</td><td>C#m</td><td>D#º</td></tr>
  </table>
  <h3>Tom menor</h3>
  <p>Cada tom maior tem um <b>relativo menor</b> com as mesmas notas, começando no vi: Dó maior ↔ Lá menor, Sol ↔ Mi menor. No tom menor, os graus se contam a partir da tônica menor: <b>i · iiº · bIII · iv · v · bVI · bVII</b> (em Lá menor: Am Bº C Dm Em F G). Na prática, o <b>v</b> menor vira <b>V7</b> (E7 em Lá menor) para "puxar" mais forte para a casa: é a nota G# da menor harmônica.</p>
  <h3>Outras progressões do app</h3>
  <ul>
    <li><b>I–V–vi–IV</b> (G D Em C): metade das músicas pop do mundo. Em menor: <b>i–bVI–bIII–bVII</b> (Am F C G).</li>
    <li><b>I–bVII–IV</b> (D C G): rock clássico. Em menor: <b>i–bVII–bVI</b> (Em D C).</li>
    <li><b>Blues menor de 12</b>, <b>i–iv–v</b> e a <b>andaluza</b> i–bVII–bVI–V (Am G F E7).</li>
  </ul>
  <div class="box tip"><div class="t">No app</div>O seletor de <span class="ui">Tom</span> do Improviso tem os 24 tons ("Am (Lá menor)"). Numa progressão pronta, trocar maior ↔ menor troca a base pela equivalente (Blues de 12 ↔ Blues menor). Para as músicas da banda, digite a progressão (<span class="ui">Am*2 G F E7</span>, o *2 repete o compasso) ou cole a cifra em <span class="ui">Músicas</span>.</div>
  ${ex('Parte 6 · Tom e campo harmônico', [
    [`Campo harmônico de Fá maior (tríades): ${blank}`, 'F Gm Am Bb C Dm Eº'],
    [`Tétrades de Sol maior: ${blank}`, 'G7M Am7 Bm7 C7M D7 Em7 F#m7(b5)'],
    [`Em Dó maior, que grau é: Am ${blank} · F ${blank} · G7 ${blank} · Dm7 ${blank} · Em ${blank}`, 'vi · IV · V7 · ii7 · iii'],
    [`Escreva o blues de 12 em Mi (um acorde por compasso): ${blank}`, 'E7 E7 E7 E7 · A7 A7 E7 E7 · B7 A7 E7 B7'],
    [`Qual o relativo menor de Sol? ${blank} E o relativo maior de Ré menor? ${blank}`, 'Mi menor (Em) · Fá maior (F)'],
    [`Qual o tom provável de: G D Em C ${blank} · Am F C G ${blank} · Em D C D ${blank}`, 'Sol maior · Lá menor (começa e repousa em Am; Dó maior seria a outra leitura) · Mi menor (ou Sol maior: ambíguo, é o caso em que a Jam livre mostra o rival para você fixar)'],
    [`Em Lá menor, por que se usa E7 e não Em? ${blank}`, 'O E7 tem G#, meio tom abaixo do A: puxa com força para a tônica (a "sensível")'],
  ], '<span class="ui">Jam livre</span>: toque estas progressões e veja se o tom estimado bate com a sua resposta. <span class="ui">Improviso</span>: troque Lá maior por Lá menor e ouça a base mudar.')}
</section>

<section>
  <div class="kicker">Parte 7 · Teoria para compor</div>
  <h2>Harmonia para compor</h2>
  <p class="lead">Esta é a teoria por trás da área <b>Compor</b>. Ela explica <i>por que</i> cada opção do "E agora?" causa o efeito que promete. São tendências da música ocidental, não leis: o ouvido sempre decide.</p>
  <h3>Funções: casa, afastamento e tensão</h3>
  <table class="dense">
    <tr><th>Função</th><th>Graus (maior)</th><th>Em Dó</th><th>Sensação</th></tr>
    <tr><td><b>Tônica</b></td><td>I · vi · iii</td><td>C · Am · Em</td><td>Casa, repouso</td></tr>
    <tr><td><b>Subdominante</b></td><td>IV · ii</td><td>F · Dm</td><td>Sai de casa, abre, prepara</td></tr>
    <tr><td><b>Dominante</b></td><td>V7 · viiº</td><td>G7 · Bº</td><td>Tensão que pede para voltar</td></tr>
  </table>
  <p>Por que o V7 pede tanto para voltar? Ele tem a <b>sensível</b> (a 7ª nota da escala, B em Dó), meio tom abaixo da tônica, e um <b>trítono</b> (B–F, 6 casas) que "resolve" fechando em C–E. Esse é o motor de quase toda música tonal.</p>
  <h3>Cadências: como terminar uma frase</h3>
  <table class="dense">
    <tr><th>Cadência</th><th>Graus</th><th>Em Dó</th><th>Efeito no app</th></tr>
    <tr><td>Perfeita</td><td>V7 → I</td><td>G7 → C</td><td>Conclusão forte</td></tr>
    <tr><td>Plagal ("amém")</td><td>IV → I</td><td>F → C</td><td>Conclusão sóbria</td></tr>
    <tr><td>Plagal menor</td><td>iv → I</td><td>Fm → C</td><td>Saudade (muito usada na bossa como ivm6)</td></tr>
    <tr><td>Épica (emprestada)</td><td>bVI → bVII → I</td><td>Ab → Bb → C</td><td>Conclusão épica, final de show</td></tr>
    <tr><td>Suspensa (meia cadência)</td><td>termina no V</td><td>… → G</td><td>Deixar em suspense: pede a próxima seção</td></tr>
  </table>
  <h3>Empréstimo modal: acordes do tom menor no tom maior</h3>
  <p>Em Dó maior, dá para "pegar emprestado" acordes de Dó menor: <b>iv</b> (Fm), <b>bVI</b> (Ab), <b>bVII</b> (Bb), <b>bIII</b> (Eb). Eles trazem cor de rock (bVII), drama de trilha de filme (bVI) ou um aperto no peito (iv). No app, aparecem em Surpresa, Melancolia e Conclusão épica.</p>
  <h3>Dominantes secundários: o V de outro acorde</h3>
  <p>Qualquer acorde do tom pode ganhar o seu próprio V7. Em Dó: <b>A7 → Dm</b> (o V7 do ii), <b>D7 → G</b> (o V7 do V, chamado II7), <b>E7 → Am</b> (o V7 do vi, o III7). É assim que baladas e bossas "andam" com força de um acorde para outro sem sair do tom.</p>
  <h3>Bossa e jazz: ii–V–I, trítono e diminuto</h3>
  <ul>
    <li><b>ii–V–I</b> (Dm7 → G7 → C7M): a frase-base do jazz; o ii prepara, o V cria a tensão, o I resolve. Em tom menor: <b>iiø → V7(b9) → im6</b> (Bm7(b5) → E7(b9) → Am6).</li>
    <li><b>Substituto trítono</b>: troque o V7 pelo dominante meio tom acima da tônica. G7 vira <b>Db7</b>: os dois têm o mesmo trítono (B/Cb e F). Dm7 → Db7 → C7M faz o baixo descer cromático.</li>
    <li><b>Diminuto de passagem</b>: um º7 meio tom abaixo do acorde de chegada liga dois acordes: C7M → <b>C#º7</b> → Dm7. No blues: A7 → D7 → <b>D#º7</b> → A7.</li>
    <li><b>I7M → II7</b> (C7M → D7): o II7 sai do tom de propósito e dá aquele balanço típico de bossa nova.</li>
    <li><b>Colorir</b>: troque a tríade pela tétrade e pela extensão sem mudar a função: C → C7M → C7M(9) → C6(9); Am → Am7 → Am7(9); G7 → G7(9) → G7(13).</li>
  </ul>
  <h3>Blues: tudo com sétima</h3>
  <p>No blues a tônica já é dominante (A7, não A7M): por isso a pentatônica menor "briga" bonito com o acorde (Parte 9). Caminhos clássicos: <b>quick change</b> (IV7 no compasso 2), <b>V7 → IV7 → I7</b> no fim, <b>turnaround</b> I7 → VI7 → ii7 → V7 (A7 F#7 Bm7 E7) e o <b>bVII7</b> do blues-rock.</p>
  <h3>Condução de vozes: trocas fáceis e bonitas</h3>
  <p>Entre dois acordes, prefira desenhos <b>perto um do outro</b>: as notas em comum ficam paradas e as outras andam meio tom ou um tom. Soa mais "ligado" e a mão quase não anda. Exemplo: Dm7 (xx0211) → G7 (320001) → C7M (x32000), tudo na 1ª posição. No Compor, o botão <span class="ui">Aproximar os desenhos</span> faz essa escolha para a progressão inteira.</p>
  ${ex('Parte 7 · Harmonia', [
    [`Em Dó, classifique pela função: Am ${blank} · F ${blank} · G7 ${blank} · Dm7 ${blank} · Em ${blank}`, 'tônica · subdominante · dominante · subdominante · tônica'],
    [`Em Ré maior: cadência perfeita ${blank} · plagal ${blank}`, 'A7 → D · G → D'],
    [`ii–V–I em Fá: ${blank} · em Sib: ${blank}`, 'Gm7 → C7 → F7M · Cm7 → F7 → Bb7M'],
    [`Em Dó, que dominante secundário leva para Dm? ${blank} E para Am? ${blank}`, 'A7 (o V7 de Ré) · E7 (o V7 de Lá)'],
    [`Substituto trítono de G7: ${blank}. De E7: ${blank}`, 'Db7 · Bb7'],
    [`Diminuto de passagem entre C e Dm: ${blank}. Entre F e G7? ${blank}`, 'C#º7 · F#º7'],
    [`Acordes emprestados de Dó menor em Dó maior (iv, bVI, bVII): ${blank}`, 'Fm · Ab · Bb'],
    [`"Colorir" Am em três passos: ${blank}`, 'Am → Am7 → Am7(9) (e na bossa, Am6)'],
    [`Por que o V7 → I soa conclusivo? ${blank}`, 'A sensível (3ª do V7) sobe meio tom até a tônica e a b7 do V7 desce até a 3ª do I: o trítono resolve'],
  ], '<span class="ui">Compor</span> em Dó, linguagem <span class="ui">Pop/Rock</span>: C → <i>Melancolia</i> → <i>Subir a energia</i> → <i>Conclusão forte</i>. Troque para <span class="ui">Bossa/Jazz</span>, selecione o último acorde, peça <i>Conclusão épica</i> (ii–bII7–I) e use <span class="ui">colorir</span>. Ouça cada opção antes de usar e compare com o seu gabarito.')}
</section>

<section>
  <div class="kicker">Parte 8 · Teoria mínima</div>
  <h2>Ritmo: tempo, compasso e shuffle</h2>
  <ul>
    <li><b>Tempo (pulso)</b>: o "1, 2, 3, 4" que você bate o pé. <b>BPM</b> = batidas por minuto (60 bpm = 1 por segundo).</li>
    <li><b>Compasso</b>: um grupo de 4 tempos. No app, cada caixinha da faixa de acordes é um compasso.</li>
    <li><b>Semínima</b>: 1 nota por tempo. <b>Colcheia</b>: 2 por tempo ("1 e 2 e"). <b>Tercina</b>: 3 por tempo ("1-e-a"). <b>Semicolcheia</b>: 4 por tempo.</li>
    <li><b>Contratempo</b>: o "e", entre os tempos. Frases que começam no contratempo soam mais soltas.</li>
  </ul>
  <div class="box"><div class="t">Shuffle: o balanço do blues</div>No shuffle as colcheias não são iguais: a primeira é longa e a segunda curta, como "<b>TAAA</b>-da, <b>TAAA</b>-da". Tecnicamente é a tercina sem a nota do meio. Diga em voz alta "<i>pão</i>-de, <i>pão</i>-de" no ritmo da base. O <b>slow blues 12/8</b> é o mesmo balanço, devagar, com as 3 notas de cada tempo bem marcadas.</div>
  <h3>Como treinar ritmo sem perceber</h3>
  <ol>
    <li>Sempre bata o pé no tempo 1 e 3 enquanto toca.</li>
    <li>No <span class="ui">Improviso</span>, use a restrição <span class="ui">Frase de 1 compasso, pausa de 1 compasso</span>: obriga a contar.</li>
    <li>Em <span class="ui">Escalas</span>, troque o <span class="ui">Ritmo</span> de colcheias para tercinas no mesmo exercício.</li>
    <li>Silêncio também é música: pausas deixam as frases mais "faladas".</li>
  </ol>
  <h3>Estilos e levadas</h3>
  <p>A base do app tem 5 <b>estilos</b> (bateria, baixo e piano): shuffle de blues, rock reto, slow blues 12/8, pop rock/balada e <b>bossa nova</b>. No Compor, cada seção pode ter a sua <b>levada de violão</b>. Leia "B" como palhetada para baixo e "C" para cima, uma letra por colcheia:</p>
  <table class="dense">
    <tr><th>Levada</th><th>Como se toca</th><th>Onde cai a força</th></tr>
    <tr><td>Pop (baixo-cima)</td><td>B . B C . C B C</td><td>Nos tempos 1, 2 e 4; as "C" são leves</td></tr>
    <tr><td>Balada dedilhada</td><td>polegar no baixo no 1 e no 3; os dedos sobem e descem as cordas em colcheias</td><td>No baixo, deixando soar</td></tr>
    <tr><td>Rock em colcheias</td><td>B B B B B B B B nas cordas graves</td><td>Acento nos tempos</td></tr>
    <tr><td>Reggae</td><td>acorde curto e seco só nos tempos 2 e 4</td><td>No contratempo do compasso</td></tr>
    <tr><td>Funk</td><td>mão em semicolcheias o tempo todo; poucas batidas soam, o resto é abafado ("tchk")</td><td>Na síncope (entre os tempos)</td></tr>
    <tr><td>Shuffle</td><td>B-C com o balanço tercinado</td><td>Tempos 2 e 4 (com a caixa)</td></tr>
    <tr><td>Bossa nova</td><td>polegar no baixo no 1 e no 3; dedos sincopados nos agudos, num desenho de 2 compassos</td><td>Na síncope dos dedos contra o polegar reto</td></tr>
  </table>
  ${ex('Parte 8 · Ritmo', [
    [`Num compasso de 4 tempos cabem quantas colcheias? ${blank} Semicolcheias? ${blank} Tercinas? ${blank}`, '8 · 16 · 12'],
    [`A 60 bpm cada tempo dura ${blank} s; a 120 bpm, ${blank} s. Um acorde de ½ compasso a 90 bpm dura ${blank} s.`, '1 s · 0,5 s · 2 tempos × 0,667 s ≈ 1,33 s'],
    [`Na levada pop B . B C . C B C, em quais contratempos ("e") a mão vai para cima? ${blank}`, 'No "e" do 2, no "e" do 3 e no "e" do 4'],
    [`No reggae, o violão toca em quais tempos? ${blank} E no rock reto, a caixa da bateria? ${blank}`, '2 e 4 · também 2 e 4 (o "contratempo" do compasso)'],
    [`Shuffle: as duas colcheias de cada tempo duram igual? ${blank} Que divisão do tempo ele usa? ${blank}`, 'Não: longa-curta · a tercina, sem a nota do meio (2/3 + 1/3)'],
  ], '<span class="ui">Compor</span>: monte 4 acordes, toque com a base e troque a levada da seção entre Pop, Reggae, Funk e Bossa, batendo palma junto com a "força" de cada uma.')}
</section>

<section>
  <div class="kicker">Parte 9 · O conceito mais importante</div>
  <h2>Notas-alvo: o segredo do improviso</h2>
  <p class="lead">Tocar a escala certa evita notas erradas. Mas o que faz o improviso soar <b>musical</b> é <b>onde você para</b>. As notas que mais "encaixam" num acorde são as <b>notas do próprio acorde</b>, principalmente a <b>3ª</b> e a <b>7ª</b>, que dizem se ele é maior, menor ou dominante.</p>
  ${fretboard({ lo: 4, hi: 9, dots: a7over, caption: 'Box 1 com o A7 tocando: vermelho = fundamental (A), laranja = 3, 5 e b7 do acorde (C#, E, G), cinza = resto da pentatônica.' })}
  ${legend}
  <h3>A regra prática</h3>
  <ol>
    <li>Durante o compasso, passeie pela escala à vontade (bolinhas cinza).</li>
    <li>Nos pontos de apoio, principalmente o <b>tempo 1 de cada compasso</b>, pouse numa bolinha <b>laranja ou vermelha</b>.</li>
    <li>Quando o acorde muda, as bolinhas mudam de lugar: mire nas novas.</li>
  </ol>
  <h3>Notas-guia: a linha que liga os acordes</h3>
  <p>O app marca uma <b>bolinha branca</b> por compasso: a 3ª ou a 7ª do acorde, escolhida sempre <b>perto da anterior</b>. Assim os alvos formam uma linha suave. O exemplo clássico: a 3ª de A7 (C#) desce <b>meia casa</b> e vira a b7 de D7 (C). Esse movimento de meio tom é o som de "resolução" do blues.</p>
  ${fretboard({ lo: 4, hi: 9, dots: guide, caption: 'Alvo no A7: C# (3ª corda, casa 6). O anel marca o alvo do próximo acorde, D7: C (casa 5), meia casa abaixo.' })}
  <div class="box warn"><div class="t">A "briga" boa do blues: C contra C#</div>A pentatônica menor de Lá tem <b>C</b>; o acorde A7 tem <b>C#</b>. Tocar C sobre A7 soa "blueseiro" (tensão); C# soa "resolvido". Os grandes fazem os dois: tocam o C e <b>puxam a corda (bend)</b> ou <b>deslizam</b> até o C#. Teste no box 1, 3ª corda: casa 5 (C) → casa 6 (C#).</div>
  ${ex('Parte 9 · Notas-alvo', [
    [`Notas-guia (3 e b7) de: A7 ${blank} · D7 ${blank} · E7 ${blank}`, 'A7: C# e G · D7: F# e C · E7: G# e D'],
    [`De A7 para D7, que nota-guia anda só meio tom? ${blank} E de E7 para A7? ${blank}`, 'C# (3 de A7) desce para C (b7 de D7); ou G (b7 de A7) desce para F# (3 de D7) · D (b7 de E7) desce para C# (3 de A7)'],
    [`No ii–V–I Dm7 → G7 → C7M, siga a linha que começa na b7 de Dm7: ${blank}`, 'C (b7 de Dm7) → B (3 de G7) → B (7 de C7M): quase parada, só meio tom'],
    [`Sobre A7, a nota C da pentatônica menor é "errada"? ${blank} O que fazer com ela? ${blank}`, 'Não: é a tensão do blues (b3 sobre acorde maior) · use de passagem e puxe (bend) ou deslize até C#'],
    [`Por que pousar a frase no tempo 1? ${blank}`, 'É o ponto mais forte do compasso: a nota do acorde ali deixa claro que você "ouviu" a troca'],
  ], '<span class="ui">Improviso</span>, Blues de 12 em Lá, <span class="ui">Alvos sugeridos</span> ligado e o <span class="ui">Placar</span> ouvindo a guitarra. Meta: 8 de 12 compassos no alvo; depois tente com o box escondido.')}
</section>

<section>
  <div class="kicker">Parte 10 · O app</div>
  <h2>Improviso</h2>
  <div class="shot small"><img src="${shots('improviso-desktop.png')}"></div>
  <ol>
    <li><b>Agora / faixa / Próxima troca</b>: o acorde atual em letra grande, a progressão andando até a linha "agora" e quanto falta para mudar.</li>
    <li><b>Braço</b> de ponta a ponta: vermelho = fundamental, laranja = notas do acorde, cinza = escala, <b>branco = alvo sugerido</b>, anel azul = notas do próximo acorde no tempo 4. <span class="ui">Box 1–5 / Todo</span> destaca a região do desenho escolhido.</li>
    <li><b>Base</b> (abaixo do braço, tudo à vista): progressão (pronta, digitada, música ou composição), tom com os 24 tons, estilo, escala (inclusive <span class="ui">acompanha o acorde</span>), virada e andamento.</li>
    <li><b>Restrição</b> e a lista de compassos da progressão, com o compasso da vez aceso.</li>
    <li><b>Placar</b>: com a guitarra ligada, o app confere o tempo 1 de cada compasso: no alvo, outra nota do acorde ou fora.</li>
    <li><b>Player</b> no rodapé: tocar (ou espaço), bpm, contagem, loop e mixer.</li>
  </ol>
  <div class="two">
    <div class="box tip"><div class="t">Configuração para começar</div>Blues de 12 · Lá · Shuffle · Pentatônica menor · 70–80 bpm · Box 1 · Alvos sugeridos ligado.</div>
    <div class="box"><div class="t">Mixer</div>Deixe bateria e baixo ligados. Piano e violão preenchem; desligue se ficar embolado com a sua guitarra.</div>
  </div>
  <h3>Restrições: o professor exigente</h3>
  <p>No cartão <span class="ui">Restrição</span> (ou <span class="ui">Sortear</span>). Uma por sessão:</p>
  <table class="dense">
    <tr><th>Restrição</th><th>O que treina</th></tr>
    <tr><td>Só 3 notas da escala</td><td>Ritmo e expressão em vez de "correr" na escala.</td></tr>
    <tr><td>Termine cada frase na 3ª do acorde</td><td>Notas-alvo; o som "certo" de cada acorde.</td></tr>
    <tr><td>Frase de 1 compasso, pausa de 1</td><td>Contar, respirar, frasear como quem fala.</td></tr>
    <tr><td>Pergunta e resposta</td><td>Conversa musical: 2 tempos tocando, 2 escutando.</td></tr>
    <tr><td>Só o desenho (box) N</td><td>Dominar um desenho por vez.</td></tr>
    <tr><td>Só nas cordas 1 e 2</td><td>Criatividade com poucos recursos; melodia.</td></tr>
    <tr><td>Repita a mesma frase em cada acorde</td><td>Ouvir como a mesma ideia muda de cor sobre cada acorde.</td></tr>
  </table>
</section>

<section>
  <div class="kicker">Parte 10 · O app</div>
  <h2>Músicas: o repertório da banda</h2>
  <div class="shot small"><img src="${shots('musicas.png')}"></div>
  <ol>
    <li><span class="ui">Nova música</span> → cole a cifra inteira (acordes em cima da letra, como no Cifra Club). O app separa acordes, seções ([Intro], [Refrão]…), entende cifra brasileira (A7(9), G7M, E4, Bº), repete o que tem (2x) e pula tablatura. Capotraste vira transposição.</li>
    <li><b>Grade de compassos</b>: um acorde por compasso. Clique para juntar dois no mesmo compasso (2+2), separar, repetir, apagar ou trocar.</li>
    <li><b>Marcar tempos com a gravação</b>: com a música original tocando, bata no tempo (o app acha o BPM) e depois a cada troca; vira a duração real de cada acorde.</li>
    <li><b>Cifra rolando</b>: a base toca a música e a grade acompanha o acorde atual. Ótimo para treinar as trocas antes do ensaio.</li>
    <li><span class="ui">Improvisar sobre ela</span> leva a música para o Improviso (tom e escala certos); <span class="ui">Treinar os acordes dela</span> filtra o quiz de Acordes.</li>
  </ol>
  <div class="box"><div class="t">As cifras são suas</div>Nenhuma cifra vem dentro do app: você cola, e ela fica só no seu aparelho.</div>
</section>

<section>
  <div class="kicker">Parte 10 · O app</div>
  <h2>Compor</h2>
  <div class="shot small"><img src="${shots('compor.png')}"></div>
  <ol>
    <li>Escolha o <b>tom</b>, o <b>BPM</b> e o <b>estilo</b> da base. Escolha a <b>linguagem</b> no "E agora?": <span class="ui">Pop/Rock</span>, <span class="ui">Blues</span> ou <span class="ui">Bossa/Jazz</span>.</li>
    <li>Comece pela sugestão de começo da seção (verso, refrão, ponte…) e, a cada passo, escolha pelo <b>efeito</b>: repousar, criar tensão, subir a energia, melancolia, surpresa, conclusões, suspense. Cada opção mostra os graus e <b>por que soa assim</b> (a teoria da Parte 7). <span class="ui">▶ ouvir</span> antes de <span class="ui">+ usar</span>.</li>
    <li><b>Clique num acorde</b> para mudar a duração (½, 1 ou 2 compassos), mover (◀ ▶ ou arrastar), duplicar, apagar, trocar a cifra ou <span class="ui">colorir</span>. As sugestões passam a valer para ele. Atalhos: ← → anda, Shift+← → move, Delete apaga.</li>
    <li><b>Desenho de cada acorde</b>: o mais simples vem primeiro; o mais perto do acorde anterior fica marcado. <span class="ui">Aproximar os desenhos</span> escolhe tudo com o menor movimento da mão. A base toca o desenho escolhido.</li>
    <li><b>Levada do violão por seção</b> (Parte 8) e <span class="ui">Tocar com a base</span> em loop: o que você mudar entra no compasso seguinte.</li>
    <li><span class="ui">Improvisar sobre ela</span> ou <span class="ui">Salvar como música</span> (com as durações) para levar para a banda.</li>
  </ol>
  <div class="box tip"><div class="t">Para estudar harmonia de verdade</div>Antes de clicar em "+ usar", tente adivinhar o efeito pelos graus (ii–V, bVII, iv…). Depois ouça. Errar e ouvir é o jeito mais rápido de ligar a teoria da Parte 7 ao som.</div>
</section>

<section>
  <div class="kicker">Parte 10 · O app</div>
  <h2>Acordes</h2>
  <div class="shot"><img src="${shots('acordes-desktop.png')}"></div>
  <ul>
    <li><b>Consultar</b>: digite qualquer cifra (F#7, Am7b5, C13, D/F#…) e veja tipo, fórmula (graus), notas e <b>todas as formas tocáveis</b> no braço, da casa 1 à 15.</li>
    <li><b>Treinar</b>: sete tipos de pergunta, sozinhos ou no modo <b>Misturado</b>:
      <ul>
        <li><b>Cifra → desenho</b> e <b>Desenho → cifra</b>, com abertas, pestanas, formas móveis e tríades.</li>
        <li><b>Graus no desenho</b>: "neste Bº7, onde está a b5?" e você clica na bolinha.</li>
        <li><b>Nota de cada grau</b>: "qual é a 3ª de F#m7?".</li>
        <li><b>O que muda</b>: de C para Cm, de C7 para C7M…</li>
        <li><b>Cifra → notas</b>.</li>
        <li><b>Cronometrado</b> com a guitarra na mão, conferido pelo áudio (o relógio para quando o acorde soa) ou autoavaliado.</li>
      </ul></li>
    <li><b>Níveis 1–4</b> prontos, ou escolha os tipos (básicos, cores, jazz/bossa/blues) e as formas. Sessões de 10, 20 ou 50 com resultado e o que revisar. <span class="ui">▶ Ouvir a resposta</span> (tecla O).</li>
    <li>O que você erra ou demora <b>volta mais vezes</b> (repetição espaçada). "Dominados: X de Y" mostra o avanço.</li>
  </ul>
  <div class="box tip"><div class="t">Ordem sugerida</div>Nível 1 (abertos: maior, menor, 7 e power chord) → nível 2 (+ pestanas na 6ª e 5ª corda e m7) → nível 3 (+ 7M, sus, add9, formas pelo braço e tríades) → nível 4 (tudo: + 6, 9, 7(#9), m7(b5) e º7). Só avance quando "Dominados" passar de 80%.</div>
</section>

<section>
  <div class="kicker">Parte 10 · O app</div>
  <h2>Escalas</h2>
  <div class="shot"><img src="${shots('escalas-desktop.png')}"></div>
  <ul>
    <li>Escolha <b>escala</b> (pentatônicas, blues, maior, menor, dórico, mixolídio, menor harmônica, blues maior ou um arpejo), <b>tom e desenhos</b> (pode marcar vários boxes) e o <b>exercício</b>:
      <span class="ui">Subir e descer</span> · <span class="ui">Grupos de 3</span> (1-2-3, 2-3-4…) · <span class="ui">Grupos de 4</span> · <span class="ui">Terças</span> (1-3, 2-4…) · <span class="ui">Percorrer os boxes</span> (sobe um, desce o seguinte, atravessando o braço).</li>
    <li><span class="ui">Começar</span>: o metrônomo conta 4, a <b>bolinha branca</b> é a nota da vez e o anel é a próxima.</li>
    <li><b>Ritmo</b>: semínimas → colcheias → tercinas → semicolcheias. <b>Tocar as notas</b>: ouvir cada nota junto do clique.</li>
    <li><b>Mostrar</b>: <span class="ui">Tudo</span> para aprender · <span class="ui">Só tônicas</span> para completar de cabeça · <span class="ui">Esconder</span> para tocar de memória (e <span class="ui">Revelar</span> para conferir).</li>
    <li><b>Treinos salvos</b>: guarde combinações ("Seg: box 1–2, grupos de 3, 80 bpm"). Um conjunto delas é o seu plano da semana.</li>
    <li><b>Onde está a nota?</b>: decorar o braço clicando nas casas ou tocando a nota na guitarra (o app ouve).</li>
  </ul>
  <div class="box warn"><div class="t">Devagar e limpo vence rápido e sujo</div>Comece num andamento em que você <b>não erra</b>. Velocidade é consequência de repetição limpa. Suba de 5 em 5 bpm.</div>
</section>

<section>
  <div class="kicker">Parte 10 · O app</div>
  <h2>Jam livre e Afinador</h2>
  <div class="shot half"><img src="${shots('jam-livre.png')}"></div>
  <h3>Jam livre: o app ouve e sugere</h3>
  <ol>
    <li>Cube Baby no USB, som limpo, <span class="ui">Ativar</span> (permita o "microfone").</li>
    <li>Toque acordes e deixe soar. O app mostra o acorde, a <b>função no tom</b> ("IV7 em Lá maior") e o <b>tom</b> estimado. Se aparecer "Ou é … ? Fixar", escolha o que você sente como "casa".</li>
    <li><b>Próximos acordes pelo contexto</b>: o app reconhece os últimos até 6 acordes num banco de progressões <b>e das músicas do seu repertório</b>, e mostra até 6 opções em <i>mais comum</i>, <i>volta pra casa</i> e <i>surpresa</i>, com o motivo e o desenho.</li>
    <li>Faça frases: a bolinha branca mostra o <b>alvo</b> (3ª/7ª) perto de onde você está tocando.</li>
  </ol>
  <div class="box tip"><div class="t">Troca de acorde</div><span class="ui">Equilibrada</span> é o padrão. Se o acorde "pisca" muito, use <span class="ui">Estável</span> e aumente o <b>tempo mínimo entre trocas</b>. Para trocas rápidas, <span class="ui">Rápida</span>.</div>
  <h3>Afinador</h3>
  <ul>
    <li><span class="ui">Nota (afinador)</span>: toque uma corda solta e deixe soar. O ponteiro diz quantos <b>cents</b> (centésimos de semitom) você está acima ou abaixo. Afinado = dentro de ±5.</li>
    <li><span class="ui">Acorde</span>: o acorde soando, palpites alternativos e barras com a energia de cada nota. Ótimo para conferir se um desenho novo está saindo limpo (nota abafada some da barra).</li>
    <li><b>Medidor de nível</b>: deixe o pico na faixa verde ajustando o volume do Cube Baby.</li>
  </ul>
</section>

<section>
  <div class="kicker">Parte 11</div>
  <h2>Plano de evolução em 4 fases</h2>
  <p>Cada fase tem um objetivo claro e um "teste de saída". Não tenha pressa de pular: as fases se apoiam umas nas outras. Com 2 h por dia, cada fase leva de 2 a 4 semanas.</p>
  <h3>Fase 1 · Fundamentos (semanas 1–3)</h3>
  <ul>
    <li><b>Acordes:</b> E, A, D, G, C, Em, Am, Dm, A7, D7, E7 abertos (quiz <b>nível 1</b>, <span class="ui">Misturado</span> + <span class="ui">Cronometrado</span>).</li>
    <li><b>Teoria:</b> Partes 2 a 4 com os exercícios (uma parte por semana, 10 min por dia).</li>
    <li><b>Escalas:</b> pentatônica menor de Lá, <b>box 1</b>: <span class="ui">Subir e descer</span>, depois <span class="ui">Grupos de 3</span>.</li>
    <li><b>Braço:</b> notas da 6ª e 5ª corda (<span class="ui">Onde está a nota?</span>).</li>
    <li><b>Improviso:</b> blues em Lá, shuffle, 70 bpm, Box 1, restrição <span class="ui">Só 3 notas da escala</span>.</li>
  </ul>
  <ul class="check"><li>Troca A7 → D7 → E7 no tempo, sem parar a mão direita.</li><li>Box 1 subindo e descendo a 90 bpm em colcheias, sem erro.</li><li>Diz o nome de qualquer nota da 6ª e 5ª corda em menos de 3 s.</li></ul>

  <h3>Fase 2 · Mirar nos alvos (semanas 4–6)</h3>
  <ul>
    <li><b>Improviso</b> com <span class="ui">Alvos sugeridos</span>: pousar na bolinha branca no tempo 1. Restrições <span class="ui">Termine cada frase na 3ª</span> e <span class="ui">Pergunta e resposta</span>.</li>
    <li><b>Escalas:</b> box 2; <span class="ui">Percorrer os boxes</span> 1–2; <span class="ui">Terças</span>.</li>
    <li><b>Acordes:</b> quiz <b>nível 2</b> (pestanas na 6ª e na 5ª corda, m7).</li>
    <li><b>Técnica:</b> bend e slide do C para o C# sobre o A7 (ver Parte 9).</li>
    <li><b>Teoria:</b> Partes 5, 6 e 9 com os exercícios; o <span class="ui">Placar</span> no Improviso para medir os alvos.</li>
  </ul>
  <ul class="check"><li>Numa volta do blues, pousa no alvo em pelo menos 8 dos 12 compassos.</li><li>Liga box 1 e box 2 sem parar.</li><li>Toca F, Bm e C7 com pestana limpa (confira no <span class="ui">Afinador → Acorde</span>).</li></ul>

  <h3>Fase 3 · Braço inteiro e repertório (semanas 7–10)</h3>
  <ul>
    <li><b>Escalas:</b> boxes 3, 4 e 5; escala <b>blues</b>; <span class="ui">Esconder</span> para tocar de memória.</li>
    <li><b>Improviso:</b> outros tons (Mi, Sol, Dó) e estilos (<span class="ui">Rock reto</span>, <span class="ui">Slow blues 12/8</span>); <span class="ui">Box: Todo</span>.</li>
    <li><b>Banda:</b> cole as cifras em <span class="ui">Músicas</span>, marque os tempos com a gravação e treine as trocas com a cifra rolando; depois improvise em cima.</li>
    <li><b>Compor:</b> uma progressão de 8 compassos por semana em Pop/Rock e outra em Blues (Partes 7 e 8 com os exercícios).</li>
    <li><b>Jam livre:</b> toque as músicas da banda e observe tom, graus e sugestões.</li>
  </ul>
  <ul class="check"><li>Improvisa no blues em qualquer um dos 5 boxes.</li><li>Sabe o tom e os graus (I, IV, V…) das músicas da banda.</li></ul>

  <h3>Fase 4 · Cor e expressão (semana 11 em diante)</h3>
  <ul>
    <li><b>Pentatônica maior</b> em I–V–vi–IV e pop/balada; alternar maior e menor no blues; <b>dórico</b> no m7 e <b>mixolídio</b> no 7 (escala <span class="ui">acompanha o acorde</span>).</li>
    <li><b>Acordes:</b> quiz <b>níveis 3 e 4</b> (7M, sus, add9, tríades, 6, 9, m7(b5), º7) e onde eles aparecem nas músicas.</li>
    <li><b>Compor em Bossa/Jazz:</b> ii–V–I, colorir, aproximar os desenhos e a base de bossa nova.</li>
    <li><b>Frases:</b> repita a mesma frase em cada acorde; crie 5 "frases favoritas" e leve para outros tons.</li>
  </ul>
</section>

<section>
  <div class="kicker">Parte 12</div>
  <h2>Rotina diária de 2 horas</h2>
  <table>
    <tr><th style="width:18mm">Tempo</th><th style="width:38mm">Onde</th><th>O quê</th></tr>
    <tr><td>10 min</td><td>Afinador + aquecimento</td><td>Afinar. Cromático lento (1-2-3-4 em cada corda) para soltar os dedos.</td></tr>
    <tr><td>20 min</td><td>Acordes</td><td>10 min de quiz (o app puxa o que você erra) + 10 min de <b>cronometrado</b> com a guitarra.</td></tr>
    <tr><td>30 min</td><td>Escalas</td><td>Exercício do treino salvo do dia (comece devagar, suba 5 bpm a cada 3 acertos) + 5 min de <i>Onde está a nota?</i></td></tr>
    <tr><td>40 min</td><td>Improviso</td><td>Uma restrição por volta. Alvos sugeridos ligados. Grave no celular 2 minutos no fim e escute.</td></tr>
    <tr><td>15 min</td><td>Músicas / Compor / Jam</td><td>Músicas da banda (cifra rolando e frases sobre elas) ou uma ideia nova no Compor. 2–3 exercícios do guia da semana.</td></tr>
    <tr><td>5 min</td><td>Anotar</td><td>O que travou hoje? Isso vira o foco de amanhã.</td></tr>
  </table>
  <h3>Semana modelo</h3>
  <table>
    <tr><th>Dia</th><th>Foco</th></tr>
    <tr><td>Seg</td><td>Box novo da fase · acordes da fase</td></tr>
    <tr><td>Ter</td><td>Ritmo: tercinas, contratempo, pausas (restrição de pausa)</td></tr>
    <tr><td>Qua</td><td>Notas-alvo e notas-guia (alvos sugeridos)</td></tr>
    <tr><td>Qui</td><td>Outro tom e outro estilo</td></tr>
    <tr><td>Sex</td><td>Músicas da banda (área Músicas + Jam livre)</td></tr>
    <tr><td>Sáb</td><td>Revisão: o que mais errou na semana (o quiz já mostra) + compor uma progressão</td></tr>
    <tr><td>Dom</td><td>Descanso ou jam livre por diversão</td></tr>
  </table>
  <div class="box tip"><div class="t">Treinos salvos = plano pronto</div>Monte em <span class="ui">Escalas → Treinos salvos</span> um treino para cada dia ("Seg", "Ter"…). No dia, é só um clique.</div>
</section>

<section>
  <div class="kicker">Parte 13</div>
  <h2>Erros comuns e como saber que evoluiu</h2>
  <table>
    <tr><th>Erro comum</th><th>O que fazer</th></tr>
    <tr><td>Tocar a escala inteira para cima e para baixo e chamar de improviso</td><td>Restrição <i>Só 3 notas</i>; frases curtas com pausa; pousar nos alvos.</td></tr>
    <tr><td>Acelerar antes de estar limpo</td><td>Metrônomo num andamento sem erros; subir de 5 em 5 bpm.</td></tr>
    <tr><td>Ficar preso no box 1</td><td>Fase 2–3: <i>Percorrer os boxes</i> e improviso com <i>Box: Todo</i>.</td></tr>
    <tr><td>Não ouvir a troca de acorde</td><td>Olhar "Próxima troca" e o anel azul no tempo 4; cantar a fundamental do acorde novo.</td></tr>
    <tr><td>Esquecer do ritmo</td><td>Bater o pé; restrição de pausa; contratempo.</td></tr>
    <tr><td>Só praticar o que já sabe</td><td>Confiar no quiz: ele puxa o que você erra.</td></tr>
  </table>
  <h3>Sinais de evolução</h3>
  <ul class="check">
    <li>"Dominados" no quiz de acordes passando de 80% em cada grupo.</li>
    <li>Andamento confortável nos exercícios de escala subindo semana a semana (anote).</li>
    <li>Você ouve a troca de acorde chegando sem olhar a tela.</li>
    <li>Nas gravações, as frases têm começo, meio e fim (e pausas).</li>
    <li>Você consegue explicar o tom e os graus de uma música da banda.</li>
  </ul>
</section>

<section>
  <div class="kicker">Parte 14</div>
  <h2>Glossário</h2>
  <table>
    <tr><td style="width:36mm"><b>Fundamental (1)</b></td><td>A nota que dá nome ao acorde ou à escala. Vermelho no app.</td></tr>
    <tr><td><b>Grau</b></td><td>Posição de uma nota em relação à fundamental (1, b3, 3, 5, b7…).</td></tr>
    <tr><td><b>Semitom / tom</b></td><td>1 casa / 2 casas.</td></tr>
    <tr><td><b>Oitava</b></td><td>A mesma nota 12 casas acima (mais aguda).</td></tr>
    <tr><td><b>Tríade</b></td><td>Acorde de 3 notas (1, 3, 5).</td></tr>
    <tr><td><b>Dominante (7)</b></td><td>Acorde maior com b7. Base do blues.</td></tr>
    <tr><td><b>Pestana</b></td><td>Um dedo prendendo várias cordas na mesma casa.</td></tr>
    <tr><td><b>Box / desenho</b></td><td>Um dos 5 recortes da escala no braço.</td></tr>
    <tr><td><b>Tom</b></td><td>A "casa" da música.</td></tr>
    <tr><td><b>Progressão</b></td><td>Sequência de acordes.</td></tr>
    <tr><td><b>I, IV, V</b></td><td>Acordes construídos na 1ª, 4ª e 5ª nota do tom.</td></tr>
    <tr><td><b>Turnaround</b></td><td>A virada no fim da progressão que leva de volta ao começo.</td></tr>
    <tr><td><b>BPM</b></td><td>Batidas por minuto (andamento).</td></tr>
    <tr><td><b>Shuffle</b></td><td>Colcheias "longa-curta" (balanço do blues).</td></tr>
    <tr><td><b>Nota-alvo</b></td><td>Nota do acorde onde você pousa a frase.</td></tr>
    <tr><td><b>Notas-guia</b></td><td>3ª e 7ª dos acordes; ligadas, formam uma linha suave.</td></tr>
    <tr><td><b>Blue note</b></td><td>A b5 (e a b3 sobre acorde maior): tensão típica do blues.</td></tr>
    <tr><td><b>Bend</b></td><td>Empurrar a corda para subir a nota.</td></tr>
    <tr><td><b>Cents</b></td><td>Centésimos de semitom (afinação fina).</td></tr>
    <tr><td><b>Tétrade</b></td><td>Acorde de 4 notas (1, 3, 5, 7): 7M, m7, 7, m7(b5), º7.</td></tr>
    <tr><td><b>Extensão</b></td><td>Nota além da 7ª, pensada uma oitava acima: 9, 11, 13.</td></tr>
    <tr><td><b>Inversão</b></td><td>Acorde com outra nota que não a fundamental no baixo (C/E).</td></tr>
    <tr><td><b>Campo harmônico</b></td><td>Os 7 acordes que nascem da escala de um tom.</td></tr>
    <tr><td><b>Relativo</b></td><td>Tom maior e menor com as mesmas notas (Dó maior e Lá menor).</td></tr>
    <tr><td><b>Função</b></td><td>Papel do acorde no tom: tônica (casa), subdominante (sai), dominante (tensão).</td></tr>
    <tr><td><b>Cadência</b></td><td>Fim de frase harmônica: perfeita (V7–I), plagal (IV–I), suspensa (no V).</td></tr>
    <tr><td><b>Sensível</b></td><td>A 7ª nota da escala, meio tom abaixo da tônica, que puxa para ela.</td></tr>
    <tr><td><b>Trítono</b></td><td>Intervalo de 6 casas (b5). Dentro do V7, é a tensão que resolve.</td></tr>
    <tr><td><b>Empréstimo modal</b></td><td>Usar no tom maior acordes do tom menor (iv, bVI, bVII).</td></tr>
    <tr><td><b>Dominante secundário</b></td><td>O V7 de outro acorde do tom (A7 → Dm em Dó).</td></tr>
    <tr><td><b>Substituto trítono</b></td><td>Dominante meio tom acima da tônica no lugar do V7 (Db7 → C).</td></tr>
    <tr><td><b>ii–V–I</b></td><td>Preparação → tensão → resolução (Dm7 G7 C7M): a frase-base do jazz.</td></tr>
    <tr><td><b>Meio-diminuto (ø)</b></td><td>m7(b5): 1 b3 b5 b7. O ii do tom menor.</td></tr>
    <tr><td><b>Modo</b></td><td>A escala maior começando em outra nota (dórico, mixolídio…).</td></tr>
    <tr><td><b>Arpejo</b></td><td>As notas do acorde tocadas uma de cada vez.</td></tr>
    <tr><td><b>Levada</b></td><td>O desenho rítmico do acompanhamento (batida, dedilhado).</td></tr>
    <tr><td><b>Condução de vozes</b></td><td>Ligar acordes movendo cada nota o mínimo possível.</td></tr>
  </table>
</section>

<section>
  <div class="kicker">Parte 15</div>
  <h2>Respostas dos exercícios</h2>
  <p>Confira depois de tentar. Errou? Volte à parte e refaça o treino indicado em "No app" no dia seguinte.</p>
  <div class="answers">${renderAnswers()}</div>
</section>

<section>
  <div class="kicker">Parte 16</div>
  <h2>Próximos passos do software</h2>
  <h3>Já feito desde a primeira edição deste guia</h3>
  <ul class="cols2">
    <li><b>Músicas</b>: colar a cifra, grade editável, marcar tempos com a gravação, cifra rolando.</li>
    <li><b>Quiz conferido pelo áudio</b> e <b>placar de notas-alvo</b> no Improviso.</li>
    <li><b>Jam pelo contexto</b>, aprendendo com as músicas do repertório.</li>
    <li><b>Compor</b>: progressões pelo efeito em Pop/Rock, Blues e Bossa/Jazz, edição livre, desenhos e levadas.</li>
    <li>Tons menores, modos, arpejos, acordes 6, 9, 7(#9), m7(b5), º7 e o quiz com 7 tipos de pergunta.</li>
    <li>Estilo <b>bossa nova</b> e levadas de violão (reggae, funk, dedilhado…).</li>
  </ul>
  <h3>O que vem depois</h3>
  <p><span class="prio p1">ALTA</span> impacto direto na sua evolução; <span class="prio p2">MÉDIA</span> deixa tudo mais redondo; <span class="prio p3">PRODUTO</span> necessário só se virar plataforma.</p>
  <table class="dense">
    <tr><th style="width:44mm">Funcionalidade</th><th>Por que vale</th><th style="width:16mm">Prioridade</th></tr>
    <tr><td><b>Treino do dia + Progresso</b></td><td>Monta a sessão de 2 h sozinho com base nos erros; mostra tempo por área, andamento máximo e taxa de acerto ao longo das semanas.</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Loop de trecho e "mais devagar"</b></td><td>Repetir só os compassos difíceis de uma música, começando lento e acelerando sozinho.</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Exportar e importar músicas</b></td><td>Levar o repertório do PC para o celular (e para o resto da banda).</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Treino de ouvido</b></td><td>Reconhecer intervalos, acordes maior/menor/7 e graus de ouvido (a mesma teoria das Partes 3 a 7).</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Pergunta e resposta</b></td><td>O app toca uma frase curta e você responde; treina ouvido e vocabulário.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Licks por estilo</b></td><td>Frases prontas de blues, rock e bossa para aprender e levar para outros tons.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Speed trainer</b></td><td>Metrônomo que sobe o bpm sozinho a cada volta sem erro (o app ouve).</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Gravar e ouvir</b></td><td>Gravar a guitarra sobre a base e escutar depois; mapa de calor das notas usadas.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Compasso 3/4 e mais estilos</b></td><td>Valsa e baladas em 3/4; funk, reggae e metal como estilos completos de base.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Loops próprios</b></td><td>Trocar a bateria por loops gravados no FL Studio.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>App instalável offline (PWA)</b></td><td>Abrir sem internet e com ícone no celular.</td><td><span class="prio p3">PRODUTO</span></td></tr>
    <tr><td><b>Contas e sincronização</b></td><td>Progresso no PC e no celular; backup.</td><td><span class="prio p3">PRODUTO</span></td></tr>
    <tr><td><b>Modo professor</b></td><td>Professor monta treinos e acompanha alunos; caminho natural para escolas de música.</td><td><span class="prio p3">PRODUTO</span></td></tr>
  </table>
  <div class="two">
    <div class="box"><div class="t">Ordem recomendada</div>1) <b>Treino do dia + Progresso</b>: as 2 h viram plano automático e você vê a evolução. 2) <b>Loop de trecho</b> e <b>exportar músicas</b>: ajudam direto nos ensaios. 3) <b>Treino de ouvido</b>. 4) O resto conforme fizer falta.</div>
    <div class="box"><div class="t">Antes de pensar em produto</div>Use por algumas semanas, mostre para 10–20 guitarristas e pergunte se usariam e pagariam. O que eles pedirem vale mais do que qualquer lista.</div>
  </div>
</section>

</body></html>`

writeFileSync(join(here, 'guia.html'), html)
console.log('ok', join(here, 'guia.html'))
