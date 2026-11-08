# Como contribuir

Guia de trabalho do Front-End do ColdTrack Control. O contrato técnico (estrutura, CSS,
`src/lib`, hooks, componentes, regras) está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Branches

| Branch | Papel |
|---|---|
| `everson` | branch de trabalho; cada push publica o site no Azure (`publicar-site.yml`) |
| `main` | versão consolidada; recebe a `everson` por pull request quando uma etapa fica pronta |

Fluxo:

1. Atualize a `everson` antes de começar: `git switch everson && git pull`.
2. Mudança grande ou em paralelo com outra pessoa: crie uma branch a partir da `everson`
   (`git switch -c <nome>/<assunto>`) e abra um pull request para a `everson`.
3. Quando a etapa estiver pronta, abra o pull request `everson` -> `main`. O workflow `testes.yml`
   roda em todo pull request e precisa estar verde para o merge. Depois do merge, traga a `main`
   de volta para a `everson` (`git switch everson && git merge main`).
4. **Nunca apague a `everson`** (nem use "apagar branch após o merge"): o deploy do site e o login
   do GitHub Actions no Azure (OIDC) só aceitam essa branch.

Lembre que push na `everson` publica o site: só envie o que passou nas verificações abaixo.
A API e o firmware estão no repositório
[projeto-integrador-4-periodo](https://github.com/mbalbuquerque/projeto-integrador-4-periodo), com fluxo igual.

## Commits

Mensagens em português, no formato [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

```text
<tipo>(<escopo opcional>): <descrição no presente, minúscula, sem ponto final>
```

| Tipo | Quando |
|---|---|
| `feat` | funcionalidade nova visível para o usuário |
| `fix` | correção de defeito |
| `refactor` | mudança de código sem mudar comportamento |
| `style` | CSS e aparência (não formatação de código) |
| `test` | testes unitários ou e2e |
| `docs` | documentação |
| `build` / `ci` | Vite, dependências, workflows |
| `chore` | manutenção (arquivos de configuração, limpeza) |

Exemplos: `feat(viagens): filtro por veículo`, `fix(chat): botão "Sensores" encontra a resposta`.

Um commit por mudança lógica. Não misture refatoração com funcionalidade nova no mesmo commit.

## Antes de enviar (push ou pull request)

```bash
npm ci                 # se o package-lock.json mudou
npm run lint           # zero avisos
npm test               # unitários
npm run build
npm run test:e2e       # Playwright contra o build
```

São os mesmos passos do CI. Na primeira vez, instale o navegador: `npx playwright install chromium`.

## Adicionar uma tela

1. **Rota.** Crie `src/pages/<Nome>/<Nome>.jsx` e registre a rota em `src/App.jsx` com
   `lazy(() => import("./pages/<Nome>/<Nome>.jsx"))`. Tela logada vai dentro do
   `<Route element={<RequireAuth />}>`. Se a tela aparece no menu do painel, acrescente-a em
   `PAGINAS_PAINEL` (`src/rotas.js`).
2. **Layout e CSS.** Tela do painel usa `<PainelLayout titulo subtitulo conexao>`, que já
   importa a família `painel`. Tela fora do painel: importe o CSS da família
   (`src/styles/<familia>/*.css`) e use a raiz `<div className="escopo-<familia> raiz-pagina">`.
   Família nova = pasta nova em `src/styles/`; o escopo é aplicado sozinho pelo `vite.config.js`.
3. **Dados.** API só por `src/lib/api.js` (`api`, `postPublico`, `getPublico`); atualização
   periódica só com `usePolling` (verifique `sinal.aborted` depois de cada `await`);
   `localStorage` só por `src/lib/armazenamento.js`; perfil com `ehGestor(usuario)`.
4. **Regras puras** (cálculo, formatação, montagem de dados) em um `.js` na pasta da tela, com
   teste `*.test.js` ao lado. Se outra tela precisar da mesma função, mova para `src/lib/`.
5. **Links** com `<Link to="/rota">`; nunca `href="pagina.html"`. Navegação por código com
   `useNavigate()`.
6. **Título** da aba com `useTitulo("...")` ou a prop `tituloDocumento` do `PainelLayout`.
7. **Testes e2e.** Acrescente a tela em `coldtrack-qa/tests` (tela logada: inclua-a na lista
   `TELAS` de `painel.spec.js`). Use `entrarComo` e `simularApi` de `tests/apoio.js`;
   nenhum teste pode acessar a API real.
8. Confira a tela no `npm run dev` em largura de desktop e em 390 px: sem rolagem horizontal
   e sem erro no console.

## Regras que o lint e a revisão cobram

- Sem `innerHTML` nem `dangerouslySetInnerHTML` (o ESLint bloqueia).
- Sem variáveis globais, sem `document.getElementById` para montar tela, sem `setInterval` solto.
- Ids, textos e `aria-*` usados pelos testes e2e não mudam sem atualizar os testes.
- Mudança no `public/sw.js`: suba o `CACHE_NAME` (`coldtrack-v12` -> `coldtrack-v13`).
- Segredos (chaves, tokens) nunca entram no repositório; configuração local vai em `.env.local`.
