# Treino do dia: plano de 12 meses dentro do solonely (branch `treino-do-dia`)

Pedido do usuário (5 nov 2026): trazer para o app o "Caderno solonely" (artifact no Claude com o
plano de 12 meses, roteiro diário de 4 h, treino de ouvido e progresso) e reorganizar a tela,
que está poluída. Banco de dados para sincronizar PC/celular fica para depois da reorganização
aprovada (Supabase, plano grátis, login Google; salvar local primeiro e sincronizar).

Regra do projeto: mudança visual grande em branch, mostrar prints e só juntar na main com aprovação.

## Feito nesta branch
- `core/plano.ts`: 4 fases, 24 sprints (9 nov 2026 → 10 out 2027), metas, `sprintOf`,
  `blocksFor(date)` (dia útil = 8 blocos, 240 min, grupos A/B; domingo leve; semana zero de
  diagnóstico até 8 nov). Blocos de técnica e improviso trazem `tec: TecCfg` / `imp: ImpCfg`
  para aplicar nas áreas; os outros trazem `area`.
- `core/ear.ts`: perguntas de ouvido (intervalos, qualidade de acorde, graus com cadência,
  acordes do campo) como lista de notas com hora; `toggleItem`.
- Testes: `core/plano.test.ts` (datas, ids válidos de escala/progressão/estilo/restrição,
  roteiro) e `core/ear.test.ts`.

## Falta (desenho combinado)
1. `features/hoje/store.ts` (zustand persist `hoje-v1`): `days[dateKey]` = blocos {done, min},
   bpm, dentro, alvo, rating, travou, rec, ear{modo: {c,t}}; `exits[sprint][i]`;
   `active` (bloco aberto numa área); `timer` {date, blockId, total, endAt|null, left}.
2. `features/hoje/HojePage.tsx`: cabeçalho (sprint, fase, dia, min feitos / plano, sequência),
   três alvos do sprint, blocos com check, timer (um por vez, bipe no fim, wake lock) e
   "Abrir": aplica `tec` em `useEscalas.set` ou `imp` em `useImproviso.set`, marca `active` e
   chama `go(area)`. Registro do fim do dia (nota 1–5, gravei, o que travou).
   Abas internas: Hoje · Plano (metas, fases, sprints com teste de saída marcável) · Progresso
   (minutos 28 dias, bpm, ouvido, % dentro, diário).
3. `features/hoje/TrainBanner.tsx`: faixa no topo da área quando `active.area === area`:
   título do bloco, a instrução curta, timer, "Concluir" e "Voltar para Hoje".
4. Registro automático: em `Exercises.finishLoop`, volta com 90%+ grava o maior bpm do dia;
   no Improviso, `tally`/`score` gravam `dentro` (com 20+ notas) e `alvo` (com 4+ compassos).
5. `features/ouvido/OuvidoPage.tsx` + `engine.playEar(events, mix)` (igual a `playShapes`,
   usando o `exSampler`): presets do sprint em chips, modo/conjunto à mão, placar da sessão e
   do dia gravado em `days[hoje].ear`.
6. Navegação: áreas novas `hoje` (padrão) e `ouvido`; menu lateral em grupos
   (Hoje · Praticar: Improviso, Escalas, Acordes, Ouvido · Repertório: Músicas, Compor ·
   Ferramentas: Jam livre, Afinador). No celular, barra com Hoje, Improviso, Escalas, Músicas
   e "Mais" (folha com o resto).
7. Menos poluição: no Improviso, deixar à vista progressão, tom, estilo e andamento; escala,
   virada, braço até a casa, checks, restrição e compassos num "Mais ajustes" recolhido.
   Em Escalas, à vista escala, tom, exercício e desenhos; ritmo, mostrar, checks e treinos
   salvos recolhidos. CSS novo com prefixo `hj-` (classes `.timer`, `.feedback`, `.cfg`,
   `.empty` já existem).
8. CLAUDE.md: atualizar o contexto do usuário (4 h/dia, plano de 24 sprints, metas de
   guitarra, piano e ouvido; o foco antigo era blues/rock da banda com prazo jan/2027).
