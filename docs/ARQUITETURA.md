# Arquitetura do ColdTrack Control (React)

Contrato técnico do painel: estrutura, CSS, módulos compartilhados e regras de código.
Leia antes de criar ou alterar uma tela. O passo a passo de trabalho (branches, commits,
verificações) está em [`CONTRIBUTING.md`](../CONTRIBUTING.md). Visão geral do projeto e links: [`README.md`](../README.md).
A API, o firmware e a infraestrutura estão no repositório
[projeto-integrador-4-periodo](https://github.com/mbalbuquerque/projeto-integrador-4-periodo);
as rotas da API estão documentadas no [Swagger](https://func-coldtrack-7319.azurewebsites.net/api/docs).
Telas de referência: **`src/pages/Login/Login.jsx`** (pública) e **`src/pages/Alertas/Alertas.jsx`** (logada, com polling).

Stack: React 18 + Vite 5 + React Router 6, JavaScript (sem TypeScript). Node 20+.

```bash
npm ci
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (com as cópias dashboard.html, login.html...)
npm run preview    # serve dist/
npm test           # Vitest (src/**/*.test.js)
npm run lint       # ESLint, zero avisos
npm run test:e2e   # Playwright em coldtrack-qa/tests (rode o build antes)
```

## 1. Estrutura

```text
index.html                 casca única (fonte Inter, manifest, ícones)
vite.config.js             React + escopo de CSS + cópias das páginas .html antigas
public/                    vai para dist/ como está: sw.js, manifest.json, assets/icons/
scripts/enviar-site.sh     envio de dist/ para o Azure (CI e publicar.sh)
coldtrack-qa/tests/        testes e2e (Playwright) e apoio.js (API simulada, sessão de teste)
docs/                      documentação (não vai para o site)
src/
  main.jsx                 BrowserRouter > AuthProvider > App; registra o sw.js no build
  App.jsx                  todas as rotas (cada tela com React.lazy)
  rotas.js                 ROTAS_LEGADAS (nome.html -> rota) e PAGINAS_PAINEL (menu)
  lib/                     lógica sem React (API, sessão, leituras, faixas, formatação)
  hooks/                   useSessao, usePolling, useVeiculoEscolhido, useTitulo,
                           useMovimentoReduzido, useAlertasPush, useTelaAcesa
  components/              PainelLayout, FaixaOffline, RequireAuth, Estado, StatusSelo, FiltroPeriodo,
                           SeletorVeiculo, GraficoTemperatura, ChatWidget/, AssistentePainel/
  pages/<Nome>/<Nome>.jsx  uma pasta por tela (regras puras em .js e testes ao lado)
  styles/base.css          reset mínimo global
  styles/<familia>/*.css   CSS de cada família de telas, escopado por .escopo-<familia>
  assets/images/           imagens WebP (slide-1..3, coldtrack-infografico)
```

## 2. Telas

Cada tela é `src/pages/<Nome>/<Nome>.jsx`, registrada em `App.jsx` com `lazy`. As telas logadas
ficam dentro de `<Route element={<RequireAuth />}>`. Para criar uma tela nova, siga
[`CONTRIBUTING.md`](../CONTRIBUTING.md#adicionar-uma-tela).

| Rota | Arquivo | Família | Login |
|---|---|---|---|
| `/` | `pages/Home/Home.jsx` | home (+ chat) | não |
| `/login` | `pages/Login/Login.jsx` | login | não |
| `/cadastro` | `pages/Cadastro/Cadastro.jsx` | painel | não |
| `/dashboard` | `pages/Dashboard/Dashboard.jsx` | painel | sim |
| `/alertas` | `pages/Alertas/Alertas.jsx` | painel | sim |
| `/relatorios` | `pages/Relatorios/Relatorios.jsx` | painel | sim |
| `/veiculos` | `pages/Veiculos/Veiculos.jsx` | painel | sim |
| `/sensores` | `pages/Sensores/Sensores.jsx` | painel | sim |
| `/viagens` | `pages/Viagens/Viagens.jsx` | painel | sim |
| `/configuracoes` | `pages/Configuracoes/Configuracoes.jsx` | painel | sim |
| `/motorista` | `pages/Motorista/Motorista.jsx` | motorista | sim (só perfil motorista) |
| `/usuarios` | `pages/Usuarios/Usuarios.jsx` | usuarios | não (demo) |
| `/auditoria` | `pages/Auditoria/Auditoria.jsx` | auditoria | não (demo) |
| `/cadastro-usuario` | `pages/CadastroUsuario/CadastroUsuario.jsx` | cadastro-usuario | não (demo) |
| `/logistica` | `pages/Logistica/Logistica.jsx` | logistica | não (demo) |
| `/monitoramento` | `pages/Monitoramento/Monitoramento.jsx` | monitoramento | não (demo) |
| (widget da `/`) | `components/ChatWidget/ChatWidget.jsx` | chat | não |
| (botão de toda tela logada) | `components/AssistentePainel/AssistentePainel.jsx` (montado no `PainelLayout`) | painel | sim |

As telas "não (demo)" usam dados de exemplo no próprio componente, sem API, como no site anterior.

## 3. CSS: famílias e escopo

O CSS de cada família veio do site anterior (HTML + JS) e redefine `:root`, `*`, `body` e classes com o mesmo nome
(`.sidebar`, `.card`, `.topbar`, `.brand`, `.main`). O PostCSS (em `vite.config.js`) prefixa
**todo** arquivo em `src/styles/<familia>/` com `.escopo-<familia>`:

| Antes | Depois |
|---|---|
| `.card { }` | `.escopo-painel .card { }` |
| `:root { --navy }`, `html { }`, `body { }` | `.escopo-painel { }` (a própria raiz) |
| `body.pagina-login .x` | `.escopo-painel.pagina-login .x` |
| `* { box-sizing }` | `.escopo-painel, .escopo-painel * { }` |
| `@media` | continua, com as regras de dentro prefixadas |
| `@keyframes` | intacto (nome global; hoje existem `pulse`, em home, e `assistente-entra`, em painel) |
| `@media (prefers-reduced-motion: reduce)` | continua; a home desliga a transição do slider e o `pulse` |

| Família | Classe raiz | Arquivos | Import |
|---|---|---|---|
| painel | `escopo-painel` | `style.css`, `telas.css`, `assistente.css` (via `index.css`) | `styles/painel/index.css` (já feito no `PainelLayout`) |
| home | `escopo-home` | `home.css` | `styles/home/home.css` |
| login | `escopo-login` | `login.css` | `styles/login/login.css` |
| cadastro-usuario | `escopo-cadastro-usuario` | `cadastro.css` | `styles/cadastro-usuario/cadastro.css` |
| usuarios | `escopo-usuarios` | `usuarios.css` | `styles/usuarios/usuarios.css` |
| auditoria | `escopo-auditoria` | `auditoria.css` | `styles/auditoria/auditoria.css` |
| logistica | `escopo-logistica` | `logistica.css` | `styles/logistica/logistica.css` |
| monitoramento | `escopo-monitoramento` | `monitoramento.css` | `styles/monitoramento/monitoramento.css` |
| chat | `escopo-chat` | `chat.css` | `styles/chat/chat.css` (raiz do widget, sem `raiz-pagina`) |

Regras:

- A raiz do escopo **substitui o `<body>` antigo**: recebe fundo, fonte, cor e (no painel) o
  `display: flex` que o body tinha. Use `className="escopo-<familia> raiz-pagina"`
  (`.raiz-pagina` dá `min-height: 100vh`).
- Tudo que a tela mostra tem que estar **dentro** da raiz, inclusive `<dialog>`: as variáveis
  (`--navy`, `--red`...) só existem ali. Não use portal para fora do escopo.
- Seletor antigo que dependia do `<body>` ou do HTML fixo pode ser ajustado no CSS da família
  (registre no commit). Já ajustado: `.pagina-login { flex: 1 }` em `painel/index.css`.
- `/cadastro` usa a família painel: `<div className="escopo-painel raiz-pagina"><div className="pagina-login"><main className="login">…`.
- Impressão da etiqueta (Veículos): a regra é `.escopo-painel:has(.etiqueta[open]) > *:not(.etiqueta)`,
  então a `<dialog className="etiqueta">` precisa ser filha direta da raiz: passe-a na prop
  `dialogos` do `PainelLayout`.
- `html { scroll-behavior: smooth }` da home virou regra da raiz (sem efeito). Se a rolagem suave
  das âncoras importar, trate na Home (ex.: `scrollIntoView({ behavior: "smooth" })`).
- Imagens: `import slide1 from "../../assets/images/slide-1.webp"` (o Vite gera a URL com hash).
  `slide-1/2/3.webp` eram `assets/images/1/2/3.png`; `coldtrack-infografico.webp` é do chat.

## 4. `src/lib` (sem React)

Importe sempre com extensão: `import { api } from "../../lib/api.js"`.

**`conectividade.js`** — `registrarRecepcao()` (chamada por `api()` a cada resposta), `useOnline()` e
`useUltimaRecepcao()` (`navigator.onLine` + eventos `online`/`offline`), `esquecerRecepcao()` (no logout).

**`config.js`** — `API_URL` (de `VITE_API_URL`, padrão a Function do Azure), `HISTORY_SIZE = 60`, `UPDATE_INTERVAL = 20000`.

**`api.js`**
- `api(caminho, { metodo = "GET", corpo } = {}) -> Promise<dados>` — com token. 204 → `{}`.
  Erro HTTP lança `Error` com `message = dados.erros.join(" · ")` (ou `"HTTP 500"`) e `.status`.
  401 limpa a sessão, manda para `/login` e lança `Error("Sessão encerrada.")`.
  ```js
  const { veiculos } = await api("/veiculos");
  await api(`/viagens/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: { fim: true } });
  ```
- `postPublico(caminho, corpo) -> Promise<{ ok, status, dados }>` — sem token, **não** lança em
  erro HTTP (401 = senha errada), só em falha de rede. Use em `/login` e `/empresas`.
- `getPublico(caminho) -> Promise<json>` — GET sem token (usado por `carregarPerfis`).

**`chat.js`** — chat com Azure OpenAI da página inicial (rota pública, sem token).
- `perguntarChat(pergunta, historico = [], { signal, tempoLimite = 15000 }) -> Promise<{ resposta, fontes }>`
  — `POST /chat` com `{ pergunta, historico? }` (pergunta até 500 caracteres; só as últimas 6
  mensagens `{ papel: "usuario" | "assistente", texto }`, texto até 1000). Erro HTTP lança
  `Error` com a mensagem de `dados.erros` e `.status` (400, 429, 503...); passou do tempo limite,
  lança com `.tempoEsgotado = true`; falha de rede é repassada. Quem decide o plano B é o
  `ChatWidget` (`components/ChatWidget/conversa.js`): 429 mostra o aviso da API; qualquer outra
  falha responde pelo FAQ local (`respostas.js`). As perguntas rápidas não chamam a rota.

**`assistente.js`** — assistente do painel com Azure OpenAI (rota autenticada).
- `perguntarAssistente(pergunta, historico = [], { signal, tempoLimite = 20000 }) -> Promise<{ resposta, fontes }>`
  — `POST /assistente` pela `api()` (leva o token; 401 limpa a sessão e vai para `/login`, como
  em qualquer tela). Mesmos limites do `/chat`: pergunta até 500, histórico até 6 mensagens de
  até 1000. Erro HTTP lança com `.status`; tempo esgotado lança com `.tempoEsgotado = true`;
  resposta vazia lança. `api()` aceita `signal` só para isso.
- `mensagemDeErro(erro) -> string` — 400/429: a mensagem da API; 401: "Sua sessão terminou...";
  o resto (503, tempo, rede): `MENSAGEM_INDISPONIVEL` ("O assistente está indisponível agora.
  Tente de novo em instantes."). Sem plano B local: as perguntas dependem dos dados da empresa.

**`sessao.js`** — `lerSessao()` (null se vencida), `salvarSessao(token, usuario)`, `limparSessao()`,
`usuarioAtual()`, `ehGestor(usuario = usuarioAtual())`, `expiracaoDoToken(token)`, `CHAVE_SESSAO`.
Em componente prefira `useSessao()`.

**`leituras.js`** — `buscarLeituras({ deviceId, limite = 50, horas, status })` (mais recente
primeiro), `horarioDe(leitura) -> Date`, `resumir(leituras) -> { total, media, minima, maxima, atencao, critico } | null`,
`agruparOcorrencias(leituras) -> [{ inicio, fim, pico, status, leituras, duracao }]` (mais recente primeiro).

**`faixas.js`** — `FAIXA_PADRAO`, `carregarPerfis()` (cache em memória), `faixaDoPerfil(perfil)`,
`descreverNormal(faixa)` ("até 15 °C"), `descreverCritico(faixa)` ("acima de 20 °C").

**`formatar.js`** — `STATUS_INFO`, `infoStatus(status) -> { texto, classe }`, `formatarTemp`,
`formatarUmidade`, `formatarDataHora(date)` ("08/11, 14:05:09"), `formatarHora(date)` ("14:05"),
`formatarDuracao(ms)`.

**`veiculo.js`** — `escolherVeiculo(search) -> { veiculos, veiculo, perfil, faixa }` (ordem:
`?veiculo=` > salvo > primeiro; `veiculo` null sem cadastro), `decidirVeiculo(...)`, `lembrarVeiculo(id)`.

**`push.js`** — alertas no celular (Web Push, padrão VAPID; issue #27 e a API em
`projeto-integrador-4-periodo#75`). `suportaPush()`, `base64UrlParaBytes(chave)`,
`estadoPush() -> "sem-suporte" | "negado" | "inativo" | "ativo"`, `ativarPush()` (pede a
permissão, lê a chave pública em `GET /push/chave`, inscreve no `pushManager` do service worker com
`userVisibleOnly: true` e manda `inscricao.toJSON()` para `POST /push/inscricao`; se a API recusar,
cancela a inscrição local e repassa o erro) e `desativarPush()` (`DELETE /push/inscricao` com o
`endpoint`, melhor esforço, e cancela no navegador). No dev não há service worker: ativar avisa em
vez de travar. O hook `useAlertasPush` guarda o estado (`verificando`, ocupado, erro) e é usado
pelo card `AlertasCelular` da tela de Configurações (operador e gestor) e pelo bloco
`AlertasPushMotorista` da tela do motorista. A API manda ao motorista só os alertas do veículo
vinculado a ele, com `url` `/motorista` (`projeto-integrador-4-periodo#88`).

**`armazenamento.js`** — `ler`, `gravar`, `remover`, `lerJSON(chave, padrao)`, `gravarJSON` (com try/catch).
Único lugar que toca `localStorage`. Chaves em uso: `coldtrack.sessao`, `coldtrack.veiculo`
(as do chat continuam as mesmas do `chat.js`).

## 5. Hooks

- **`useSessao()`** → `{ usuario, entrar(token, usuario), sair() }`. `entrar` grava a sessão e
  atualiza a tela (login, cadastro de empresa, troca de senha em Configurações). `sair` chama `sairNoServidor()`
  (`lib/api.js`, `POST /sair` com o Bearer, limite de 5 s, erro ignorado), limpa a sessão e vai para
  `/login`.
- **`usePolling(fn, ms, deps)`** → `recarregar()`. Roda `fn(sinal)` agora e a cada `ms`; quando
  `deps` muda, cancela e recomeça na hora. Depois de cada `await`: `if (sinal.aborted) return;`.
  Chame `recarregar()` depois de salvar um formulário (o antigo `carregarX()` direto).
- **`useVeiculoEscolhido()`** → `{ escolher, chave, trocarVeiculo }`. `escolher()` chama
  `escolherVeiculo` com o `?veiculo=` da rota atual; ponha `chave` nas `deps` do polling.
- **`useTitulo(texto)`** — `document.title`.
- **`useMovimentoReduzido()`** → `true` quando o sistema pede menos movimento
  (`prefers-reduced-motion: reduce`); acompanha a troca com a página aberta. A home usa para
  parar a troca automática do slider. `movimentoReduzido()` é a leitura avulsa, fora de componente.

## 6. Componentes

- **`<FaixaOffline />`** — dentro do `<PainelLayout>`, portanto em toda tela logada. Sem internet
  mostra, fixa no topo (`position: sticky`), "Sem conexão — exibindo os últimos dados recebidos às
  HH:MM" (ou "nenhum dado foi recebido nesta sessão") e some ao voltar a conexão. Com a faixa, o
  indicador do topo passa a "Sem internet". Offline e API são coisas diferentes: a API fora do ar
  com internet continua no "Sem conexão com Azure".
- **`<PainelLayout titulo subtitulo tituloDocumento? conexao extraTopo dialogos>`** — menu
  (NavLink com `active` + `aria-current="page"`), usuário, `#botaoSair`, topo com `<h1>`/`<p>`,
  `extraTopo` antes do indicador, `#fonteDados`, rodapé. `conexao`: `null` "Conectando...",
  `true` "Azure conectado", `false` "Sem conexão com Azure" (ponto vermelho). `tituloDocumento`
  padrão `"<titulo> · ColdTrack Control"` (Dashboard: passe `"ColdTrack Control"`).
  Os filhos entram no `<main>` entre o topo e o rodapé: normalmente `<div id="conteudo" className="page-grid">`.
  Monta também o `<AssistentePainel />` (a tela não faz nada para tê-lo).
- **`<AssistentePainel />`** — botão flutuante `#assistenteBotao` ("Assistente") e conversa
  (`role="dialog"` não modal, "Assistente do painel"): saudação pelo primeiro nome, 4 sugestões
  (`SUGESTOES` em `conversa.js`) antes da primeira pergunta, lista `role="log"` `aria-live="polite"`,
  "Assistente digitando…", campo `#assistenteCampo` + "Enviar" (desligados enquanto espera),
  resposta em texto puro (`white-space: pre-wrap`) com "Fontes: ...". Escape e × fecham e o foco
  volta ao botão. A conversa vive em `conversa.js` (módulo, fora do React): sobrevive à troca de
  tela, pertence ao token da sessão e é apagada ao sair ou com 401. CSS em
  `styles/painel/assistente.css`: folha na largura toda até 720 px, `.main` ganha folga embaixo
  para o botão não cobrir o rodapé, `@media print` esconde tudo (etiqueta QR limpa), entrada de
  180 ms desligada com `prefers-reduced-motion`.
- **`<RequireAuth perfil?>`** — já envolve as rotas logadas em `App.jsx`. Para bloquear só para
  gestor dentro de uma tela, use `ehGestor(usuario)` e esconda o trecho. O perfil motorista é
  mandado para `/motorista` em qualquer rota do painel; `perfil="motorista"` (só na rota
  `/motorista`) manda operador e gestor para `/dashboard`. Depois do login, `rotaInicial(usuario)`
  (`lib/sessao.js`) escolhe o destino.
- **`<Estado titulo? painel?>texto</Estado>`**, **`<Carregando />`** ("Carregando leituras…"),
  **`<ErroAzure />`** (antigo `ERRO_AZURE`), **`<SemVeiculo />`** (antigo `SEM_VEICULO`).
- **`<StatusSelo status />`** — antigo `seloStatus()`.
- **`<FiltroPeriodo horas aoMudar />`** — "Últimas 24 h" / "Últimos 7 dias", `aria-pressed`.
  Vai dentro de `<div className="acoes">`.
- **`<SeletorVeiculo veiculos veiculo aoTrocar />`** — `#seletorVeiculo`, some com menos de 2 veículos.
- **`<GraficoTemperatura leituras faixa id? className? />`** — porte de `desenharGrafico`
  (mesmas classes, tooltip, redesenho por `ResizeObserver`). O `id` é o do container antigo
  (`graficoTemperatura`, `graficoRelatorio`, `graficoViagem${i}`).

Esqueleto de tela logada (ver `Alertas.jsx` completo):

```jsx
export default function Relatorios() {
  const [conexao, setConexao] = useState(null);
  const [tela, setTela] = useState({ tipo: "carregando" });
  const { escolher, chave, trocarVeiculo } = useVeiculoEscolhido();

  usePolling(async sinal => {
    try {
      const escolha = await escolher();
      if (sinal.aborted) return;
      // ...buscar, depois setConexao(true) e setTela({ tipo: "ok", ... })
    } catch (erro) {
      if (sinal.aborted) return;
      console.error("Erro ao carregar relatórios:", erro);
      setConexao(false);
      setTela({ tipo: "erro" });
    }
  }, UPDATE_INTERVAL, [chave]);

  return (
    <PainelLayout titulo="Relatórios" subtitulo="Resumo da temperatura por período" conexao={conexao}>
      <div id="conteudo" className="page-grid">
        {tela.tipo === "carregando" && <Carregando />}
        {tela.tipo === "erro" && <ErroAzure />}
      </div>
    </PainelLayout>
  );
}
```

## 7. Regras

1. **Sem `innerHTML`** nem `dangerouslySetInnerHTML` (o lint barra). Monte JSX; o React já
   escapa texto, então `texto()` não existe mais.
2. **Sem globais** e sem `document.getElementById` para montar tela. Estado com `useState`,
   referência a input com `useRef`.
3. **`localStorage` só via `lib/armazenamento.js`** (ou `lib/sessao.js` / `lib/veiculo.js`).
4. **API do ColdTrack só via `lib/api.js`** (`api`, `postPublico`, `getPublico`); a rota `/chat`,
   que precisa de tempo limite e cancelamento, fica em `lib/chat.js`; a `/assistente` fica em
   `lib/assistente.js`, por cima da `api()`. Serviço de
   terceiro (Open-Meteo em `risco.js`, ThingSpeak em `monitoramento.js`) pode usar `fetch` direto,
   isolado num arquivo `.js` da própria tela ou em `src/lib/`.
5. **Polling só com `usePolling`** (nada de `setInterval` solto: vaza ao trocar de tela).
6. **Perfil**: `ehGestor(usuario)` com o `usuario` de `useSessao()`; rotas logadas já estão em `RequireAuth`.
7. **Erros na tela com `Estado`/`ErroAzure`** e `console.error("Erro ao carregar <tela>:", erro)`.
   `alert`/`confirm` são aceitos nas confirmações de remoção.
8. **Ids, textos e `aria-*`** usados pelos testes e2e (`coldtrack-qa/tests`) e pelo CSS só mudam
   junto com os testes.
9. **Links internos com `<Link to="/rota">`**, nunca `href="pagina.html"`. Navegação por código:
   `useNavigate()`; `location.replace(x)` antigo vira `navigate(x, { replace: true })`.
   URL absoluta para QR/etiqueta: `${window.location.origin}/dashboard.html?veiculo=${encodeURIComponent(id)}`
   (mantém o formato das etiquetas já impressas).
10. **Espaços em JSX**: quebra de linha entre dois elementos inline some no JSX
    (`<span>❄</span>\n<span>Texto</span>` vira "❄Texto"). Onde o espaço importa, use `{" "}`.
11. Formulário: `onSubmit` com `evento.preventDefault()`; `noValidate` quando a validação é
    feita no código; `Object.fromEntries(new FormData(evento.currentTarget))` funciona igual.
12. Função usada por uma tela só fica na pasta da tela; usada por duas ou mais, sobe para
    `src/lib` (sem React), `src/hooks` ou `src/components`, com teste.

## 8. Checklist por tela

- [ ] Rota em `App.jsx` com `lazy`; tela logada dentro de `RequireAuth`; menu em `rotas.js` se for do painel.
- [ ] CSS da família importado; raiz com `escopo-<familia> raiz-pagina` (ou `PainelLayout`).
- [ ] `useTitulo` (ou `tituloDocumento`).
- [ ] API via `lib/api.js`; polling com `usePolling` e `sinal.aborted` checado depois de cada `await`.
- [ ] Trechos de gestor com `ehGestor(usuario)`.
- [ ] Links com `<Link>`; nenhum `*.html` em `href`.
- [ ] Nenhum `innerHTML`, `localStorage` direto, global ou `setInterval` solto.
- [ ] Regras puras com teste unitário; tela coberta em `coldtrack-qa/tests` (logada: `painel.spec.js`).
- [ ] `npm run lint`, `npm test`, `npm run build` e `npm run test:e2e` passam.
- [ ] Conferida em desktop e em 390 px: sem rolagem horizontal e sem erro no console.

## 9. Deploy e URLs antigas

- `npm run build` gera `dist/`; o plugin `coldtrack-paginas-legadas` copia `dist/index.html` para
  `dist/<nome>.html` de cada entrada de `ROTAS_LEGADAS`. Assim `/dashboard.html?veiculo=X`
  (etiquetas QR impressas) responde 200 no Azure Storage e o React Router redireciona para
  `/dashboard?veiculo=X`. Rota limpa (`/dashboard`) chega pelo documento 404 (= `index.html`).
- O site publicado é o conteúdo de `dist/` no container `$web` da conta `stcoldtrackweb7319`
  (grupo `rg-coldtrack`). O workflow `publicar-site.yml` (push na `main`) e o `publicar.sh`
  (máquina local) rodam lint, testes e build e chamam `scripts/enviar-site.sh dist`, que:
  - envia `dist/assets/*` (nomes com hash) com `Cache-Control: public, max-age=31536000, immutable`;
  - envia o resto (`index.html`, cópias `*.html`, `sw.js`, `manifest.json`, `assets/icons/`) com
    `Cache-Control: no-cache`, depois dos arquivos com hash;
  - apaga do `$web` todo blob que não está em `dist/` (lista remota menos lista local);
  - confirma `index.html` como documento inicial e de erro (404) do site estático.
- Etiqueta QR do veículo: `${window.location.origin}/dashboard.html?veiculo=<id>` (formato das
  etiquetas já impressas; a cópia `dashboard.html` responde 200 e redireciona).
- Offline (issue #13): o `sw.js` guarda na instalação o shell (`index.html`, `manifest.json`), os
  JS/CSS com hash citados no `index.html` e os pedaços de tela citados no JS de entrada, e renova
  tudo a cada visita (rede primeiro). Resultado: depois da primeira visita o app abre sem internet.
  **Respostas da API nunca entram no cache** (o host `*.azurewebsites.net` passa direto): leitura,
  token e dados de empresa não ficam em disco para outra sessão ler. Sem rede, a tela continua com
  o que já estava carregada, sob a faixa que informa a hora desses dados; recarregar a página
  offline abre o shell, mas as telas ficam sem dados (erro do Azure) até a conexão voltar.
- Alertas no celular (Web Push): o `sw.js` trata `push` (lê o JSON `{ titulo, corpo, url, tag,
  status, deviceId }`; corpo inválido vira notificação genérica) e mostra a notificação com o ícone
  do app, `tag` por sensor (o alerta novo substitui o anterior) e `requireInteraction` no crítico.
  `notificationclick` foca a janela do painel já aberta e navega para a `url`, ou abre uma nova.
  Só caminho relativo da própria origem é aceito; URL externa vira `/alertas`.
- Teste real dos alertas (depois de publicar a API com as chaves VAPID e o site): no celular
  (Android com Chrome, ou iPhone com iOS 16.4+ e o app adicionado à tela de início), entrar no
  painel, **Configurações → Ativar alertas no celular** e permitir. Depois provocar uma mudança de
  faixa num sensor da mesma empresa: na simulação do Wokwi, subir a temperatura do DHT22 acima da
  faixa normal do perfil do veículo; ou enviar `POST /api/telemetria` com a chave de um sensor de
  teste e uma temperatura fora da faixa, logo depois de uma leitura normal. A notificação chega uma
  vez por mudança de faixa; tocar nela abre `/alertas?veiculo=<código>`. Motorista: entrar com a
  conta de motorista, tocar em **Ativar alertas no celular** na tela `/motorista`, fechar o
  navegador e provocar a mudança de faixa no sensor do veículo dele (chega, e o toque abre
  `/motorista`) e no sensor de outro veículo (não chega).
- `public/sw.js`: suba `CACHE_NAME` (`coldtrack-v14` → `v15`...) quando mudar o service worker.
  Ele só é registrado no build (`import.meta.env.PROD`).
