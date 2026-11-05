/**
 * Plano de 12 meses: 4 fases, 24 sprints de duas semanas e o roteiro diário de 4 horas.
 * Cada sprint tem uma música, um conceito e uma técnica, e termina com um teste gravado.
 * Os blocos que usam o app trazem a configuração pronta (`tec`, `imp`): "Abrir" aplica e leva à área.
 */

export type ExerciseId = 'subir-descer' | 'grupos3' | 'grupos4' | 'tercas' | 'percorrer'

/** configuração da área Escalas para o bloco de técnica */
export interface TecCfg {
  scaleId: string
  key: string
  boxes: number[]
  exercise: ExerciseId
  perBeat: 1 | 2 | 3 | 4
  bpm: number
  autoBpm?: boolean
  display?: 'tudo' | 'fundamentais' | 'esconder'
}

/** configuração da área Improviso para o bloco de improviso */
export interface ImpCfg {
  progId: string
  key: string
  keyMinor?: boolean
  styleId: string
  bpm: number
  scaleId: string
  restrictionId?: string
  /** 0 = braço inteiro */
  focusBox?: number
  guide?: boolean
  /** progId 'custom' */
  customText?: string
}

export type EarMode = 'int' | 'acorde' | 'grau' | 'campo'
export interface EarPreset {
  m: EarMode
  set: string[]
  /** intervalos: subindo, descendo ou juntas */
  dir?: 'asc' | 'desc' | 'harm'
}

/** área do app aonde o bloco leva */
export type AreaId = 'hoje' | 'improviso' | 'musicas' | 'compor' | 'acordes' | 'escalas' | 'ouvido' | 'jam' | 'afinador'

export interface Sprint {
  n: number
  tema: string
  alvo: { musica: string; conceito: string; tecnica: string }
  /** três tarefas de teoria, alternadas nos dias da semana */
  teoria: [string, string, string]
  tec: { txt: string; cfg?: TecCfg; area?: AreaId }
  ear: EarPreset[]
  ouvidoTxt: string
  rep: string
  imp: { txt: string; cfg?: ImpCfg; area?: AreaId }
  piano: string
  saida: string[]
}

export interface Phase {
  n: number
  name: string
  range: [number, number]
  why: string
}

export const PHASES: Phase[] = [
  { n: 1, name: 'Fundamentos', range: [1, 6], why: 'Mapa do braço, intervalos, acordes por dentro e técnica limpa no metrônomo. Tudo que vem depois se apoia nisto.' },
  { n: 2, name: 'Harmonia aplicada', range: [7, 12], why: 'Mirar nas notas do acorde, blues de verdade, tonalidade menor, tríades no braço todo e as primeiras músicas tiradas de ouvido.' },
  { n: 3, name: 'A sua linguagem', range: [13, 18], why: 'Acordes com cor, bossa, Clube da Esquina, neo-soul e transcrição de solos do Mayer.' },
  { n: 4, name: 'Ouvido e autoria', range: [19, 24], why: 'Tirar músicas inteiras de ouvido, harmonia de Jobim, composição própria e um repertório de show limpo.' },
]

export const GOALS: { when: string; items: string[] }[] = [
  { when: 'Fev 2027', items: [
    'Pentatônica menor e escala maior nos 5 desenhos, limpas, a 100 bpm em colcheias',
    'Reconhecer os intervalos simples com 90% de acerto',
    'Montar o campo harmônico de qualquer tom maior em menos de 1 minuto',
    'Tirar de ouvido a progressão de uma música pop simples',
    'Slow Dancing in a Burning Room completa, com o solo',
  ] },
  { when: 'Mai 2027', items: [
    'Improvisar sobre blues, menor e I–V–vi–IV com 75% das notas dentro e 60% dos alvos no tempo 1',
    'Tríades em 3 grupos de cordas e 3 inversões, em qualquer tom',
    'Tirar uma música inteira (acordes) de ouvido, sem cifra',
    'Gravity e Little Wing completas',
    'Piano: acompanhar com tétrades e inversões',
  ] },
  { when: 'Out 2027', items: [
    'Tirar melodia e acordes de uma música inteira só de ouvido',
    'Improvisar sobre bossa e ii–V–I mirando 3ªs e 7ªs',
    'Um set de 6 músicas inteiras, limpas, gravadas em sequência',
    'Compor e gravar uma música sua, do começo ao fim',
    'Piano: voicings de neo-soul e bossa',
  ] },
]

export const ALL_INT = ['2m', '2M', '3m', '3M', '4J', 'TT', '5J', '6m', '6M', '7m', '7M', '8J']
export const DIAT = ['1', '2', '3', '4', '5', '6', '7']
export const CHROM = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7']

export const SPRINTS: Sprint[] = [
  { n: 1, tema: 'Pentatônica menor: desenhos 1 e 2',
    alvo: { musica: 'Something Like Olivia limpa', conceito: 'Notas no braço e intervalos', tecnica: 'Palhetada alternada' },
    teoria: ['Notas naturais nas cordas 6 e 5 (guia: notas no braço).', 'Tom e semitom; os graus 1 b3 4 5 b7 dentro da pentatônica.', 'Quiz de Acordes, nível 1, sessão de 20.'],
    tec: { txt: 'Pentatônica menor em Lá, desenhos 1 e 2. Comece em "Subir e descer" e passe para "Grupos de 3". Colcheias, a partir de 60 bpm, com o bpm subindo sozinho.',
      cfg: { scaleId: 'pentMin', key: 'A', boxes: [1, 2], exercise: 'subir-descer', perBeat: 2, bpm: 60, autoBpm: true } },
    ear: [{ m: 'int', set: ['2M', '3M', '5J', '8J'], dir: 'asc' }],
    ouvidoTxt: 'Tirar de ouvido as duas primeiras frases da melodia de Asa Branca. Cante antes de procurar no braço.',
    rep: 'Something Like Olivia: escolha o trecho em que a mão mais "dá um jeito". Metrônomo a 60% do andamento original; sobe 5 bpm a cada 3 passadas limpas seguidas.',
    imp: { txt: 'Blues de 12 em Lá, shuffle, 80 bpm. Semana 1 só no box 1; semana 2 alterne os boxes 1 e 2. Ligue o placar e veja a % de notas dentro.',
      cfg: { progId: 'blues12', key: 'A', styleId: 'shuffle', bpm: 80, scaleId: 'pentMin', restrictionId: 'box1', focusBox: 1, guide: false } },
    piano: 'Achar todas as notas no teclado. Escala de Dó maior na mão direita (dedilhado 1-2-3 / 1-2-3-4-5). Tríades de C, F e G.',
    saida: ['Pentatônica d1–2 em colcheias a 80 bpm, limpa', '80% de acerto nos 4 intervalos', 'Primeira parte de Asa Branca tirada de ouvido', 'Trecho de Olivia no andamento original', '2 min de improviso gravado nos boxes 1–2'] },

  { n: 2, tema: 'Os 5 desenhos da pentatônica',
    alvo: { musica: 'Slow Dancing in a Burning Room', conceito: 'Tônicas em todo o braço', tecnica: 'Bends afinados' },
    teoria: ['Como os 5 desenhos se encaixam (CAGED) e onde ficam as tônicas.', 'Intervalos 3m, 4J, 6M e 7m no braço.', 'Quiz "Onde está a nota?" na área Escalas, 10 min.'],
    tec: { txt: 'Pentatônica menor, desenhos 1–5, "Percorrer os boxes". Um dia em Lá, um em Mi, um em Sol. Da 2ª semana em diante, exibição "só as tônicas".',
      cfg: { scaleId: 'pentMin', key: 'A', boxes: [1, 2, 3, 4, 5], exercise: 'percorrer', perBeat: 2, bpm: 70, autoBpm: true } },
    ear: [{ m: 'int', set: ['3m', '3M', '4J', '5J', '6M', '7m', '8J'], dir: 'asc' }],
    ouvidoTxt: 'Terminar Asa Branca de ouvido (melodia completa). Depois, os acordes dela.',
    rep: 'Slow Dancing in a Burning Room: acordes e levada do verso; depois o começo do solo. Confira cada bend com a nota-alvo antes.',
    imp: { txt: 'Blues em Mi, rock reto, 90 bpm, braço todo. Termine cada frase na tônica.',
      cfg: { progId: 'blues12', key: 'E', styleId: 'rock', bpm: 90, scaleId: 'pentMin', restrictionId: 'nenhuma', focusBox: 0, guide: false } },
    piano: 'Escalas de Sol e Fá maior. Tríades maiores e menores de C, D, E, F, G e A.',
    saida: ['5 desenhos de cor em Lá, Mi e Sol', 'Achar qualquer tônica em menos de 3 segundos', 'Primeira metade do solo de Slow Dancing', '85% nos 7 intervalos'] },

  { n: 3, tema: 'Escala maior e graus',
    alvo: { musica: 'O Leãozinho', conceito: 'Escala maior e graus 1–7', tecnica: 'Terças e grupos de 4' },
    teoria: ['Fórmula T T S T T T S; escala maior nos 12 tons; introdução ao círculo de quintas.', 'Graus da escala e como cada um soa sobre a tônica.', 'Exercícios do guia sobre escalas (com gabarito).'],
    tec: { txt: 'Escala maior em Sol, desenhos 1 e 2. Alterne "Terças" e "Grupos de 4".',
      cfg: { scaleId: 'major', key: 'G', boxes: [1, 2], exercise: 'tercas', perBeat: 2, bpm: 60, autoBpm: true } },
    ear: [{ m: 'grau', set: ['1', '3', '5'] }, { m: 'int', set: ALL_INT, dir: 'asc' }],
    ouvidoTxt: 'Cantar os graus 1-2-3-4-5 sobre um bordão de Sol. Tirar a melodia do refrão de O Leãozinho.',
    rep: 'O Leãozinho (Caetano): acordes com 7M e levada no tempo, cantando junto.',
    imp: { txt: 'I–V–vi–IV em Sol. Semana 1 com pentatônica maior, semana 2 com a escala maior. Dois dias só nas cordas 1 e 2.',
      cfg: { progId: 'pop', key: 'G', styleId: 'ballad', bpm: 85, scaleId: 'pentMaj', restrictionId: 'nenhuma', focusBox: 1, guide: false } },
    piano: 'Escala maior com as duas mãos em Dó, Sol e Fá. Melodia de Asa Branca na mão direita.',
    saida: ['Escala maior d1–2 em terças, colcheias a 70 bpm', 'Cantar e reconhecer os graus 1, 3 e 5', 'O Leãozinho inteira com a levada no tempo'] },

  { n: 4, tema: 'Acordes por dentro',
    alvo: { musica: 'Hallelujah (Jeff Buckley)', conceito: 'Tríades e tétrades', tecnica: 'Dedilhado em 12/8' },
    teoria: ['Formação: maior 1-3-5, menor 1-b3-5, 7, m7 e 7M (Consulta, na área Acordes).', 'Quiz de Acordes nível 2 com "graus no desenho".', 'Tríades nas cordas 1-2-3, nas três inversões.'],
    tec: { txt: 'Arpejos maior e menor, desenhos 1 e 2, em Dó. Depois, tríades nas cordas agudas.',
      cfg: { scaleId: 'arpMaj', key: 'C', boxes: [1, 2], exercise: 'subir-descer', perBeat: 2, bpm: 70, autoBpm: true } },
    ear: [{ m: 'acorde', set: ['maior', 'menor', '7'] }, { m: 'grau', set: DIAT }],
    ouvidoTxt: 'Ouvir o baixo de 3 músicas que você conhece e cantar a fundamental de cada acorde.',
    rep: 'Hallelujah (Jeff Buckley): dedilhado em 12/8 e a progressão I–vi–IV–V. Repare como a letra descreve a própria progressão.',
    imp: { txt: 'Blues em Lá com os alvos sugeridos ligados. Pouse na bolinha branca (3ª ou 7ª) no tempo 1.',
      cfg: { progId: 'blues12', key: 'A', styleId: 'shuffle', bpm: 80, scaleId: 'pentMin', restrictionId: 'nenhuma', focusBox: 1, guide: true } },
    piano: 'Tríades maiores e menores nos 12 tons; inversões de Dó (C, C/E, C/G).',
    saida: ['Dizer as notas de qualquer tríade e tétrade em C, G, D, A, E e F', '85% em maior / menor / 7', 'Hallelujah inteira dedilhada no tempo', '50% ou mais dos alvos no tempo 1'] },

  { n: 5, tema: 'Campo harmônico maior',
    alvo: { musica: 'No Surprises (Radiohead)', conceito: 'I ii iii IV V vi vii°', tecnica: 'Escala maior nos 5 desenhos' },
    teoria: ['Campo harmônico maior em tríades e tétrades.', 'Analisar com graus: Hallelujah, O Leãozinho e Slow Dancing.', 'Acorde emprestado: o que ele faz no refrão de No Surprises.'],
    tec: { txt: 'Escala maior em Ré, desenhos 1–5, "Percorrer os boxes". Depois, arpejos 7M e m7.',
      cfg: { scaleId: 'major', key: 'D', boxes: [1, 2, 3, 4, 5], exercise: 'percorrer', perBeat: 2, bpm: 75, autoBpm: true } },
    ear: [{ m: 'campo', set: ['I', 'IV', 'V', 'vi'] }, { m: 'grau', set: DIAT }],
    ouvidoTxt: 'Tirar sozinho a progressão de Let It Be (Beatles). Confira só no fim.',
    rep: 'No Surprises: o dedilhado arpejado e o acorde menor emprestado do refrão.',
    imp: { txt: 'I–V–vi–IV em Ré com pentatônica maior, mirando os alvos.',
      cfg: { progId: 'pop', key: 'D', styleId: 'ballad', bpm: 85, scaleId: 'pentMaj', restrictionId: 'nenhuma', focusBox: 1, guide: true } },
    piano: 'Campo harmônico de Dó e Sol em tétrades: fundamental na mão esquerda, tríade na direita.',
    saida: ['Escrever o campo de qualquer tom maior em menos de 1 minuto', 'Progressão de Let It Be tirada de ouvido', 'No Surprises completa', 'Escala maior nos 5 desenhos em Sol'] },

  { n: 6, tema: 'Consolidação da Fase 1',
    alvo: { musica: 'Slow Dancing com o solo inteiro', conceito: 'Revisão geral', tecnica: '100 bpm em colcheias' },
    teoria: ['Quiz de Acordes nível 2, modo misturado.', 'Refazer os exercícios do guia em que você errou.', 'Revisar o campo harmônico tocando no braço.'],
    tec: { txt: 'Speed trainer na pentatônica e na escala maior, mirando 100 bpm em colcheias.',
      cfg: { scaleId: 'pentMin', key: 'A', boxes: [1, 2, 3, 4, 5], exercise: 'grupos3', perBeat: 2, bpm: 80, autoBpm: true } },
    ear: [{ m: 'int', set: ALL_INT, dir: 'desc' }, { m: 'grau', set: DIAT }],
    ouvidoTxt: 'Tirar a melodia vocal do verso de Karma Police (Radiohead).',
    rep: 'Slow Dancing in a Burning Room completa, com o solo inteiro.',
    imp: { txt: 'Grave 2 minutos de blues em Lá: é o teste da fase. Compare com a gravação do diagnóstico.',
      cfg: { progId: 'blues12', key: 'A', styleId: 'shuffle', bpm: 85, scaleId: 'pentMin', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Hallelujah simples: acordes na mão esquerda, melodia na direita.',
    saida: ['Todas as metas de Fev 2027', 'Gravação da fase comparada com a do diagnóstico'] },

  { n: 7, tema: 'Notas-alvo: mirar no acorde',
    alvo: { musica: 'Gravity (John Mayer)', conceito: '3ª e 7ª de cada acorde', tecnica: 'Arpejo 7 nos 5 desenhos' },
    teoria: ['Notas-guia: 3ª e b7 do acorde dominante.', 'Por que a 3ª de A7 desce meio tom até a b7 de D7.', 'Quiz de Acordes: "o que muda" de um acorde para outro.'],
    tec: { txt: 'Arpejo 7 (dominante) em Lá, nos 5 desenhos.',
      cfg: { scaleId: 'arp7', key: 'A', boxes: [1, 2, 3, 4, 5], exercise: 'subir-descer', perBeat: 2, bpm: 70, autoBpm: true } },
    ear: [{ m: 'acorde', set: ['7', 'm7', '7M'] }, { m: 'grau', set: ['1', 'b3', '3', '4', '5', 'b7'] }],
    ouvidoTxt: 'Cantar a 3ª e a 7ª de cada acorde de um blues enquanto a base toca.',
    rep: 'Gravity: levada de slow blues 12/8 e o primeiro solo.',
    imp: { txt: 'Slow blues em Lá com alvos e a restrição "termine frases na 3ª".',
      cfg: { progId: 'blues12', key: 'A', styleId: 'slow128', bpm: 60, scaleId: 'pentMin', restrictionId: 'terca', focusBox: 0, guide: true } },
    piano: 'Blues de 12 em Dó com shell voicings na mão esquerda (fundamental e 7ª).',
    saida: ['70% das notas dentro e 60% dos alvos', 'Primeiro solo de Gravity', '85% em 7 / m7 / 7M'] },

  { n: 8, tema: 'Blues de verdade: shuffle e mixolídio',
    alvo: { musica: 'Pride and Joy (SRV)', conceito: 'Mixolídio sobre o 7', tecnica: 'Shuffle na mão direita' },
    teoria: ['Mixolídio: maior com b7.', 'Escala "acompanha o acorde" no Improviso.', 'Quick change e turnaround.'],
    tec: { txt: 'Mixolídio em Mi, desenhos 1–2, em tercinas. Depois, blues maior.',
      cfg: { scaleId: 'mixo', key: 'E', boxes: [1, 2], exercise: 'subir-descer', perBeat: 3, bpm: 70, autoBpm: true } },
    ear: [{ m: 'campo', set: ['I', 'IV', 'V'] }, { m: 'int', set: ALL_INT, dir: 'harm' }],
    ouvidoTxt: 'Tirar de ouvido o blues de 3 gravações diferentes: onde entram o IV e o V?',
    rep: 'Pride and Joy: levada de shuffle em Mi e as viradas.',
    imp: { txt: 'Blues quick change em Mi com a escala acompanhando o acorde. Misture pentatônica menor com mixolídio.',
      cfg: { progId: 'blues12quick', key: 'E', styleId: 'shuffle', bpm: 100, scaleId: 'auto', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Levada de blues shuffle na mão esquerda em Dó.',
    saida: ['Pride and Joy no andamento', 'Blues de 3 gravações tirado de ouvido', 'Improviso misturando menor e mixolídio, gravado'] },

  { n: 9, tema: 'Tonalidade menor',
    alvo: { musica: 'Little Wing (Hendrix): a introdução', conceito: 'Menor natural, dórico e harmônica', tecnica: 'Enfeites de tríade' },
    teoria: ['Campo harmônico menor; o V7 da menor harmônica.', 'A cor de cada uma: menor natural, dórico e menor harmônica.', 'Analisar a progressão andaluza.'],
    tec: { txt: 'Menor natural, dórico e menor harmônica em Lá, desenhos 1–2, em grupos de 3. Uma escala por dia.',
      cfg: { scaleId: 'minor', key: 'A', boxes: [1, 2], exercise: 'grupos3', perBeat: 2, bpm: 70, autoBpm: true } },
    ear: [{ m: 'acorde', set: ['maior', 'menor', 'dim'] }, { m: 'grau', set: ['1', '2', 'b3', '4', '5', 'b6', 'b7'] }],
    ouvidoTxt: 'Dizer se 10 músicas que você ouve estão em tom maior ou menor.',
    rep: 'Little Wing: a introdução, com os enfeites de tríade e pentatônica dentro dos acordes.',
    imp: { txt: 'Andaluza em Lá menor. Um dia com cada escala menor.',
      cfg: { progId: 'andalusian', key: 'A', keyMinor: true, styleId: 'rock', bpm: 80, scaleId: 'minor', restrictionId: 'nenhuma', focusBox: 1, guide: true } },
    piano: 'Campo harmônico de Lá menor; a andaluza com voice leading.',
    saida: ['Introdução de Little Wing', 'Diferenciar maior, menor e diminuto com 90%', 'Improviso nas 3 escalas menores gravado'] },

  { n: 10, tema: 'Tríades no braço todo',
    alvo: { musica: 'Little Wing completa', conceito: 'Tríades, 3 grupos × 3 inversões', tecnica: 'Trocas sem parar' },
    teoria: ['Tríades em 3 grupos de cordas × 3 inversões (quiz de Acordes, forma "tríade").', 'Como as tríades ligam os desenhos do CAGED.', 'Voice leading: o menor movimento entre acordes.'],
    tec: { txt: 'Quiz de Acordes com o tipo de forma "tríades" e o cronometrado conferido pelo áudio.', area: 'acordes' },
    ear: [{ m: 'campo', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'] }],
    ouvidoTxt: 'Tirar a progressão de Stand by Me e de Someone Like You.',
    rep: 'Little Wing completa.',
    imp: { txt: 'I–V–vi–IV em Dó improvisando só com notas do acorde.',
      cfg: { progId: 'pop', key: 'C', styleId: 'ballad', bpm: 75, scaleId: 'auto', restrictionId: 'acorde', focusBox: 0, guide: true } },
    piano: 'Inversões e voice leading em I–vi–IV–V nos tons de Dó, Sol e Fá.',
    saida: ['Qualquer tríade maior ou menor em 3 grupos de cordas', 'Little Wing completa', 'Stand by Me e Someone Like You tiradas de ouvido'] },

  { n: 11, tema: 'ii–V–I e tirar de ouvido',
    alvo: { musica: 'Blackbird (Beatles)', conceito: 'ii–V–I maior', tecnica: 'Dedilhado com décimas' },
    teoria: ['ii–V–I em tom maior; tétrades do campo.', 'Área Compor, linguagem Bossa/Jazz: ouvir e entender cada opção.', 'Por que o V7 "pede" o I.'],
    tec: { txt: 'Arpejos m7, 7 e 7M encadeados (ii–V–I) em Dó. Comece pelo m7.',
      cfg: { scaleId: 'arpM7', key: 'D', boxes: [1, 2], exercise: 'subir-descer', perBeat: 2, bpm: 70, autoBpm: true } },
    ear: [{ m: 'campo', set: ['I', 'ii', 'IV', 'V', 'vi'] }, { m: 'acorde', set: ['m7', '7', '7M'] }],
    ouvidoTxt: 'Tirar a progressão de uma música que você ama sem olhar cifra. Anote os graus.',
    rep: 'Blackbird: o dedilhado e as décimas paralelas.',
    imp: { txt: 'Progressão digitada Dm7 G7 C7M mirando 3ªs e 7ªs.',
      cfg: { progId: 'custom', customText: 'Dm7 G7 C7M*2', key: 'C', styleId: 'bossa', bpm: 90, scaleId: 'auto', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'ii–V–I em Dó, Fá e Sol com tétrades.',
    saida: ['Blackbird completa', 'ii–V–I em 3 tons, no piano e na guitarra', 'Uma música tirada de ouvido com os graus anotados'] },

  { n: 12, tema: 'Consolidação da Fase 2',
    alvo: { musica: 'Gravity completa', conceito: 'Revisão: alvos e tom menor', tecnica: 'Gravação da fase' },
    teoria: ['Quiz de Acordes nível 3, misturado.', 'Analisar com graus 3 músicas do seu repertório.', 'Revisar as escalas menores.'],
    tec: { txt: 'Speed trainer no arpejo 7 e na escala maior, mirando 110 bpm.',
      cfg: { scaleId: 'arp7', key: 'A', boxes: [1, 2, 3, 4, 5], exercise: 'percorrer', perBeat: 2, bpm: 90, autoBpm: true } },
    ear: [{ m: 'campo', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'] }, { m: 'grau', set: CHROM }],
    ouvidoTxt: 'Tirar uma música inteira (acordes) sem cifra, do começo ao fim.',
    rep: 'Gravity completa, com os dois solos.',
    imp: { txt: 'Teste: blues e menor i–bVII–bVI com 75% de notas dentro. Grave os dois.',
      cfg: { progId: 'blues12', key: 'A', styleId: 'shuffle', bpm: 90, scaleId: 'auto', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Hallelujah com inversões e voice leading.',
    saida: ['Todas as metas de Mai 2027', 'Gravação da fase comparada com a da Fase 1'] },

  { n: 13, tema: 'Acordes com cor',
    alvo: { musica: 'Best Part (Daniel Caesar)', conceito: '7M, m7, 9 e 6/9', tecnica: 'Voicings nas cordas do meio' },
    teoria: ['Extensões: 9, 11 e 13; o que é 6/9.', 'Botão "colorir" no Compor: C → C7M → C7M(9) → C6/9.', 'Quiz de Acordes nível 3 com 7M, 6 e 9.'],
    tec: { txt: 'Arpejo 7M nos 5 desenhos, em Fá.',
      cfg: { scaleId: 'arp7M', key: 'F', boxes: [1, 2, 3, 4, 5], exercise: 'subir-descer', perBeat: 2, bpm: 75, autoBpm: true } },
    ear: [{ m: 'acorde', set: ['7M', 'm7', '7', '6', '9'] }],
    ouvidoTxt: 'Identificar de ouvido onde há 7M e onde há 7 em músicas do Daniel Caesar e do Frank Ocean.',
    rep: 'Best Part: os voicings e a levada.',
    imp: { txt: 'Cole a cifra de Best Part em Músicas e use "Improvisar sobre ela". Mire a 9 e a 7M.', area: 'musicas' },
    piano: 'Voicings de 7M e m7: shell na esquerda, extensões na direita.',
    saida: ['Best Part completa', '80% em 7M / m7 / 7 / 6 / 9', 'Improviso sobre Best Part gravado'] },

  { n: 14, tema: 'Bossa nova',
    alvo: { musica: 'Garota de Ipanema', conceito: 'Dominantes secundários', tecnica: 'Levada de bossa' },
    teoria: ['Dominantes secundários (o V7 de cada grau).', 'A ponte de Garota de Ipanema: por que ela muda de centro.', 'Compor em Bossa/Jazz: ii–V–I e dominantes.'],
    tec: { txt: 'Levada de bossa no polegar e nos dedos, com a base do Compor em Bossa/Jazz.', area: 'compor' },
    ear: [{ m: 'acorde', set: ['7M', 'm7', '7', 'm7b5', 'dim7'] }, { m: 'grau', set: CHROM }],
    ouvidoTxt: 'Ouvir Getz/Gilberto inteiro e marcar onde aparecem dominantes secundários.',
    rep: 'Garota de Ipanema: acordes, levada e a ponte.',
    imp: { txt: 'Bossa sobre um ii–V–I com dominante secundário.',
      cfg: { progId: 'custom', customText: 'Em7 A7 Dm7 G7 C7M*2', key: 'C', styleId: 'bossa', bpm: 110, scaleId: 'auto', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Garota de Ipanema: acordes com voicings fechados.',
    saida: ['Garota de Ipanema com a levada, sem parar', 'Explicar a função de cada acorde da ponte'] },

  { n: 15, tema: 'Clube da Esquina e harmonia modal',
    alvo: { musica: 'Clube da Esquina nº 2', conceito: 'Empréstimo modal', tecnica: 'Vamps modais' },
    teoria: ['Empréstimo modal: iv, bVI e bVII.', 'Dórico e mixolídio em vamps de dois acordes.', 'Revisitar No Surprises sabendo o nome do que acontece.'],
    tec: { txt: 'Dórico em Mi nos 5 desenhos, "Percorrer os boxes".',
      cfg: { scaleId: 'dorian', key: 'E', boxes: [1, 2, 3, 4, 5], exercise: 'percorrer', perBeat: 2, bpm: 80, autoBpm: true } },
    ear: [{ m: 'campo', set: ['I', 'IV', 'iv', 'bVI', 'bVII', 'vi'] }],
    ouvidoTxt: 'Achar 3 acordes emprestados em músicas do Clube da Esquina.',
    rep: 'Clube da Esquina nº 2 (Milton Nascimento).',
    imp: { txt: 'Vamp Em7 A7 em dórico.',
      cfg: { progId: 'custom', customText: 'Em7*2 A7*2', key: 'E', keyMinor: true, styleId: 'ballad', bpm: 80, scaleId: 'dorian', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Progressões com iv e bVII em Dó.',
    saida: ['Clube da Esquina nº 2 completa', 'Reconhecer iv e bVII de ouvido com 80%'] },

  { n: 16, tema: 'Transcrever um solo do Mayer',
    alvo: { musica: 'Solo de Gravity (ao vivo)', conceito: 'Fraseado', tecnica: 'Bends, vibrato e dinâmica' },
    teoria: ['Analisar cada frase transcrita: em que nota do acorde ela pousa?', 'Pergunta e resposta no improviso.', 'Ritmo das frases: onde começam e onde terminam.'],
    tec: { txt: 'Escala blues em Sol no modo "Espera por você", cuidando de vibrato e bends.',
      cfg: { scaleId: 'blues', key: 'G', boxes: [1, 2], exercise: 'subir-descer', perBeat: 2, bpm: 70 } },
    ear: [{ m: 'grau', set: CHROM }, { m: 'int', set: ALL_INT, dir: 'desc' }],
    ouvidoTxt: 'Transcrever de ouvido 8 a 16 compassos de um solo do Mayer, sem tablatura, com a velocidade reduzida.',
    rep: 'O solo transcrito, nota por nota, com a mesma dinâmica.',
    imp: { txt: 'Use 3 frases transcritas em outros pontos da progressão.',
      cfg: { progId: 'blues12', key: 'G', styleId: 'slow128', bpm: 60, scaleId: 'pentMin', restrictionId: 'pergunta', focusBox: 0, guide: true } },
    piano: 'Pink + White: os acordes da introdução.',
    saida: ['8+ compassos transcritos e tocados igual ao disco', '3 frases transcritas usadas num improviso gravado'] },

  { n: 17, tema: 'Neo-soul',
    alvo: { musica: 'Pink + White (Frank Ocean)', conceito: 'Pentatônica maior sobre 7M', tecnica: 'Hammer-ons dentro do acorde' },
    teoria: ['Enfeites de acorde no estilo Mayer e neo-soul (hammer-on, double stops).', 'Alvos 9 e 7M sobre acordes maiores.', 'Análise de Pink + White com graus.'],
    tec: { txt: 'Escala maior em Lá em terças: base para double stops.',
      cfg: { scaleId: 'major', key: 'A', boxes: [1, 2, 3], exercise: 'tercas', perBeat: 2, bpm: 70, autoBpm: true } },
    ear: [{ m: 'acorde', set: ['7M', 'm7', '7', '9', '6'] }, { m: 'campo', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi'] }],
    ouvidoTxt: 'Tirar os acordes de Pink + White de ouvido antes de ver qualquer cifra.',
    rep: 'Pink + White na guitarra, com enfeites.',
    imp: { txt: 'Cole a cifra de Pink + White e improvise mirando 9 e 7M.', area: 'musicas' },
    piano: 'Pink + White completa.',
    saida: ['Pink + White com enfeites', 'Improviso neo-soul gravado'] },

  { n: 18, tema: 'Consolidação da Fase 3',
    alvo: { musica: 'Neon completa e limpa', conceito: 'Revisão: cor e modal', tecnica: 'Polegar independente' },
    teoria: ['Analisar Neon com graus.', 'Revisar extensões e empréstimo modal.', 'Quiz de Acordes nível 4, misturado.'],
    tec: { txt: 'Padrão de polegar de Neon no metrônomo: começa a 60% do andamento e sobe 4 bpm por dia.', area: 'musicas' },
    ear: [{ m: 'grau', set: CHROM }, { m: 'acorde', set: ['maior', 'menor', '7', 'm7', '7M', 'm7b5', 'dim7', '9'] }],
    ouvidoTxt: 'Tirar de ouvido os acordes de uma música inteira de MPB.',
    rep: 'Neon, finalmente completa e no andamento.',
    imp: { txt: 'Gravar Best Part com solo improvisado.', area: 'musicas' },
    piano: 'Revisão das peças da fase.',
    saida: ['Neon completa no andamento', 'Gravação da fase comparada com a da Fase 2'] },

  { n: 19, tema: 'Música inteira de ouvido',
    alvo: { musica: 'Thinkin Bout You (Frank Ocean)', conceito: 'Melodia e harmonia de ouvido', tecnica: 'Escala maior no braço todo' },
    teoria: ['Método: o baixo primeiro, depois a qualidade do acorde, depois as extensões.', 'Anotar tudo em graus antes de dar nomes.', 'Revisar dominantes secundários.'],
    tec: { txt: 'Escala maior percorrendo os boxes, mirando 110 bpm.',
      cfg: { scaleId: 'major', key: 'F', boxes: [1, 2, 3, 4, 5], exercise: 'percorrer', perBeat: 2, bpm: 90, autoBpm: true } },
    ear: [{ m: 'grau', set: CHROM }, { m: 'campo', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'bVII', 'iv'] }],
    ouvidoTxt: 'Tirar melodia e acordes de Thinkin Bout You inteira, sem cifra.',
    rep: 'Thinkin Bout You: o seu arranjo.',
    imp: { txt: 'Improvise sobre a sua própria transcrição, carregada em Músicas.', area: 'musicas' },
    piano: 'Thinkin Bout You: acordes e melodia.',
    saida: ['Melodia e acordes completos, de ouvido', 'Arranjo gravado'] },

  { n: 20, tema: 'Jobim',
    alvo: { musica: 'Wave (Tom Jobim)', conceito: 'Substituto trítono', tecnica: 'Voicings em movimento' },
    teoria: ['Substituto trítono: Dm7 → Db7 → C7M(9).', 'Cromatismo na harmonia de Jobim.', 'Compor em Bossa/Jazz: testar substituições.'],
    tec: { txt: 'Voicings de 4 notas nas cordas 2-3-4-5, encadeados. Use a Consulta de acordes.', area: 'acordes' },
    ear: [{ m: 'acorde', set: ['7M', 'm7', '7', 'm7b5', 'dim7', '6', '9'] }],
    ouvidoTxt: 'Identificar de ouvido onde há substituto trítono em gravações de bossa.',
    rep: 'Wave: harmonia completa com levada.',
    imp: { txt: 'ii–V–I com trítono, mirando 3ªs e 7ªs.',
      cfg: { progId: 'custom', customText: 'Dm7 Db7 C7M*2', key: 'C', styleId: 'bossa', bpm: 100, scaleId: 'auto', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Wave: acordes.',
    saida: ['Wave completa', 'Explicar e tocar o substituto trítono em 3 tons'] },

  { n: 21, tema: 'Composição',
    alvo: { musica: 'Uma música sua', conceito: 'Harmonia para compor', tecnica: 'Arranjo e gravação' },
    teoria: ['Funções e cadências para compor (guia: harmonia para compor).', 'Área Compor: progressão por efeito.', 'Encaixar as frases soltas do seu caderno de letras.'],
    tec: { txt: 'Técnica a serviço do arranjo: monte a progressão no Compor e treine o que ela pede.', area: 'compor' },
    ear: [{ m: 'grau', set: CHROM }],
    ouvidoTxt: 'Cantar a melodia da sua música e anotar os graus.',
    rep: 'A sua música: forma, harmonia, melodia e letra.',
    imp: { txt: 'Improvise sobre a sua progressão para achar melodias.', area: 'compor' },
    piano: 'Arranjo de piano para a sua música.',
    saida: ['Música completa (forma, letra, harmonia)', 'Demo gravada'] },

  { n: 22, tema: 'Fingerstyle avançado',
    alvo: { musica: 'Stop This Train (John Mayer)', conceito: 'Baixo independente', tecnica: 'Polegar e dedos' },
    teoria: ['Analisar a harmonia de Stop This Train.', 'Como o baixo alternado sustenta a melodia.', 'Revisar o campo harmônico com extensões.'],
    tec: { txt: 'Polegar alternado com melodia nos dedos, devagar no metrônomo.', area: 'musicas' },
    ear: [{ m: 'campo', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'bVII', 'iv'] }],
    ouvidoTxt: 'Tirar de ouvido uma música fingerstyle curta.',
    rep: 'Stop This Train completa.',
    imp: { txt: 'Improviso livre na Jam: deixe o app sugerir os próximos acordes.', area: 'jam' },
    piano: 'Revisão livre.',
    saida: ['Stop This Train completa no andamento'] },

  { n: 23, tema: 'Repertório de show',
    alvo: { musica: 'Set de 6 músicas', conceito: 'Forma e transições', tecnica: 'Tocar sem parar' },
    teoria: ['Montar o set: tons, andamentos e transições.', 'Escrever a forma de cada música em graus.', 'Revisar o que você errou nas gravações.'],
    tec: { txt: 'Trechos difíceis do set em loop, com a cifra rolando.', area: 'musicas' },
    ear: [{ m: 'grau', set: CHROM }, { m: 'acorde', set: ['maior', 'menor', '7', 'm7', '7M', 'm7b5', 'dim7', '9', '6'] }],
    ouvidoTxt: 'Tocar junto com as gravações originais e corrigir o que difere.',
    rep: 'Set de 6 músicas inteiras, em sequência.',
    imp: { txt: 'Solo improvisado dentro de 2 músicas do set.', area: 'musicas' },
    piano: 'Uma música do set no piano.',
    saida: ['Set inteiro gravado em sequência, sem parar'] },

  { n: 24, tema: 'Revisão do ano',
    alvo: { musica: 'Gravação final', conceito: 'Tudo', tecnica: 'Comparar com o dia 1' },
    teoria: ['Revisar o que ainda é fraco.', 'Escrever o que funcionou e o que não funcionou.', 'Planejar o ano 2.'],
    tec: { txt: 'Refazer os testes de técnica de todas as fases.',
      cfg: { scaleId: 'pentMin', key: 'A', boxes: [1], exercise: 'subir-descer', perBeat: 2, bpm: 80, autoBpm: true } },
    ear: [{ m: 'grau', set: CHROM }, { m: 'campo', set: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'bVII', 'iv', 'bVI'] }],
    ouvidoTxt: 'Refazer o teste de ouvido do diagnóstico.',
    rep: 'Tocar o repertório do ano.',
    imp: { txt: 'Gravação final de improviso, no mesmo blues do diagnóstico.',
      cfg: { progId: 'blues12', key: 'A', styleId: 'shuffle', bpm: 80, scaleId: 'pentMin', restrictionId: 'nenhuma', focusBox: 0, guide: true } },
    piano: 'Tocar o que aprendeu no ano.',
    saida: ['Todas as metas de Out 2027', 'Gravação final comparada com o diagnóstico'] },
]

export const ALBUMS = [
  'In Rainbows · Radiohead', 'Grace · Jeff Buckley', 'Blonde · Frank Ocean', 'Continuum · John Mayer',
  'Clube da Esquina · Milton Nascimento e Lô Borges', 'Freudian · Daniel Caesar', 'Elis & Tom', 'Kid A · Radiohead',
  'Getz/Gilberto', 'Channel Orange · Frank Ocean', 'Acabou Chorare · Novos Baianos', 'Electric Ladyland · Jimi Hendrix',
  'Abbey Road · Beatles', 'Texas Flood · Stevie Ray Vaughan',
]

// ---------- datas ----------

/** segunda, 9 nov 2026: início do sprint 1 (antes disso, semana zero de diagnóstico) */
export const START = new Date(2026, 10, 9)
const DAY = 86_400_000

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export function fromKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number)
  return new Date(y, m - 1, d)
}
/** dias de calendário de a até b (ignora a hora e o horário de verão) */
export function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / DAY)
}
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
export const sprintStart = (n: number) => addDays(START, (n - 1) * 14)

/** sprint do dia (0 = semana zero) e o dia dentro dele (1–14; passa de 14 depois do último) */
export function sprintOf(d: Date): { n: number; day: number } {
  const diff = daysBetween(START, d)
  if (diff < 0) return { n: 0, day: 0 }
  const n = Math.min(SPRINTS.length, Math.floor(diff / 14) + 1)
  return { n, day: diff - (n - 1) * 14 + 1 }
}
export const phaseOf = (n: number) => PHASES.find((p) => n >= p.range[0] && n <= p.range[1])

// ---------- roteiro do dia ----------

export type LogKind = 'bpm' | 'imp' | 'close'

export interface Block {
  id: string
  title: string
  min: number
  /** Bloco A (manhã) ou B (tarde); domingo e semana zero não têm */
  group?: 'A' | 'B'
  /** o que fazer, em frases curtas */
  lines: string[]
  /** configuração do app para "Abrir" (Escalas ou Improviso) */
  tec?: TecCfg
  imp?: ImpCfg
  /** área que "Abrir" mostra */
  area?: AreaId
  /** presets do treino de ouvido */
  ear?: EarPreset[]
  guia?: boolean
  log?: LogKind
}

/** teoria: seg/qui a 1ª tarefa, ter/sex a 2ª, qua/sáb a 3ª */
const THEORY_OF_WEEKDAY: Record<number, 0 | 1 | 2> = { 1: 0, 4: 0, 2: 1, 5: 1, 3: 2, 6: 2 }

export function earLabel(p: EarPreset): string {
  if (p.m === 'int') {
    const dir = p.dir === 'desc' ? 'descendentes' : p.dir === 'harm' ? 'harmônicos' : 'ascendentes'
    return `Intervalos ${dir}: ${p.set.length === 12 ? 'todos' : p.set.join(', ')}`
  }
  if (p.m === 'acorde') return `Qualidade de acorde: ${p.set.join(', ')}`
  if (p.m === 'grau') return `Graus na tonalidade: ${p.set.length === 12 ? 'todos os 12' : p.set.join(', ')}`
  return `Acordes do campo: ${p.set.join(', ')}`
}

export function blocksFor(date: Date): Block[] {
  const { n, day } = sprintOf(date)
  if (n === 0) return diagnosticBlocks()
  const s = SPRINTS[n - 1]
  if (date.getDay() === 0) return sundayBlocks(s, day, date)
  const th = s.teoria[THEORY_OF_WEEKDAY[date.getDay()] ?? 0]
  return [
    { id: 'aquec', title: 'Aquecimento e afinação', min: 15, group: 'A', area: 'afinador',
      lines: ['Afine no Afinador.', 'Cromático 1-2-3-4 nas 6 cordas, devagar, mão relaxada.', 'Alongue punhos e dedos antes e depois.'] },
    { id: 'tec', title: 'Técnica', min: 25, group: 'A', log: 'bpm', tec: s.tec.cfg, area: s.tec.area ?? (s.tec.cfg ? 'escalas' : undefined),
      lines: [s.tec.txt, 'O bpm só sobe quando 90% sai limpo. Com a guitarra ligada, toda volta com 90% ou mais registra o bpm sozinha.'] },
    { id: 'ouvido', title: 'Ouvido', min: 30, group: 'A', area: 'ouvido', ear: s.ear,
      lines: [`20 min no treino de ouvido: ${s.ear.map(earLabel).join(' · ')}.`, `10 min tirando de ouvido: ${s.ouvidoTxt}`] },
    { id: 'teoria', title: 'Teoria aplicada', min: 25, group: 'A', guia: true, area: th.includes('Quiz') ? 'acordes' : undefined,
      lines: [th, 'Toda teoria termina no braço: depois de ler, toque o que leu.'] },
    { id: 'piano', title: 'Piano', min: 30, group: 'A',
      lines: [s.piano, 'No teclado você enxerga escalas e acordes. Use isso para entender o que toca na guitarra.'] },
    { id: 'rep', title: 'Repertório', min: 50, group: 'B', area: 'musicas',
      lines: [s.rep, 'Trechos de 2 a 4 compassos, não a música inteira.', 'Metrônomo a 60% do andamento; sobe 5 bpm a cada 3 passadas limpas.', 'Nos últimos 10 min, do começo ao fim sem parar.'] },
    { id: 'imp', title: 'Improviso', min: 45, group: 'B', log: 'imp', imp: s.imp.cfg, area: s.imp.area ?? (s.imp.cfg ? 'improviso' : undefined),
      lines: [s.imp.txt, 'Com a guitarra ligada, o placar registra sozinho a % de notas dentro e de alvos no tempo 1.'] },
    { id: 'reg', title: 'Gravar e registrar', min: 20, group: 'B', log: 'close',
      lines: ['Grave 1 minuto do trecho mais difícil do dia ou de improviso. Ouça uma vez e escreva o que travou.'] },
  ]
}

function sundayBlocks(s: Sprint, day: number, date: Date): Block[] {
  const week = Math.floor(daysBetween(START, date) / 7)
  const album = ALBUMS[((week % ALBUMS.length) + ALBUMS.length) % ALBUMS.length]
  const list: Block[] = [
    { id: 'rev', title: 'Revisão da semana', min: 15, lines: ['Leia os registros da semana em Progresso. O que melhorou? O que travou mais de uma vez? Isso vira prioridade na segunda.'] },
    { id: 'album', title: 'Escuta ativa', min: 45, lines: [`${album}, inteiro e sem fazer outra coisa.`, 'Em cada faixa: tom maior ou menor?', 'Escolha uma faixa e ache a tônica e o primeiro acorde na guitarra.', 'Anote uma ideia que você quer roubar.'] },
    { id: 'livre', title: 'Tocar por prazer', min: 30, lines: ['Toque o que quiser, sem metrônomo e sem meta. Isso também conta.'] },
  ]
  if (day === 14) list.push({ id: 'teste', title: `Teste de saída do sprint ${s.n}`, min: 45, log: 'close', lines: ['Grave o teste e marque o que passou no Plano.', ...s.saida, 'O que não passar entra no próximo sprint como revisão.'] })
  else if (day === 7) list.push({ id: 'meio', title: 'Gravação de meio de sprint', min: 20, log: 'close', lines: ['Grave a música e o improviso do sprint. Compare com a gravação do início.'] })
  return list
}

function diagnosticBlocks(): Block[] {
  return [
    { id: 'd-imp', title: 'Gravação de diagnóstico: improviso', min: 20, log: 'imp', area: 'improviso',
      imp: { progId: 'blues12', key: 'A', styleId: 'shuffle', bpm: 80, scaleId: 'pentMin', restrictionId: 'nenhuma', focusBox: 1, guide: true },
      lines: ['Blues de 12 em Lá, shuffle, 80 bpm. Grave 3 minutos do jeito que você toca hoje: é o seu "antes".', 'Com a guitarra ligada, o placar fica registrado.'] },
    { id: 'd-tec', title: 'Medir a técnica', min: 20, log: 'bpm', area: 'escalas',
      tec: { scaleId: 'pentMin', key: 'A', boxes: [1], exercise: 'subir-descer', perBeat: 2, bpm: 60, autoBpm: true },
      lines: ['Pentatônica menor em Lá, desenho 1, colcheias, com o bpm subindo sozinho. Qual o bpm mais alto em que sai limpa?'] },
    { id: 'd-ear', title: 'Teste de ouvido', min: 15, area: 'ouvido', ear: [{ m: 'int', set: ALL_INT, dir: 'asc' }],
      lines: ['20 perguntas de intervalos ascendentes, todos. Não treine antes: é para medir.'] },
    { id: 'd-acordes', title: 'Teste de acordes', min: 15, area: 'acordes', lines: ['Quiz de Acordes, nível 1, sessão de 20. Anote a %.'] },
    { id: 'd-rep', title: 'Gravar Something Like Olivia', min: 20, lines: ['Toque e grave inteira. Marque os 3 trechos mais sujos: eles são o repertório do sprint 1.'] },
    { id: 'd-guia', title: 'Ler o guia do iniciante', min: 40, guia: true, lines: ['As partes de notas no braço e de intervalos. Não precisa decorar: é para saber o que vem.'] },
    { id: 'd-piano', title: 'Piano: ponto de partida', min: 20, lines: ['Anote o que você já sabe tocar no piano e ache todas as notas Dó do teclado.'] },
    { id: 'd-livre', title: 'Prática livre', min: 90, log: 'close', lines: ['O resto do tempo é livre até segunda, quando começa o sprint 1. Explore as áreas do solonely.'] },
  ]
}
