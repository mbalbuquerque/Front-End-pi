# ColdTrack Control

Painel web do **ColdTrack Edge**, projeto integrador de monitoramento IoT da cadeia fria.
Sensores ESP32 instalados no baú dos veículos enviam temperatura, umidade e sinal Wi-Fi para
uma API no Azure; o painel mostra a situação de cada carga, os alertas fora da faixa do perfil
da mercadoria, relatórios, viagens e o risco de calor previsto na rota.

- Site publicado: <https://stcoldtrackweb7319.z15.web.core.windows.net>
- Repositório do Front-End: <https://github.com/mbalbuquerque/Front-End-pi>
- Repositório da API (Back-End, Azure Functions) e do firmware: <https://github.com/mbalbuquerque/projeto-integrador-4-periodo>

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

### Fluxo dos dados

```text
Sensor DHT + ESP32-C3 (no baú)
        |  Wi-Fi, HTTPS, chave por dispositivo
        v
API ColdTrack (Azure Functions)  -- perfis de carga, veículos, sensores, viagens, usuários
        |  JSON, token de sessão (8 h)
        v
ColdTrack Control (este repositório, React, site estático no Azure Storage)
```

A tela **Monitoramento** é uma demonstração separada que lê o canal público do ThingSpeak
(`3496439`: field1 temperatura, field2 umidade, field3 RSSI). O **Dashboard** usa a
previsão da Open-Meteo para estimar o calor na rota Petrolina a Suape.

### Faixas de temperatura

As faixas não são fixas no Front-End: cada veículo tem um **perfil de carga** cadastrado na API
(`GET /perfis`, com `min`, `max` e `margem`). A leitura é Normal dentro da faixa, Atenção até
`margem` graus fora dela e Crítico além disso. Enquanto os perfis não carregam, vale o perfil
demonstrativo (até 15 °C Normal, até 20 °C Atenção).

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 18, React Router 6, JavaScript (sem TypeScript) |
| Build | Vite 5, PostCSS (`postcss-prefix-selector` para escopo do CSS por família) |
| Testes | Vitest + jsdom (unitários), Playwright (e2e, Chromium desktop e Pixel 7) |
| Qualidade | ESLint 9 (`--max-warnings 0`) |
| PWA | `public/manifest.json`, `public/sw.js` (rede primeiro, registrado só no build) |
| Hospedagem | Azure Storage, site estático (container `$web`), publicação por GitHub Actions com OIDC |
| Hardware | ESP32-C3, sensor DHT |
| Serviços externos | API ColdTrack (Azure Functions), ThingSpeak, Open-Meteo |

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
  components/              PainelLayout, RequireAuth, GraficoTemperatura, ChatWidget/...
  pages/<Nome>/            uma pasta por tela (componente, regras puras e testes)
  styles/<familia>/        CSS de cada família de telas, escopado por .escopo-<familia>
  assets/images/           imagens WebP (slider da página inicial, infográfico do chat)
coldtrack-qa/              testes e2e (Playwright) e a documentação deles
scripts/enviar-site.sh     envio de dist/ para o Azure (usado pelo CI e pelo publicar.sh)
publicar.sh                publicação manual pela máquina local
docs/ARQUITETURA.md        contrato técnico: estrutura, CSS, lib, hooks, regras
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

## 5. Testes

- **Unitários (Vitest):** regras sem tela em `src/lib` e em `src/pages/*/` (leituras,
  faixas, sessão, API, formatação, CSV, sensores, viagens, etiqueta, chat).
- **E2E (Playwright):** `coldtrack-qa/tests`, em Desktop Chrome e Mobile Chrome. Cobrem as
  telas públicas e demonstrativas, o chat, os redirecionamentos das URLs antigas e as telas
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

A página inicial tem um assistente com botão flutuante, perguntas rápidas e campo livre. As
respostas vêm de uma base local de palavras-chave (`src/components/ChatWidget/respostas.js`),
sem IA generativa e sem API paga. Quando a resposta não resolve, o visitante pode falar com o
desenvolvedor pelo WhatsApp (mensagem pré-preenchida com a última pergunta) e avaliar o
atendimento de 1 a 5 estrelas, com comentário opcional.

As avaliações ficam só no navegador (`localStorage`, chave `coldtrack_chat_avaliacoes_v1`), no
formato abaixo; ainda não há envio para um servidor.

```json
{ "nota": 5, "resolvida": true, "comentario": "Atendimento excelente!", "data": "2026-11-04T17:00:00.000Z" }
```

## 9. Segurança e limitações

- Autenticação na API com token de 8 horas; a sessão fica em `localStorage` (`coldtrack.sessao`)
  e é descartada quando vence ou quando a API responde 401. As permissões valem na API; o
  Front-End só esconde o que o perfil não pode usar.
- Mensagens do chat e dados da API são renderizados como texto pelo React; o lint bloqueia
  `innerHTML` e `dangerouslySetInnerHTML`.
- Usuários, Auditoria, Cadastro de usuário e Gestão Logística continuam demonstrativos, com
  dados de exemplo e sem persistência.
- As avaliações do chat ficam no navegador de quem avaliou.

## 10. Contribuição

Fluxo de branches, convenção de commits e como adicionar uma tela: [`CONTRIBUTING.md`](CONTRIBUTING.md).
Contrato técnico: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

## 11. Equipe do Projeto Integrador

- Antonio Henzo
- Everson
- Emerson Luiz
- Gabriel Eduardo
- José Alanberg
- Marcelo Barbosa

O desenvolvimento envolve hardware, IoT, Front-End, Back-End, integração, documentação e testes.

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
