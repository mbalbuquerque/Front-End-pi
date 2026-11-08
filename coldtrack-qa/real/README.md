# ColdTrack Control: suíte e2e real (opt-in)

Testes de ponta a ponta contra o **site publicado** e a **API de produção**, sem nenhuma
simulação. Complementam os testes de `coldtrack-qa/tests/`, que rodam contra o build local
com a API simulada.

Esta suíte **não roda** no `npm run test:e2e` nem no CI: só quando alguém chama
`npm run test:e2e:real` de propósito.

| | padrão | variável para trocar |
|---|---|---|
| Site | `https://stcoldtrackweb7319.z15.web.core.windows.net` | `COLDTRACK_SITE_URL` |
| API | `https://func-coldtrack-7319.azurewebsites.net/api` | `COLDTRACK_API_URL` |

`COLDTRACK_API_URL` só muda as chamadas diretas feitas pelos testes; o site usa a API com
que foi publicado.

## Regras de segurança

O banco é o de produção, compartilhado com a equipe. A suíte segue estas regras, e quem
escrever teste novo aqui precisa seguir também:

1. **Bloqueio de login.** 5 senhas erradas seguidas bloqueiam a conta por 15 min. Senha errada
   nunca vai para as contas fixas (gestor e operador). O login delas acontece **uma vez por
   execução**, pela tela, em `login.setup.js`; o resto da suíte reaproveita a sessão salva
   (`storageState` em `coldtrack-qa/real/.auth/`, fora do git). Teste de senha errada só com o
   usuário descartável que a própria suíte cria.
2. **Contas fixas intocadas.** A senha do gestor e do operador nunca é trocada nem redefinida.
3. **Só mexe no que criou.** Nada existente é editado ou apagado. Tudo o que a suíte cria leva o
   prefixo `QA-<timestamp>`:
   - sensor `qa-<ts>`, veículo `QA-<ts>`, viagem com origem `QA-<ts> ...`;
   - usuário `qa-<ts>@teste.coldtrack.app`, nome `QA-<ts> Operador`.
4. **Limpeza garantida.** Cada arquivo que cria registros apaga os desta execução no `afterAll`,
   mesmo quando um teste falha. Se algo sobrar (execução interrompida no meio), o script
   `limpar-qa.js` apaga qualquer `QA-<número>` que tenha ficado.
5. **Sem empresa nova.** A API não tem rota para apagar empresa, então `POST /empresas` só é
   chamado com dados que a validação recusa (400): nada é gravado.
6. **Sem telemetria.** `POST /telemetria` nunca é chamado (as leituras não podem ser apagadas).
7. **Chat com moderação.** A rota `/chat` (Azure OpenAI) tem limite de uso por IP e custo por
   pergunta: a suíte faz no máximo 2 perguntas de verdade por execução (REAL-PUB-05 e 09).
   O assistente do painel (`/assistente`, com token) segue a mesma regra: no máximo 1
   pergunta por execução (REAL-ASSIST-01).
8. **Operador e 403.** Os pedidos de escrita feitos com o token do operador usam ids que não
   existem e corpos inválidos: mesmo que a checagem de perfil falhasse, nada seria gravado.

## Como rodar

Credenciais só por variável de ambiente. Peça os valores a quem administra a empresa de
demonstração; **nunca** coloque as senhas em arquivo versionado.

```bash
npm ci
npx playwright install chromium     # primeira vez
```

Opção 1, variáveis na linha de comando (Git Bash):

```bash
COLDTRACK_GESTOR_EMAIL=... COLDTRACK_GESTOR_SENHA=... \
COLDTRACK_OPERADOR_EMAIL=... COLDTRACK_OPERADOR_SENHA=... \
npm run test:e2e:real
```

Opção 2, arquivo `.env.local` na raiz (já está no `.gitignore`): copie as linhas
`COLDTRACK_*` do `.env.example` e preencha. O `playwright.real.config.js` e o `limpar-qa.js`
leem esse arquivo sozinhos.

```bash
npm run test:e2e:real               # roda a suíte (1 worker, em série, sem retry)
npm run test:e2e:real:report        # abre o relatório HTML (playwright-report-real/)
npm run test:e2e:real:limpar        # apaga registros QA-* que tenham sobrado
```

Sem as variáveis, os testes que precisam de login são pulados e só os públicos rodam
(home, chat, rotas, contrato da API sem token, erros do cadastro).

Só os testes do chat, contra um build local (sem credenciais; o CORS da API aceita
`http://127.0.0.1:5500`):

```bash
npm run build
npm run preview -- --port 5500 --strictPort --host 127.0.0.1     # em outro terminal
COLDTRACK_SITE_URL=http://127.0.0.1:5500 npx playwright test --config playwright.real.config.js --project real --no-deps -g "REAL-PUB-0(4|5|9)"
```

Leva cerca de 2 a 3 minutos. Falhas guardam rastro (`trace`) e captura em
`test-results-real/`; abra com `npx playwright show-trace <arquivo>.zip`.

## O que cobre

| Arquivo | Casos | O que verifica |
|---|---|---|
| `login.setup.js` | REAL-AUTH-01, 02 | login do gestor e do operador pela tela; salva a sessão para o resto da suíte |
| `01-publico.spec.js` | REAL-PUB-01 a 09 | home (carrossel, âncoras do menu, menu do celular), chat (pergunta rápida pelo FAQ com avaliação; chat com Azure OpenAI: pergunta sobre o ColdTrack respondida em português com fontes, pergunta fora do assunto recusada com WhatsApp), rotas limpas e `.html` respondendo 200, `/login.html`, `/dashboard.html?veiculo=X` com e sem sessão |
| `02-autenticacao.spec.js` | REAL-AUTH-03 a 07 | sessão sobrevive ao recarregar, Sair, telas logadas sem sessão, token adulterado e sessão vencida voltam ao `/login` |
| `03-api-contrato.spec.js` | REAL-API-01 a 06, REAL-CAD-01 | `/perfis`, 401 sem token, erros no formato `{"erros": [...]}`, `/eu`, `/leituras` 400/404, tela de cadastro de empresa mostrando os erros sem criar nada |
| `04-gestor-cadastros.spec.js` | REAL-GES-01 a 06 | sensor (chave mostrada uma vez), veículo com perfil `manga`, etiqueta QR (o desenho é comparado com o QR de `/dashboard.html?veiculo=<código>`), viagem (registrar, encerrar, remover), chave nova, 409 ao remover sensor em uso, remoções |
| `05-gestor-usuario.spec.js` | REAL-USR-01 a 04 | usuário QA operador: criar, redefinir senha, entrar num contexto novo, trocar a própria senha, senha antiga recusada, entrar com a nova, remover |
| `06-operador.spec.js` | REAL-OPE-01 a 03 | telas do operador sem controles de gestor; API aceita leitura e recusa com 403 as ações de gestor |
| `07-telas.spec.js` | REAL-TEL, REAL-TEL-CSV | as 7 telas do painel em 1280 px e 390 px (título, selo "Azure conectado", sem erro no console, sem rolagem horizontal); CSV do relatório baixado e conferido |
| `08-assistente.spec.js` | REAL-ASSIST-01 | gestor pergunta "Quantos veículos eu tenho cadastrados?" ao assistente do painel, pela tela, e recebe resposta não vazia (status 200). Uma única chamada real. **Pula com o motivo** se o site publicado ainda não tem o botão Assistente ou se a rota `/assistente` ainda não subiu (404, 503 ou sem resposta por CORS) |

Sobre o CSV: quando o sensor não mandou leituras nos últimos 7 dias, a tela mostra o estado
vazio. O teste então repete o pedido à API real sem o filtro de período (as últimas leituras
gravadas do sensor) para poder baixar e conferir o arquivo, e registra isso como anotação no
relatório.

## Limitações

- Configuração do sensor pelo cabo USB (Web Serial) precisa da placa física ligada.
- Telemetria ao vivo (leitura nova chegando, alerta disparando) precisa da placa ligada e
  enviando; a suíte não grava leituras.
