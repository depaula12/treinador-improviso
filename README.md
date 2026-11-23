# solonely.

*Treino de improviso na guitarra: toque junto com as músicas da sua banda.*

[![CI](https://github.com/depaula12/treinador-improviso/actions/workflows/ci.yml/badge.svg)](https://github.com/depaula12/treinador-improviso/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![React](https://img.shields.io/badge/React-19-61dafb)
![Tone.js](https://img.shields.io/badge/áudio-Tone.js-f2a03d)
![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)

### ▶ [Teste agora: treinador-improviso.vercel.app](https://treinador-improviso.vercel.app) · 📘 [Guia do iniciante (PDF)](docs/guia/guia-do-iniciante.pdf)

**Uma banda de apoio no navegador para guitarristas praticarem improviso, acordes e escalas.**
A base toca com bateria, baixo, piano e violão de verdade (samples), e o braço da guitarra mostra,
compasso a compasso, para onde mirar: a escala, as notas do acorde da vez e a próxima troca.
Com a guitarra ligada (interface USB ou microfone), o app **ouve o que você toca**: afina, reconhece
notas e acordes, confere se você acertou o alvo e, na Jam livre, sugere os próximos acordes em tempo real.
Também dá para **colar as cifras do repertório da banda**, **compor** progressões pelo efeito (em
Pop/Rock, Blues ou Bossa/Jazz) e treinar acordes num quiz com centenas de perguntas.

![Tela de improviso no desktop](docs/screenshots/improviso-desktop.png)

> **In English:** a browser-based backing band and practice tool for guitarists. It plays
> humanized, sample-based backing tracks (drums, bass, piano, acoustic guitar) and shows target
> notes on an interactive fretboard in real time. It also listens to your guitar (USB interface or mic):
> pitch and chord detection, key estimation and live next-chord suggestions. Built with React,
> TypeScript and Tone.js; runs entirely in the browser, no backend.

---

## O problema

Quem está aprendendo a improvisar costuma ficar preso em "tocar a pentatônica inteira, aleatória"
por cima de uma base genérica do YouTube. Faltam quatro coisas:

1. **Uma base que soe como banda** e não como metrônomo, no tom, andamento e estilo que você quiser.
2. **Saber para onde mirar** em cada acorde, e não só que escala usar.
3. **Treino deliberado** dos acordes e desenhos que você ainda erra.
4. **Retorno sobre o que você tocou**, e não só sobre o que deveria tocar.

## O que o app faz

### Pensado para horas de treino
- **Menu lateral fixo** (no celular, barra de ícones embaixo) e **player fixo** em todas as áreas:
  tocar/parar, andamento, contagem, loop e mixer sempre à mão; a **barra de espaço** toca e para.
- **Braço de ponta a ponta** em todas as telas, da casa 0 à 17: a box escolhida fica destacada e
  só as notas dela aparecem. No celular o braço rola de lado e abre já na box.
- Nada escondido em janelas: os ajustes de cada área ficam à vista.

### Improviso
- Faixa da progressão andando até a linha "agora" (estilo Yousician), com a próxima troca e quanto falta.
- Progressões prontas em tom maior (blues de 12 normal e *quick change*, I–V–vi–IV, I–bVII–IV) e
  menor (blues menor, i–iv–v, i–bVI–bIII–bVII, i–bVII–bVI, andaluza), ou digitadas (`Am*2 G F E7`).
  O seletor de tom tem os 24 tons; num tom menor a base vira a versão menor da progressão.
- Cinco estilos: **shuffle de blues**, **rock reto**, **slow blues 12/8**, **pop rock/balada** e **bossa nova**.
- O braço mostra o desenho (box 1–5) em foco: a **fundamental** em vermelho, as **notas do acorde**
  em destaque com o grau (3, b7…) e a escala em pontos discretos. No tempo 4, brilham as notas do
  **próximo acorde**.
- **Alvos sugeridos (notas-guia)**: a cada compasso, uma bolinha branca marca a 3ª ou a 7ª do acorde,
  sempre a mais próxima do alvo anterior, formando uma linha suave (ex.: a 3ª de A7 desce meio tom
  até a b7 de D7). Improvise livre e pouse no alvo no tempo 1.
- Restrições sorteáveis para treino deliberado: "só box 2", "termine frases na 3ª",
  "só cordas 1 e 2"…
- Escala no braço à escolha (inclusive modos e arpejos) ou **acompanhando o acorde**: mixolídio no 7,
  dórico no m7, menor natural na tônica menor.
- **O app ouve cada nota que você toca**: com a guitarra ligada, cada palhetada (inclusive a mesma nota
  repetida, ligados e slides) **pulsa no braço** com a cor do veredito: verde no alvo, amarelo nota do
  acorde, azul escala, rosa fora. Uma trilha mostra as últimas notas, e o placar dá a % de notas dentro
  e quantos compassos você pousou no alvo no tempo 1.
- Mixer (bateria, baixo, piano, violão), contagem de entrada, loop, virada a cada 4 ou 8 compassos.

### Compor

![Compor: progressão por efeito, com desenhos e levadas](docs/screenshots/compor.png)

- Escolha o tom e o primeiro acorde; a cada passo o app oferece opções pelo **efeito**: repousar,
  criar tensão, subir a energia, melancolia, surpresa, conclusão sóbria / forte / épica, suspense.
- Três **linguagens**: **Pop/Rock** (tríades), **Blues** (tudo com sétima, quick change, #IVº7 de
  passagem, turnaround) e **Bossa/Jazz** (7M, m7, 6/9, 7(13), ii–V–I, dominantes secundários,
  substituto trítono como Dm7 → Db7 → C7M(9), I7M → II7, ivm6).
- Cada opção mostra os acordes, os graus e **por que soa assim**, e tem **▶ ouvir** antes de usar.
- **Edição livre**: clique num acorde para mudar a duração (½, 1 ou 2 compassos), trocar, mover,
  duplicar ou apagar; arraste para reordenar; digite qualquer cifra; as sugestões valem para o
  acorde selecionado. **colorir** enriquece o acorde (C → C7M → C7M(9) → C6/9).
- **Escolha o desenho** de cada acorde no braço (o mais simples, os outros na ordem do braço, e o
  mais perto do acorde anterior marcado) ou **aproxime os desenhos** de uma vez: o app escolhe a
  combinação com menos movimento da mão. A base toca o desenho escolhido.
- **Levada do violão por seção**: pop baixo-cima, balada dedilhada, rock em colcheias, reggae, funk em
  semicolcheias, shuffle, bossa nova ou uma batida por compasso. Tom (transpõe tudo), BPM e estilo.
- **Tocar com a base** em loop (o que você muda entra no próximo compasso), **improvisar sobre ela**
  e **salvar como música** do repertório, com as durações.

### Músicas (repertório)

![Cifra rolando no tempo](docs/screenshots/musicas.png)

- **Cole a cifra** (formato do Cifra Club, com letra e tablatura): o app separa acordes, letra e
  seções ([Intro], [Refrão]…), entende cifra brasileira (A7(9), Dm7(b5), G7M, E4, Bº), repete
  linhas marcadas com (2x) e pula tablatura. Capotraste vira transposição, para a base soar no tom real.
- **Grade de compassos editável**: um acorde por compasso; clique para juntar dois no mesmo
  compasso (2+2), separar, repetir, apagar ou trocar o acorde. Seções podem ser repetidas.
- **Marcar tempos com a gravação**: a cifra não diz quanto dura cada acorde. Com a música original
  tocando, você bate no tempo (o app acha o BPM) e depois bate a cada troca; as batidas são
  encaixadas nos tempos e viram a duração real de cada acorde, inclusive trocas no meio do
  compasso. Sem marcar, a música toca com 1 compasso por acorde.
- Transpor, andamento e estilo por música, salvos no aparelho (IndexedDB).
- **Cifra rolando**: a base toca a música e a grade acompanha o acorde atual, com "agora / depois
  / em N tempos".
- **Integração**: "Improvisar sobre ela" carrega a música no Improviso (tom e escala certos) e
  "Treinar os acordes dela" filtra o quiz de Acordes.
- Nenhuma cifra vem embutida no app: o repertório é seu e fica só no seu aparelho.

### Acordes

![Quiz de acordes](docs/screenshots/acordes-desktop.png)

- Banco com formas móveis e abertas de 14 tipos (power, maior, menor, 7, m7, 7M, sus2, sus4, add9,
  6, 9, 7(#9), m7(b5) e º7), com fundamental na 6ª e na 5ª corda.
- **Consulta**: digite qualquer cifra (inclusive Am7b5, E9, C13, D/F#) e veja fórmula, notas e
  **todas as formas tocáveis no braço**, geradas por busca (até 4 dedos, contando pestana) e
  ordenadas da casa 1 à 15. As principais aparecem primeiro; clicar num desenho mostra onde
  ele fica no braço.

![Consulta de acordes com todas as formas](docs/screenshots/acordes-consulta.png)
- **Quiz com centenas de perguntas** (446 no nível 4): cifra → desenho, desenho → cifra, **graus no
  desenho** (clique na bolinha da 3ª, da b7…), **nota de cada grau**, **o que muda** de um acorde para
  outro (C → Cm: a 3ª desce meio tom), cifra → notas e um modo **cronometrado** com a guitarra na mão,
  **conferido pelo áudio**. Modo misturado, **níveis 1–4** e filtros por tipo de acorde e de forma
  (aberta, pestana, móvel, tríade nas cordas agudas).
- Desenhos de verdade: abertos, pestanas e formas móveis que funcionam em quase todas as fundamentais
  (as do CAGED), além de tríades em 3 grupos de cordas × 3 inversões.
- **▶ Ouvir a resposta** (arpejado e depois junto) e a que você escolheu; sessões de 10, 20 ou 50
  com resultado e o que revisar. Teclas 1–4, Enter e O.
- **Repetição espaçada (Leitner)**: o que você erra ou demora aparece mais vezes.

### Escalas

![Exercícios de escala](docs/screenshots/escalas-desktop.png)

- Pentatônica menor e maior, blues e blues maior, maior, menor natural, **dórico, mixolídio, menor
  harmônica** e **arpejos** (maior, menor, 7, m7, 7M), nos **desenhos 1–5**, em qualquer tom.
- Exercícios no metrônomo, com a nota da vez acesa no braço (e a próxima marcada): **subir e descer**,
  **grupos de 3 e de 4**, **terças** e **percorrer os boxes** (sobe um, desce o seguinte, atravessando o braço).
- Ritmo em semínimas, colcheias, tercinas ou semicolcheias; opção de ouvir cada nota no violão.
- Exibição para memorizar: tudo, **só as tônicas** ou **esconder e revelar**.
- **Conferido pelo áudio**: no metrônomo, cada nota da sequência fica verde (certa), amarela (fora do
  tempo ou outra oitava) ou vermelha (errada ou faltou), com a nota da volta e o atraso médio; no modo
  **espera por você**, a próxima nota só acende quando você acerta a atual. **Speed trainer**: com 90% ou
  mais o bpm sobe sozinho.
- **Onde está a nota?**: quiz clicando no braço ou **tocando a nota** ("onde está o Lá na 3ª corda?"), com repetição espaçada.
- **Treinos salvos**: combinações favoritas viram o plano da semana.

### Jam livre

![Jam livre reconhecendo um blues em Lá](docs/screenshots/jam-livre.png)

Você toca livre; o app escuta e acompanha:
- **acorde que você está tocando** e a função dele no tom ("IV7 em Lá maior");
- **tom estimado** a partir do que foi tocado; quando é ambíguo (ex.: Em–D–C–D), mostra o rival para você fixar;
- **até 6 próximos acordes pelo contexto**: o app reconhece os últimos até 6 acordes (ex.: I–V–vi) num
  banco de progressões **e das músicas do seu repertório**, e separa as opções em *mais comum*,
  *volta pra casa* e *surpresa*, cada uma com o motivo em uma linha e o desenho;
- **alvo para improvisar** (3ª/7ª do acorde) perto da última nota que você tocou, e o anel de aonde ir se trocar;
- histórico do que você tocou.

### Afinador e leitura de acordes

![Afinador no modo acorde](docs/screenshots/afinador-acorde.png)

- **Afinador** com ponteiro em cents e a nota acesa em todas as posições do braço.
- **Modo acorde**: o acorde soando, palpites alternativos e a energia de cada uma das 12 notas.
- **Troca de acorde configurável**: rápida, equilibrada ou estável, e tempo mínimo entre trocas.
- Medidor de nível com a faixa ideal, e a interface USB (ex.: Cube Baby) escolhida sozinha.

### No celular

<p align="center"><img src="docs/screenshots/mobile.png" alt="Telas no celular" width="620"></p>

## Guia do iniciante

O [**guia em PDF**](docs/guia/guia-do-iniciante.pdf) (37 páginas) ensina a usar o app e a teoria por trás
dele, do zero: notas no braço, intervalos e graus, acordes (tríades, tétrades, extensões, inversões),
escalas, modos e arpejos, campo harmônico, **harmonia para compor** (funções, cadências, empréstimo
modal, dominantes secundários, ii–V–I, substituto trítono), ritmo e levadas e notas-alvo. Cada parte
de teoria tem **exercícios com gabarito** e o treino correspondente no app, e o guia termina com um
plano de evolução em 4 fases e uma rotina de 2 horas por dia. Ele é gerado por
[`docs/guia/gerar-guia.mjs`](docs/guia/gerar-guia.mjs) (diagramas calculados pela afinação, sem desenho à mão).

## Destaques técnicos

**Motor de áudio que não soa robótico.** O protótipo original usava osciladores e soava como
um teclado de brinquedo. O motor novo foi escrito do zero sobre o Tone.js:

| Técnica | Como |
|---|---|
| Samples reais | Bateria multisample com camadas de intensidade e *round robin* (alterna gravações do mesmo golpe), piano Salamander, baixo e violão de soundfont |
| Swing de verdade | Colcheias tercinadas (2/3 do tempo) no shuffle e no 12/8, não um "atraso" aproximado |
| Humanização | Desvio de tempo por instrumento (o baixo toca levemente atrás), variação de intensidade, *ghost notes* na caixa |
| Arranjo | Variações A/B por frase, viradas, prato na entrada da frase, baixo idiomático por estilo (desenho de shuffle, aproximação cromática antes da troca) |
| Piano | **Voice leading**: escolhe a inversão com menor movimento em relação ao acorde anterior |
| Violão | *Strum* real, com 10–25 ms entre as cordas e batida para cima e para baixo; 8 levadas (dedilhado, reggae, funk com abafados, bossa com polegar no baixo…) |

**Agendamento preciso e Parar instantâneo.** Cada nota vira um evento do `Tone.Transport` e só é
entregue ao Web Audio ~50 ms antes de soar. O Parar descarta a fila e fecha um *gate* em 30 ms.
Um detalhe que exigiu ler o código do Tone.js: eventos agendados para o mesmo *tick* que está sendo
processado são ignorados, então cada compasso é montado uma semicolcheia antes de começar.

**A tela acompanha o som.** As atualizações visuais compensam a latência de saída do áudio
(`outputLatency`), que em fone Bluetooth passa de 200 ms.

**Teoria musical testada.** Cifras são interpretadas com `tonal`, incluindo a notação brasileira (7M).
Os 249 desenhos de acorde (9 tipos × 12 tons × formas) são verificados automaticamente: notas certas,
fundamental no baixo, casas válidas e abertura tocável.

**Desempenho.** Assinaturas seletivas no estado (Zustand) e SVG memoizado: a cada batida só os
indicadores de tempo re-renderizam; o braço só redesenha na troca de acorde.

**Ouvido de guitarra, sem servidor e sem IA pesada.** Tudo roda no navegador, em tempo real:

| Etapa | Como |
|---|---|
| Nota | Método de McLeod (`pitchy`) limitado à faixa da guitarra, com **histerese**: clareza 0,9 para começar uma nota e 0,6 para mantê-la enquanto a corda perde força; mediana contra saltos de oitava |
| Cada nota tocada | **Detector de ataque**: salto de volume nos últimos ~21 ms do sinal (palhetada) ou troca de altura confirmada em 2 leituras (ligado, slide); salto de oitava sem ataque é descartado. Uma nota por palhetada em ~35 ms |
| Acorde | Espectro de 16 384 pontos → energia das 12 notas (picos com interpolação e **compressão**) → comparação com os moldes de 9 tipos × 12 fundamentais; power chord só sem 3ª |
| Estabilidade | O acorde atual só é trocado por um claramente mais provável, depois de um tempo mínimo configurável; média móvel do espectro |
| Tom | Perfis de **Krumhansl-Kessler** sobre os acordes tocados, com dica de tônica (o acorde que abre e o que mais repousa) |
| Sugestões | Tabelas de transição de blues (I7–IV7–V7), tons maiores e menores, por grau no tom |

Os parâmetros da leitura de acordes saíram de uma **busca sistemática** em 280 acordes sintéticos com
volume aleatório por corda: a primeira versão acertava 43%; a final acerta 113 de 113 desenhos do banco
e foi validada com guitarra real.

**Teste ponta a ponta no navegador** (`npm run e2e`, em [`scripts/e2e-jam.mjs`](scripts/e2e-jam.mjs)).
Um áudio de guitarra gerado (A7 → D7 → A7 → E7) é entregue ao Chrome/Edge headless como se fosse o
microfone; via DevTools Protocol o script liga a entrada e confere que a Jam reconhece a sequência,
estima Lá maior e sugere acordes do blues. Os prints da Jam e do Afinador acima saíram desse processo.

## Arquitetura

```mermaid
flowchart LR
  subgraph core["core/ — teoria pura, sem UI nem áudio"]
    theory["theory<br/>cifras → notas"]
    prog["progressions"]
    scales["scales<br/>desenhos 1–5"]
    voicings["voicings<br/>banco de acordes"]
    ear["pitch · chroma · key<br/>ouvido"]
    sug["guide · next-chords · compose<br/>sugestões"]
  end
  subgraph audio["audio/"]
    engine["engine<br/>Transport, mixer, agendamento"]
    styles["styles/<br/>shuffle · rock · 12/8 · balada · bossa<br/>+ levadas de violão"]
    human["humanize"]
    drums["drums<br/>camadas + round robin"]
    input["input<br/>captura da guitarra"]
  end
  subgraph features["features/"]
    imp["improviso"]
    ac["acordes<br/>quiz + Leitner"]
    es["escalas<br/>exercícios + quiz"]
    jam["jam livre"]
    af["afinador"]
  end
  subgraph ui["ui/"]
    fb["Fretboard"]
    cd["ChordDiagram"]
    mix["Mixer"]
    ip["InputPanel"]
  end
  core --> audio
  core --> features
  core --> ui
  styles --> engine
  human --> engine
  drums --> engine
  ear --> input
  engine --> imp
  engine --> es
  input --> jam
  input --> af
  sug --> jam
  sug --> imp
  ui --> features
```

O princípio é que **as áreas compartilham o núcleo**: a mesma teoria alimenta a base, o braço e os
quizzes. Uma música importada (próxima fase) vai servir ao mesmo tempo de base de improviso, de filtro
do quiz de acordes e de cifra rolando no tempo.

## Stack

| | |
|---|---|
| Interface | React 19, TypeScript (strict), Vite |
| Áudio | Tone.js (Transport, Sampler, efeitos) |
| Teoria musical | tonal |
| Detecção de nota | pitchy (McLeod) + Web Audio `AnalyserNode` |
| Estado | Zustand (com persistência local) |
| Testes | Vitest (673 testes) + GitHub Actions; ponta a ponta com microfone falso no navegador (Jam, placar e Escalas) |
| Dados | Tudo local no navegador; sem backend |
| Deploy | Vercel (publica a cada push em `main`) |

## Rodar localmente

```bash
npm install
npm run dev        # desenvolvimento
npm test           # testes
npm run build      # versão final (depois: npm run preview)
npm run e2e        # com o preview rodando: Jam livre num navegador headless com microfone simulado
npm run e2e:placar # placar por nota do Improviso (idem)
npm run e2e:escalas # Escalas conferidas, modo "espera por você" (MODE=metronomo para o metrônomo)
```

> No PowerShell do Windows, se o `npm` acusar "execução de scripts desabilitada", use `npm.cmd`
> ou rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Roadmap

- [x] Motor de áudio com 5 estilos (inclui bossa nova), levadas de violão, mixer e humanização
- [x] Improviso: braço com foco por desenho, próxima troca, alvos sugeridos, restrições, progressão digitada
- [x] Acordes: banco, consulta com todas as formas, quiz com 7 tipos de pergunta e níveis, repetição espaçada
- [x] **Escalas**: desenhos 1–5, exercícios no metrônomo, quiz "onde está a nota" e treinos salvos
- [x] **Entrada de áudio** (interface USB ou microfone): afinador, detecção de nota e de acorde
- [x] **Jam livre** (primeira versão): acorde e tom detectados, próximos acordes e notas-alvo em tempo real
- [x] **Músicas** (v0.2): colar uma cifra e virar base de treino, grade editável, cifra rolando
- [x] **Treino do dia + progresso**: roteiro diário do plano de 12 meses, timer, lições de teoria e histórico
- [x] Jam livre pelo contexto, aprendendo com as músicas do repertório
- [x] **Compor**: progressões pelo efeito em Pop/Rock, Blues ou Bossa/Jazz, edição livre, desenho de cada acorde e levada por seção
- [x] O app confere o que você toca: placar de notas-alvo, quiz de acordes e de notas pelo áudio
- [x] Tons menores, modos, arpejos e acordes 6, 9, 7(#9), m7(b5) e º7

O planejamento detalhado e as decisões de projeto estão em [`CLAUDE.md`](CLAUDE.md), e o plano
das próximas versões em [`docs/plano.md`](docs/plano.md).

## Créditos

Samples gratuitos com licença Creative Commons, detalhados em
[`public/samples/LICENSES.md`](public/samples/LICENSES.md):
Salamander Grand Piano (Alexander Holm, CC BY 3.0), FluidR3_GM (Frank Wen, CC BY 3.0) e
MuldjordKit (Lars Muldjord, CC BY 4.0).

## Licença

Código sob a licença [MIT](LICENSE). Os samples seguem as próprias licenças (ver Créditos) e a fonte Fraunces está sob a [OFL](public/fonts/OFL.txt).
