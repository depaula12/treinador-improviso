import { KEYS, parseChord, type ChordInfo } from './theory'

// Compor: a partir do último acorde, opções pelo EFEITO que causam (tensão, subir a energia,
// melancolia…). São tendências da música ocidental (pop, rock, blues), não regras: o texto
// diz "costuma soar", e cada opção tem o porquê em uma linha.

export interface ComposeKey {
  /** classe de altura da tônica (0 = C) */
  root: number
  minor: boolean
}

export type MoodId =
  | 'repousar' | 'tensao' | 'energia' | 'melancolia' | 'surpresa'
  | 'fim-sobrio' | 'fim-forte' | 'fim-epico' | 'suspense'

export interface MoveOption {
  /** acordes que entram, em ordem (1 a 3) */
  chords: string[]
  /** graus, ex.: "IV → I" */
  romans: string
  /** por que soa assim (teoria em uma linha) */
  why: string
}

export interface Move {
  id: MoodId
  label: string
  /** o efeito, em linguagem de músico */
  feel: string
  /** a primeira é a sugerida; as outras aparecem em "outra opção" */
  options: MoveOption[]
}

// grau: semitons a partir da tônica + tipo do acorde
type Kind = '' | 'm' | '7' | 'sus4'
interface G {
  deg: number
  kind: Kind
  roman: string
}
const g = (deg: number, kind: Kind, roman: string): G => ({ deg, kind, roman })

const MAJ = {
  I: g(0, '', 'I'), ii: g(2, 'm', 'ii'), iii: g(4, 'm', 'iii'), IV: g(5, '', 'IV'), V: g(7, '', 'V'), V7: g(7, '7', 'V7'),
  Vsus: g(7, 'sus4', 'Vsus4'), vi: g(9, 'm', 'vi'), bVII: g(10, '', 'bVII'), bVI: g(8, '', 'bVI'), iv: g(5, 'm', 'iv'),
  bIII: g(3, '', 'bIII'), II7: g(2, '7', 'II7'), III7: g(4, '7', 'III7'),
}
const MIN = {
  i: g(0, 'm', 'i'), iv: g(5, 'm', 'iv'), v: g(7, 'm', 'v'), V7: g(7, '7', 'V7'), bVI: g(8, '', 'bVI'), bVII: g(10, '', 'bVII'),
  bIII: g(3, '', 'bIII'), IV: g(5, '', 'IV'), bII: g(1, '', 'bII'),
}

interface Raw {
  seq: G[]
  why: string
}
interface MoodDef {
  id: MoodId
  label: string
  feel: string
  major: Raw[]
  minor: Raw[]
}

const MOODS: MoodDef[] = [
  {
    id: 'repousar', label: 'Repousar', feel: 'sensação de chegada, de casa',
    major: [
      { seq: [MAJ.I], why: 'a tônica é o centro do tom: tudo quer voltar para ela' },
      { seq: [MAJ.vi], why: 'o vi é o relativo menor: um repouso mais suave, meio nostálgico' },
    ],
    minor: [
      { seq: [MIN.i], why: 'a tônica menor é o centro: tudo quer voltar para ela' },
      { seq: [MIN.bIII], why: 'o relativo maior: um repouso luminoso dentro do tom menor' },
    ],
  },
  {
    id: 'tensao', label: 'Criar tensão', feel: 'deixa no ar, pedindo resolução',
    major: [
      { seq: [MAJ.V7], why: 'o V7 tem a sensível, meio tom abaixo da tônica, que puxa para o I' },
      { seq: [MAJ.ii, MAJ.V7], why: 'ii → V7 é o caminho clássico até a tensão máxima' },
      { seq: [MAJ.Vsus, MAJ.V7], why: 'o sus4 segura a tensão antes de soltar no V7' },
    ],
    minor: [
      { seq: [MIN.V7], why: 'o V7 (com a sensível) é a tensão mais forte no tom menor' },
      { seq: [MIN.iv, MIN.V7], why: 'iv → V7 aumenta a tensão em dois passos' },
      { seq: [MIN.bII], why: 'o bII soa escuro e dramático, pedindo para voltar' },
    ],
  },
  {
    id: 'energia', label: 'Subir a energia', feel: 'abre e empurra para frente (ótimo para refrão)',
    major: [
      { seq: [MAJ.IV], why: 'o IV se afasta da tônica e soa como abertura, como respirar fundo' },
      { seq: [MAJ.IV, MAJ.V], why: 'IV → V sobe degrau por degrau: a energia cresce' },
      { seq: [MAJ.bVII, MAJ.IV], why: 'bVII → IV é a subida do rock clássico (emprestado do menor)' },
    ],
    minor: [
      { seq: [MIN.bVI, MIN.bVII], why: 'bVI → bVII sobe em bloco: o som épico do rock e do metal' },
      { seq: [MIN.bVII], why: 'o bVII dá impulso e prepara a volta' },
      { seq: [MIN.IV], why: 'o IV maior no tom menor (dórico) clareia e levanta' },
    ],
  },
  {
    id: 'melancolia', label: 'Melancolia', feel: 'mais triste, introspectivo',
    major: [
      { seq: [MAJ.vi], why: 'o vi usa as mesmas notas do tom, mas com clima triste' },
      { seq: [MAJ.iv], why: 'o iv é emprestado do tom menor: um aperto no peito antes de voltar' },
      { seq: [MAJ.iii], why: 'o iii é delicado e um pouco triste' },
    ],
    minor: [
      { seq: [MIN.iv], why: 'o iv aprofunda o clima menor' },
      { seq: [MIN.v], why: 'o v menor (sem a sensível) é melancólico e sem pressa' },
      { seq: [MIN.bVI], why: 'o bVI soa saudoso e amplo' },
    ],
  },
  {
    id: 'surpresa', label: 'Surpresa', feel: 'uma cor diferente, fora do óbvio',
    major: [
      { seq: [MAJ.bVI], why: 'emprestado do tom menor: ar épico, de trilha de filme' },
      { seq: [MAJ.II7], why: 'dominante secundário: o II7 puxa com força para o V' },
      { seq: [MAJ.III7], why: 'dominante secundário: o III7 puxa para o vi (muito usado em baladas)' },
      { seq: [MAJ.bIII], why: 'emprestado do menor: um tempero de blues e rock' },
    ],
    minor: [
      { seq: [MIN.IV], why: 'o IV maior no tom menor: cor dórica, mais luminosa' },
      { seq: [MIN.bII], why: 'o bII (napolitano): estranho e dramático' },
      { seq: [MIN.bIII], why: 'o relativo maior aparece como um raio de sol' },
    ],
  },
  {
    id: 'fim-sobrio', label: 'Conclusão sóbria', feel: 'fecha de leve, como um "amém"',
    major: [{ seq: [MAJ.IV, MAJ.I], why: 'cadência plagal (IV → I): a do "amém", calma e sem drama' }],
    minor: [{ seq: [MIN.iv, MIN.i], why: 'iv → i: fecha com suavidade e um pouco de tristeza' }],
  },
  {
    id: 'fim-forte', label: 'Conclusão forte', feel: 'fecha com firmeza, sem dúvida',
    major: [{ seq: [MAJ.V7, MAJ.I], why: 'cadência perfeita (V7 → I): a resolução mais forte que existe' }],
    minor: [{ seq: [MIN.V7, MIN.i], why: 'V7 → i: a sensível resolve na tônica, fecha com firmeza' }],
  },
  {
    id: 'fim-epico', label: 'Conclusão épica', feel: 'sobe e explode no final',
    major: [{ seq: [MAJ.bVI, MAJ.bVII, MAJ.I], why: 'bVI → bVII → I: a subida épica (emprestada do menor), final de show' }],
    minor: [{ seq: [MIN.bVI, MIN.bVII, MIN.i], why: 'bVI → bVII → i: subida em bloco até a tônica, som de arena' }],
  },
  {
    id: 'suspense', label: 'Deixar em suspense', feel: 'termina sem resolver, pede continuação',
    major: [
      { seq: [MAJ.V], why: 'parar no V deixa a frase "perguntando": ótimo antes de uma nova seção' },
      { seq: [MAJ.IV], why: 'parar no IV soa aberto, como reticências' },
    ],
    minor: [
      { seq: [MIN.V7], why: 'parar no V7 deixa tudo em aberto' },
      { seq: [MIN.bVII], why: 'parar no bVII soa como uma pergunta sem resposta' },
    ],
  },
]

const symbolOf = (key: ComposeKey, x: G) => KEYS[(key.root + x.deg) % 12] + x.kind

/** O mesmo acorde (fundamental e tipo), ignorando grafia. */
function sameChord(a: string, b: ChordInfo | null): boolean {
  if (!b) return false
  const c = parseChord(a)
  return !!c && c.root === b.root && c.semitones.join() === b.semitones.join()
}

/**
 * Opções a partir do último acorde da progressão. Uma opção que começaria repetindo o último
 * acorde perde o primeiro acorde (ex.: já está no IV → a conclusão sóbria é só o I) ou vai
 * para o fim da lista.
 */
export function movesFor(key: ComposeKey, last: ChordInfo | null): Move[] {
  return MOODS.map((m) => {
    const raws = key.minor ? m.minor : m.major
    const options: MoveOption[] = []
    const later: MoveOption[] = []
    for (const r of raws) {
      let seq = r.seq
      if (sameChord(symbolOf(key, seq[0]), last)) {
        if (seq.length === 1) continue
        seq = seq.slice(1)
      }
      const opt = { chords: seq.map((x) => symbolOf(key, x)), romans: seq.map((x) => x.roman).join(' → '), why: r.why }
      ;(seq === r.seq ? options : later).push(opt)
    }
    return { id: m.id, label: m.label, feel: m.feel, options: [...options, ...later] }
  }).filter((m) => m.options.length)
}

export interface SectionStart {
  label: string
  chords: string[]
  romans: string
  why: string
}

/** Por onde começar uma seção (verso, refrão, ponte…). */
export function sectionStarts(key: ComposeKey, section: string): SectionStart[] {
  const s = section.toLowerCase()
  const T = key.minor ? MIN.i : MAJ.I
  const mk = (label: string, x: G, why: string): SectionStart => ({ label, chords: [symbolOf(key, x)], romans: x.roman, why })
  if (s.includes('refr')) {
    return key.minor
      ? [mk('Subir com o bVI', MIN.bVI, 'refrão em tom menor costuma abrir no bVI: amplo e forte'), mk('Começar na tônica', T, 'direto e marcante'), mk('Clarear no bIII', MIN.bIII, 'o relativo maior dá o "levantar" do refrão')]
      : [mk('Abrir no IV', MAJ.IV, 'refrão costuma subir a energia começando no IV'), mk('Começar na tônica', T, 'firme, cantável'), mk('Emocionar no vi', MAJ.vi, 'refrão "de chorar" começa no vi')]
  }
  if (s.includes('ponte')) {
    return key.minor
      ? [mk('Fugir para o iv', MIN.iv, 'a ponte sai do lugar-comum do verso'), mk('Ir para o bVI', MIN.bVI, 'muda a cor antes de voltar ao refrão')]
      : [mk('Começar no vi', MAJ.vi, 'a ponte costuma ir para o relativo menor'), mk('Ir para o ii', MAJ.ii, 'um começo diferente, que prepara o V'), mk('Ousar no bVI', MAJ.bVI, 'emprestado do menor: a ponte vira outro mundo')]
  }
  return key.minor
    ? [mk('Começar na tônica', T, 'apresenta o tom logo de cara'), mk('Começar no bVI', MIN.bVI, 'começar "fora de casa" cria expectativa')]
    : [mk('Começar na tônica', T, 'apresenta o tom logo de cara'), mk('Começar no vi', MAJ.vi, 'pop em tom maior que soa melancólico'), mk('Começar no IV', MAJ.IV, 'começar fora de casa cria expectativa')]
}

/** Grau de um acorde no tom, para mostrar a progressão em algarismos romanos. */
export function romanIn(key: ComposeKey, sym: string): string {
  const c = parseChord(sym)
  if (!c) return '?'
  const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII']
  const deg = (((c.root - key.root) % 12) + 12) % 12
  const dom = c.semitones.includes(4) && c.semitones.includes(10)
  return (c.minor ? ROMAN[deg].toLowerCase() : ROMAN[deg]) + (dom ? '7' : c.semitones.includes(5) && !c.semitones.includes(4) && !c.semitones.includes(3) ? 'sus4' : '')
}
