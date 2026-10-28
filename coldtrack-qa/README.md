# ColdTrack Control — Testes Automatizados de QA

Documentação para instalação, execução e análise dos testes automatizados do Front-End do **ColdTrack Control**, desenvolvido no Projeto Integrador.

## 1. Objetivo

Validar os fluxos já implementados no Front-End antes da integração com a API do Back-End. A suíte utiliza **Playwright** para executar cenários no navegador desktop e na emulação de dispositivo móvel.

> **Escopo:** os testes atuais verificam comportamentos da interface. A aprovação não comprova autenticação, autorização, segurança do servidor ou integração com a API, que ainda depende da equipe de Back-End.

## 2. Pré-requisitos

- Node.js e npm instalados;
- Python disponível no terminal pelo comando `python`;
- Dependências do projeto instaladas;
- Navegador Chromium do Playwright instalado.

Verifique as instalações no **PowerShell**:

```powershell
node --version
npm --version
python --version
```

## 3. Estrutura esperada

Execute os comandos na **raiz do repositório Front-End**, onde estão `package.json` e `playwright.config.js`.

```text
projeto-integrador-4-periodo-Front/
├── package.json
├── package-lock.json
├── playwright.config.js
├── index.html
├── login.html
├── usuarios.html
├── ...
└── coldtrack-qa/
    ├── README.md
    └── tests/
        └── fluxo.spec.js
```

As páginas `cadastro.html`, `auditoria.html` e `dashboard.html` também são utilizadas pelos cenários de teste e devem estar disponíveis no servidor local.

## 4. Instalação (primeira execução)

Abra o PowerShell na raiz do projeto:

```powershell
npm install
npx playwright install chromium
```

Se a dependência de testes ainda não estiver declarada no projeto, instale-a:

```powershell
npm install --save-dev @playwright/test
```

O arquivo `package.json` deve conter os scripts:

```json
{
  "scripts": {
    "test:qa": "playwright test",
    "test:qa:report": "playwright show-report"
  }
}
```

**Atenção:** esse JSON é um exemplo do conteúdo do arquivo `package.json`, não um comando para digitar diretamente no PowerShell. Preserve os demais campos e scripts existentes.

## 5. Executar os testes

### Execução completa

```powershell
npm run test:qa
```

A configuração do Playwright utiliza `http://127.0.0.1:5500` como URL-base e inicia automaticamente um servidor local Python, se necessário. Não é preciso iniciar a API do Back-End.

### Conferir os testes disponíveis

```powershell
npx playwright test --list --config=./playwright.config.js
```

### Executar somente no desktop

```powershell
npx playwright test --project="Desktop Chrome"
```

### Executar somente no mobile

```powershell
npx playwright test --project="Mobile Chrome"
```

### Executar um caso específico

```powershell
npx playwright test -g "QA-001"
```

### Executar com navegador visível

```powershell
npx playwright test --headed
```

## 6. Relatório e evidências

Após executar a suíte, abra o relatório HTML:

```powershell
npm run test:qa:report
```

Ou use diretamente:

```powershell
npx playwright show-report
```

Os artefatos locais são gerados normalmente nas pastas:

- `playwright-report/` — relatório HTML;
- `test-results/` — resultados e evidências, como capturas, vídeos e rastros de falhas, conforme a configuração.

## 7. Casos automatizados

| ID | Cenário | Verificação principal |
|---|---|---|
| QA-001 | Abrir login | Formulário e campos visíveis |
| QA-002 | Login com campos vazios | Validação e permanência no login |
| QA-003 | Mostrar/ocultar senha | Alternância do tipo do campo |
| QA-004 | Acessar cadastro | Navegação pelo botão/link Cadastrar |
| QA-005 | CPF inválido | Rejeição de CPF inválido |
| QA-006 | Cadastro sem API | Não concluir criação real de conta |
| QA-007 | Gestão de usuários | Exibição de dados demonstrativos |
| QA-008 | Pesquisa de usuários | Filtragem da listagem |
| QA-009 | Abrir auditoria | Navegação para a tela de auditoria |
| QA-010 | ThingSpeak indisponível | Dashboard apresenta tratamento de erro |
| QA-011 | Senha e localStorage | Não persistir a senha de teste no localStorage |

A suíte é executada em dois projetos de navegador: **Desktop Chrome** e **Mobile Chrome (Pixel 7)**, totalizando **22 verificações**.

## 8. Resultado registrado

Na execução informada em **20/10/2026**:

| Indicador | Resultado |
|---|---:|
| Casos de teste | 11 |
| Ambientes | 2 |
| Verificações executadas | 22 |
| Aprovadas | 22 |
| Reprovadas | 0 |
| Taxa de aprovação | 100% |
| Duração aproximada | 1,1 minuto |

> Este é o resultado de uma execução específica. Novas alterações no código exigem nova execução dos testes; o resultado histórico não garante aprovação futura.

## 9. Solução de problemas

### `ENOENT ... package.json`

O comando foi executado fora da raiz do projeto ou o arquivo não existe. Acesse a pasta que contém `package.json` e execute novamente `npm install`.

### `playwright.config.js does not exist`

Confirme a existência do arquivo na raiz:

```powershell
Test-Path .\playwright.config.js
```

### `Cannot navigate to invalid URL`

O Playwright provavelmente não carregou a configuração com `baseURL`. Confira:

```powershell
npx playwright test --list --config=./playwright.config.js
npx playwright test --config=./playwright.config.js
```

### `No tests found`

Confira se existe `coldtrack-qa/tests/fluxo.spec.js` e se `testDir` aponta para `./coldtrack-qa/tests`.

### Servidor local não inicia

Confirme que o Python está instalado e que a porta `5500` está disponível. Para testar manualmente:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Em outro terminal, execute `npm run test:qa`.

### Teste falha após carregar a página

Verifique o relatório HTML e os elementos esperados pelo teste. Não altere o teste apenas para forçar aprovação; confirme primeiro se o comportamento esperado e a implementação estão corretos.

## 10. Versionamento no GitHub

Inclua no repositório:

- `package.json` e `package-lock.json`;
- `playwright.config.js`;
- `coldtrack-qa/tests/fluxo.spec.js`;
- `coldtrack-qa/README.md`.

No `.gitignore`, mantenha:

```gitignore
node_modules/
playwright-report/
test-results/
```

Confira as alterações antes de publicar:

```powershell
git status
git add package.json package-lock.json playwright.config.js coldtrack-qa/README.md coldtrack-qa/tests/fluxo.spec.js .gitignore
git commit -m "docs(qa): documenta execucao dos testes Playwright"
git push
```

**Observação:** o comando `git add` pressupõe que os arquivos listados existem. Caso algum não exista, ajuste a lista conforme a estrutura real do repositório.

## 11. Próximas etapas

Quando a API do Back-End estiver disponível, ampliar a suíte para autenticação real, autorização por perfil, integração de cadastro, persistência de dados, auditoria do servidor e testes de segurança de ponta a ponta.
