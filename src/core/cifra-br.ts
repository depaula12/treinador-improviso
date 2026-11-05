/**
 * Leitura estruturada de cifra no estilo brasileiro (Cifra Club): C7(9), Cm7(5-), C7(9)(13), C4/7,
 * C7M(5+), C(b5)… A fundamental é separada do corpo e o texto dos parênteses vira lista de extensões;
 * nunca se cola o parêntese na fundamental (era isso que fazia "C(b5)" virar "Cb5").
 *
 * Devolve os intervalos no formato do tonal ('1P', '3M', '5d', '9m'…), do grave ao agudo.
 * Regra de leitura: só entra o que está escrito. 7(13) = 1 3 5 b7 13 (sem a 9ª implícita);
 * os símbolos "americanos" sem parênteses (C13, Cm11…) continuam com o tonal (theory.ts).
 */

type Third = '3M' | '3m' | '4P' | '2M' | null
type Fifth = '5P' | '5d' | '5A'
type Seventh = '7m' | '7M' | '7d' | null

interface Parts {
  third: Third
  fifth: Fifth
  sixth: boolean
  seventh: Seventh
  tens: Set<string>
  power: boolean
}

/** tensões e alterações (dentro ou fora de parênteses) → intervalo */
const TENSION: Record<string, string> = {
  '9': '9M', '2': '9M', add9: '9M', add2: '9M',
  b9: '9m', '9-': '9m', '-9': '9m',
  '#9': '9A', '9+': '9A', '+9': '9A',
  '11': '11P', add11: '11P', add4: '11P',
  '#11': '11A', '11+': '11A', '+11': '11A',
  '13': '13M', add13: '13M',
  b13: '13m', '13-': '13m', '-13': '13m', b6: '13m',
}

export interface BrChord {
  intervals: string[]
  /** aviso de ambiguidade para mostrar ao usuário */
  warn?: string
}

/** Lê o corpo da cifra (tudo depois da fundamental, sem o baixo "/X"). null = não reconhecido. */
export function parseBody(body: string): BrChord | null {
  let b = body.replace(/\s+/g, '')
  let warn: string | undefined
  // grafias alternativas que valem para o corpo inteiro
  b = b.replace(/[°º]/g, 'dim').replace(/ø/g, 'm7b5').replace(/Maj|MAJ|MA(?=\d)/g, 'maj')
  b = b.replace(/^7M7$/, '7M').replace(/(?<!a)j7/g, 'maj7').replace(/^M7/, 'maj7').replace(/^M9/, 'maj9').replace(/^M$/, '')

  // extensões entre parênteses: "(9)(13)", "(4/9)", "(b5)"
  const ext: string[] = []
  b = b.replace(/\(([^()]*)\)/g, (_, inner: string) => {
    ext.push(...inner.split(/[/,]/).filter(Boolean))
    return ''
  })
  if (/[()]/.test(b)) return null
  // extensões com barra: "7/9", "4/7", "6/9", "7/4/9"
  const slash = b.split('/')
  b = slash[0]
  ext.push(...slash.slice(1).filter(Boolean))

  const p: Parts = { third: '3M', fifth: '5P', sixth: false, seventh: null, tens: new Set(), power: false }

  // ---- prefixo: menor, diminuto, aumentado ----
  let rest = b
  let dim = false
  if (/^(m(?!aj)|min|-)/.test(rest)) {
    p.third = '3m'
    rest = rest.replace(/^(min|m|-)/, '')
  }
  if (rest.startsWith('dim')) {
    dim = true
    p.third = '3m'
    p.fifth = '5d'
    rest = rest.slice(3)
  } else if (rest.startsWith('aug')) {
    p.fifth = '5A'
    rest = rest.slice(3)
  }

  // ---- corpo: sequência de peças conhecidas ----
  const PIECES: [RegExp, () => void][] = [
    [/^maj13/, () => { p.seventh = '7M'; p.tens.add('9M'); p.tens.add('13M') }],
    [/^maj9/, () => { p.seventh = '7M'; p.tens.add('9M') }],
    [/^(maj7|7M)/, () => { p.seventh = '7M' }],
    [/^7\+/, () => { p.seventh = p.seventh ?? '7m'; p.fifth = '5A'; warn = '7+ pode ser 7(#5) ou, em cifras antigas, 7M. Entendi como 7(#5).' }],
    [/^69/, () => { p.sixth = true; p.tens.add('9M') }],
    [/^13/, () => { p.seventh = p.seventh ?? '7m'; p.tens.add('9M'); p.tens.add('13M') }],
    [/^11/, () => { p.seventh = p.seventh ?? '7m'; p.tens.add('9M'); p.tens.add('11P') }],
    [/^9/, () => { p.seventh = p.seventh ?? '7m'; p.tens.add('9M') }],
    [/^7/, () => { p.seventh = dim ? '7d' : p.seventh ?? '7m' }],
    [/^6/, () => { p.sixth = true }],
    [/^(add9|add2)/, () => p.tens.add('9M')],
    [/^(add11|add4)/, () => p.tens.add('11P')],
    [/^add13/, () => p.tens.add('13M')],
    [/^sus2/, () => { p.third = '2M' }],
    [/^(sus4|sus)/, () => { p.third = '4P' }],
    [/^(5\+|\+5|#5|\+)/, () => { p.fifth = '5A' }],
    [/^(5-|-5|b5)/, () => { p.fifth = '5d' }],
    [/^(b9|#9|#11|b13)/, () => {}], // tratado abaixo (precisa do texto)
    [/^4/, () => { p.third = '4P' }],
    [/^2/, () => { p.third = '2M' }],
    [/^5/, () => { p.power = true }],
  ]
  let guard = 0
  while (rest && guard++ < 12) {
    const alt = rest.match(/^(b9|#9|#11|b13)/)
    if (alt) {
      p.tens.add(TENSION[alt[1]])
      p.seventh = p.seventh ?? '7m'
      rest = rest.slice(alt[1].length)
      continue
    }
    const hit = PIECES.find(([re]) => re.test(rest))
    if (!hit) return null
    const len = rest.match(hit[0])![0].length
    hit[1]()
    rest = rest.slice(len)
  }
  if (rest) return null

  // ---- extensões ----
  for (const raw of ext) {
    const e = raw.trim()
    if (TENSION[e]) p.tens.add(TENSION[e])
    else if (/^(5\+|\+5|#5|\+)$/.test(e)) p.fifth = '5A'
    else if (/^(5-|-5|b5)$/.test(e)) p.fifth = '5d'
    else if (e === '4' || e === 'sus4') p.third = '4P'
    else if (e === 'sus2') p.third = '2M'
    else if (e === '7') p.seventh = dim ? '7d' : '7m'
    else if (/^(7M|maj7|M7)$/.test(e)) p.seventh = '7M'
    else if (e === '6') p.sixth = true
    else return null
  }

  if (p.power) {
    if (p.sixth || p.seventh || p.tens.size || p.third !== '3M' || p.fifth !== '5P') return null
    return { intervals: ['1P', '5P'] }
  }
  // 9ª com sus2 seria a mesma nota: fica só o sus2
  if (p.third === '2M') p.tens.delete('9M')

  const out = ['1P']
  if (p.third) out.push(p.third)
  out.push(p.fifth)
  if (p.sixth) out.push('6M')
  if (p.seventh) out.push(p.seventh)
  for (const t of ['9m', '9M', '9A', '11P', '11A', '13m', '13M']) if (p.tens.has(t)) out.push(t)
  return { intervals: out, ...(warn ? { warn } : {}) }
}

/** O corpo precisa da leitura brasileira? (parênteses, extensão com barra, + ou -, j7…) */
export const needsBr = (body: string) => /[()+\-/]|(?<!a)j7|7M7|^M$/.test(body)
