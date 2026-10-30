# Plano: itens de prioridade ALTA

Ordem pensada pelo que mais ajuda a tocar o repertório da banda. Cada versão termina com o app
rodando, testes verdes, commit em português e `git push` (a Vercel publica sozinha).

Feito antes do plano: **consulta de acordes gerando todas as formas tocáveis** de qualquer cifra
(`core/chord-shapes.ts`), inclusive m7b5, dim, 9, 13, 6 e baixo invertido (D/F#).

## v0.2 Músicas (1ª prioridade) — feita
Entregue: itens 1–5 abaixo. Decisões: arrastar para reordenar ficou de fora (repetir/apagar
compasso e seção resolvem); o tom é o "Tom:" da cifra ou estimado, ajustável por transposição.
v0.2.1: durações reais por "marcar tempos com a gravação" (bater no tempo e nas trocas);
opcional, sem marcar continua 1 compasso por acorde.
Falta validar com as cifras reais do repertório (o Cifra Club bloqueia acesso automático:
o usuário cola).

Objetivo: treinar improviso e acordes nas músicas da banda.

1. **Colar a cifra.** Fica em `core/cifra.ts`, com testes: separa as linhas de acordes das de letra
   e reconhece seções ([Intro], [Refrão]...). Linha de acorde = maioria dos tokens é cifra válida.
2. **Grade de compassos.** Assume um acorde por compasso. Clicar divide (2+2) ou junta; arrastar
   reordena. A seção pode ser repetida.
3. **Dados da música:** tom (estimado com `core/key.ts`, editável), transpor, BPM e estilo.
   Salva com Dexie (IndexedDB), primeira tabela `musicas`.
4. **Integração.** "Treinar esta música" abre o Improviso com a grade da música e o quiz de
   Acordes com o filtro "só acordes desta música".
5. **Cifra rolando.** A grade anda no tempo, com metrônomo ou base, para treinar as trocas.
   Destaca o compasso atual e o próximo.

Riscos: o formato de cifra colada varia (tabs, acordes com parênteses). Mitigação: tela de
revisão antes de salvar, onde dá para corrigir o que veio errado.

## Feito fora da ordem (pedido do usuário, a partir do relatório de melhorias)
- Layout novo (menu lateral, player fixo, braço de ponta a ponta) e nome solonely.
- Tons menores e progressões menores no Improviso.
- Jam livre pelo contexto dos últimos 6 acordes, aprendendo com o repertório.
- Área Compor (progressões pelo efeito, com teoria e prévia).
- v0.4 e v0.5 (quiz pelo áudio e placar de notas-alvo) adiantadas.
- Escalas novas (modos, arpejos, escala por acorde) e acordes 6, 9, 7(#9), m7(b5), º7.
- Branch `melhorias-2`: fonte Fraunces; quiz de acordes com centenas de perguntas (graus no
  desenho, nota do grau, o que muda, níveis 1–4, tríades, ouvir a resposta); Compor com edição livre
  (duração ½/1/2, mover, digitar, transpor), desenho de cada acorde + "aproximar os desenhos",
  linguagens Pop/Rock | Blues | Bossa/Jazz, "colorir", levada do violão por seção e estilo Bossa nova.

Ainda do relatório, para depois: pergunta e resposta, licks por estilo, treino de ouvido, loop de
trecho e "mais devagar e acelerando" nas Músicas, exportar/importar as músicas entre aparelhos
(junto com a v0.3). Fora do escopo por ora: compasso 3/4 (o motor só toca 4/4); a música salva
a partir do Compor não guarda o desenho escolhido nem a levada por seção (o modelo Song não tem).

## v0.3 Treino do dia + Progresso (próxima, quando o usuário pedir)
1. Migrar `acordes-v1`, `escalas-v1` e `entrada-v1` do localStorage para Dexie, sem perder dados.
2. Registrar sessões (área, minutos, acertos, BPM máximo alcançado).
3. **Treino do dia:** monta a sessão de 2 h a partir dos blocos do guia (aquecimento, escalas,
   acordes da música X, improviso), puxando o que você mais erra. Um cronômetro passa de bloco
   em bloco.
4. Tela de Progresso: tempo por área por semana, taxa de acerto e BPM ao longo do tempo.

## v0.4 Quiz conferido pelo áudio
Reaproveita `audio/input.ts` + `core/chroma.ts` + `core/pitch.ts` (já validados com o Cube Baby).
1. Quiz cronometrado de acordes: o app ouve, confere a qualidade e a fundamental, mede o tempo e
   marca acerto sozinho. Usa a autoavaliação como reserva, quando não há entrada de áudio.
2. Quiz "onde está a nota" das Escalas: tocar a nota em vez de clicar.
3. Teste ponta a ponta com áudio sintético, no mesmo esquema do `npm run e2e`.

## v0.5 Placar de notas-alvo
1. No Improviso, com a base tocando e a entrada ligada, registra a nota tocada em cada tempo 1.
2. Conta acerto quando ela é 3ª ou 7ª do acorde (ou o alvo sugerido). Mostra o placar no fim da
   volta e o guarda no Progresso.
3. Compensação de latência: entrada + saída medidas uma vez por um teste de "palma" (bater no
   tempo).

## Depois das ALTA
Itens MÉDIA do guia: speed trainer, pergunta e resposta, Jam aprendendo com as músicas,
revisão visual (Tailwind/Radix).
