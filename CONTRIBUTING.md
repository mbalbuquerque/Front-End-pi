# Como contribuir

Guia de trabalho do Front-End do ColdTrack Control. O contrato técnico (estrutura, CSS,
`src/lib`, hooks, componentes, regras) está em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## Branches

| Branch | Papel |
|---|---|
| `main` | branch oficial; cada push publica o site no Azure (`publicar-site.yml`) |
| `everson` | antiga branch de publicação, mantida como reserva; não publica mais depois de receber a `main` |

Fluxo:

1. Atualize a `main` antes de começar: `git switch main && git pull`.
2. Crie uma branch a partir da `main` (`git switch -c <tipo>/<assunto>`) e abra um pull request
   para a `main`. O workflow `testes.yml` roda em todo pull request e precisa estar verde para o
   merge.
3. **Não apague a `everson`**: o login do GitHub Actions no Azure (OIDC) ainda aceita essa branch,
   e ela é o caminho de volta se a publicação pela `main` falhar. Até a `main` ser trazida para a
   `everson`, a cópia antiga do workflow que está nela ainda publica a cada push.

Lembre que o merge na `main` publica o site: só envie o que passou nas verificações abaixo.

### Proteção da `main`

A `main` deve exigir pull request e o `testes.yml` verde antes do merge. Só um administrador do
repositório consegue ligar isso (para quem tem só permissão de escrita a API responde 404).
Comando, rodado por um administrador:

```bash
gh api -X PUT repos/mbalbuquerque/Front-End-pi/branches/main/protection --input - <<'EOF'
{"required_status_checks":{"strict":true,"contexts":["Lint, testes, build e e2e"]},
 "enforce_admins":false,
 "required_pull_request_reviews":{"required_approving_review_count":0},
 "restrictions":null}
EOF
```

Estado em 23/11/2026: ainda sem proteção, porque a conta de quem desenvolve tem só permissão de escrita; o dono precisa rodar o comando.

O nome em `contexts` é o do job do `testes.yml`; se ele for renomeado, a lista precisa acompanhar.
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
   `<Route element={<RequireAuth />}>`. Se a tela aparece no menu do painel, acrescente-a no grupo
   certo de `GRUPOS_PAINEL` (`src/rotas.js`), com um ícone de `components/Icone.jsx`.
2. **Layout e CSS.** Tela interna usa `<PainelLayout titulo subtitulo conexao>`, que já
   importa o shell e a família `painel`; tela interna com CSS próprio passa `familia="<familia>"`.
   Tela fora do painel (landing, login): importe o CSS da família
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
