# Treinador de Improviso

Web app para guitarristas praticarem improviso, acordes e escalas sobre bases que soam como banda
(bateria, baixo, piano e violão com samples reais), com o braço mostrando as notas-alvo de cada acorde.

## Rodar

```
npm install
npm run dev
```

No PowerShell do Windows, se `npm` der erro de "execução de scripts desabilitada", use `npm.cmd run dev`
ou rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Versão final (mais leve): `npm run build` e depois `npm run preview`.

## Áreas

- **Improviso**: progressões prontas ou digitadas, 4 estilos (shuffle, rock reto, slow blues 12/8, balada),
  mixer, braço com escala, notas do acorde, próxima troca, desenhos 1–5 e restrições.
- **Acordes**: banco de formas, decodificador de cifras e quizzes com repetição espaçada.

Planejamento completo e estado atual em [`CLAUDE.md`](CLAUDE.md).

## Créditos dos samples

Ver [`public/samples/LICENSES.md`](public/samples/LICENSES.md) (Salamander Grand Piano, FluidR3_GM, MuldjordKit).
