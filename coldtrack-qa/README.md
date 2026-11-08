# ColdTrack Control: testes e2e (Playwright)

Testes de ponta a ponta do painel React. Rodam no navegador contra o **build de produção**
(`vite preview` servindo `dist/`), o mesmo conteúdo publicado no Azure.

Há também uma suíte **real** (site publicado + API de produção), opt-in e fora do CI:
`npm run test:e2e:real`. Regras de segurança e como rodar em [`real/README.md`](real/README.md).

Nenhum teste acessa serviço externo. O arquivo `tests/apoio.js` intercepta:

| Serviço | Comportamento padrão no teste |
|---|---|
| API do ColdTrack (`func-coldtrack-7319.azurewebsites.net`) | 503 (fora do ar), a não ser que o teste chame `simularApi(page)` |
| Chat com Azure OpenAI (`POST /chat` da mesma API) | 503 sempre (o campo livre do chat cai no FAQ local), a não ser que o teste chame `simularChat(page, responder)` |
| Assistente do painel (`POST /assistente`, com token) | 503 sempre (o assistente mostra "O assistente está indisponível agora..."), a não ser que o teste chame `simularAssistente(page, responder)` |
| Open-Meteo (risco de calor no Dashboard) | previsão fixa de 48 h para as 7 cidades da rota |
| ThingSpeak (Monitoramento) | `{ feeds: [] }`; os testes de monitoramento definem as próprias leituras |
| Google Fonts | CSS vazio |

## Executar

Na raiz do repositório:

```bash
npm ci
npx playwright install chromium   # primeira vez
npm run build                     # os testes usam dist/
npm run test:e2e                  # sobe o preview em 127.0.0.1:5500 sozinho
npm run test:e2e:report           # abre o relatório HTML
```

Filtros úteis:

```bash
npx playwright test --project="Desktop Chrome"
npx playwright test --project="Mobile Chrome"
npx playwright test -g "QA-PAINEL"
npx playwright test --headed
```

O `webServer` do `playwright.config.js` roda `npm run preview` na porta 5500. Fora do CI,
um preview já aberto nessa porta é reaproveitado. O service worker fica bloqueado nos testes
(`serviceWorkers: "block"`), senão ele atenderia os pedidos antes da interceptação.

## Apoio (`tests/apoio.js`)

| Exportação | Uso |
|---|---|
| `test`, `expect` | substituem os do `@playwright/test`; `test` já instala as interceptações |
| `simularApi(page)` | API simulada: `/perfis`, `/veiculos`, `/dispositivos`, `/leituras`, `/viagens`, `/usuarios`; `POST /login` responde 401; escrita responde 200 |
| `simularChat(page, responder)` | simula `POST /chat`: `responder(corpo, numero)` devolve `{ status = 200, json, atraso = 0 }`; a função devolve a lista dos corpos recebidos (para conferir pergunta e histórico) |
| `simularAssistente(page, responder)` | simula `POST /assistente`: `responder(corpo, numero)` devolve `{ status = 200, json, atraso = 0 }`; a função devolve a lista dos pedidos `{ corpo, autorizacao }` (pergunta, histórico e o `Bearer` mandado) |
| `tokenFalso(usuario)` | JWT de teste (assinatura falsa, `exp` em 8 h), para simular a resposta de `POST /login` |
| `entrarComo(page, "gestor" \| "operador")` | grava uma sessão falsa em `localStorage["coldtrack.sessao"]` antes de a página abrir |
| `errosDoConsole(page)` | lista de `console.error` e exceções da página |

Rotas registradas pelo próprio teste (`page.route`) têm prioridade sobre as do apoio.

## Casos

Cada caso roda em **Desktop Chrome** e **Mobile Chrome (Pixel 7)**, exceto o responsivo
(viewport fixo de 390 px, só no projeto desktop): 101 casos, 184 execuções e 18 puladas.

| Arquivo | Casos | O que cobre |
|---|---|---|
| `fluxo.spec.js` | QA-001 a QA-011 | login, cadastro de usuário (demo), gestão de usuários, auditoria, tela logada sem sessão volta ao login, senha fora do `localStorage` |
| `navegacao.spec.js` | QA-018 a QA-022, QA-039, QA-040 | rotas respondem, links internos válidos, menu visível, URLs antigas `.html` redirecionam (`/login.html`, `/dashboard.html?veiculo=X` da etiqueta QR), rota desconhecida volta para `/` |
| `logistica.spec.js` | QA-023 a QA-030 | gestão logística (demo): indicadores, busca, filtro, cadastro e validação de carga, menu até o Dashboard |
| `logistica-operacoes.spec.js` | QA-031 a QA-034 | editar, concluir e cancelar carga |
| `monitoramento.spec.js` | QA-035 a QA-038 | leituras do ThingSpeak simuladas: normal, crítica e falha |
| `chat-atendimento.spec.js` | QA-CHAT-01 a 25 | assistente virtual da página inicial: FAQ, avaliação, WhatsApp (01 a 16, com `/chat` em 503); chat com Azure OpenAI simulado (17 a 25): resposta como texto com fontes, "Digitando...", envio desabilitado e sem envio duplo, FAQ como plano B em 503 e em 15 s sem resposta, aviso do 429, histórico enviado, perguntas rápidas sem chamar a rota |
| `painel.spec.js` | QA-PAINEL (15) | `/dashboard`, `/alertas`, `/relatorios`, `/veiculos`, `/sensores`, `/viagens` e `/configuracoes` como gestor e como operador: título, selo "Azure conectado", nenhum erro no console, controles de gestor ocultos para o operador; botão Sair |
| `assistente.spec.js` | QA-ASSIST-01 a 11 (12) | assistente do painel: botão nas 7 telas logadas (gestor e operador) e em nenhuma pública; saudação pelo primeiro nome; sugestão manda a pergunta com `Bearer` e mostra a resposta em texto (quebra de linha mantida) com "Fontes:"; "Assistente digitando…" com campo e envio desligados; segunda pergunta (Enter) leva o histórico; conversa sobrevive à troca de tela e some ao sair; 429 mostra o aviso da API; 503 mostra o aviso de indisponível; Escape e × fecham com o foco de volta no botão; 390 px com o painel aberto na largura toda e sem rolagem horizontal; o botão não cobre o rodapé; impressão esconde o assistente (09 a 11 só no desktop) |
| `responsivo.spec.js` | QA-041 (15) | todas as rotas em 390 px, as logadas como gestor: sem rolagem horizontal e sem erro no console |

Controles verificados como exclusivos do gestor: `#painelNovo`/`#formVeiculo` (Veículos),
`#painelCabo`/`#formSensor` (Sensores), `#painelUsuarios`/`#formUsuario` (Configurações).

## Escrevendo um teste novo

- Importe de `./apoio.js`, não de `@playwright/test`.
- Use as rotas novas (`/dashboard`, não `/dashboard.html`) e `a[href="/rota"]`.
- As telas são carregadas sob demanda: antes de contar elementos logo depois do `goto`,
  espere algo da tela (`await expect(...).toBeVisible()` ou `locator.first().waitFor()`).
- Tela logada: `entrarComo` e `simularApi` **antes** do `page.goto`.
- Não altere um teste só para forçar a aprovação: confirme antes se o comportamento esperado
  e a implementação estão corretos.

## Artefatos

- `playwright-report/`: relatório HTML.
- `test-results/`: rastros, capturas e vídeos das falhas.

Os dois estão no `.gitignore`. No CI, o relatório é anexado à execução quando algum teste falha.
