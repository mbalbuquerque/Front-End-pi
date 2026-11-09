# ColdTrack Control

Painel web do **ColdTrack Edge**, projeto integrador de monitoramento IoT da cadeia fria.
Sensores ESP32-C3 instalados no baú dos veículos enviam temperatura, umidade e sinal Wi-Fi para
uma API no Azure; o painel (React + Vite) mostra a situação de cada carga, os alertas fora da
faixa do perfil da mercadoria, relatórios, viagens e o risco de calor previsto na rota.

Este é o repositório do **painel (front-end)**. A API, o firmware, a infraestrutura e a análise
climática ficam no repositório do back-end:
[mbalbuquerque/projeto-integrador-4-periodo](https://github.com/mbalbuquerque/projeto-integrador-4-periodo).

| | endereço |
|---|---|
| Painel publicado | <https://stcoldtrackweb7319.z15.web.core.windows.net> |
| API (base) | `https://func-coldtrack-7319.azurewebsites.net/api`; exemplo público: <https://func-coldtrack-7319.azurewebsites.net/api/perfis> |
| Repositório do painel (este) | <https://github.com/mbalbuquerque/Front-End-pi> |
| Repositório do back-end e do firmware | <https://github.com/mbalbuquerque/projeto-integrador-4-periodo> |
| Simulação do firmware no Wokwi | <https://wokwi.com/projects/475352296477619201> |

## 1. Sobre o projeto

O ColdTrack Control foi desenvolvido no contexto do Projeto Integrador para acompanhar as
condições ambientais no transporte e armazenamento de mercadorias refrigeradas. A solução
integra Internet das Coisas, desenvolvimento web, comunicação HTTP, monitoramento ambiental
e gestão logística.

Objetivos:

- monitorar temperatura e umidade relativa do ar de cada veículo;
- classificar cada leitura conforme a faixa do perfil da carga (Normal, Atenção, Crítico);
- apresentar a conectividade Wi-Fi (RSSI) e a situação de cada sensor;
- registrar viagens e mostrar a condição da carga em cada trajeto;
- gerar relatórios por período, com exportação CSV;
- separar o que o gestor e o operador logístico podem fazer;
- oferecer atendimento automatizado aos visitantes, com encaminhamento ao desenvolvedor;
- manter a interface responsiva e testada automaticamente.

### Arquitetura

```text
ESP32-C3 + DHT11/DHT22 (no baú)
        |  Wi-Fi, HTTPS + JSON, chave por dispositivo
        v
API ColdTrack (Azure Functions, Python)  <--> Azure OpenAI (gpt-4.1-mini, RAG)
        |  grava e consulta                      chat público e assistente do painel
        v
Azure Cosmos DB (empresas, usuários, veículos, sensores, viagens, leituras)
        ^
        |  JSON, token JWT de sessão (8 h)
        |
ColdTrack Control (este repositório): React + Vite, site estático no Azure Storage
```

Perfis de usuário: **gestor** (consulta e cadastra) e **operador** (consulta). A API é a única
fonte dos dados do painel; a especificação das rotas está em
[`docs/api.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/api.md)
do back-end.

A tela **Monitoramento** é uma demonstração separada que lê o canal público do ThingSpeak
(`3515173`: field1 temperatura, field2 umidade, field3 RSSI); o ThingSpeak não faz parte do
caminho dos dados do painel. O **Dashboard** usa a previsão da Open-Meteo para estimar o calor
na rota Petrolina a Suape.

### Faixas de temperatura

As faixas não são fixas no Front-End: cada veículo tem um **perfil de carga** cadastrado na API
(`GET /perfis`, com `min`, `max` e `margem`; manga, uva e demonstrativo). A leitura é Normal
dentro da faixa, Atenção até `margem` graus fora dela e Crítico além disso. Os valores vêm da
API; só enquanto os perfis não carregam (ou para veículo sem perfil) o painel usa o perfil
demonstrativo de reserva (Normal até 15 °C, Atenção até 20 °C).

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 18, React Router 6, JavaScript (sem TypeScript) |
| Build | Vite 5, PostCSS (`postcss-prefix-selector` para escopo do CSS por família) |
| Testes | Vitest + jsdom (unitários), Playwright (e2e, Chromium desktop e Pixel 7) |
| Qualidade | ESLint 9 (`--max-warnings 0`) |
| PWA | `public/manifest.json`, `public/sw.js` (rede primeiro, registrado só no build) |
| Hospedagem | Azure Storage, site estático (container `$web`), publicação por GitHub Actions com OIDC |
| Hardware | ESP32-C3, sensor DHT11 ou DHT22 (firmware no repositório do back-end) |
| Serviços externos | API ColdTrack (Azure Functions; chat e assistente do painel com Azure OpenAI), ThingSpeak, Open-Meteo |

## 3. Estrutura

```text
index.html                 casca única (fonte Inter, manifest, ícones)
vite.config.js             React, escopo de CSS, cópias das páginas .html antigas
playwright.config.js       e2e contra o build (vite preview na porta 5500)
eslint.config.js
public/                    copiado para dist/ como está: sw.js, manifest.json, assets/icons/
src/
  main.jsx                 BrowserRouter > AuthProvider > App; registra o sw.js no build
  App.jsx                  rotas (cada tela carregada sob demanda com React.lazy)
  rotas.js                 ROTAS_LEGADAS (nome.html -> rota) e menu do painel
  lib/                     API, sessão, leituras, faixas, formatação, veículo (sem React)
  hooks/                   useSessao, usePolling, useVeiculoEscolhido, useTitulo, useMovimentoReduzido
  components/              PainelLayout, RequireAuth, GraficoTemperatura, ChatWidget/, AssistentePainel/...
  pages/<Nome>/            uma pasta por tela (componente, regras puras e testes)
  styles/<familia>/        CSS de cada família de telas, escopado por .escopo-<familia>
  assets/images/           imagens WebP (slider da página inicial, infográfico do chat)
coldtrack-qa/              testes e2e (Playwright) e a documentação deles
scripts/enviar-site.sh     envio de dist/ para o Azure (usado pelo CI e pelo publicar.sh)
publicar.sh                publicação manual pela máquina local
docs/ARQUITETURA.md        contrato técnico: estrutura, CSS, lib, hooks, regras
docs/guia-de-uso.md        guia do usuário final, tela por tela (base do assistente do painel)
```

## 4. Como rodar

Requisitos: Node.js 20 ou superior, npm e Git.

```bash
git clone https://github.com/mbalbuquerque/Front-End-pi.git
cd Front-End-pi
npm ci
npm run dev                # http://localhost:5173
```

A API usada por padrão é a publicada (`https://func-coldtrack-7319.azurewebsites.net/api`).
Para apontar para outra (por exemplo, a Function rodando localmente), copie `.env.example`
para `.env.local` e ajuste:

```bash
cp .env.example .env.local
# VITE_API_URL=http://localhost:7071/api
```

`.env.local` não vai para o Git. A variável é lida no build: depois de mudar, reinicie o
`npm run dev` ou gere o build de novo.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento do Vite (porta 5173) |
| `npm run build` | build de produção em `dist/` (inclui as cópias `*.html` das URLs antigas) |
| `npm run preview` | serve `dist/` localmente |
| `npm test` | testes unitários (Vitest, `src/**/*.test.js`) |
| `npm run test:watch` | Vitest em modo observação |
| `npm run lint` | ESLint, falha com qualquer aviso |
| `npm run test:e2e` | testes Playwright contra o build (rode `npm run build` antes) |
| `npm run test:e2e:report` | abre o último relatório do Playwright |
| `npm run test:e2e:real` | suíte real (site publicado + API de produção), opt-in, fora do CI; veja `coldtrack-qa/real/README.md` |
| `npm run test:e2e:real:limpar` | apaga pela API registros `QA-*` que a suíte real tenha deixado |

## 5. Testes

- **Unitários (Vitest):** regras sem tela em `src/lib` e em `src/pages/*/` (leituras,
  faixas, sessão, API, formatação, CSV, sensores, viagens, etiqueta, chat, plano B do chat e assistente do painel).
- **E2E (Playwright):** `coldtrack-qa/tests`, em Desktop Chrome e Mobile Chrome. Cobrem as
  telas públicas e demonstrativas, o chat (com a rota `/chat` simulada), o assistente do painel (rota `/assistente` simulada), os redirecionamentos das URLs antigas e as telas
  logadas como gestor e como operador. A API e os serviços de terceiros são simulados: nenhum
  teste acessa o Azure. Detalhes em [`coldtrack-qa/README.md`](coldtrack-qa/README.md).

```bash
npx playwright install chromium   # primeira vez
npm run build
npm run test:e2e
```

O workflow `.github/workflows/testes.yml` roda lint, unitários, build e e2e a cada push e pull
request; quando algum e2e falha, o relatório fica anexado à execução.

## 6. Deploy

Fluxo de branches: o trabalho acontece na **`everson`**; quando uma etapa fica pronta, abre-se
um pull request `everson` -> `main`. **A `everson` não pode ser apagada** (nem após o merge):
o deploy e o login por OIDC no Azure dependem dela.

Cada push na branch **`everson`** dispara `.github/workflows/publicar-site.yml`:

1. `npm ci`, `npm run lint`, `npm test`, `npm run build` (para se algum falhar);
2. login no Azure por OIDC (`azure/login`, sem senha guardada no repositório);
3. `bash scripts/enviar-site.sh dist`, que:
   - envia `assets/` com hash no nome com `Cache-Control: public, max-age=31536000, immutable`;
   - envia `index.html`, as cópias `*.html`, `sw.js`, `manifest.json` e os ícones com
     `Cache-Control: no-cache`;
   - remove do container `$web` todo arquivo que não está em `dist/` (restos do site antigo
     e de builds anteriores);
   - confirma `index.html` como documento inicial e de erro do site estático.

Para publicar pela máquina local (Azure CLI logado na assinatura do projeto), com os mesmos
passos sobre o que está commitado:

```bash
bash publicar.sh
```

## 7. Rotas

| Rota | Tela | Acesso |
|---|---|---|
| `/` | página inicial, com o assistente virtual | público |
| `/login` | login | público |
| `/cadastro` | cadastro de empresa (cria o primeiro gestor) | público |
| `/dashboard` | visão geral do veículo: leitura atual, histórico, calor na rota | logado |
| `/alertas` | leituras fora da faixa, agrupadas em ocorrências | logado |
| `/relatorios` | resumo por período e exportação CSV | logado |
| `/veiculos` | frota, situação de cada carga, etiqueta QR; cadastro só para gestor | logado |
| `/sensores` | situação dos sensores; conexão pelo cabo USB e registro manual só para gestor | logado |
| `/viagens` | viagens e condição da carga em cada trajeto | logado |
| `/configuracoes` | conta, troca de senha, faixas, sensores; usuários só para gestor | logado |
| `/usuarios`, `/auditoria`, `/cadastro-usuario`, `/logistica` | telas demonstrativas (dados de exemplo) | público |
| `/monitoramento` | leitura do canal público do ThingSpeak | público |

Rota logada sem sessão vai para `/login`. Rota desconhecida volta para `/`.

**URLs antigas.** O build gera uma cópia de `index.html` para cada página do site antigo
(`dashboard.html`, `login.html`, `alertas.html` e as demais de `src/rotas.js`). Assim o Azure
responde 200 e o React Router redireciona, mantendo a query string:

| URL antiga | Vai para |
|---|---|
| `/index.html` | `/` |
| `/login.html` | `/login` |
| `/dashboard.html?veiculo=VAN-01` | `/dashboard?veiculo=VAN-01` |
| `/<pagina>.html` | `/<pagina>` |

**Etiqueta QR do veículo.** A etiqueta impressa em Veículos aponta para
`<origem do site>/dashboard.html?veiculo=<id>`. O formato antigo foi mantido de propósito, para
que as etiquetas já coladas nos veículos continuem abrindo o Dashboard do veículo certo.

## 8. Assistente virtual

A página inicial tem um assistente com botão flutuante, perguntas rápidas e campo livre.

- **Campo livre:** chat com Azure OpenAI pela rota pública `POST /chat` da API
  (`src/lib/chat.js`). A resposta aparece como texto, com a linha "Fontes:" dos documentos do
  projeto usados; as últimas 6 mensagens da conversa vão como histórico. Pergunta fora do
  assunto é recusada com a indicação do WhatsApp.
- **Plano B:** se a rota falhar (sem rede, 503, outro erro ou 15 s sem resposta), a pergunta é
  respondida pela base local de palavras-chave (`src/components/ChatWidget/respostas.js`), e o
  chat nunca fica sem resposta. Muitas perguntas seguidas (429) mostram o aviso da API.
- **Perguntas rápidas:** respondem na hora pela base local, sem chamar a rota.

Quando a resposta não resolve, o visitante pode falar com o desenvolvedor pelo WhatsApp
(mensagem pré-preenchida com a última pergunta) e avaliar o atendimento de 1 a 5 estrelas, com
comentário opcional.

As avaliações ficam só no navegador (`localStorage`, chave `coldtrack_chat_avaliacoes_v1`), no
formato abaixo; ainda não há envio para um servidor.

```json
{ "nota": 5, "resolvida": true, "comentario": "Atendimento excelente!", "data": "2026-11-04T17:00:00.000Z" }
```

### Assistente do painel (telas logadas)

Todas as telas logadas têm o botão flutuante **Assistente** (canto inferior direito), montado uma
vez no `PainelLayout`. Ele responde dúvidas de uso do painel e perguntas sobre os dados da empresa
de quem está logado (veículos, sensores, últimas leituras, alertas das últimas 24 h, viagens).

- **Rota:** `POST /assistente` da API, com o token (`Authorization: Bearer`), pela mesma `api()`
  das outras telas: 401 limpa a sessão e volta ao login. Corpo
  `{ pergunta (1 a 500), historico?: [{ papel: "usuario" | "assistente", texto }] (até 6) }`;
  resposta `{ resposta, fontes, origem: "ia" }`. Cliente em `src/lib/assistente.js` (20 s de
  tempo limite).
- **Tela:** saudação pelo primeiro nome, 4 sugestões, resposta em texto puro (quebras de linha
  mantidas) com a linha "Fontes:", "Assistente digitando…" enquanto espera. Escape ou × fecha e
  o foco volta ao botão. No celular a conversa ocupa a largura toda; na impressão (inclusive a
  etiqueta QR) o assistente não aparece.
- **Erros:** 400 e 429 mostram a mensagem da API; 503, tempo esgotado e falha de rede mostram
  "O assistente está indisponível agora. Tente de novo em instantes." Não há plano B local: as
  perguntas dependem dos dados da empresa.
- **Conversa:** só em memória (`src/components/AssistentePainel/conversa.js`). Sobrevive à troca
  de tela, some ao sair ou quando a sessão vence. As últimas 6 mensagens respondidas vão como
  histórico. Nada vai para o `localStorage`.
- **Base de conhecimento:** [`docs/guia-de-uso.md`](docs/guia-de-uso.md), o guia do usuário tela
  por tela.

## 9. Segurança e limitações

Análise completa de segurança (ameaças, API, banco, tokens): no repositório do back-end,
[`docs/seguranca.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/seguranca.md).
O que o Front-End faz:

- **CSP por `<meta>`:** o site estático não envia cabeçalhos, então o build injeta no `index.html`
  uma `Content-Security-Policy` (`script-src 'self'`, `object-src 'none'`, `connect-src` só com a
  API, a Open-Meteo e o ThingSpeak) e `referrer: strict-origin-when-cross-origin`. É feito por um
  plugin do Vite (`vite.config.js`) só no build; o `npm run dev` não recebe a política, porque o
  HMR usa script inline e websocket. O e2e `csp.spec.js` percorre todas as rotas do build e falha
  se houver qualquer violação.
- **Sem `innerHTML`:** mensagens do chat, do assistente do painel e dados da API são renderizados
  como texto pelo React; o lint bloqueia `innerHTML` e `dangerouslySetInnerHTML`.
- **Token no `localStorage` (`coldtrack.sessao`) com validade de 8 horas:** é descartado quando
  vence ou quando a API responde 401. **Sair** também chama `POST /sair` na API, que invalida os
  tokens do usuário (melhor esforço: 5 s de limite, erro ignorado; a sessão local é apagada de
  qualquer jeito). As permissões valem na API; o Front-End só esconde o que o perfil não pode usar.
- **Login:** a mensagem de erro vem da API e é a mesma para senha errada, e-mail desconhecido e
  pausa por excesso de tentativas.
- **Sem segredos no bundle:** só há a URL pública da API (`VITE_API_URL`); chaves e senhas ficam
  no back-end e nunca entram no código do site.
- **Dependências:** `npm audit` roda a cada entrega. Os avisos que restam exigem salto de versão
  maior (React Router 7; Vite/Vitest mais novos) e ficam para uma migração própria.

Limitações:

- Usuários, Auditoria, Cadastro de usuário e Gestão Logística continuam demonstrativos, com
  dados de exemplo e sem persistência.
- As avaliações do chat ficam no navegador de quem avaliou.

## 10. Documentação

| documento | conteúdo |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | branches, commits, verificações e como adicionar uma tela |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | contrato técnico: estrutura, CSS, `src/lib`, hooks, componentes, regras |
| [`docs/guia-de-uso.md`](docs/guia-de-uso.md) | guia do usuário final, tela por tela |
| [`docs/relatorio-de-testes.md`](docs/relatorio-de-testes.md) | resultados dos testes (unitários, e2e simulado e real) |
| [`coldtrack-qa/README.md`](coldtrack-qa/README.md) | suíte e2e: casos, apoio e como rodar |
| [`coldtrack-qa/real/README.md`](coldtrack-qa/real/README.md) | suíte e2e real contra produção (regras de segurança) |
| [Back-end: README](https://github.com/mbalbuquerque/projeto-integrador-4-periodo#readme) | API, firmware, infraestrutura |
| [Back-end: `docs/funcionalidades.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/funcionalidades.md) | mapeamento de funcionalidades de toda a plataforma |
| [Back-end: `docs/apresentacao.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/apresentacao.md) | apresentação do projeto em slides, com roteiro da demonstração |
| [Back-end: `docs/api.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/api.md) | referência das rotas |
| [Back-end: `docs/seguranca.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/seguranca.md) | análise de segurança |

## 11. Equipe do Projeto Integrador

- Antonio Henzo
- Everson
- Emerson Luiz
- Gabriel Eduardo
- José Alanberg
- Marcelo Barbosa

O desenvolvimento envolve hardware, IoT, Front-End, Back-End, integração, documentação e testes.
Mesma equipe do [repositório do back-end](https://github.com/mbalbuquerque/projeto-integrador-4-periodo#equipe).

## 12. Referências técnicas

- [React](https://react.dev/) e [Vite](https://vite.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Playwright](https://playwright.dev/)
- [Azure Storage: site estático](https://learn.microsoft.com/azure/storage/blobs/storage-blob-static-website)
- [ThingSpeak](https://thingspeak.mathworks.com/)
- [Open-Meteo](https://open-meteo.com/)
- [Documentação do ESP32 (Espressif)](https://docs.espressif.com/)

---

ColdTrack Control, Projeto Integrador, 2026.
