# Treinador de Improviso — contexto do projeto

Web app para guitarristas praticarem improviso, acordes e escalas. É genérico, para qualquer pessoa,
mas permite carregar as músicas do próprio repertório (setlist) como base de treino.
Usuário principal: guitarrista intermediário, foco em blues e rock, com prazo apertado (jan/2027).
Ele precisa praticar logo: priorizar versões úteis e pequenas a features completas.
Rotina: ~2 h de prática por dia, dedicado à banda até jul/2027. Usa o Cuvave Cube Baby como
pedaleira e interface USB (é o mesmo aparelho da entrada de áudio da v2).
Site público: talvez, se ficar bom. Não é prioridade, mas manter licenças em ordem e nada de
conteúdo de terceiros embutido, para não fechar essa porta.

O protótipo atual está em `prototype/treinador.html` (HTML único). Reaproveite a lógica de braço,
progressões e "acorde atual/próximo", mas reescreva o áudio do zero.

## Stack
- Vite + React + TypeScript
- Tone.js (áudio, Transport, Sampler)
- tonal (teoria: parse de cifras, escalas, intervalos)
- Zustand (estado)
- Dexie/IndexedDB (músicas e progresso; tudo local na v1)
- pitchy (detecção de nota; só na v2)
- Deploy: Cloudflare Pages
- Funcionar bem em desktop E celular (braço legível em tela estreita)

## Estrutura
```
src/
  core/      theory (parse de cifra -> notas/intervalos), voicings, fretboard-model, scales
  audio/     engine, styles/ (rock, shuffle, slow12-8, ballad), humanize, samplers
  features/  improviso/ musicas/ acordes/ escalas/ progresso/
  ui/        Fretboard, ChordDiagram, Mixer, Transport
public/samples/
```
Princípio: as áreas compartilham o núcleo. Uma música importada alimenta a base de improviso,
o quiz de acordes ("só acordes desta música") e o modo cifra rolando.

## Escopo v1

### Improviso
- Estilos: rock reto (colcheias), shuffle de blues, slow blues 12/8, pop rock/balada.
- Progressões prontas: blues de 12 (normal e quick change), I–V–vi–IV, I–bVII–IV,
  menor rock i–bVII–bVI. Também progressão digitada pelo usuário e música importada.
- Ajustes: tom, BPM, loop, contagem de entrada.
- Braço: escala escolhida + fundamental + notas do acorde atual acesas; mostra o próximo acorde.
- Restrição opcional (sorteada ou escolhida): "só box 2", "termine frases na 3ª do acorde", "só 3 notas" etc.

### Som (prioridade alta; o protótipo soava robótico)
- Mixer com on/off e volume para: bateria, baixo (ligado por padrão), piano, violão.
- Timbres: samples gratuitos via Tone.Sampler (piano Salamander Grand; violão e baixo de
  soundfonts livres; kit de bateria multisample). Conferir as licenças e registrar em `public/samples/LICENSES.md`.
- Anti-robô, em ordem de impacto:
  1. Padrões de bateria por estilo, com variações A/B e virada a cada 4 ou 8 compassos.
  2. Swing real (tercinado) no shuffle e no 12/8.
  3. Humanização: timing ±5–15 ms, velocity aleatória dentro de uma faixa, ghost notes na caixa, acento em 2 e 4.
  4. Baixo idiomático: desenho de shuffle no blues, colcheias na fundamental no rock, fundamental–quinta na balada.
  5. Violão com atraso de 10–25 ms entre cordas (strum); piano com voice leading (menor movimento entre acordes).
- Agendamento com lookahead pelo Tone.Transport.

### Músicas
- Colar texto do Cifra Club (acordes acima da letra) e extrair acordes e seções (intro/verso/refrão).
- A cifra não traz durações: assumir 1 acorde por compasso e mostrar uma grade editável em que
  clicar divide (2+2) ou junta compassos.
- Transpor, BPM, estilo. Salvar localmente. Não embutir cifras de terceiros no app.

### Acordes
- Banco (~30 formatos móveis): power chord, maior, menor, 7, m7, 7M, sus2, sus4, add9.
  Cada tipo com fundamental na 6ª e na 5ª corda, mais a forma aberta quando existir.
- Decodificador: digita qualquer cifra e vê fórmula, notas e 2–3 desenhos.
- Quiz de múltipla escolha: cifra→desenho, desenho→cifra, cifra→notas.
- Quiz cronometrado: "Toque Bm7 com fundamental na 5ª corda". Na v1 é autoavaliado
  (revela o desenho, o usuário marca acertou/rápido).
- Sorteio ponderado: itens errados ou lentos aparecem mais (Leitner simples, sem UI de flashcard).
- Filtro "só acordes da música X".
- Cifra rolando no tempo: sequência aleatória ou da música, com metrônomo ou base, para treinar trocas.

### Escalas
- Escalas: pentatônica menor, pentatônica maior, blues, maior, menor natural. Desenhos 1–5.
- Montador de treino configurável:
  - escala, tom e quais desenhos entram;
  - exibição: tudo / só fundamentais / esconder e revelar;
  - exercício: subir/descer no metrônomo, sequências (grupos de 3 e 4, terças),
    conectar box N→N+1 (diagonal), quiz "onde está o Lá na 3ª corda".
- Salvar treinos como predefinições (o plano semanal vira um conjunto de predefinições).

### Progresso
- Tempo praticado por área + taxa de acerto, guardados localmente.

### Jam livre (depois da Fase 1b; depende da entrada de áudio)
- Guitarra plugada, tocando livremente: o app detecta notas (pitchy) e acordes
  (chroma + comparação com moldes de maior/menor/7/m7…; Basic Pitch só se os moldes não bastarem).
- Detecta o tom a partir das últimas notas (algoritmo de tonalidade, ex.: Krumhansl-Schmuckler).
- Sugere 2–3 próximos acordes por tabela de transições (cadeia de Markov): primeiro feita à mão para
  blues/rock, depois aprendida com as músicas importadas na área Músicas.
- Acende no braço as notas-alvo do acorde sugerido + notas de aproximação + escala do tom.
- Sem LLM em tempo real (lento, caro, depende de rede); se entrar, só para explicar depois de tocar.
- Tela mínima: acordes sugeridos grandes + braço; nada de texto durante a jam.
- Limites conhecidos: som limpo (distorção atrapalha), ~0,3–0,5 s para fechar um acorde,
  pouco útil em solo rápido; melhor em jam lenta e composição.

## Ordem de construção
1. Fase 1a: setup + core (teoria, voicings, braço) + novo motor de áudio + Improviso + Acordes + Escalas.
2. Teste de entrada de áudio: tela que mostra a nota tocada + afinador (valida o Cube Baby no PC/celular).
3. Fase 1b: Músicas (import + grade) + cifra rolando + integração entre áreas + progresso.
4. Jam livre (versão pequena), reaproveitando a detecção do passo 2.
Cada fase deve terminar com o app rodando e utilizável para praticar.

## Estado (atualizar ao fim de cada etapa)
- Feito: setup, motor de áudio (4 estilos, mixer, humanização, Parar instantâneo), Improviso
  (braço, desenhos 1–5, restrições, progressão digitada), Acordes (banco, decodificador, 4 quizzes, Leitner).
- Visual (etapa 1): tema escuro único; Improviso em "palco" (acorde grande, braço em foco no box,
  próxima troca) + gaveta de Ajustes (<dialog>); braço com hierarquia (acorde grande, escala em pontos).
- Revisão visual completa (Tailwind + Radix/shadcn) fica para depois da Fase 1b.
- Pendente: Escalas.
- Progresso dos acordes está em localStorage; migrar para Dexie junto com a área Progresso.

## Depois (não fazer agora)
- v2: entrada de áudio pelo M-Vave/Cuvave Cube Baby, que funciona como interface USB
  (getUserMedia + pitchy; a detecção base nasce no passo 2 da ordem acima): validar quiz de notas, medir acerto de nota-alvo no improviso, afinador,
  checar a fundamental no quiz cronometrado. Tap para marcar trocas na cifra. Modos dórico e
  mixolídio, escalas de 3 notas por corda. Acordes m7(b5), dim, 6, 9, 13. Sincronização PC/celular.
- v3: loops próprios gravados no FL Studio substituindo a bateria, pergunta e resposta,
  gravar e ouvir a si mesmo, mapa de calor das notas usadas, PWA offline, site público.

## Como trabalhar
- O usuário quer rapidez e objetividade. Construir em incrementos que rodem.
- Ser honesto quando algo for exagero; cortar o supérfluo.
- Idioma da UI e das conversas: português.
- Git: repositório privado github.com/depaula12/treinador-improviso (branch main). Ao fim de cada
  etapa que roda, fazer commit com mensagem em português descrevendo a etapa e `git push`, para o
  histórico mostrar a evolução do projeto. Autor usa o e-mail noreply do GitHub.
- Antes de cada commit: `npm run typecheck` e `npm test` (Vitest, arquivos `*.test.ts` ao lado do
  código). O CI no GitHub Actions roda os dois + build a cada push. Lógica nova em core/, audio/styles
  ou quiz ganha teste. Ao mudar a UI, atualizar os prints em `docs/screenshots/` usados no README.
