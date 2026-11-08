# Arquitetura do ColdTrack Control (React)

Contrato para quem porta uma tela de `legado/` para React. Leia inteiro antes de começar.
Referências prontas: **`src/pages/Login/Login.jsx`** (tela pública) e **`src/pages/Alertas/Alertas.jsx`** (tela logada com polling).

Stack: React 18 + Vite 5 + React Router 6, JavaScript (sem TypeScript). Node 20+.

```bash
npm install
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
legado/                    código antigo, SÓ LEITURA, apagado no fim da migração
docs/                      documentação (não vai para o site)
src/
  main.jsx                 BrowserRouter > AuthProvider > App; registra o sw.js no build
  App.jsx                  TODAS as rotas (já prontas, não mexer)
  rotas.js                 ROTAS_LEGADAS (nome.html -> rota) e PAGINAS_PAINEL (menu)
  lib/                     lógica sem React (porte de comum.js / config.js)
  hooks/                   useSessao, usePolling, useVeiculoEscolhido, useTitulo
  components/              PainelLayout, RequireAuth, Estado, StatusSelo, FiltroPeriodo,
                           SeletorVeiculo, GraficoTemperatura, EmConstrucao, ChatWidget/
  pages/<Nome>/<Nome>.jsx  uma pasta por tela
  styles/base.css          reset mínimo global
  styles/<familia>/*.css   CSS antigo, escopado por .escopo-<familia>
  assets/images/           imagens WebP (slide-1..3, coldtrack-infografico)
```

## 2. Como portar uma tela

1. Abra o placeholder `src/pages/<Nome>/<Nome>.jsx` e **substitua o arquivo inteiro**.
   A rota já existe em `App.jsx` (carregada com `lazy`). Não edite `App.jsx`, `rotas.js` nem
   `vite.config.js`: várias pessoas portam em paralelo e esses arquivos são compartilhados.
2. Fonte: `legado/<pagina>.html` (marcação) + `legado/js/<pagina>.js` (comportamento).
   O que vinha de `comum.js` já está em `src/lib` e `src/components`.
3. Importe o CSS da família no topo do arquivo e envolva a tela na raiz do escopo:
   `<div className="escopo-<familia> raiz-pagina">…</div>` (telas do painel usam `PainelLayout`,
   que já faz isso). Arquivos novos de CSS da tela vão na pasta da família.
4. Rode `npm run lint`, `npm test`, `npm run build` e abra a tela no `npm run dev`
   lado a lado com a antiga (`cd legado && python -m http.server 5600`).

| Rota | Arquivo | Origem em `legado/` | Família | Login |
|---|---|---|---|---|
| `/` | `pages/Home/Home.jsx` | `index.html`, `js/home.js` | home (+ chat) | não |
| `/login` | `pages/Login/Login.jsx` | **pronta** | login | não |
| `/cadastro` | `pages/Cadastro/Cadastro.jsx` | `cadastro.html`, `js/cadastro.js` | painel | não |
| `/dashboard` | `pages/Dashboard/Dashboard.jsx` | `dashboard.html`, `js/app.js`, `js/risco.js` | painel | sim |
| `/alertas` | `pages/Alertas/Alertas.jsx` | **pronta** | painel | sim |
| `/relatorios` | `pages/Relatorios/Relatorios.jsx` | `relatorios.html`, `js/relatorios.js` | painel | sim |
| `/veiculos` | `pages/Veiculos/Veiculos.jsx` | `veiculos.html`, `js/veiculos.js`, `js/vendor/qrcode.js` | painel | sim |
| `/sensores` | `pages/Sensores/Sensores.jsx` | `sensores.html`, `js/sensores.js`, `js/serial.js` | painel | sim |
| `/viagens` | `pages/Viagens/Viagens.jsx` | `viagens.html`, `js/viagens.js` | painel | sim |
| `/configuracoes` | `pages/Configuracoes/Configuracoes.jsx` | `configuracoes.html`, `js/configuracoes.js` | painel | sim |
| `/usuarios` | `pages/Usuarios/Usuarios.jsx` | `usuarios.html`, `js/usuarios.js` | usuarios | não (demo) |
| `/auditoria` | `pages/Auditoria/Auditoria.jsx` | `auditoria.html`, `js/auditoria.js` | auditoria | não (demo) |
| `/cadastro-usuario` | `pages/CadastroUsuario/CadastroUsuario.jsx` | `cadastro-usuario.html`, `js/cadastro-usuario.js` | cadastro-usuario | não (demo) |
| `/logistica` | `pages/Logistica/Logistica.jsx` | `logistica.html`, `js/logistica.js` | logistica | não (demo) |
| `/monitoramento` | `pages/Monitoramento/Monitoramento.jsx` | `monitoramento.html`, `js/monitoramento.js` | monitoramento | não (demo) |
| (widget da `/`) | `components/ChatWidget/ChatWidget.jsx` | `js/chat.js` (marcação no fim de `index.html`) | chat | não |

`legado/coldtrack-auditoria/` é uma cópia antiga de `auditoria.html` (o CSS é uma versão anterior):
porte a partir de `legado/auditoria.html`. `legado/css/dashboard.css` não é usado por nenhuma página.

## 3. CSS: famílias e escopo

O CSS antigo de cada arquivo redefine `:root`, `*`, `body` e classes com o mesmo nome
(`.sidebar`, `.card`, `.topbar`, `.brand`, `.main`). O PostCSS (em `vite.config.js`) prefixa
**todo** arquivo em `src/styles/<familia>/` com `.escopo-<familia>`:

| Antes | Depois |
|---|---|
| `.card { }` | `.escopo-painel .card { }` |
| `:root { --navy }`, `html { }`, `body { }` | `.escopo-painel { }` (a própria raiz) |
| `body.pagina-login .x` | `.escopo-painel.pagina-login .x` |
| `* { box-sizing }` | `.escopo-painel, .escopo-painel * { }` |
| `@media` | continua, com as regras de dentro prefixadas |
| `@keyframes` | intacto (nome global; hoje só existe `pulse`, em home) |

| Família | Classe raiz | Arquivos | Import |
|---|---|---|---|
| painel | `escopo-painel` | `style.css`, `telas.css` (via `index.css`) | `styles/painel/index.css` (já feito no `PainelLayout`) |
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

**`armazenamento.js`** — `ler`, `gravar`, `remover`, `lerJSON(chave, padrao)`, `gravarJSON` (com try/catch).
Único lugar que toca `localStorage`. Chaves em uso: `coldtrack.sessao`, `coldtrack.veiculo`
(as do chat continuam as mesmas do `chat.js`).

## 5. Hooks

- **`useSessao()`** → `{ usuario, entrar(token, usuario), sair() }`. `entrar` grava a sessão e
  atualiza a tela (login, cadastro de empresa, troca de senha em Configurações). `sair` limpa e vai
  para `/login`.
- **`usePolling(fn, ms, deps)`** → `recarregar()`. Roda `fn(sinal)` agora e a cada `ms`; quando
  `deps` muda, cancela e recomeça na hora. Depois de cada `await`: `if (sinal.aborted) return;`.
  Chame `recarregar()` depois de salvar um formulário (o antigo `carregarX()` direto).
- **`useVeiculoEscolhido()`** → `{ escolher, chave, trocarVeiculo }`. `escolher()` chama
  `escolherVeiculo` com o `?veiculo=` da rota atual; ponha `chave` nas `deps` do polling.
- **`useTitulo(texto)`** — `document.title`. Use o `<title>` exato da página antiga.

## 6. Componentes

- **`<PainelLayout titulo subtitulo tituloDocumento? conexao extraTopo dialogos>`** — menu
  (NavLink com `active` + `aria-current="page"`), usuário, `#botaoSair`, topo com `<h1>`/`<p>`,
  `extraTopo` antes do indicador, `#fonteDados`, rodapé. `conexao`: `null` "Conectando...",
  `true` "Azure conectado", `false` "Sem conexão com Azure" (ponto vermelho). `tituloDocumento`
  padrão `"<titulo> · ColdTrack Control"` (Dashboard: passe `"ColdTrack Control"`).
  Os filhos entram no `<main>` entre o topo e o rodapé: normalmente `<div id="conteudo" className="page-grid">`.
- **`<RequireAuth perfil?>`** — já envolve as rotas logadas em `App.jsx`. Para bloquear só para
  gestor dentro de uma tela, use `ehGestor(usuario)` e esconda o trecho (como o original).
- **`<Estado titulo? painel?>texto</Estado>`**, **`<Carregando />`** ("Carregando leituras…"),
  **`<ErroAzure />`** (antigo `ERRO_AZURE`), **`<SemVeiculo />`** (antigo `SEM_VEICULO`).
- **`<StatusSelo status />`** — antigo `seloStatus()`.
- **`<FiltroPeriodo horas aoMudar />`** — "Últimas 24 h" / "Últimos 7 dias", `aria-pressed`.
  Vai dentro de `<div className="acoes">` como no original.
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
4. **API do ColdTrack só via `lib/api.js`** (`api`, `postPublico`, `getPublico`). Serviço de
   terceiro (Open-Meteo em `risco.js`, ThingSpeak em `monitoramento.js`) pode usar `fetch` direto,
   isolado num arquivo `.js` da própria tela ou em `src/lib/`.
5. **Polling só com `usePolling`** (nada de `setInterval` solto: vaza ao trocar de tela).
6. **Perfil**: `ehGestor(usuario)` com o `usuario` de `useSessao()`; rotas logadas já estão em `RequireAuth`.
7. **Erros na tela com `Estado`/`ErroAzure`**, `console.error` com a mesma mensagem do original.
   `alert`/`confirm` do original podem ficar (mesmo comportamento).
8. **Mantenha os ids** que os testes e2e (`coldtrack-qa/tests`) e o CSS usam, e **os textos
   visíveis idênticos** (rótulos, mensagens, títulos, `aria-label`).
9. **Links internos com `<Link to="/rota">`**, nunca `href="pagina.html"`. Navegação por código:
   `useNavigate()`; `location.replace(x)` antigo vira `navigate(x, { replace: true })`.
   URL absoluta para QR/etiqueta: `${window.location.origin}/dashboard.html?veiculo=${encodeURIComponent(id)}`
   (mantém o formato das etiquetas já impressas).
10. **Espaços em JSX**: quebra de linha entre dois elementos inline some no JSX
    (`<span>❄</span>\n<span>Texto</span>` vira "❄Texto"). Onde o HTML antigo dependia desse
    espaço, use `{" "}`. Compare com a tela antiga.
11. Formulário: `onSubmit` com `evento.preventDefault()`; `noValidate` onde o original tinha
    `novalidate`; `Object.fromEntries(new FormData(evento.currentTarget))` funciona igual.
12. Não altere `src/lib`, `src/components` ou `src/hooks` compartilhados sem combinar: se faltar
    algo, crie local na pasta da tela e avise para subir para o compartilhado depois.

## 8. Checklist por tela

- [ ] Arquivo `src/pages/<Nome>/<Nome>.jsx` substituído (sem `EmConstrucao`).
- [ ] CSS da família importado; raiz com `escopo-<familia> raiz-pagina` (ou `PainelLayout`).
- [ ] `useTitulo` (ou `tituloDocumento`) com o `<title>` antigo.
- [ ] Mesmos ids, classes, textos, `aria-*` e ordem dos elementos da página antiga.
- [ ] Chamadas à API iguais (caminho, método, corpo) via `lib/api.js`; mesmas mensagens de erro.
- [ ] Polling com `usePolling` e `sinal.aborted` checado depois de cada `await`.
- [ ] Trechos de gestor com `ehGestor(usuario)`.
- [ ] Links com `<Link>`; nenhum `*.html` em `href`.
- [ ] Nenhum `innerHTML`, `localStorage` direto, global ou `setInterval` solto.
- [ ] `npm run lint`, `npm test` e `npm run build` passam.
- [ ] Conferida lado a lado com a antiga (desktop e 390 px), sem erro no console.

## 9. Deploy e URLs antigas

- `npm run build` gera `dist/`; o plugin `coldtrack-paginas-legadas` copia `dist/index.html` para
  `dist/<nome>.html` de cada entrada de `ROTAS_LEGADAS`. Assim `/dashboard.html?veiculo=X`
  (etiquetas QR impressas) responde 200 no Azure Storage e o React Router redireciona para
  `/dashboard?veiculo=X`. Rota limpa (`/dashboard`) chega pelo documento 404 (= `index.html`).
- O site publicado é o conteúdo de `dist/` no container `$web` (`publicar.sh` e o workflow
  `publicar-site.yml`).
- `public/sw.js`: suba `CACHE_NAME` (`coldtrack-v12` → `v13`...) quando mudar o service worker.
  Ele só é registrado no build (`import.meta.env.PROD`).
