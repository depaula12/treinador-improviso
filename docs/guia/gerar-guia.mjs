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
function chord(name, frets, note = '') {
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
    const deg = DEG[(pcAt(s, f) - rootPc + 12) % 12]
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
h1, h2, h3 { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; line-height: 1.1; margin: 0; }
h2 { font-size: 22pt; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2px solid var(--accent); break-after: avoid; }
h3 { font-size: 14pt; margin: 6mm 0 2mm; color: var(--accent); break-after: avoid; }
p { margin: 0 0 2.5mm; }
ul, ol { margin: 0 0 3mm; padding-left: 5mm; }
li { margin-bottom: 1mm; }
b { font-weight: 600; }
section { break-before: page; }
section.flow { break-before: auto; }
.kicker { font: 600 9pt 'Barlow Condensed', sans-serif; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); }
.lead { font-size: 11.5pt; color: #333; }
.box { border: 1px solid var(--line); border-left: 4px solid var(--accent); background: var(--soft); padding: 3mm 4mm; border-radius: 2mm; margin: 3mm 0; break-inside: avoid; }
.box.tip { border-left-color: #1f8a9c; background: #f1f8f9; }
.box.warn { border-left-color: var(--root); background: #fbf0ee; }
.box .t { font: 700 10pt 'Barlow Condensed', sans-serif; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 1mm; }
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
.cname { font: 700 13pt 'Barlow Condensed', sans-serif; }
.shot { margin: 2mm 0 3mm; break-inside: avoid; text-align: center; }
.shot img { width: 74%; border-radius: 2mm; border: 1px solid #ccc; }
.shot.half img { width: 52%; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0; font-size: 9.5pt; break-inside: avoid; }
table.dense { font-size: 8.8pt; }
table.dense td, table.dense th { padding: 1.1mm 1.6mm; }
th, td { border-bottom: 1px solid var(--line); padding: 1.6mm 2mm; text-align: left; vertical-align: top; }
th { font: 700 9pt 'Barlow Condensed', sans-serif; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); border-bottom: 2px solid var(--line); }
.grid12 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5mm; margin: 3mm 0; break-inside: avoid; }
.grid12 div { border: 1px solid var(--line); border-radius: 1.5mm; padding: 2mm; font: 700 13pt 'Barlow Condensed', sans-serif; display: flex; justify-content: space-between; }
.grid12 small { font: 500 7.5pt 'IBM Plex Mono', monospace; color: var(--muted); }
.grid12 .iv { background: #fdf1e3; } .grid12 .v { background: #fbe4e1; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.tag { display: inline-block; font: 600 8pt 'IBM Plex Mono', monospace; background: #eef0f2; border-radius: 1mm; padding: 0 1.5mm; }
.ui { font: 600 9pt 'IBM Plex Mono', monospace; background: #f1ede6; border: 1px solid #e2d8c8; border-radius: 1mm; padding: 0 1.2mm; white-space: nowrap; }
.legend { display: flex; gap: 4mm; justify-content: center; font-size: 8.5pt; color: var(--muted); flex-wrap: wrap; }
.legend i { display: inline-block; width: 3mm; height: 3mm; border-radius: 50%; margin-right: 1mm; vertical-align: -0.4mm; }
.cover { height: 262mm; display: flex; flex-direction: column; justify-content: space-between; break-before: auto; }
.cover h1 { font-size: 44pt; text-transform: uppercase; letter-spacing: .01em; }
.cover h1 span { color: var(--accent); }
.cover .sub { font-size: 14pt; color: #444; max-width: 140mm; margin-top: 5mm; }
.toc { columns: 2; column-gap: 8mm; font-size: 10pt; }
.toc li { break-inside: avoid; }
.check li { list-style: none; margin-left: -5mm; }
.check li::before { content: '☐ '; color: var(--accent); }
.prio { font: 700 8pt 'IBM Plex Mono', monospace; padding: 0.3mm 1.5mm; border-radius: 1mm; color: #fff; }
.p1 { background: #c0392b; } .p2 { background: #d9822b; } .p3 { background: #7d848c; }
`

const L = (c) => `<i style="background:${c}"></i>`
const legend = `<div class="legend"><span>${L(COLOR.root)}fundamental (1)</span><span>${L(COLOR.tone)}notas do acorde/desenho</span><span>${L(COLOR.scale)}outras notas da escala</span><span>${L(COLOR.target)}alvo sugerido</span><span><i style="border:2px solid ${COLOR.next}"></i>próximo</span></div>`

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Guia do Treinador de Improviso</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600;700&display=swap">
<style>${css}</style></head><body>

<div class="cover">
  <div>
    <div class="kicker">Guia do iniciante</div>
    <h1>Do zero ao <span>improviso</span></h1>
    <p class="sub">Como usar o Treinador de Improviso para evoluir na guitarra, com a teoria mínima explicada sem complicação, um plano de estudo para 2 horas por dia e os próximos passos do app.</p>
  </div>
  ${fretboard({ lo: 4, hi: 9, dots: a7over, caption: 'A7 sobre a pentatônica menor de Lá (box 1): o tipo de "mapa" que o app mostra enquanto a base toca.' })}
  <div>
    <h3 style="margin-top:0">Neste guia</h3>
    <ol class="toc">
      <li>Antes de começar: equipamento e rotina</li>
      <li>Teoria mínima: notas e o braço</li>
      <li>Intervalos e graus (1, 3, 5, b7…)</li>
      <li>Acordes: como são montados</li>
      <li>Escalas e desenhos (boxes)</li>
      <li>Tom, progressão e o blues de 12</li>
      <li>Ritmo: tempo, compasso e shuffle</li>
      <li>Notas-alvo: o segredo do improviso</li>
      <li>Conhecendo cada área do app</li>
      <li>Plano de evolução em 4 fases</li>
      <li>Rotina diária de 2 horas</li>
      <li>Erros comuns e como saber que evoluiu</li>
      <li>Glossário</li>
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

  <h3>O app tem 5 áreas</h3>
  <table>
    <tr><th>Área</th><th>Serve para</th><th>Você precisa de</th></tr>
    <tr><td><b>Improviso</b></td><td>Tocar livre sobre uma base, com o braço mostrando notas do acorde e alvos.</td><td>Fone/caixinha</td></tr>
    <tr><td><b>Acordes</b></td><td>Decorar desenhos de acordes e o que eles são (quiz).</td><td>Nada (ou a guitarra no modo cronometrado)</td></tr>
    <tr><td><b>Escalas</b></td><td>Decorar os desenhos (boxes) e as notas do braço com metrônomo.</td><td>Fone/caixinha</td></tr>
    <tr><td><b>Jam livre</b></td><td>Você toca; o app reconhece acorde e tom e sugere o próximo acorde e o alvo.</td><td>Cube Baby no USB</td></tr>
    <tr><td><b>Afinador</b></td><td>Afinar e ver que nota/acorde você está tocando.</td><td>Cube Baby no USB</td></tr>
  </table>
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
  <div class="box tip"><div class="t">No app</div><span class="ui">Escalas → Onde está a nota?</span> faz exatamente esse treino: pergunta "onde está o Lá na 3ª corda?" e você clica no braço. Desmarque "Só notas de…" para treinar todas as notas.</div>
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
  <div class="box tip"><div class="t">No app</div><span class="ui">Acordes → Consultar / decodificar</span>: digite qualquer cifra e veja graus, notas e desenhos. <span class="ui">Acordes → Treinar</span>: comece só com <span class="tag">maior</span> <span class="tag">m</span> e <span class="tag">7</span> na <span class="tag">Forma aberta</span>.</div>
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
  <h3>Outras progressões do app</h3>
  <ul>
    <li><b>I–V–vi–IV</b> (G D Em C): metade das músicas pop do mundo.</li>
    <li><b>I–bVII–IV</b> (D C G): rock clássico.</li>
    <li><b>i–bVII–bVI</b> (Em D C): rock em tom menor.</li>
  </ul>
  <div class="box tip"><div class="t">No app</div>Em <span class="ui">Improviso → Ajustes → Progressão → Digitar progressão…</span> escreva as músicas da banda: <span class="ui">Am*2 G F E7</span> (o *2 repete o compasso).</div>
</section>

<section>
  <div class="kicker">Parte 7 · Teoria mínima</div>
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
</section>

<section>
  <div class="kicker">Parte 8 · O conceito mais importante</div>
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
</section>

<section>
  <div class="kicker">Parte 9 · O app</div>
  <h2>Improviso</h2>
  <div class="shot small"><img src="${shots('improviso-desktop.png')}"></div>
  <ol>
    <li><b>Ajustes</b> (barra no topo): progressão, tom, estilo, escala, andamento, mixer e restrição.</li>
    <li><b>Agora / Próxima troca</b>: o acorde atual em letra grande e quantos compassos faltam para mudar.</li>
    <li><b>Braço</b>: vermelho = fundamental, laranja = notas do acorde, cinza = escala, <b>branco = alvo sugerido</b>, anel azul = notas do próximo acorde no tempo 4.</li>
    <li><b>Box 1–5 / Todo</b>: mostra só a região do desenho escolhido. Comece no Box 1.</li>
    <li><span class="ui">− 90 bpm +</span> e <span class="ui">Tocar</span>: a contagem "1 2 3 4" vem antes da base.</li>
  </ol>
  <div class="two">
    <div class="box tip"><div class="t">Configuração para começar</div>Blues de 12 · Lá · Shuffle · Pentatônica menor · 70–80 bpm · Box 1 · Alvos sugeridos ligado.</div>
    <div class="box"><div class="t">Mixer</div>Deixe bateria e baixo ligados. Piano e violão preenchem; desligue se ficar embolado com a sua guitarra.</div>
  </div>
  <h3>Restrições: o professor exigente</h3>
  <p>Em <span class="ui">Ajustes → Restrição</span> (ou <span class="ui">Sortear</span>). Uma por sessão:</p>
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
  <div class="kicker">Parte 9 · O app</div>
  <h2>Acordes</h2>
  <div class="shot"><img src="${shots('acordes-desktop.png')}"></div>
  <ul>
    <li><b>Consultar / decodificar</b>: digite qualquer cifra (F#7, Cadd9…) e veja tipo, fórmula (graus), notas, desenhos e o acorde espalhado pelo braço.</li>
    <li><b>Treinar</b>, quatro modos:
      <ul>
        <li><b>Cifra → desenho</b>: aparece "Dbm7 (fundamental na 5ª corda)" e você escolhe o desenho certo entre 4.</li>
        <li><b>Desenho → cifra</b>: o contrário.</li>
        <li><b>Cifra → notas</b>: entender o que forma cada acorde.</li>
        <li><b>Cronometrado</b>: com a guitarra na mão. "Toque Bm7 na 5ª corda"; toque, clique em <span class="ui">Revelar</span> e avalie: <span class="ui">Errei</span>, <span class="ui">Acertei, lento</span> ou <span class="ui">Acertei rápido</span>.</li>
      </ul></li>
    <li>O que você erra ou demora <b>volta mais vezes</b> (repetição espaçada). "Dominados: X de Y" mostra o avanço.</li>
  </ul>
  <div class="box tip"><div class="t">Ordem sugerida</div>1) maior, m e 7 na forma aberta · 2) os mesmos com fundamental na 6ª · 3) na 5ª · 4) m7 e 7M · 5) power chord, sus2, sus4, add9. Só avance quando "Dominados" passar de 80%.</div>
</section>

<section>
  <div class="kicker">Parte 9 · O app</div>
  <h2>Escalas</h2>
  <div class="shot"><img src="${shots('escalas-desktop.png')}"></div>
  <ul>
    <li>Escolha <b>escala, tom e desenhos</b> (pode marcar vários boxes) e o <b>exercício</b>:
      <span class="ui">Subir e descer</span> · <span class="ui">Grupos de 3</span> (1-2-3, 2-3-4…) · <span class="ui">Grupos de 4</span> · <span class="ui">Terças</span> (1-3, 2-4…) · <span class="ui">Percorrer os boxes</span> (sobe um, desce o seguinte, atravessando o braço).</li>
    <li><span class="ui">Começar</span>: o metrônomo conta 4, a <b>bolinha branca</b> é a nota da vez e o anel é a próxima.</li>
    <li><b>Ritmo</b>: semínimas → colcheias → tercinas → semicolcheias. <b>Tocar as notas</b>: ouvir cada nota junto do clique.</li>
    <li><b>Mostrar</b>: <span class="ui">Tudo</span> para aprender · <span class="ui">Só tônicas</span> para completar de cabeça · <span class="ui">Esconder</span> para tocar de memória (e <span class="ui">Revelar</span> para conferir).</li>
    <li><b>Treinos salvos</b>: guarde combinações ("Seg: box 1–2, grupos de 3, 80 bpm"). Um conjunto delas é o seu plano da semana.</li>
    <li><b>Onde está a nota?</b>: decorar o braço clicando nas casas.</li>
  </ul>
  <div class="box warn"><div class="t">Devagar e limpo vence rápido e sujo</div>Comece num andamento em que você <b>não erra</b>. Velocidade é consequência de repetição limpa. Suba de 5 em 5 bpm.</div>
</section>

<section>
  <div class="kicker">Parte 9 · O app</div>
  <h2>Jam livre e Afinador</h2>
  <div class="shot half"><img src="${shots('jam-livre.png')}"></div>
  <h3>Jam livre: o app ouve e sugere</h3>
  <ol>
    <li>Cube Baby no USB, som limpo, <span class="ui">Ativar</span> (permita o "microfone").</li>
    <li>Toque acordes e deixe soar. O app mostra o acorde, a <b>função no tom</b> ("IV7 em Lá maior") e o <b>tom</b> estimado. Se aparecer "Ou é … ? Fixar", escolha o que você sente como "casa".</li>
    <li><b>Próximos acordes que soam bem</b>: 3 sugestões com desenho; clique para ver as notas no braço <b>antes</b> de trocar.</li>
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
  <div class="kicker">Parte 10</div>
  <h2>Plano de evolução em 4 fases</h2>
  <p>Cada fase tem um objetivo claro e um "teste de saída". Não tenha pressa de pular: as fases se apoiam umas nas outras. Com 2 h por dia, cada fase leva de 2 a 4 semanas.</p>
  <h3>Fase 1 · Fundamentos (semanas 1–3)</h3>
  <ul>
    <li><b>Acordes:</b> E, A, D, G, C, Em, Am, Dm, A7, D7, E7 abertos (quiz <span class="ui">Cifra → desenho</span> + <span class="ui">Cronometrado</span>).</li>
    <li><b>Escalas:</b> pentatônica menor de Lá, <b>box 1</b>: <span class="ui">Subir e descer</span>, depois <span class="ui">Grupos de 3</span>.</li>
    <li><b>Braço:</b> notas da 6ª e 5ª corda (<span class="ui">Onde está a nota?</span>).</li>
    <li><b>Improviso:</b> blues em Lá, shuffle, 70 bpm, Box 1, restrição <span class="ui">Só 3 notas da escala</span>.</li>
  </ul>
  <ul class="check"><li>Troca A7 → D7 → E7 no tempo, sem parar a mão direita.</li><li>Box 1 subindo e descendo a 90 bpm em colcheias, sem erro.</li><li>Diz o nome de qualquer nota da 6ª e 5ª corda em menos de 3 s.</li></ul>

  <h3>Fase 2 · Mirar nos alvos (semanas 4–6)</h3>
  <ul>
    <li><b>Improviso</b> com <span class="ui">Alvos sugeridos</span>: pousar na bolinha branca no tempo 1. Restrições <span class="ui">Termine cada frase na 3ª</span> e <span class="ui">Pergunta e resposta</span>.</li>
    <li><b>Escalas:</b> box 2; <span class="ui">Percorrer os boxes</span> 1–2; <span class="ui">Terças</span>.</li>
    <li><b>Acordes:</b> formas com pestana na 6ª e na 5ª corda (maior, m, 7).</li>
    <li><b>Técnica:</b> bend e slide do C para o C# sobre o A7 (ver Parte 8).</li>
  </ul>
  <ul class="check"><li>Numa volta do blues, pousa no alvo em pelo menos 8 dos 12 compassos.</li><li>Liga box 1 e box 2 sem parar.</li><li>Toca F, Bm e C7 com pestana limpa (confira no <span class="ui">Afinador → Acorde</span>).</li></ul>

  <h3>Fase 3 · Braço inteiro e repertório (semanas 7–10)</h3>
  <ul>
    <li><b>Escalas:</b> boxes 3, 4 e 5; escala <b>blues</b>; <span class="ui">Esconder</span> para tocar de memória.</li>
    <li><b>Improviso:</b> outros tons (Mi, Sol, Dó) e estilos (<span class="ui">Rock reto</span>, <span class="ui">Slow blues 12/8</span>); <span class="ui">Box: Todo</span>.</li>
    <li><b>Banda:</b> digite as progressões das músicas da banda e improvise em cima.</li>
    <li><b>Jam livre:</b> toque as músicas da banda e observe tom, graus e sugestões.</li>
  </ul>
  <ul class="check"><li>Improvisa no blues em qualquer um dos 5 boxes.</li><li>Sabe o tom e os graus (I, IV, V…) das músicas da banda.</li></ul>

  <h3>Fase 4 · Cor e expressão (semana 11 em diante)</h3>
  <ul>
    <li><b>Pentatônica maior</b> em I–V–vi–IV e pop/balada; alternar maior e menor no blues.</li>
    <li><b>Acordes:</b> m7, 7M, sus2, sus4, add9 (e onde eles aparecem nas músicas).</li>
    <li><b>Frases:</b> repita a mesma frase em cada acorde; crie 5 "frases favoritas" e leve para outros tons.</li>
  </ul>
</section>

<section>
  <div class="kicker">Parte 11</div>
  <h2>Rotina diária de 2 horas</h2>
  <table>
    <tr><th style="width:18mm">Tempo</th><th style="width:38mm">Onde</th><th>O quê</th></tr>
    <tr><td>10 min</td><td>Afinador + aquecimento</td><td>Afinar. Cromático lento (1-2-3-4 em cada corda) para soltar os dedos.</td></tr>
    <tr><td>20 min</td><td>Acordes</td><td>10 min de quiz (o app puxa o que você erra) + 10 min de <b>cronometrado</b> com a guitarra.</td></tr>
    <tr><td>30 min</td><td>Escalas</td><td>Exercício do treino salvo do dia (comece devagar, suba 5 bpm a cada 3 acertos) + 5 min de <i>Onde está a nota?</i></td></tr>
    <tr><td>40 min</td><td>Improviso</td><td>Uma restrição por volta. Alvos sugeridos ligados. Grave no celular 2 minutos no fim e escute.</td></tr>
    <tr><td>15 min</td><td>Jam livre / banda</td><td>Músicas da banda: acordes e frases sobre a progressão delas.</td></tr>
    <tr><td>5 min</td><td>Anotar</td><td>O que travou hoje? Isso vira o foco de amanhã.</td></tr>
  </table>
  <h3>Semana modelo</h3>
  <table>
    <tr><th>Dia</th><th>Foco</th></tr>
    <tr><td>Seg</td><td>Box novo da fase · acordes da fase</td></tr>
    <tr><td>Ter</td><td>Ritmo: tercinas, contratempo, pausas (restrição de pausa)</td></tr>
    <tr><td>Qua</td><td>Notas-alvo e notas-guia (alvos sugeridos)</td></tr>
    <tr><td>Qui</td><td>Outro tom e outro estilo</td></tr>
    <tr><td>Sex</td><td>Músicas da banda (progressão digitada + Jam livre)</td></tr>
    <tr><td>Sáb</td><td>Revisão: o que mais errou na semana (o quiz já mostra)</td></tr>
    <tr><td>Dom</td><td>Descanso ou jam livre por diversão</td></tr>
  </table>
  <div class="box tip"><div class="t">Treinos salvos = plano pronto</div>Monte em <span class="ui">Escalas → Treinos salvos</span> um treino para cada dia ("Seg", "Ter"…). No dia, é só um clique.</div>
</section>

<section>
  <div class="kicker">Parte 12</div>
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
  <div class="kicker">Parte 13</div>
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
  </table>
</section>

<section>
  <div class="kicker">Parte 14</div>
  <h2>Próximos passos do software</h2>
  <p>O que falta para o app ficar mais completo, útil e com valor de produto. <span class="prio p1">ALTA</span> impacto direto na sua evolução; <span class="prio p2">MÉDIA</span> deixa tudo mais redondo; <span class="prio p3">PRODUTO</span> necessário só se virar plataforma.</p>
  <table class="dense">
    <tr><th style="width:44mm">Funcionalidade</th><th>Por que vale</th><th style="width:16mm">Prioridade</th></tr>
    <tr><td><b>Músicas</b>: colar a cifra e virar base</td><td>Treinar improviso e acordes nas músicas da banda; grade de compassos editável; transpor; cifra rolando no tempo para treinar trocas.</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Treino do dia + Progresso</b></td><td>Monta a sessão de 2 h sozinho com base nos erros; mostra tempo por área, andamento máximo e taxa de acerto ao longo das semanas.</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Quiz conferido pelo áudio</b></td><td>No cronometrado, o app <b>ouve</b> se você tocou o acorde/nota pedido e mede o tempo sozinho.</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Placar de notas-alvo</b></td><td>No Improviso, o app ouve sua frase e conta quantas vezes você pousou no alvo no tempo 1. Retorno objetivo do improviso.</td><td><span class="prio p1">ALTA</span></td></tr>
    <tr><td><b>Speed trainer</b></td><td>Metrônomo que sobe o bpm sozinho a cada volta sem erro (o app ouve).</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Pergunta e resposta</b></td><td>O app toca uma frase curta e você responde; treina ouvido e vocabulário.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Treino de ouvido</b></td><td>Reconhecer intervalos, acordes maior/menor/7 e graus de ouvido.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Gravar e ouvir</b></td><td>Gravar a guitarra sobre a base e escutar depois; mapa de calor das notas usadas.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Loop de trecho</b></td><td>Repetir só 2 compassos difíceis de uma música ou progressão.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Mais conteúdo musical</b></td><td>Arpejos, modos (dórico, mixolídio), escalas de 3 notas por corda; acordes m7(b5), dim, 6, 9, 13; estilos funk, reggae, metal, bossa.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Jam aprendendo o repertório</b></td><td>As sugestões de próximo acorde passam a seguir as músicas importadas (o estilo da sua banda).</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>Loops próprios</b></td><td>Trocar a bateria por loops gravados no FL Studio.</td><td><span class="prio p2">MÉDIA</span></td></tr>
    <tr><td><b>App instalável offline (PWA)</b></td><td>Abrir sem internet e com ícone no celular.</td><td><span class="prio p3">PRODUTO</span></td></tr>
    <tr><td><b>Contas e sincronização</b></td><td>Progresso no PC e no celular; backup.</td><td><span class="prio p3">PRODUTO</span></td></tr>
    <tr><td><b>Modo professor</b></td><td>Professor monta treinos e acompanha alunos; caminho natural para escolas de música.</td><td><span class="prio p3">PRODUTO</span></td></tr>
    <tr><td><b>Plano pago (freemium)</b></td><td>Grátis: Improviso, Afinador e quiz básico. Pago: Jam livre, Músicas ilimitadas, Progresso, conferência pelo áudio.</td><td><span class="prio p3">PRODUTO</span></td></tr>
  </table>
  <div class="two">
    <div class="box"><div class="t">Ordem recomendada</div>1) <b>Músicas</b>: ajuda a banda e alimenta Jam, quiz e Improviso ao mesmo tempo. 2) <b>Treino do dia + Progresso</b>: as 2 h viram plano automático. 3) <b>Quiz e placar pelo áudio</b>: o app vira professor que escuta. 4) O resto conforme fizer falta.</div>
    <div class="box"><div class="t">Antes de pensar em produto</div>Use por algumas semanas, mostre para 10–20 guitarristas e pergunte se usariam e pagariam. O que eles pedirem vale mais do que qualquer lista.</div>
  </div>
</section>

</body></html>`

writeFileSync(join(here, 'guia.html'), html)
console.log('ok', join(here, 'guia.html'))
