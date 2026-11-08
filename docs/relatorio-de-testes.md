# Relatório de testes: ColdTrack Control

| | |
|---|---|
| Data da execução | 08/11/2026 |
| Versão testada | branch `everson`, commit `5e91187` (site publicado) |
| Site | `https://stcoldtrackweb7319.z15.web.core.windows.net` |
| API | `https://func-coldtrack-7319.azurewebsites.net/api` (Azure Function + Cosmos DB, produção) |
| Empresa usada | `coldtrack` (demonstração), contas gestor e operador |
| Máquina | Windows 10 Pro, Node.js 24.15.0 |
| Ferramentas | Vitest 2.1.9 (jsdom), Playwright 1.64.1 (Chromium) |

## Resumo

| Suíte | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | sem avisos |
| Unitários | `npm test` | 114 passaram em 19 arquivos, 0 falharam |
| Build | `npm run build` | ok |
| E2E simulado (API simulada, build local) | `npm run test:e2e` | 145 passaram, 0 falharam, 15 pulados (o caso de 390 px roda só no projeto desktop, de propósito) |
| E2E real (site publicado + API de produção) | `npm run test:e2e:real` | 56 passaram, 0 falharam, 0 pulados (duas execuções seguidas) |

Depois das execuções, o script de limpeza (`npm run test:e2e:real:limpar`) foi rodado e a API
foi consultada: nenhum veículo, sensor, viagem ou usuário com prefixo `QA-` ficou no banco. Os
cadastros da empresa voltaram ao estado de antes (1 veículo, 1 sensor, 0 viagens, 3 usuários).

## Cenários da suíte real

### Login e sessão

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-AUTH-01 | Login do gestor pela tela, perfil e validade da sessão gravados | passou |
| REAL-AUTH-02 | Login do operador pela tela | passou |
| REAL-AUTH-03 | Sessão continua depois de recarregar; `/login` logado leva ao painel | passou |
| REAL-AUTH-04 | Sair limpa a sessão e as telas logadas voltam a pedir login | passou |
| REAL-AUTH-05 | As 7 telas logadas sem sessão vão para `/login` | passou |
| REAL-AUTH-06 | Token com assinatura adulterada: API responde 401 e a tela volta ao `/login` | passou |
| REAL-AUTH-07 | Sessão vencida volta ao `/login` | passou |

### Parte pública

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-PUB-01 | Home carrega com título; carrossel avança, volta, dá a volta e aceita clique no ponto; sem erro no console | passou |
| REAL-PUB-02 | Cada âncora do menu (Início, Projeto, Diferencial, Quem somos, Contato) leva à seção; link direto `/#contato` | passou |
| REAL-PUB-03 | Menu do celular (390 px) abre, navega e fecha; sem rolagem horizontal | passou |
| REAL-PUB-04 | Chat: pergunta conhecida respondida; avaliação exige nota e é salva uma vez | passou |
| REAL-PUB-05 | Chat: pergunta desconhecida oferece o WhatsApp com a dúvida no texto | passou |
| REAL-PUB-06 | 15 rotas limpas e as 15 páginas antigas `.html` respondem 200 | passou |
| REAL-PUB-07 | `/login.html` abre o login; `/dashboard.html?veiculo=X` sem sessão vai ao login | passou |
| REAL-PUB-08 | Etiqueta antiga `/dashboard.html?veiculo=X` com sessão abre o painel no veículo | passou |

### Contrato da API

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-API-01 | `GET /perfis` responde 200 com `id`, `nome`, `min`, `max`, `margem` | passou |
| REAL-API-02 | Rotas do painel sem token (ou com token inválido) respondem 401 `{"erros": [...]}` | passou |
| REAL-API-03 | `POST /empresas` inválido responde 400 com erro por campo; corpo que não é JSON responde 400 | passou |
| REAL-API-04 | `GET /eu` devolve o usuário da sessão | passou |
| REAL-API-05 | Cadastros inválidos (veículo, sensor, viagem, usuário) respondem 400 com erro por campo | passou |
| REAL-API-06 | `GET /leituras` sem `deviceId` responde 400; sensor de fora responde 404 | passou |
| REAL-CAD-01 | Tela de cadastro de empresa: campos em branco barrados na tela; e-mail e senha inválidos mostram os erros da API, sem criar empresa | passou |

### Cadastros do gestor (ida e volta)

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-GES-01 | Registrar sensor QA: chave mostrada uma vez, some ao recarregar, API não devolve chave nem hash | passou |
| REAL-GES-02 | Cadastrar veículo QA com o perfil `manga` e o sensor QA; aparece na lista e na API | passou |
| REAL-GES-03 | Etiqueta QR: o desenho é exatamente o QR de `/dashboard.html?veiculo=<código>`; o endereço abre o painel no veículo | passou |
| REAL-GES-04 | Registrar viagem do veículo QA, encerrar (fim depois do início) e remover | passou |
| REAL-GES-05 | Gerar nova chave (diferente da primeira); remover sensor em uso é recusado (409) com aviso | passou |
| REAL-GES-06 | Remover o veículo e depois o sensor; os dois somem da API | passou |

### Usuário descartável

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-USR-01 | Gestor cria usuário QA com perfil operador | passou |
| REAL-USR-02 | Gestor redefine a senha do usuário QA | passou |
| REAL-USR-03 | Usuário QA entra num navegador limpo, vê o painel de operador, erra a senha atual (mensagem), troca a senha, segue logado; senha antiga recusada com "e-mail ou senha incorretos"; entra com a nova | passou |
| REAL-USR-04 | Gestor remove o usuário QA; o login dele deixa de valer | passou |

### Operador

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-OPE-01 | As 7 telas abrem para o operador, sem controles de gestor e sem erro no console (7 casos) | passou |
| REAL-OPE-02 | API permite ao operador ler `/eu`, veículos, sensores, viagens e perfis | passou |
| REAL-OPE-03 | API recusa com 403 as 12 ações de gestor feitas com o token do operador | passou |

### Telas do painel em 1280 px e 390 px

| Caso | Cenário | Resultado |
|---|---|---|
| REAL-TEL (14 casos) | Dashboard, Alertas, Relatórios, Veículos, Sensores, Viagens e Configurações em 1280 px e em 390 px: título da aba e da tela, "Azure conectado", sem erro no console, sem rolagem horizontal | passou |
| REAL-TEL-CSV | Relatório baixa o CSV: nome `coldtrack-<veículo>-168h.csv`, BOM, cabeçalho `medido_em;temperatura_c;umidade_pct;rssi_dbm;status`, uma linha por leitura da tabela | passou |

O sensor físico não enviou leituras nos últimos 7 dias, então o Relatório mostrou o estado
vazio. Para conferir o arquivo, o teste repetiu o pedido à API real sem o filtro de período
(as últimas leituras gravadas do sensor). Essa troca fica registrada como anotação no
relatório do Playwright.

## Defeito encontrado e corrigido

| Onde | Problema | Correção |
|---|---|---|
| Relatórios, estado vazio de 7 dias | O texto saía "Nenhuma leitura **nas** últimos 7 dias." | `src/pages/Relatorios/Relatorios.jsx` usa "nos" para 7 dias e "nas" para 24 h, como a tela de Alertas. Lint, unitários, build e e2e simulado continuam passando. A correção chega ao site na próxima publicação. |

Nenhum outro defeito de funcionamento foi encontrado.

## Limitações conhecidas

- **Configuração do sensor pelo cabo USB** (Web Serial, em Sensores) precisa da placa física
  ligada ao computador; não é coberta por teste automático.
- **Telemetria ao vivo** (leitura nova chegando, mudança de status, alerta disparando) precisa
  da placa ligada e enviando. A suíte não grava leituras: elas não podem ser apagadas pela API.

## Como repetir

Instruções, variáveis de ambiente e regras de segurança em `coldtrack-qa/real/README.md`.
