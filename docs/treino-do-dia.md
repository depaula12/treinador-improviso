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

## Feito (continuação, 5 nov 2026)
- `core/progresso.ts` (+ teste): minutos do dia (timer ou o planejado ao marcar), sequência
  (30 min ou metade do plano valem o dia; hoje em aberto não quebra), últimos 28 dias, séries de
  bpm/dentro/alvo, ouvido por modo, diário.
- `features/hoje/store.ts` (`hoje-v1`), `timer.ts` (um timer por vez, persiste, bipe + vibração,
  wake lock; minutos entram no bloco ao pausar/terminar), `open.ts` ("Abrir" aplica `tec`/`imp`/`ear`),
  `HojePage.tsx` (abas Hoje · Plano · Progresso, navegar entre dias), `TrainBanner.tsx`.
- `ui/nav.ts`: área num store (`go` de qualquer lugar). Área padrão = `hoje`.
- Registro automático: volta de Escalas com 90%+ → `logBpm`; placar do Improviso → `dentro`
  (20+ notas) e `alvo` (4+ compassos).
- Ouvido: `features/ouvido` + `engine.playEar`. Abre no conjunto do plano do dia, a menos que
  o usuário tenha escolhido outro no mesmo dia (`pickedOn`). Teclas 1–9 respondem, Enter = próxima.
- Menu em grupos; celular com Hoje, Improviso, Escalas, Músicas e "Mais" (folha).
- Improviso: à vista progressão, tom, estilo, andamento; "Mais ajustes" com escala, virada, casa
  máxima, checks, restrição e compassos. Escalas: à vista escala, tom, exercício, desenhos;
  ritmo, mostrar, checks e treinos salvos recolhidos.

- Painéis minimizáveis (`ui/Panel.tsx`) nas configurações de cada página; ver CLAUDE.md.

## Falta
- Aprovação do usuário (prints em `docs/screenshots/hoje-*.png`, `ouvido.png`,
  `improviso-treino.png`, `mobile-hoje.png`) e merge na main.
- Depois: sincronizar PC/celular (Supabase, login Google; local primeiro).
