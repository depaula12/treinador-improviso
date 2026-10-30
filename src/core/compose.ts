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

/** Linguagem das sugestões: muda os acordes (tríades, dominantes do blues, tétrades da bossa). */
export type Lang = 'pop' | 'blues' | 'jazz'
export const LANGS: { id: Lang; label: string; hint: string }[] = [
  { id: 'pop', label: 'Pop/Rock', hint: 'São tendências da música pop e rock, não regras: confie no seu ouvido.' },
  { id: 'blues', label: 'Blues', hint: 'No blues quase tudo é acorde com sétima (dominante), até a tônica. Confie no seu ouvido.' },
  { id: 'jazz', label: 'Bossa/Jazz', hint: 'Bossa e jazz usam tétrades e extensões (7M, m7, 9ª, 13ª) e caminhos ii–V. Confie no seu ouvido.' },
]

// grau: semitons a partir da tônica + sufixo do acorde (cifra brasileira: 7M, m7(b5), º7…)
interface G {
  deg: number
  kind: string
  roman: string
  /** escreve a fundamental com sustenido (C#º7, não Dbº7) */
  sharp?: boolean
}
const g = (deg: number, kind: string, roman: string, sharp = false): G => ({ deg, kind, roman, sharp })

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

// ---------- Blues: quase tudo é acorde com sétima (dominante), até a tônica ----------
const BL = {
  I7: g(0, '7', 'I7'), I9: g(0, '9', 'I9'), IV7: g(5, '7', 'IV7'), V7: g(7, '7', 'V7'), VI7: g(9, '7', 'VI7'),
  II7: g(2, '7', 'II7'), ii7: g(2, 'm7', 'ii7'), bVII7: g(10, '7', 'bVII7'), bIII7: g(3, '7', 'bIII7'),
  bVI7: g(8, '7', 'bVI7'), sIVo: g(6, 'º7', '#IVº7', true), iv: g(5, 'm', 'iv'),
}
const BLM = {
  i7: g(0, 'm7', 'i7'), i: g(0, 'm', 'i'), iv7: g(5, 'm7', 'iv7'), v7: g(7, 'm7', 'v7'), V7: g(7, '7', 'V7'),
  bVI7: g(8, '7', 'bVI7'), bVII7: g(10, '7', 'bVII7'), bIII: g(3, '', 'bIII'),
}
// ---------- Bossa nova e jazz: tétrades, extensões, ii–V, dominantes secundários, trítono ----------
const JZ = {
  I7M: g(0, '7M', 'I7M'), I69: g(0, '6(9)', 'I6/9'), I7M9: g(0, '7M(9)', 'I7M(9)'), ii7: g(2, 'm7', 'ii7'),
  iii7: g(4, 'm7', 'iii7'), IV7M: g(5, '7M', 'IV7M'), iv6: g(5, 'm6', 'iv6'), V7: g(7, '7', 'V7'),
  V79: g(7, '7(9)', 'V7(9)'), V713: g(7, '7(13)', 'V7(13)'), V7sus: g(7, '7sus4', 'V7sus4'), vi7: g(9, 'm7', 'vi7'),
  VI7: g(9, '7', 'VI7'), II7: g(2, '7', 'II7'), III7: g(4, '7', 'III7'), bII7: g(1, '7', 'bII7'),
  bVII7: g(10, '7', 'bVII7'), sIo: g(1, 'º7', '#Iº7', true), sIVo: g(6, 'm7(b5)', '#ivø', true),
}
const JZM = {
  i6: g(0, 'm6', 'i6'), i7: g(0, 'm7', 'i7'), iio: g(2, 'm7(b5)', 'iiø'), V7b9: g(7, '7(b9)', 'V7(b9)'),
  iv7: g(5, 'm7', 'iv7'), bVI7M: g(8, '7M', 'bVI7M'), bIII7M: g(3, '7M', 'bIII7M'), bII7: g(1, '7', 'bII7'),
  bVII7: g(10, '7', 'bVII7'), bVI7: g(8, '7', 'bVI7'), IV7: g(5, '7', 'IV7'),
}

type LangMoods = Partial<Record<MoodId, { major: Raw[]; minor: Raw[] }>>

const BLUES: LangMoods = {
  repousar: {
    major: [
      { seq: [BL.I7], why: 'no blues a tônica já tem sétima: é "casa", mas com tempero' },
      { seq: [BL.I9], why: 'o I9 é a casa do blues com mais brilho (funk, R&B)' },
    ],
    minor: [
      { seq: [BLM.i7], why: 'a tônica menor com sétima: a casa do blues menor' },
      { seq: [BLM.i], why: 'a tríade menor, mais seca e direta' },
    ],
  },
  tensao: {
    major: [
      { seq: [BL.V7], why: 'o V7 do compasso 9: a tensão mais forte do blues' },
      { seq: [BL.V7, BL.IV7], why: 'V7 → IV7: o blues desce em vez de resolver direto' },
      { seq: [BL.II7, BL.V7], why: 'II7 → V7: o dominante do dominante sobe a tensão em dois passos' },
    ],
    minor: [
      { seq: [BLM.V7], why: 'no blues menor o V7 (com a sensível) puxa forte para o i' },
      { seq: [BLM.bVI7, BLM.V7], why: 'bVI7 → V7: o caminho dos compassos 9 e 10 do blues menor' },
    ],
  },
  energia: {
    major: [
      { seq: [BL.IV7], why: 'o IV7 do compasso 5: a música sobe' },
      { seq: [BL.IV7, BL.sIVo], why: 'IV7 → #IVº7: o diminuto de passagem sobe meio tom e volta ao I7 (blues de piano)' },
      { seq: [BL.bVII7, BL.IV7], why: 'bVII7 → IV7: o blues-rock pesado' },
    ],
    minor: [
      { seq: [BLM.iv7], why: 'o iv7 do compasso 5: o blues menor sobe' },
      { seq: [BLM.bVII7], why: 'bVII7: o empurrão do blues-rock em tom menor' },
    ],
  },
  melancolia: {
    major: [
      { seq: [BL.IV7, BL.iv], why: 'IV7 → iv: o iv menor dá o aperto do blues gospel' },
      { seq: [BL.VI7], why: 'o VI7 puxa para o ii: clima de blues antigo, de ragtime' },
    ],
    minor: [
      { seq: [BLM.iv7], why: 'o iv7 aprofunda a tristeza' },
      { seq: [BLM.v7], why: 'o v7 menor é melancólico e sem pressa' },
    ],
  },
  surpresa: {
    major: [
      { seq: [BL.bVII7], why: 'o bVII7 dá o sabor do rock dos anos 60' },
      { seq: [BL.bIII7], why: 'bIII7: a "blue note" (3ª menor) virando acorde' },
      { seq: [BL.bVI7, BL.V7], why: 'bVI7 → V7: chega no V7 por cima, meio tom acima' },
    ],
    minor: [
      { seq: [BLM.bVI7], why: 'bVI7: a cor mais escura do blues menor' },
      { seq: [BLM.bIII], why: 'o bIII (relativo maior) é um respiro no meio da tristeza' },
    ],
  },
  'fim-sobrio': {
    major: [{ seq: [BL.IV7, BL.I7], why: 'IV7 → I7: o "amém" do blues' }],
    minor: [{ seq: [BLM.iv7, BLM.i7], why: 'iv7 → i7: fecha devagar, sem drama' }],
  },
  'fim-forte': {
    major: [
      { seq: [BL.V7, BL.IV7, BL.I7], why: 'V7 → IV7 → I7: o fim clássico dos compassos 9 a 11' },
      { seq: [BL.V7, BL.I7], why: 'V7 → I7: direto e firme' },
    ],
    minor: [{ seq: [BLM.bVI7, BLM.V7, BLM.i7], why: 'bVI7 → V7 → i7: o fim clássico do blues menor' }],
  },
  'fim-epico': {
    major: [{ seq: [BL.bVI7, BL.V7, BL.I9], why: 'bVI7 → V7 → I9: desce cromático até casa, final de banda de blues' }],
    minor: [{ seq: [BLM.bVI7, BLM.bVII7, BLM.i7], why: 'bVI7 → bVII7 → i7: subida em bloco, com sétimas' }],
  },
  suspense: {
    major: [
      { seq: [BL.I7, BL.VI7, BL.ii7, BL.V7], why: 'turnaround I7 → VI7 → ii7 → V7: dá a volta e pede o começo de novo' },
      { seq: [BL.V7], why: 'parar no V7 (o turnaround curto) pede a volta ao I7' },
    ],
    minor: [
      { seq: [BLM.V7], why: 'parar no V7 pede a volta ao começo' },
      { seq: [BLM.bVI7, BLM.V7], why: 'bVI7 → V7: o turnaround do blues menor' },
    ],
  },
}

const JAZZ: LangMoods = {
  repousar: {
    major: [
      { seq: [JZ.I7M], why: 'I7M: a tônica com 7ª maior, repouso sofisticado' },
      { seq: [JZ.I69], why: 'I6/9: a tônica típica da bossa nova' },
      { seq: [JZ.iii7], why: 'o iii7 tem quase as notas do I7M: um repouso mais suave' },
    ],
    minor: [
      { seq: [JZM.i6], why: 'im6: a tônica menor da bossa, menos sombria que a m7' },
      { seq: [JZM.i7], why: 'im7: a tônica menor do jazz modal' },
      { seq: [JZM.bIII7M], why: 'bIII7M: o relativo maior, repouso luminoso' },
    ],
  },
  tensao: {
    major: [
      { seq: [JZ.ii7, JZ.V7], why: 'ii7 → V7: o ii–V, a frase-base do jazz' },
      { seq: [JZ.V713], why: 'V7(13): a 13ª deixa a tensão macia, típica da bossa' },
      { seq: [JZ.ii7, JZ.bII7], why: 'ii7 → bII7: o substituto trítono (divide o trítono com o V7) e desce meio tom até o I' },
    ],
    minor: [
      { seq: [JZM.iio, JZM.V7b9], why: 'iiø → V7(b9): o ii–V em tom menor' },
      { seq: [JZM.V7b9], why: 'V7(b9): a 9ª menor deixa a tensão dramática' },
      { seq: [JZM.bII7], why: 'bII7: substituto trítono do V7, desce meio tom até o i' },
    ],
  },
  energia: {
    major: [
      { seq: [JZ.IV7M], why: 'IV7M: abre e ilumina, sem perder a elegância' },
      { seq: [JZ.II7], why: 'I7M → II7: o dominante emprestado dá o balanço clássico da bossa' },
      { seq: [JZ.vi7, JZ.ii7], why: 'vi7 → ii7: anda pelo ciclo de quartas e empurra para frente' },
    ],
    minor: [
      { seq: [JZM.IV7], why: 'IV7 no tom menor: a cor dórica do samba-jazz' },
      { seq: [JZM.bVI7M], why: 'bVI7M: amplo, cinematográfico' },
      { seq: [JZM.iv7], why: 'iv7: sobe a energia mantendo o clima' },
    ],
  },
  melancolia: {
    major: [
      { seq: [JZ.vi7], why: 'vi7: o relativo menor com sétima, melancolia elegante' },
      { seq: [JZ.iv6], why: 'ivm6 (emprestado do tom menor): a saudade da bossa nova' },
      { seq: [JZ.sIVo], why: '#ivø: o meio-diminuto escurece e prepara a volta' },
    ],
    minor: [
      { seq: [JZM.iv7], why: 'iv7 aprofunda a melancolia' },
      { seq: [JZM.iv7, JZM.bVII7], why: 'iv7 → bVII7: o caminho até o relativo maior, agridoce' },
    ],
  },
  surpresa: {
    major: [
      { seq: [JZ.VI7, JZ.ii7], why: 'VI7 → ii7: dominante secundário, puxa com força para o ii' },
      { seq: [JZ.sIo, JZ.ii7], why: '#Iº7 → ii7: o diminuto de passagem sobe meio tom e cai no ii7' },
      { seq: [JZ.bVII7], why: 'bVII7: o "backdoor", volta para casa pela porta dos fundos' },
      { seq: [JZ.III7, JZ.vi7], why: 'III7 → vi7: dominante secundário do vi' },
    ],
    minor: [
      { seq: [JZM.bVII7, JZM.bIII7M], why: 'bVII7 → bIII7M: um V–I que leva ao relativo maior' },
      { seq: [JZM.bVI7, JZM.V7b9], why: 'bVI7 → V7(b9): dramático, de bolero e tango' },
    ],
  },
  'fim-sobrio': {
    major: [{ seq: [JZ.iv6, JZ.I7M], why: 'ivm6 → I7M: plagal menor, fecha com saudade' }],
    minor: [{ seq: [JZM.iv7, JZM.i6], why: 'iv7 → im6: fecha suave' }],
  },
  'fim-forte': {
    major: [
      { seq: [JZ.ii7, JZ.V7, JZ.I7M], why: 'ii–V–I: a cadência mais importante do jazz' },
      { seq: [JZ.ii7, JZ.V79, JZ.I69], why: 'ii7 → V7(9) → I6/9: o mesmo caminho com cores de bossa' },
    ],
    minor: [{ seq: [JZM.iio, JZM.V7b9, JZM.i6], why: 'iiø → V7(b9) → im6: o ii–V–i menor' }],
  },
  'fim-epico': {
    major: [{ seq: [JZ.ii7, JZ.bII7, JZ.I7M9], why: 'ii7 → bII7 → I7M(9): o baixo desce cromático (como Dm7 → Db7 → C7M)' }],
    minor: [{ seq: [JZM.bVI7, JZM.V7b9, JZM.i6], why: 'bVI7 → V7(b9) → im6: dramático, de bolero' }],
  },
  suspense: {
    major: [
      { seq: [JZ.V7sus], why: 'V7sus4: flutua sem resolver' },
      { seq: [JZ.iii7, JZ.VI7, JZ.ii7, JZ.V7], why: 'turnaround iii–VI–ii–V: dá a volta e pede o começo' },
    ],
    minor: [
      { seq: [JZM.V7b9], why: 'V7(b9) deixa tudo pedindo a volta' },
      { seq: [JZM.iio], why: 'parar no iiø deixa a frase no ar' },
    ],
  },
}

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const symbolOf = (key: ComposeKey, x: G) => (x.sharp ? SHARPS : KEYS)[(key.root + x.deg) % 12] + x.kind

/** O mesmo acorde (fundamental e tipo), ignorando grafia. */
function sameChord(a: string, b: ChordInfo | null): boolean {
  if (!b) return false
  const c = parseChord(a)
  return !!c && c.root === b.root && c.semitones.join() === b.semitones.join()
}

function rawsFor(m: MoodDef, key: ComposeKey, lang: Lang): Raw[] {
  if (lang === 'pop') return key.minor ? m.minor : m.major
  const l = (lang === 'blues' ? BLUES : JAZZ)[m.id]
  return l ? (key.minor ? l.minor : l.major) : []
}

/**
 * Opções a partir do último acorde da progressão. Uma opção que começaria repetindo o último
 * acorde perde o primeiro acorde (ex.: já está no IV → a conclusão sóbria é só o I) ou vai
 * para o fim da lista.
 */
export function movesFor(key: ComposeKey, last: ChordInfo | null, lang: Lang = 'pop'): Move[] {
  return MOODS.map((m) => {
    const options: MoveOption[] = []
    const later: MoveOption[] = []
    for (const r of rawsFor(m, key, lang)) {
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
export function sectionStarts(key: ComposeKey, section: string, lang: Lang = 'pop'): SectionStart[] {
  const s = section.toLowerCase()
  const mk = (label: string, x: G, why: string): SectionStart => ({ label, chords: [symbolOf(key, x)], romans: x.roman, why })
  const refrao = s.includes('refr')
  const ponte = s.includes('ponte')
  if (lang === 'blues') {
    if (key.minor) {
      return refrao || ponte
        ? [mk('Abrir no iv7', BLM.iv7, 'a parte nova sobe para o iv7, como o compasso 5 do blues'), mk('Começar na tônica', BLM.i7, 'firme, cantável')]
        : [mk('Começar na tônica', BLM.i7, 'o blues menor apresenta a casa logo de cara'), mk('Começar no iv7', BLM.iv7, 'começar fora de casa cria expectativa')]
    }
    return refrao || ponte
      ? [mk('Abrir no IV7', BL.IV7, 'a parte nova sobe para o IV7, como o compasso 5 do blues'), mk('Ir para o VI7', BL.VI7, 'o VI7 leva a um caminho de ii–V, cor de blues antigo')]
      : [mk('Começar no I7', BL.I7, 'o blues começa na tônica com sétima'), mk('Começar no IV7', BL.IV7, 'começar no IV7 (como no quick change) cria movimento logo')]
  }
  if (lang === 'jazz') {
    if (key.minor) {
      return refrao || ponte
        ? [mk('Clarear no bVI7M', JZM.bVI7M, 'a parte nova abre no bVI7M, amplo'), mk('Ir para o relativo', JZM.bIII7M, 'o bIII7M muda a luz da música')]
        : [mk('Começar no im6', JZM.i6, 'a tônica menor da bossa'), mk('Começar no iiø', JZM.iio, 'começar com ii–V: a música "chega" na tônica')]
    }
    return refrao || ponte
      ? [mk('Abrir no IV7M', JZ.IV7M, 'a parte nova abre no IV7M: luminosa'), mk('Começar no ii7', JZ.ii7, 'um ii–V leva a parte nova para casa'), mk('Ir para o vi7', JZ.vi7, 'o relativo menor muda o clima')]
      : [mk('Começar no I7M', JZ.I7M, 'apresenta o tom com cor de bossa'), mk('Começar no ii7', JZ.ii7, 'muito comum no jazz: a música "chega" ao I pelo ii–V'), mk('Começar no vi7', JZ.vi7, 'começa melancólico e elegante')]
  }
  const T = key.minor ? MIN.i : MAJ.I
  if (refrao) {
    return key.minor
      ? [mk('Subir com o bVI', MIN.bVI, 'refrão em tom menor costuma abrir no bVI: amplo e forte'), mk('Começar na tônica', T, 'direto e marcante'), mk('Clarear no bIII', MIN.bIII, 'o relativo maior dá o "levantar" do refrão')]
      : [mk('Abrir no IV', MAJ.IV, 'refrão costuma subir a energia começando no IV'), mk('Começar na tônica', T, 'firme, cantável'), mk('Emocionar no vi', MAJ.vi, 'refrão "de chorar" começa no vi')]
  }
  if (ponte) {
    return key.minor
      ? [mk('Fugir para o iv', MIN.iv, 'a ponte sai do lugar-comum do verso'), mk('Ir para o bVI', MIN.bVI, 'muda a cor antes de voltar ao refrão')]
      : [mk('Começar no vi', MAJ.vi, 'a ponte costuma ir para o relativo menor'), mk('Ir para o ii', MAJ.ii, 'um começo diferente, que prepara o V'), mk('Ousar no bVI', MAJ.bVI, 'emprestado do menor: a ponte vira outro mundo')]
  }
  return key.minor
    ? [mk('Começar na tônica', T, 'apresenta o tom logo de cara'), mk('Começar no bVI', MIN.bVI, 'começar "fora de casa" cria expectativa')]
    : [mk('Começar na tônica', T, 'apresenta o tom logo de cara'), mk('Começar no vi', MAJ.vi, 'pop em tom maior que soa melancólico'), mk('Começar no IV', MAJ.IV, 'começar fora de casa cria expectativa')]
}

/** Grau de um acorde no tom, para mostrar a progressão em algarismos romanos (com a sétima, se tiver). */
export function romanIn(key: ComposeKey, sym: string): string {
  const c = parseChord(sym)
  if (!c) return '?'
  const ROMAN = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII']
  const deg = (((c.root - key.root) % 12) + 12) % 12
  const has = (s: number) => c.semitones.includes(s)
  const r = c.minor ? ROMAN[deg].toLowerCase() : ROMAN[deg]
  // diminuto e meio-diminuto de passagem se escrevem com sustenido (#iº, #ivø)
  const up = ['i', '#i', 'ii', '#ii', 'iii', 'iv', '#iv', 'v', '#v', 'vi', 'bvii', 'vii'][deg]
  if (has(3) && has(6) && has(9)) return `${up}º`
  if (has(3) && has(6) && has(10)) return `${up}ø`
  if (has(4) && has(10)) return `${r}7`
  if (has(4) && has(11)) return `${r}7M`
  if (has(3) && has(10)) return `${r}7`
  if (has(5) && !has(4) && !has(3)) return `${r}${has(10) ? '7' : ''}sus4`
  return r
}

/** Cores de cada família: do acorde simples ao mais rico (botão "colorir"). */
const COLORS: Record<string, Record<Lang, string[]>> = {
  maior: { pop: ['', 'add9', '7M', '6'], blues: ['', '7', '9', '7(13)'], jazz: ['', '7M', '7M(9)', '6(9)'] },
  menor: { pop: ['m', 'm7', 'm7(9)'], blues: ['m', 'm7', 'm7(9)'], jazz: ['m', 'm7', 'm7(9)', 'm6'] },
  dom: { pop: ['7', '7(9)', '7sus4'], blues: ['7', '9', '7(13)', '7(#9)'], jazz: ['7', '7(9)', '7(13)', '7(b9)'] },
  sus: { pop: ['sus4', '7sus4', 'sus2'], blues: ['sus4', '7sus4'], jazz: ['sus4', '7sus4', '7sus4(9)'] },
}

function family(c: ChordInfo): keyof typeof COLORS | null {
  const has = (s: number) => c.semitones.includes(s)
  if (has(3) && has(6)) return null // diminutos e meio-diminutos já são "cor"
  if (has(4) && has(10)) return 'dom'
  if (has(4)) return 'maior'
  if (has(3)) return 'menor'
  if (has(5) || (has(2) && !has(4))) return 'sus'
  return null
}

/** Próxima cor do acorde (C → C7M → C7M(9) → C6/9 → C), mantendo a fundamental e o baixo. */
export function colorize(sym: string, lang: Lang = 'jazz'): string | null {
  const c = parseChord(sym)
  const m = sym.match(/^([A-G][#b]?)(.*?)(\/[A-G][#b]?)?$/)
  if (!c || !m) return null
  const fam = family(c)
  if (!fam) return null
  const steps = COLORS[fam][lang]
  const same = (s: string) => parseChord(m[1] + s)?.semitones.join() === c.semitones.join()
  const at = steps.findIndex(same)
  const next = steps[(at + 1) % steps.length]
  return next === m[2] ? null : m[1] + next + (m[3] ?? '')
}
