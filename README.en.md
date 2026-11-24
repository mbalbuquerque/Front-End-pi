# ColdTrack Control

Portuguese version: [README.md](README.md).

Web dashboard of **ColdTrack Edge**, an IoT cold chain monitoring integrative project.
ESP32-C3 sensors installed in the cargo compartment of the vehicles send temperature, humidity and
Wi-Fi signal to an API on Azure; the dashboard (React + Vite) shows the situation of each cargo,
the alerts outside the range of the goods' profile, reports, trips and the heat risk forecast
along the route.

This is the **dashboard (front-end)** repository. The API, the firmware, the infrastructure and the
climate analysis are in the back-end repository:
[mbalbuquerque/projeto-integrador-4-periodo](https://github.com/mbalbuquerque/projeto-integrador-4-periodo).

| | address |
|---|---|
| Published dashboard | <https://stcoldtrackweb7319.z15.web.core.windows.net> |
| API (interactive documentation, Swagger) | <https://func-coldtrack-7319.azurewebsites.net/api/docs> |
| API (base) | `https://func-coldtrack-7319.azurewebsites.net/api` |
| Dashboard repository (this one) | <https://github.com/mbalbuquerque/Front-End-pi> |
| Back-end and firmware repository | <https://github.com/mbalbuquerque/projeto-integrador-4-periodo> |
| Firmware simulation on Wokwi | <https://wokwi.com/projects/475352296477619201> |

Note: the other documents linked below (`docs/`, `coldtrack-qa/`, `CONTRIBUTING.md`) and the user
interface are in Portuguese.

## 1. About the project

ColdTrack Control was developed for the Integrative Project to track the environmental conditions
during the transport and storage of refrigerated goods. The solution combines the Internet of
Things, web development, HTTP communication, environmental monitoring and logistics management.

Goals:

- monitor temperature and relative humidity of each vehicle;
- classify each reading against the range of the cargo profile (Normal, Warning, Critical);
- show the Wi-Fi connectivity (RSSI) and the situation of each sensor;
- record trips and show the cargo condition on each route;
- generate reports by period, with CSV export;
- separate what the manager, the logistics operator and the driver can do (the driver only sees their own vehicle, on a phone-first screen);
- offer automated support to visitors, with hand-off to the developer;
- keep the interface responsive and automatically tested.

### Architecture

```text
ESP32-C3 + DHT11/DHT22 (in the cargo compartment)
        |  Wi-Fi, HTTPS + JSON, per-device key
        v
ColdTrack API (Azure Functions, Python)  <--> Azure OpenAI (gpt-4.1-mini, RAG)
        |  writes and queries                    public chat and dashboard assistant
        v
Azure Cosmos DB (companies, users, vehicles, sensors, trips, readings)
        ^
        |  JSON, session JWT token (8 h)
        |
ColdTrack Control (this repository): React + Vite, static site on Azure Storage
```

User roles: **manager** (queries and registers) and **operator** (queries). The API is the only
source of the dashboard's data; the route specification is in the
[API Swagger](https://func-coldtrack-7319.azurewebsites.net/api/docs) (OpenAPI 3.0) and, in text, in
[`docs/api.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/api.md) of the back end.

The **Monitoramento** (Monitoring) screen (signed in only) shows the readings of the public
ThingSpeak channel (`3515173`: field1 temperature, field2 humidity, field3 RSSI); ThingSpeak is not
part of the dashboard's data path. The **Dashboard** uses the Open-Meteo forecast to estimate the
heat along the Petrolina to Suape route.

### Temperature ranges

The ranges are not fixed in the front end: each vehicle has a **cargo profile** registered in the
API (`GET /perfis`, with `min`, `max` and `margem`; mango, grape and demonstration). A reading is
Normal inside the range, Warning up to `margem` degrees outside it, and Critical beyond that. The
values come from the API; only while the profiles are loading (or for a vehicle without a profile)
does the dashboard use the fallback demonstration profile (Normal up to 15 °C, Warning up to 20 °C).

## 2. Stack

| Layer | Technology |
|---|---|
| Interface | React 18, React Router 6, JavaScript (no TypeScript) |
| Build | Vite 5, PostCSS (`postcss-prefix-selector` to scope the CSS per family) |
| Tests | Vitest + jsdom (unit), Playwright (e2e, desktop Chromium and Pixel 7) |
| Quality | ESLint 9 (`--max-warnings 0`) |
| PWA | `public/manifest.json`, `public/sw.js` (network first, registered only in the build) |
| Hosting | Azure Storage, static site (`$web` container), published by GitHub Actions with OIDC |
| Hardware | ESP32-C3, DHT11 or DHT22 sensor (firmware in the back-end repository) |
| External services | ColdTrack API (Azure Functions; chat and dashboard assistant with Azure OpenAI), ThingSpeak, Open-Meteo |

## 3. Structure

```text
index.html                 single shell (manifest, icons; fonts self-hosted)
vite.config.js             React, CSS scoping, copies of the old .html pages
playwright.config.js       e2e against the build (vite preview on port 5500)
eslint.config.js
public/                    copied to dist/ as is: sw.js, manifest.json, assets/icons/
src/
  main.jsx                 BrowserRouter > AuthProvider > App; registers sw.js in the build
  App.jsx                  routes (each screen lazy-loaded with React.lazy)
  rotas.js                 ROTAS_LEGADAS (name.html -> route) and the dashboard navigation (Operação, Gestão)
  lib/                     API, session, readings, ranges, formatting, vehicle (no React)
  hooks/                   useSessao, usePolling, useVeiculoEscolhido, useTitulo, useMovimentoReduzido
  components/              PainelLayout, RequireAuth, GraficoTemperatura, ChatWidget/, AssistentePainel/...
  pages/<Name>/            one folder per screen (component, pure rules and tests)
  styles/<family>/         CSS of each screen family, scoped by .escopo-<family>
  assets/images/           WebP images (home page slider, chat infographic)
coldtrack-qa/              e2e tests (Playwright) and their documentation
scripts/enviar-site.sh     upload of dist/ to Azure (used by CI and by publicar.sh)
publicar.sh                manual deployment from the local machine
docs/ARQUITETURA.md        technical contract: structure, CSS, lib, hooks, rules
docs/guia-de-uso.md        end-user guide, screen by screen (basis of the dashboard assistant)
```

## 4. How to run

Requirements: Node.js 20 or later, npm and Git.

```bash
git clone https://github.com/mbalbuquerque/Front-End-pi.git
cd Front-End-pi
npm ci
npm run dev                # http://localhost:5173
```

The API used by default is the published one (`https://func-coldtrack-7319.azurewebsites.net/api`;
routes documented in the [Swagger](https://func-coldtrack-7319.azurewebsites.net/api/docs)).
To point to another one (for example, the Function running locally), copy `.env.example`
to `.env.local` and adjust:

```bash
cp .env.example .env.local
# VITE_API_URL=http://localhost:7071/api
```

`.env.local` is not committed to Git. The variable is read at build time: after changing it,
restart `npm run dev` or build again.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite development server (port 5173) |
| `npm run build` | production build in `dist/` (includes the `*.html` copies of the old URLs) |
| `npm run preview` | serves `dist/` locally |
| `npm test` | unit tests (Vitest, `src/**/*.test.js`) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint, fails on any warning |
| `npm run test:e2e` | Playwright tests against the build (run `npm run build` first) |
| `npm run test:e2e:report` | opens the last Playwright report |
| `npm run test:e2e:real` | real suite (published site + production API), opt-in, outside CI; see `coldtrack-qa/real/README.md` |
| `npm run test:e2e:real:limpar` | deletes through the API the `QA-*` records that the real suite may have left behind |

### Test user

There is no ready-made production account: a password shared in the repository would be an exposed secret.

- **Production:** open the [dashboard](https://stcoldtrackweb7319.z15.web.core.windows.net), use *Cadastrar empresa* (register company) and create the manager with an e-mail and password of your choice. In *Configurações* (settings), the manager creates the other profiles: **operator** (follows sensors and alerts) and **driver** (goes straight to the driver screen). The company and everything created can be deleted by the manager in *Configurações > Excluir empresa*.
- **Local, with the API on the Cosmos emulator:** in the API repository, `python infra/ci/preparar_banco.py` creates the manager `gestor.teste@exemplo.com`, password `SenhaDeTeste-123` (fictitious, valid only on the emulator), and `python infra/ci/dados_exemplo.py` adds a sensor, a vehicle, a trip and synthetic readings. Point `VITE_API_URL` to the local API and run `npm run dev`.
- **E2E tests (`npm run test:e2e`):** no account needed; the API is mocked inside Playwright.

## 5. Tests

- **Unit (Vitest):** screenless rules in `src/lib` and in `src/pages/*/` (readings,
  ranges, session, API, formatting, CSV, sensors, trips, label, chat, chat fallback and dashboard assistant).
- **E2E (Playwright):** `coldtrack-qa/tests`, on Desktop Chrome and Mobile Chrome. They cover the
  public and demonstration screens, the chat (with the `/chat` route mocked), the dashboard assistant (with the `/assistente` route mocked), the redirects of the old URLs and the
  screens logged in as manager and as operator. The API and third-party services are mocked: no
  test reaches Azure. Details in [`coldtrack-qa/README.md`](coldtrack-qa/README.md).

```bash
npx playwright install chromium   # first time
npm run build
npm run test:e2e
```

The `.github/workflows/testes.yml` workflow runs lint, unit tests, build and e2e on every push and
pull request; when an e2e test fails, the report is attached to the run.

## 6. Deployment

Branch flow: the work happens on branches created from **`main`**, merged through pull requests
with green tests. `everson` stays as a fallback (the OIDC login to Azure still accepts it) and must
not be deleted. Protecting `main` needs a repository administrator; the command is in
[`CONTRIBUTING.md`](CONTRIBUTING.md).

Every push to the **`main`** branch triggers `.github/workflows/publicar-site.yml`:

1. `npm ci`, `npm run lint`, `npm test`, `npm run build` (stops if any fails);
2. Azure login through OIDC (`azure/login`, no password stored in the repository);
3. `bash scripts/enviar-site.sh dist`, which:
   - uploads `assets/` with a hash in the name with `Cache-Control: public, max-age=31536000, immutable`;
   - uploads `index.html`, the `*.html` copies, `sw.js`, `manifest.json` and the icons with
     `Cache-Control: no-cache`;
   - removes from the `$web` container every file that is not in `dist/` (leftovers of the old
     site and of previous builds);
   - confirms `index.html` as the index and error document of the static site.

To publish from the local machine (Azure CLI logged in to the project's subscription), with the
same steps over what is committed:

```bash
bash publicar.sh
```

## 7. Routes

| Route | Screen | Access |
|---|---|---|
| `/` | home page, with the virtual assistant | public |
| `/login` | login | public |
| `/cadastro` | company registration (creates the first manager) | public |
| `/dashboard` | vehicle overview: current reading, history, heat along the route | logged in |
| `/alertas` | readings outside the range, grouped into occurrences | logged in |
| `/relatorios` | summary by period and CSV export | logged in |
| `/veiculos` | fleet, situation of each cargo, QR label; registration for managers only | logged in |
| `/sensores` | situation of the sensors; USB cable connection and manual registration for managers only | logged in |
| `/viagens` | trips and cargo condition on each route | logged in |
| `/configuracoes` | account, password change, ranges, sensors; users for managers only | logged in |
| `/usuarios`, `/cadastro-usuario` | redirect to the Users section of `/configuracoes` (sample-data screens removed) | yes |
| `/logistica` | redirects to `/viagens` (sample-data screen removed) | yes |
| `/auditoria` | redirects to `/dashboard` (the API has no audit log) | yes |
| `/monitoramento` | reading of the public ThingSpeak channel | yes |

A logged-in route without a session goes to `/login`. An unknown route goes back to `/`.

**Old URLs.** The build generates a copy of `index.html` for each page of the old site
(`dashboard.html`, `login.html`, `alertas.html` and the others in `src/rotas.js`). This way Azure
answers 200 and React Router redirects, keeping the query string:

| Old URL | Goes to |
|---|---|
| `/index.html` | `/` |
| `/login.html` | `/login` |
| `/dashboard.html?veiculo=VAN-01` | `/dashboard?veiculo=VAN-01` |
| `/<page>.html` | `/<page>` |

**Vehicle QR label.** The label printed in Veículos (Vehicles) points to
`<site origin>/dashboard.html?veiculo=<id>`. The old format was kept on purpose, so that the labels
already stuck on the vehicles keep opening the Dashboard of the right vehicle.

## 8. Virtual assistant

The home page has an assistant with a floating button, quick questions and a free-text field.

- **Free text:** chat with Azure OpenAI through the API's public `POST /chat` route
  (`src/lib/chat.js`). The answer appears as text, with a "Fontes:" (Sources) line listing the
  project documents used; the last 6 messages of the conversation are sent as history. An
  off-topic question is declined with a pointer to WhatsApp.
- **Fallback:** if the route fails (no network, 503, another error or 15 s without a response), the
  question is answered by the local keyword base (`src/components/ChatWidget/respostas.js`), so the
  chat is never left without an answer. Many questions in a row (429) show the API's notice.
- **Quick questions:** answered immediately from the local base, without calling the route.

When the answer does not solve the problem, the visitor can talk to the developer on WhatsApp
(message pre-filled with the last question) and rate the support from 1 to 5 stars, with an
optional comment.

The ratings stay only in the browser (`localStorage`, key `coldtrack_chat_avaliacoes_v1`), in the
format below; they are not yet sent to a server.

```json
{ "nota": 5, "resolvida": true, "comentario": "Atendimento excelente!", "data": "2026-11-04T17:00:00.000Z" }
```

### Dashboard assistant (logged-in screens)

All logged-in screens have the floating **Assistente** button (bottom right corner), mounted once in
`PainelLayout`. It answers questions about how to use the dashboard and about the data of the
logged-in user's company (vehicles, sensors, latest readings, alerts of the last 24 h, trips).

- **Route:** the API's `POST /assistente`, with the token (`Authorization: Bearer`), through the
  same `api()` as the other screens: 401 clears the session and returns to login. Body
  `{ pergunta (1 to 500), historico?: [{ papel: "usuario" | "assistente", texto }] (up to 6) }`;
  response `{ resposta, fontes, origem: "ia" }`. Client in `src/lib/assistente.js` (20 s
  timeout).
- **Screen:** greeting by first name, 4 suggestions, plain-text answer (line breaks kept) with the
  "Fontes:" line, "Assistente digitando…" (Assistant typing…) while waiting. Escape or × closes it
  and focus returns to the button. On mobile the conversation takes the full width; when printing
  (including the QR label) the assistant does not appear.
- **Errors:** 400 and 429 show the API's message; 503, timeout and network failure show
  "O assistente está indisponível agora. Tente de novo em instantes." (The assistant is unavailable
  right now. Try again shortly.) There is no local fallback: the questions depend on the company's data.
- **Conversation:** in memory only (`src/components/AssistentePainel/conversa.js`). It survives
  switching screens and disappears on logout or when the session expires. The last 6 answered
  messages are sent as history. Nothing goes to `localStorage`.
- **Knowledge base:** [`docs/guia-de-uso.md`](docs/guia-de-uso.md), the user guide screen by screen.

## 9. Security and limitations

Full security analysis (threats, API, database, tokens): in the back-end repository,
[`docs/seguranca.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/seguranca.md).
What the front end does:

- **CSP through `<meta>`:** the static site does not send headers, so the build injects into
  `index.html` a `Content-Security-Policy` (`script-src 'self'`, `object-src 'none'`, `connect-src`
  only with the API, Open-Meteo and ThingSpeak) and `referrer: strict-origin-when-cross-origin`. It
  is done by a Vite plugin (`vite.config.js`) only in the build; `npm run dev` does not receive the
  policy, because HMR uses an inline script and a websocket. The `csp.spec.js` e2e test walks all
  the routes of the build and fails on any violation.
- **No `innerHTML`:** chat messages, dashboard assistant messages and API data are rendered as text
  by React; the lint blocks `innerHTML` and `dangerouslySetInnerHTML`.
- **Token in `localStorage` (`coldtrack.sessao`) valid for 8 hours:** it is discarded when it
  expires or when the API answers 401. **Sign out** also calls `POST /sair` on the API, which
  invalidates the user's tokens (best effort: 5 s limit, error ignored; the local session is
  erased anyway). Permissions are enforced by the API; the front end only hides what the role
  cannot use.
- **Login:** the error message comes from the API and is the same for a wrong password, an unknown
  e-mail and a pause caused by too many attempts.
- **No secrets in the bundle:** only the public API URL (`VITE_API_URL`) is there; keys and
  passwords stay in the back end and never enter the site's code.
- **Dependencies:** `npm audit` runs on every delivery. The remaining warnings require a major
  version jump (React Router 7; newer Vite/Vitest) and are left for a migration of their own.

Limitations:

- There is no audit screen: the API does not yet keep a queryable event log.
- Chat ratings stay in the browser of whoever rated.

## 10. Documentation

| document | contents |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | branches, commits, checks and how to add a screen |
| [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) | technical contract: structure, CSS, `src/lib`, hooks, components, rules |
| [`docs/guia-de-uso.md`](docs/guia-de-uso.md) | end-user guide, screen by screen |
| [`docs/relatorio-de-testes.md`](docs/relatorio-de-testes.md) | test results (unit, mocked e2e and real) |
| [`docs/evidencias/painel/`](docs/evidencias/painel/README.md) | dashboard screenshots (history, alerts, AI, online/offline, profiles) taken with the mocked API (in Portuguese) |
| [`docs/design/motorista/`](docs/design/motorista/) | driver screens generated in Stitch and the design system used in the redesign |
| [`coldtrack-qa/README.md`](coldtrack-qa/README.md) | e2e suite: cases, support and how to run |
| [`coldtrack-qa/real/README.md`](coldtrack-qa/real/README.md) | real e2e suite against production (safety rules) |
| [Back end: README](https://github.com/mbalbuquerque/projeto-integrador-4-periodo#readme) | API, firmware, infrastructure ([English version](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/README.en.md)) |
| [Back end: `docs/funcionalidades.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/funcionalidades.md) | feature mapping of the whole platform |
| [Back end: `docs/apresentacao.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/apresentacao.md) | project presentation as slides, with the demonstration script |
| [API Swagger](https://func-coldtrack-7319.azurewebsites.net/api/docs) | interactive route documentation (OpenAPI 3.0) |
| [Back end: `docs/api.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/api.md) | text reference of the routes, with the rules in detail |
| [Back end: `docs/seguranca.md`](https://github.com/mbalbuquerque/projeto-integrador-4-periodo/blob/main/docs/seguranca.md) | security analysis |

## 11. Integrative Project team

- Enzo Antônio
- Everson
- Emmanuel Luís
- Gabriel Eduardo
- José Allamberg
- Marcelo Barbosa

The development involves hardware, IoT, front end, back end, integration, documentation and tests.
Same team as the [back-end repository](https://github.com/mbalbuquerque/projeto-integrador-4-periodo#equipe).

## 12. Technical references

- [React](https://react.dev/) and [Vite](https://vite.dev/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [Playwright](https://playwright.dev/)
- [Azure Storage: static website](https://learn.microsoft.com/azure/storage/blobs/storage-blob-static-website)
- [ThingSpeak](https://thingspeak.mathworks.com/)
- [Open-Meteo](https://open-meteo.com/)
- [ESP32 documentation (Espressif)](https://docs.espressif.com/)

---

ColdTrack Control, Integrative Project, 2026.
