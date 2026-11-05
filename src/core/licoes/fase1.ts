/**
 * Lições da semana zero e da fase 1 (Fundamentos). Escritas uns sprints à frente do usuário.
 * Toda afirmação que vira pergunta é conferida em licoes.test.ts.
 */
import {
  cadenceThen, fixed, fretOf, interval, KEY_SIG, MAJOR, mc, NATURALS, OPEN, PENT_DEG, PENT_MIN, pick, PT, SEMIS, seq, STRING_NAME,
} from './ajuda'
import type { Lesson } from './tipos'

const ptOf = (note: string) => `${note} (${PT[note[0]]}${note.length > 1 ? note.slice(1).replace('#', '♯').replace('b', '♭') : ''})`

// ======================= semana zero =======================

const s0_0: Lesson = {
  id: 's0-0', sprint: 0, task: 0, min: 15,
  title: 'O braço da guitarra: cordas, casas e os nomes das notas',
  steps: [
    { t: 'p', text: 'Música usa **7 notas naturais**. Na cifra, cada uma tem uma letra: **C** = Dó, **D** = Ré, **E** = Mi, **F** = Fá, **G** = Sol, **A** = Lá, **B** = Si. Depois do Si, volta o Dó, só que mais agudo.' },
    { t: 'p', text: 'As cordas soltas, da mais grossa para a mais fina, são **Mi Lá Ré Sol Si Mi** (E A D G B E). A mais grossa é a **6ª corda**, e a mais fina é a **1ª**. Na tela, como na tablatura, a 1ª corda fica em cima.' },
    { t: 'braco', fig: { root: 4, semis: [0, 5, 10, 3, 7], names: ['E', 'A', 'D', 'G', 'B'], labels: 'notas', frets: [0, 4], pos: [[6, 0], [5, 0], [4, 0], [3, 0], [2, 0], [1, 0]] }, caption: 'As seis cordas soltas.' },
    { t: 'ouvir', items: [
      { label: 'As seis cordas soltas', events: seq([40, 45, 50, 55, 59, 64], 0.45) },
      { label: 'Uma casa de cada vez', events: seq([40, 41, 42, 43, 44, 45], 0.35, 0.6) },
      { label: '6ª corda solta e casa 12', events: seq([40, 52], 0.8, 1.4) },
    ] },
    { t: 'p', text: 'Cada casa sobe **meio tom** (um **semitom**), a menor distância entre duas notas. São 12 semitons até a mesma nota voltar, uma **oitava** acima. Por isso a casa 12 tem a mesma nota da corda solta.' },
    { t: 'p', text: 'Entre quase todas as naturais cabe uma nota no meio: Dó, **Dó♯**, Ré. O ♯ (sustenido) sobe meio tom, e o ♭ (bemol) desce meio tom, então Dó♯ e Ré♭ são a mesma nota. Só há duas exceções sem nota no meio: **Mi–Fá** e **Si–Dó**.' },
    { t: 'braco', fig: { root: 4, semis: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], names: ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'], labels: 'notas', frets: [0, 12], pos: Array.from({ length: 13 }, (_, f) => [6, f] as [number, number]) }, caption: 'As 12 notas na 6ª corda. Na casa 12, o Mi volta.' },
    { t: 'tente', text: 'Toque a 6ª corda solta e depois a casa 12. Ouça: é a "mesma" nota, mais aguda. Faça o mesmo nas outras cordas.' },
  ],
  quiz: [
    fixed('Quantas casas (semitons) cabem numa oitava?', ['7', '8', '10', '12'], '12', 'São 12 semitons até a nota se repetir. Por isso a casa 12 repete a corda solta.'),
    fixed('Entre quais notas naturais NÃO existe nota no meio?', ['Dó–Ré e Fá–Sol', 'Mi–Fá e Si–Dó', 'Lá–Si e Ré–Mi', 'Sol–Lá e Dó–Ré'], 'Mi–Fá e Si–Dó', 'Mi–Fá e Si–Dó estão a meio tom. As outras naturais estão a um tom, com uma nota no meio.'),
    { gen: (rnd) => {
      const s = pick([1, 2, 3, 4, 5, 6], rnd)
      const name = { 40: 'E', 45: 'A', 50: 'D', 55: 'G', 59: 'B', 64: 'E' }[OPEN[s]]!
      return mc(`Qual é a nota da ${STRING_NAME[s].split(' (')[0]} solta?`, ptOf(name), ['E', 'A', 'D', 'G', 'B', 'C', 'F'].map(ptOf), 'Cordas soltas, da 6ª à 1ª: Mi Lá Ré Sol Si Mi (E A D G B E).', rnd)
    } },
    { gen: (rnd) => {
      const n = pick(NATURALS, rnd)
      return mc(`Na cifra, ${n} é qual nota?`, PT[n], Object.values(PT), 'C Dó, D Ré, E Mi, F Fá, G Sol, A Lá, B Si.', rnd)
    } },
    fixed('A casa 12 de uma corda é…', ['meio tom acima da corda solta', 'a mesma nota da corda solta, uma oitava acima', 'a 5ª da corda solta', 'uma nota sem nome'], 'a mesma nota da corda solta, uma oitava acima', '12 casas = 12 semitons = uma oitava.'),
  ],
}

// ======================= sprint 1 =======================

const nat6: [number, number][] = NATURALS.flatMap((n) => [fretOf(6, n), fretOf(6, n) + 12].filter((f) => f <= 12).map((f) => [6, f] as [number, number]))
const nat5: [number, number][] = NATURALS.flatMap((n) => [fretOf(5, n), fretOf(5, n) + 12].filter((f) => f <= 12).map((f) => [5, f] as [number, number]))

const s1_0: Lesson = {
  id: 's1-0', sprint: 1, task: 0, min: 20,
  title: 'Notas naturais nas cordas 6 e 5',
  steps: [
    { t: 'p', text: 'Quase todo acorde com pestana e toda escala começam numa nota da **6ª** ou da **5ª corda**. Sabendo as naturais nessas duas cordas, você acha qualquer tom no braço.' },
    { t: 'p', text: 'A regra: de uma natural para a próxima são **2 casas** (um tom), exceto **Mi→Fá** e **Si→Dó**, que estão a **1 casa** (meio tom).' },
    { t: 'braco', fig: { root: 0, semis: [0, 2, 4, 5, 7, 9, 11], names: NATURALS, labels: 'notas', frets: [0, 12], pos: [...nat6, ...nat5] }, caption: 'As naturais na 6ª e na 5ª corda. Dó em vermelho.' },
    { t: 'lista', items: [
      '6ª corda: Mi solta, Fá 1, Sol 3, **Lá 5**, Si 7, Dó 8, Ré 10, Mi 12.',
      '5ª corda: Lá solta, Si 2, **Dó 3**, Ré 5, Mi 7, Fá 8, Sol 10, Lá 12.',
    ] },
    { t: 'dica', text: 'Use as bolinhas do braço (casas 3, 5, 7, 9 e 12) como placas de rua. Na 6ª corda: 3 = Sol, 5 = Lá, 7 = Si. Na 5ª: 3 = Dó, 5 = Ré, 7 = Mi.' },
    { t: 'p', text: 'A mesma nota da 6ª corda casa 5 (Lá) está na 5ª corda **solta**. É assim que se afina de ouvido: a 6ª corda na casa 5 soa igual à 5ª solta.' },
    { t: 'ouvir', items: [
      { label: 'Naturais subindo a 6ª corda', events: seq([40, 41, 43, 45, 47, 48, 50, 52], 0.42, 0.7) },
      { label: '6ª casa 5 e 5ª solta (mesma nota)', events: seq([45, 45], 0.9, 1.3) },
    ] },
    { t: 'tente', text: 'Suba a 6ª corda dizendo o nome de cada natural em voz alta. Depois ache todos os Lá e todos os Dó nas duas cordas, sem olhar a tela.' },
  ],
  quiz: [
    { gen: (rnd) => {
      const s = pick([6, 5], rnd)
      const n = pick(NATURALS, rnd)
      const f = fretOf(s, n)
      const where = f === 0 ? 'solta' : `na casa ${f}`
      return mc(`Que nota fica ${where} da ${s}ª corda?`, ptOf(n), NATURALS.map(ptOf), `${s === 6 ? '6ª corda: Mi 0, Fá 1, Sol 3, Lá 5, Si 7, Dó 8, Ré 10' : '5ª corda: Lá 0, Si 2, Dó 3, Ré 5, Mi 7, Fá 8, Sol 10'}.`, rnd)
    } },
    { gen: (rnd) => {
      const s = pick([6, 5], rnd)
      const choices = NATURALS.filter((n) => fretOf(s, n) !== 0)
      const n = pick(choices, rnd)
      return mc(`Em que casa da ${s}ª corda fica o ${ptOf(n)}?`, String(fretOf(s, n)), choices.map((x) => String(fretOf(s, x))), `Conte a partir da corda solta: 2 casas entre naturais, 1 casa em Mi–Fá e Si–Dó.`, rnd)
    } },
    fixed('Quantas casas há entre Si e Dó?', ['0', '1', '2', '3'], '1', 'Si–Dó é meio tom: uma casa. O mesmo vale para Mi–Fá.'),
    fixed('A nota da 6ª corda na casa 5 é a mesma que…', ['a 5ª corda solta', 'a 5ª corda na casa 5', 'a 4ª corda solta', 'a 6ª corda na casa 7'], 'a 5ª corda solta', 'As duas são Lá. É o ponto de afinação entre as duas cordas.'),
  ],
}

const pentA: [number, number][] = [[6, 5], [6, 8], [5, 5], [5, 7], [4, 5], [4, 7], [3, 5], [3, 7], [2, 5], [2, 8], [1, 5], [1, 8]]

const s1_1: Lesson = {
  id: 's1-1', sprint: 1, task: 1, min: 20,
  title: 'Tom, semitom e os graus da pentatônica menor',
  steps: [
    { t: 'p', text: '**Semitom** = 1 casa. **Tom** = 2 casas. É só isso, e toda escala é uma receita de tons e semitons.' },
    { t: 'p', text: 'Em vez de decorar notas, músicos contam **graus**: a posição de cada nota em relação à **tônica** (a nota "casa" do tom, o grau **1**). Assim o mesmo desenho serve para qualquer tom.' },
    { t: 'p', text: 'A **pentatônica menor** tem 5 notas: **1 b3 4 5 b7**. Em Lá: Lá, Dó, Ré, Mi, Sol. O "b" quer dizer meio tom abaixo do grau da escala maior. A b3 está a 3 semitons da tônica, enquanto a 3 (maior) está a 4.' },
    { t: 'lista', items: [
      '1 → b3: um tom e meio (3 casas)',
      'b3 → 4: um tom (2 casas)',
      '4 → 5: um tom (2 casas)',
      '5 → b7: um tom e meio (3 casas)',
      'b7 → 1: um tom (2 casas), e a escala recomeça',
    ] },
    { t: 'braco', fig: { root: 9, semis: [0, 3, 5, 7, 10], labels: 'graus', frets: [4, 9], pos: pentA }, caption: 'Box 1 da pentatônica menor de Lá, com os graus. O 1 (Lá) em vermelho.' },
    { t: 'ouvir', items: [
      { label: 'Pentatônica de Lá subindo', events: seq([45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72], 0.32, 0.6) },
      { label: 'b3 (menor) e depois 3 (maior)', events: [...seq([45, 48, 52], 0.3, 1.2), ...seq([45, 49, 52], 0.3, 1.2, 1.6)] },
    ] },
    { t: 'p', text: 'A **b3** é o que deixa o som "triste" ou blues. Troque pela 3 maior e tudo fica alegre.' },
    { t: 'tente', text: 'Toque o box 1 subindo e descendo e diga o grau de cada nota: "um, bê-três, quatro, cinco, bê-sete…". Depois só as tônicas (as vermelhas).' },
  ],
  quiz: [
    fixed('Quantas casas tem um tom?', ['1', '2', '3', '4'], '2', 'Semitom = 1 casa, tom = 2 casas.'),
    fixed('Quais são os graus da pentatônica menor?', ['1 2 3 5 6', '1 b3 4 5 b7', '1 3 5 7', '1 2 b3 4 5'], '1 b3 4 5 b7', '1 2 3 5 6 é a pentatônica maior. A menor é 1 b3 4 5 b7.'),
    { gen: (rnd) => {
      const k = pick(Object.keys(PENT_MIN), rnd)
      const i = Math.floor(rnd() * 5)
      const notes = PENT_MIN[k]
      return mc(`Na pentatônica menor de ${ptOf(k)}, qual nota é o grau ${PENT_DEG[i]}?`, ptOf(notes[i]), notes.map(ptOf), `${ptOf(k)} menor pentatônica: ${notes.map((n, j) => `${PENT_DEG[j]} = ${n}`).join(', ')}.`, rnd)
    } },
    fixed('Da b3 para a 4, a distância é…', ['um semitom', 'um tom', 'um tom e meio', 'dois tons'], 'um tom', 'b3 está a 3 semitons da tônica e 4 está a 5: diferença de 2, um tom.'),
    fixed('Da 5 para a b7, a distância é…', ['um semitom', 'um tom', 'um tom e meio', 'dois tons'], 'um tom e meio', '5 = 7 semitons, b7 = 10: diferença de 3, um tom e meio.'),
  ],
}

// ======================= sprint 2 =======================

const s2_0: Lesson = {
  id: 's2-0', sprint: 2, task: 0, min: 25,
  title: 'Como os 5 desenhos se encaixam (CAGED) e onde ficam as tônicas',
  steps: [
    { t: 'p', text: 'A pentatônica não é só o box 1: ela se repete pelo braço todo em **5 desenhos** que se encaixam. As notas mais agudas de um box são as mais graves do próximo.' },
    { t: 'lista', items: [
      'Em Lá: box 1 casas 5–8 · box 2 7–10 · box 3 9–13 · box 4 12–15 · box 5 14–17 (ou 2–5, uma oitava abaixo).',
      'Depois do box 5 vem o box 1 de novo, na casa 17. O braço é um ciclo.',
    ] },
    { t: 'braco', fig: { root: 9, semis: [0, 3, 5, 7, 10], labels: 'graus', frets: [6, 11], box: { scaleId: 'pentMin', box: 2 } }, caption: 'Box 2 de Lá: as notas da casa 7 e 8 são as mesmas do fim do box 1.' },
    { t: 'p', text: 'O nome **CAGED** vem dos cinco desenhos de acorde aberto (C, A, G, E, D). Cada box da pentatônica "mora" em volta de um deles, e é isso que diz onde ficam as **tônicas**.' },
    { t: 'lista', items: [
      'Box 1 (forma de E): tônicas na 6ª, 4ª e 1ª corda.',
      'Box 2 (forma de D): tônicas na 4ª e na 2ª.',
      'Box 3 (forma de C): tônicas na 2ª e na 5ª.',
      'Box 4 (forma de A): tônicas na 5ª e na 3ª.',
      'Box 5 (forma de G): tônicas na 3ª, 6ª e 1ª.',
    ] },
    { t: 'dica', text: 'Aprenda primeiro onde ficam as tônicas de cada box; o resto do desenho se monta em volta delas. Para mudar de tom, é só mover tudo: em Dó, o box 1 começa na casa 8 (o Dó da 6ª corda).' },
    { t: 'braco', fig: { root: 9, semis: [0], labels: 'graus', frets: [0, 17], pos: [[6, 5], [4, 7], [1, 5], [2, 10], [5, 12], [3, 14], [6, 17], [1, 17], [3, 2], [5, 0]] }, caption: 'Todas as tônicas (Lá) do braço. Cada box tem duas ou três.' },
    { t: 'tente', text: 'Percorra os 5 boxes em Lá tocando só as tônicas, da casa 5 até a 17. Depois toque cada box inteiro começando e terminando na tônica.' },
  ],
  quiz: [
    fixed('Quantos desenhos da pentatônica cobrem o braço todo?', ['3', '5', '7', '12'], '5', 'São 5 boxes que se encaixam e se repetem a cada 12 casas.'),
    { gen: (rnd) => {
      const t: Record<string, string> = { A: '5', C: '8', D: '10', E: '12', G: '3' }
      const k = pick(Object.keys(t), rnd)
      return mc(`Na pentatônica menor de ${ptOf(k)}, em que casa da 6ª corda começa o box 1?`, t[k], ['1', '3', '5', '7', '8', '10', '12'], 'O box 1 começa na tônica da 6ª corda: Sol 3, Lá 5, Dó 8, Ré 10, Mi 12 (ou solta).', rnd)
    } },
    fixed('Depois do box 5, o próximo desenho é…', ['o box 6', 'o box 1, uma oitava acima', 'o box 4 de novo', 'não há próximo'], 'o box 1, uma oitava acima', 'Os 5 boxes formam um ciclo: depois do 5, o 1 recomeça 12 casas acima.'),
    fixed('No box 1, as tônicas ficam nas cordas…', ['5ª e 3ª', '6ª, 4ª e 1ª', '4ª e 2ª', 'só na 6ª'], '6ª, 4ª e 1ª', 'Box 1 = forma de E: tônica na 6ª, na 4ª duas casas à frente, e na 1ª.'),
    fixed('Para que servem as tônicas de cada box?', ['Tocar mais rápido', 'Começar e terminar frases no lugar certo e montar o desenho em volta delas', 'Afinar a guitarra', 'Nada: basta decorar o desenho'], 'Começar e terminar frases no lugar certo e montar o desenho em volta delas', 'A tônica é o ponto de repouso. Saber onde ela está em cada box deixa o improviso com direção.'),
  ],
}

/** a partir da tônica na 6ª corda, onde fica cada intervalo */
const SHAPE: Record<string, string> = {
  '3m': '5ª corda, 2 casas para trás',
  '3M': '5ª corda, 1 casa para trás',
  '4J': '5ª corda, mesma casa',
  '5J': '5ª corda, 2 casas para frente',
  '6M': '4ª corda, 1 casa para trás',
  '7m': '4ª corda, mesma casa',
  '8J': '4ª corda, 2 casas para frente',
}
/** subindo um intervalo a partir de uma nota (grafia correta) */
const UP: Record<string, Record<string, string>> = {
  A: { '3m': 'C', '3M': 'C#', '4J': 'D', '5J': 'E', '6M': 'F#', '7m': 'G' },
  E: { '3m': 'G', '3M': 'G#', '4J': 'A', '5J': 'B', '6M': 'C#', '7m': 'D' },
  C: { '3m': 'Eb', '3M': 'E', '4J': 'F', '5J': 'G', '6M': 'A', '7m': 'Bb' },
  G: { '3m': 'Bb', '3M': 'B', '4J': 'C', '5J': 'D', '6M': 'E', '7m': 'F' },
}

const s2_1: Lesson = {
  id: 's2-1', sprint: 2, task: 1, min: 20,
  title: 'Intervalos 3m, 4J, 6M e 7m no braço',
  steps: [
    { t: 'p', text: '**Intervalo** é a distância entre duas notas. O nome tem um número (contando as notas: de Lá para Dó são Lá-Si-Dó, uma **3ª**) e uma qualidade: **m** menor, **M** maior, **J** justa.' },
    { t: 'lista', items: ['3m = 3 semitons', '3M = 4', '4J = 5', '5J = 7', '6M = 9', '7m = 10', '8J = 12 (oitava)'] },
    { t: 'p', text: 'Na guitarra, cada intervalo é um **desenho fixo**. Com a tônica na 6ª corda:' },
    { t: 'braco', fig: { root: 9, semis: [0], labels: 'notas', names: ['A'], frets: [2, 8], pos: [[6, 5]], marks: [{ s: 5, f: 3, label: '3m' }, { s: 5, f: 5, label: '4J' }, { s: 4, f: 4, label: '6M' }, { s: 4, f: 5, label: '7m' }] }, caption: 'Tônica Lá (6ª corda, casa 5) e os quatro intervalos do sprint.' },
    { t: 'lista', items: Object.entries(SHAPE).filter(([k]) => ['3m', '4J', '6M', '7m'].includes(k)).map(([k, v]) => `**${k}**: ${v}`) },
    { t: 'dica', text: 'O desenho vale igual com a tônica na 5ª corda (5ª→4ª→3ª). Só muda quando passa pela 2ª corda (Si), que é afinada meio tom diferente: lá tudo anda uma casa para frente.' },
    { t: 'ouvir', items: [
      { label: '3m (Lá–Dó)', events: interval(45, 48) },
      { label: '4J (Lá–Ré)', events: interval(45, 50) },
      { label: '6M (Lá–Fá♯)', events: interval(45, 54) },
      { label: '7m (Lá–Sol)', events: interval(45, 55) },
    ] },
    { t: 'p', text: 'Esses intervalos estão dentro do que você já toca: 1, b3, 4 e b7 são graus da pentatônica menor. A 6M é a nota que transforma a pentatônica menor em **dórico**, a cor de muito solo de rock.' },
    { t: 'tente', text: 'Escolha uma tônica qualquer na 6ª corda e toque os quatro intervalos sem olhar a tela, cantando cada um. Depois treine os mesmos na área Ouvido.' },
  ],
  quiz: [
    { gen: (rnd) => {
      const k = pick(['3m', '3M', '4J', '5J', '6M', '7m', '8J'], rnd)
      return mc(`Quantos semitons (casas) tem uma ${k}?`, String(SEMIS[k]), ['3', '4', '5', '7', '9', '10', '12'], `3m 3, 3M 4, 4J 5, 5J 7, 6M 9, 7m 10, 8J 12.`, rnd)
    } },
    { gen: (rnd) => {
      const k = pick(Object.keys(SHAPE), rnd)
      return mc(`Com a tônica na 6ª corda, onde fica a ${k}?`, SHAPE[k], Object.values(SHAPE), Object.entries(SHAPE).map(([a, b]) => `${a}: ${b}`).join(' · '), rnd)
    } },
    { gen: (rnd) => {
      const from = pick(Object.keys(UP), rnd)
      const iv = pick(Object.keys(UP[from]), rnd)
      return mc(`Subindo uma ${iv} a partir de ${ptOf(from)}, você chega em…`, ptOf(UP[from][iv]), Object.values(UP[from]).map(ptOf), `De ${from}: ${Object.entries(UP[from]).map(([a, b]) => `${a} ${b}`).join(', ')}.`, rnd)
    } },
    fixed('Qual das duas terças é a do acorde menor?', ['3m', '3M'], '3m', 'O acorde menor tem a 3m (b3); o maior tem a 3M.'),
  ],
}

// ======================= sprint 3 =======================

const s3_0: Lesson = {
  id: 's3-0', sprint: 3, task: 0, min: 25,
  title: 'A escala maior: T T S T T T S, os 12 tons e o círculo de quintas',
  steps: [
    { t: 'p', text: 'A escala maior é a régua da teoria: graus, acordes e intervalos são medidos a partir dela. A receita é **T T S T T T S** (tom, tom, semitom, tom, tom, tom, semitom).' },
    { t: 'p', text: '**Dó maior** é a única só com naturais: Dó Ré Mi Fá Sol Lá Si Dó. Os semitons caem em Mi–Fá e Si–Dó, exatamente onde a receita pede.' },
    { t: 'ouvir', items: [{ label: 'Dó maior subindo e descendo', events: seq([48, 50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52, 50, 48], 0.32, 0.6) }] },
    { t: 'p', text: 'Comece em **Sol** e siga a receita: Sol Lá Si Dó Ré Mi **Fá♯** Sol. O Fá precisa subir para a 7ª ficar a meio tom da tônica. Cada tom maior tem o seu conjunto de sustenidos ou bemóis: a **armadura**.' },
    { t: 'lista', items: [
      '**Círculo de quintas**: subindo de 5ª em 5ª, cada tom ganha um sustenido. Dó (0) → Sol (1) → Ré (2) → Lá (3) → Mi (4) → Si (5).',
      'Descendo de 5ª em 5ª, cada tom ganha um bemol: Dó (0) → Fá (1) → Si♭ (2) → Mi♭ (3) → Lá♭ (4).',
      'Tons vizinhos no círculo dividem quase todas as notas: por isso uma música em Sol "conversa" fácil com Ré e Dó.',
    ] },
    { t: 'braco', fig: { root: 7, semis: [0, 2, 4, 5, 7, 9, 11], labels: 'graus', frets: [1, 6], box: { scaleId: 'major', box: 1 } }, caption: 'Escala maior de Sol, box 1, com os graus.' },
    { t: 'tente', text: 'Toque a escala de Sol maior no box 1 dizendo as notas. Depois a de Lá (mesmo desenho, duas casas para frente) e diga quais notas viraram sustenido.' },
  ],
  quiz: [
    fixed('Qual é a receita da escala maior?', ['T S T T S T T', 'T T S T T T S', 'T T T S T T S', 'S T T T S T T'], 'T T S T T T S', 'Tom, tom, semitom, tom, tom, tom, semitom: os semitons ficam entre os graus 3–4 e 7–1.'),
    { gen: (rnd) => {
      const k = pick(['C', 'G', 'D', 'A', 'E', 'F', 'Bb'], rnd)
      return mc(`Quantos acidentes tem ${ptOf(k)} maior?`, KEY_SIG[k], Object.values(KEY_SIG), 'Círculo de quintas: Sol 1♯, Ré 2♯, Lá 3♯, Mi 4♯ · Fá 1♭, Si♭ 2♭.', rnd)
    } },
    { gen: (rnd) => {
      const k = pick(Object.keys(MAJOR), rnd)
      const i = 1 + Math.floor(rnd() * 6)
      const notes = MAJOR[k]
      return mc(`Em ${ptOf(k)} maior, qual nota é o ${i + 1}º grau?`, ptOf(notes[i]), notes.map(ptOf), `${ptOf(k)} maior: ${notes.join(' ')}.`, rnd)
    } },
    fixed('No círculo de quintas, depois de Sol (G) vem…', ['Lá (A)', 'Ré (D)', 'Fá (F)', 'Dó (C)'], 'Ré (D)', 'Sol + 5ª justa = Ré. E Ré maior tem 2 sustenidos.'),
    fixed('Por que Sol maior tem Fá♯?', ['Porque soa melhor', 'Para a 7ª ficar meio tom abaixo da tônica, como pede a receita', 'Porque toda escala tem um sustenido', 'Para ficar igual a Dó maior'], 'Para a 7ª ficar meio tom abaixo da tônica, como pede a receita', 'O último passo da receita é S: Fá♯–Sol é meio tom.'),
  ],
}

const deg = (d: number) => cadenceThen(60, (t) => seq([72 + d], 0, 1.8, t))

const s3_1: Lesson = {
  id: 's3-1', sprint: 3, task: 1, min: 20,
  title: 'Os graus da escala e como cada um soa sobre a tônica',
  steps: [
    { t: 'p', text: 'Cada grau tem uma "personalidade" quando o tom está definido. É isso que o treino de ouvido mede, e é isso que faz uma frase de solo soar resolvida ou tensa.' },
    { t: 'lista', items: [
      '**1**: casa, repouso total. Terminar aqui soa como ponto final.',
      '**2**: passagem, quer andar para o 1 ou para o 3.',
      '**3**: doce. Decide que o tom é maior (a b3 faria menor).',
      '**4**: tensão suave, quer descer para o 3.',
      '**5**: estável e forte, mas ainda não é casa.',
      '**6**: aberto, nostálgico.',
      '**7**: a **sensível**. Está a meio tom do 1 e puxa forte para ele.',
    ] },
    { t: 'ouvir', items: [
      { label: 'Cadência e o 1', events: deg(0) },
      { label: 'Cadência e o 3', events: deg(4) },
      { label: 'Cadência e o 4', events: deg(5) },
      { label: 'Cadência e o 5', events: deg(7) },
      { label: 'Cadência e o 7', events: deg(11) },
    ] },
    { t: 'p', text: 'Ouça o 7: ele fica "pendurado", pedindo para subir. E o 4 pede para descer ao 3. Essas duas tendências movem quase toda a música tonal.' },
    { t: 'tente', text: 'Sobre um bordão de Sol (toque a 6ª corda casa 3 e deixe soar), cante e toque 1-2-3-4-5 e volte. Pare no 4 e sinta a vontade de descer. Pare no 7 e sinta a vontade de subir.' },
  ],
  quiz: [
    fixed('Qual grau puxa para a tônica a meio tom de distância?', ['2', '4', '6', '7'], '7', 'O 7 é a sensível: meio tom abaixo do 1.'),
    fixed('Qual grau decide se o som é maior ou menor?', ['2', '3', '5', '6'], '3', '3 maior (4 semitons) = maior. b3 (3 semitons) = menor.'),
    fixed('Que grau soa como repouso, ponto final?', ['1', '4', '5', '7'], '1', 'O 1 é a tônica: a casa do tom.'),
    fixed('O 4º grau tende a…', ['subir para o 7', 'descer para o 3', 'ficar parado', 'pular para o 1 uma oitava acima'], 'descer para o 3', 'O 4 está meio tom acima do 3 e resolve descendo.'),
    { gen: (rnd) => {
      const k = pick(['C', 'G', 'D', 'F'], rnd)
      const i = Math.floor(rnd() * 7)
      const notes = MAJOR[k]
      return mc(`Em ${ptOf(k)} maior, o grau ${i + 1} é…`, ptOf(notes[i]), notes.map(ptOf), `${ptOf(k)} maior: ${notes.map((n, j) => `${j + 1} ${n}`).join(', ')}.`, rnd)
    } },
  ],
}

export const FASE1: Lesson[] = [s0_0, s1_0, s1_1, s2_0, s2_1, s3_0, s3_1]
