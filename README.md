
# ❄️ ColdTrack Control

### Plataforma Web de Monitoramento Inteligente da Cadeia de Frio

![Status](https://img.shields.io/badge/Projeto-Em%20Desenvolvimento-blue)
![Frontend](https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-cyan)
![IoT](https://img.shields.io/badge/IoT-ESP32-green)
![QA](https://img.shields.io/badge/QA-32%20Testes%20do%20Chat%20Aprovados-brightgreen)
![PWA](https://img.shields.io/badge/PWA-Em%20Evolu%C3%A7%C3%A3o-orange)

## 📌 1. Sobre o projeto

O **ColdTrack Control** é uma plataforma web desenvolvida no contexto de um Projeto Integrador, com o objetivo de acompanhar condições ambientais relacionadas ao transporte e armazenamento de mercadorias refrigeradas.

A solução integra conceitos de Internet das Coisas (IoT), desenvolvimento web, comunicação HTTP, monitoramento ambiental e gestão logística.

O protótipo utiliza um microcontrolador ESP32 conectado a um sensor ambiental para coletar informações de temperatura e umidade.

Essas informações são transmitidas para a plataforma ThingSpeak e posteriormente consultadas pela interface web.

O sistema também disponibiliza módulos administrativos demonstrativos e um assistente virtual para atendimento aos visitantes.

### 🌐 Acesse a plataforma

https://coldtrackcontrol.netlify.app/

### 📂 Repositórios

**Front-End:**

https://github.com/mbalbuquerque/Front-End-pi

**Back-End:**

https://github.com/mbalbuquerque/projeto-integrador-4-periodo

---

## 🎯 2. Objetivos

### Objetivo geral

Desenvolver uma solução tecnológica para visualização e acompanhamento de condições ambientais em operações de transporte refrigerado.

### Objetivos específicos

- Monitorar temperatura e umidade relativa do ar.
- Apresentar indicadores de conectividade Wi-Fi.
- Consultar informações disponibilizadas pelo ThingSpeak.
- Disponibilizar um Dashboard de monitoramento.
- Representar operações de gestão logística.
- Disponibilizar interfaces de gestão de usuários e auditoria.
- Desenvolver uma interface responsiva.
- Oferecer suporte automatizado aos visitantes.
- Permitir encaminhamento de dúvidas ao desenvolvedor.
- Coletar avaliações de satisfação sobre o atendimento.
- Implementar testes automatizados de interface.
- Preparar a aplicação para integração com o Back-End.

---

## 🛠️ 3. Tecnologias utilizadas

| Tecnologia | Aplicação |
|---|---|
| HTML5 | Estrutura das páginas |
| CSS3 | Estilização e responsividade |
| JavaScript | Interações e lógica do Front-End |
| ESP32-C3 | Microcontrolador do protótipo IoT |
| Sensor DHT | Coleta de temperatura e umidade |
| ThingSpeak | Recebimento e disponibilização da telemetria |
| HTTP/REST | Comunicação com serviços externos |
| JSON | Formato de intercâmbio de dados |
| Playwright | Testes automatizados |
| Git | Controle de versões |
| GitHub | Repositório remoto |
| Netlify | Hospedagem do Front-End |
| PWA | Estrutura para experiência web instalável |

A autenticação, a persistência administrativa e outras operações de servidor fazem parte da evolução prevista com o Back-End.

---

## 🏗️ 4. Arquitetura da solução

O projeto possui uma arquitetura composta por coleta de dados IoT, disponibilização de telemetria e apresentação das informações em uma interface web.

### Fluxo de monitoramento

```text
┌───────────────────────┐
│ SENSOR AMBIENTAL DHT  │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ ESP32-C3              │
│ Leitura dos sensores  │
└───────────┬───────────┘
            │ Wi-Fi
            ▼
┌───────────────────────┐
│ THINGSPEAK            │
│ Canal de telemetria   │
└───────────┬───────────┘
            │ API HTTP / JSON
            ▼
┌───────────────────────┐
│ COLDTRACK CONTROL     │
│ Front-End Web         │
├───────────────────────┤
│ Dashboard             │
│ Monitoramento         │
│ Gestão Logística      │
│ Usuários              │
│ Auditoria             │
│ Assistente Virtual    │
└───────────────────────┘
```

### Integração administrativa prevista

A evolução da arquitetura contempla serviços de Back-End para autenticação, autorização, persistência de dados, auditoria e gestão das operações logísticas.

A integração com Azure Functions faz parte da arquitetura planejada para esses serviços.

---

## 📊 5. Funcionalidades do Front-End

### 5.1 Página inicial

A Home apresenta a identidade visual do ColdTrack Control e as principais características do projeto.

A página possui navegação para as áreas da plataforma e apresenta informações institucionais.

Também disponibiliza o Assistente Virtual ColdTrack, acessível por um botão flutuante.

### 5.2 Dashboard

O Dashboard reúne informações ambientais obtidas do ThingSpeak.

Indicadores apresentados:

- Temperatura em graus Celsius.
- Umidade relativa do ar.
- Intensidade do sinal Wi-Fi.
- Classificação da situação térmica.
- Horário da última atualização.
- Histórico recente das leituras.

### 5.3 Monitoramento

O módulo de Monitoramento permite consultar as leituras ambientais disponibilizadas pela API do ThingSpeak.

Funcionalidades:

- Consulta de telemetria.
- Apresentação da última leitura.
- Histórico recente.
- Visualização gráfica da temperatura.
- Atualização manual.
- Identificação de dados desatualizados.
- Tratamento de erros de comunicação.

**Canal ThingSpeak:** `3496439`

| Campo | Informação |
|---|---|
| Field 1 | Temperatura (°C) |
| Field 2 | Umidade relativa (%) |
| Field 3 | RSSI (dBm) |

### 5.4 Classificação térmica

A interface utiliza os seguintes limites demonstrativos:

| Temperatura | Situação |
|---|---|
| Até 15 °C | Normal |
| Acima de 15 °C até 20 °C | Atenção |
| Acima de 20 °C | Crítico |

**Importante:** esses valores são parâmetros de demonstração e precisam ser ajustados às exigências de cada mercadoria.

### 5.5 Gestão Logística

Módulo administrativo para representação de operações com cargas refrigeradas.

Funcionalidades demonstrativas:

- Cadastro de cargas.
- Consulta e filtragem.
- Visualização de detalhes.
- Edição.
- Conclusão de operações.
- Cancelamento de registros.
- Indicadores operacionais.

**Situação atual:** os dados utilizados são demonstrativos e não possuem persistência definitiva no servidor.

### 5.6 Gestão de Usuários

Interface destinada à administração de usuários e perfis de acesso.

Inclui:

- Listagem de usuários.
- Pesquisa.
- Filtros.
- Indicadores.
- Representação de perfis administrativos.

**Situação atual:** o controle real de permissões depende da integração com o Back-End.

### 5.7 Auditoria

Interface para consulta demonstrativa de eventos da plataforma.

Recursos:

- Pesquisa de registros.
- Filtragem por evento.
- Filtragem por resultado.
- Consulta por período.
- Visualização de detalhes.
- Exportação CSV.

**Situação atual:** os registros são demonstrativos. Logs reais precisarão ser produzidos e armazenados no servidor.

---

## 🤖 6. Assistente Virtual ColdTrack

O Front-End possui um assistente virtual interativo disponível na página inicial.

Seu objetivo é esclarecer dúvidas frequentes dos visitantes, reduzir solicitações repetitivas e facilitar o contato com o desenvolvedor.

### 6.1 Características

- Botão flutuante na Home.
- Interface responsiva.
- Mensagem inicial de boas-vindas.
- Perguntas rápidas.
- Campo para perguntas personalizadas.
- Base de conhecimento local.
- Respostas automáticas.
- Tratamento de perguntas desconhecidas.
- Indicador visual de digitação.
- Opção de atendimento humano.
- Avaliação de satisfação.

### 6.2 Assuntos disponíveis

O assistente responde perguntas sobre:

- Objetivo do ColdTrack Control.
- Sensores utilizados.
- ESP32.
- Temperatura e limites demonstrativos.
- Umidade relativa do ar.
- ThingSpeak.
- RSSI e conectividade.
- Dashboard.
- Monitoramento.
- Gestão Logística.
- Gestão de Usuários.
- Auditoria.
- Acesso à plataforma.
- Contato com o desenvolvedor.

### 6.3 Tecnologia do assistente

O chatbot foi desenvolvido utilizando HTML, CSS e JavaScript.

As respostas são selecionadas a partir de palavras-chave cadastradas em uma base de conhecimento local.

**O assistente não utiliza IA generativa nem depende de API paga.**

O conteúdo pode ser ampliado mediante atualização da base de conhecimento.

---

## 💬 7. Atendimento humano

Quando a resposta automática não resolve a dúvida, o visitante pode solicitar atendimento diretamente ao desenvolvedor.

O chat disponibiliza um botão permanente:

**Falar com o desenvolvedor**

O encaminhamento é realizado por meio do WhatsApp.

### Fluxo

```text
VISITANTE
    │
    ▼
ASSISTENTE VIRTUAL
    │
    ▼
RESPOSTA AUTOMÁTICA
    │
    ▼
A DÚVIDA FOI RESOLVIDA?
    │
    ├── SIM
    │    └── Avaliação do atendimento
    │
    └── NÃO
         ├── Avaliação do atendimento
         └── Contato pelo WhatsApp
```

O link do WhatsApp contém uma mensagem previamente preenchida, incluindo a última pergunta realizada no chat.

O visitante pode revisar a mensagem antes de enviá-la.

O atendimento humano depende da disponibilidade do responsável.

---

## ⭐ 8. Avaliação de atendimento

Após receber uma resposta, o visitante pode informar se sua dúvida foi resolvida.

Em seguida, é apresentada uma avaliação de satisfação.

### Funcionalidades

- Confirmação de resolução da dúvida.
- Nota de 1 a 5 estrelas.
- Comentário opcional.
- Validação de preenchimento da nota.
- Feedback após o registro.
- Prevenção de envio duplicado na mesma avaliação.
- Armazenamento local no navegador.

### Estrutura do registro

```json
{
  "nota": 5,
  "resolvida": true,
  "comentario": "Atendimento excelente!",
  "data": "2026-11-04T17:00:00.000Z"
}
```

O registro acima é apenas um exemplo da estrutura dos dados.

### Persistência atual

As avaliações são armazenadas por meio do `localStorage`, utilizando a chave:

```javascript
coldtrack_chat_avaliacoes_v1
```

**Limitação:** as avaliações permanecem no navegador em que foram registradas. Ainda não são enviadas para um banco de dados centralizado.

### Evolução prevista

A integração com o Back-End permitirá:

- Armazenamento centralizado das avaliações.
- Consulta administrativa.
- Cálculo da nota média.
- Percentual de dúvidas resolvidas.
- Análise dos comentários.
- Indicadores de satisfação.
- Histórico de atendimento.
- Relatórios gerenciais.

---

## 🧪 9. Qualidade e testes automatizados

O Front-End utiliza Playwright para automação dos testes de interface.

Os cenários contemplam navegação, funcionalidades dos módulos, tratamento de erros e comportamento responsivo.

### 9.1 Testes do Assistente Virtual

Foram desenvolvidos 16 cenários automatizados para validar o chat.

| ID | Cenário |
|---|---|
| QA-CHAT-01 | Exibição do botão do chat |
| QA-CHAT-02 | Abertura e fechamento |
| QA-CHAT-03 | Mensagem de boas-vindas |
| QA-CHAT-04 | Pergunta cadastrada |
| QA-CHAT-05 | Pergunta desconhecida |
| QA-CHAT-06 | Confirmação de resolução |
| QA-CHAT-07 | Dúvida resolvida |
| QA-CHAT-08 | Dúvida não resolvida |
| QA-CHAT-09 | Link do WhatsApp |
| QA-CHAT-10 | Inclusão da pergunta no link |
| QA-CHAT-11 | Validação obrigatória da nota |
| QA-CHAT-12 | Persistência local da avaliação |
| QA-CHAT-13 | Prevenção de avaliação duplicada |
| QA-CHAT-14 | Fechamento pela tecla Escape |
| QA-CHAT-15 | Tratamento seguro de HTML nas mensagens |
| QA-CHAT-16 | Adaptação às dimensões da tela |

### 9.2 Resultado da execução

**Resultado informado da última execução dos testes do chat:**

```text
32 passed
```

| Indicador | Resultado |
|---|---|
| Cenários | 16 |
| Ambientes | Desktop Chrome e Mobile Chrome |
| Execuções | 32 |
| Aprovadas | 32 |
| Falhas | 0 |
| Taxa de aprovação | 100% |

Esse resultado se refere aos testes automatizados do assistente virtual, não à cobertura integral do sistema.

### 9.3 Executar os testes

Na raiz do projeto:

```bash
npm install
npx playwright install chromium
```

Testes unitários (Vitest) e lint:

```bash
npm test
npm run lint
```

Testes de interface (Playwright, sobre o build servido por `vite preview` na porta 5500):

```bash
npm run build
npm run test:e2e
```

Para executar só os testes do chat:

```bash
npx playwright test chat-atendimento.spec.js --reporter=list
```

Para consultar o relatório HTML:

```bash
npm run test:e2e:report
```

Os testes automatizados não comprovam o recebimento efetivo das mensagens pelo desenvolvedor nem a persistência das avaliações em um servidor.

---

## 📁 10. Organização do projeto

O Front-End é uma aplicação React 18 + Vite 5 + React Router 6 (JavaScript). A estrutura, as regras e o passo a passo para migrar cada tela estão em [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md).

```text
Front-End-pi/
├── index.html            casca da aplicação
├── vite.config.js
├── public/               sw.js, manifest.json, ícones
├── src/
│   ├── App.jsx           rotas
│   ├── pages/            uma pasta por tela
│   ├── components/
│   ├── hooks/
│   ├── lib/              API, sessão, leituras, formatação
│   └── styles/           CSS por família, escopado
├── legado/               versão HTML/JS anterior (referência durante a migração)
├── coldtrack-qa/tests/   testes Playwright
└── docs/
```

As URLs antigas (`/dashboard.html?veiculo=...`, usadas nas etiquetas QR) continuam funcionando e redirecionam para as rotas novas (`/dashboard?veiculo=...`).

---

## 💻 11. Execução local

### Pré-requisitos

- Node.js 20 ou superior e npm.
- Git.

### Clonar e instalar

```bash
git clone https://github.com/mbalbuquerque/Front-End-pi.git
cd Front-End-pi
npm install
```

### Servidor de desenvolvimento

```bash
npm run dev
```

Acessar `http://localhost:5173/`.

### Build de produção

```bash
npm run build
npm run preview
```

O conteúdo de `dist/` é o que vai para o site estático no Azure (`publicar.sh` ou o workflow `publicar-site.yml`). A URL da API pode ser trocada com `VITE_API_URL` em um arquivo `.env.local`.

As funcionalidades que dependem de serviços externos exigem conectividade e disponibilidade desses serviços.

---

## 📱 12. Responsividade e PWA

A interface foi planejada para diferentes tamanhos de tela.

Recursos de responsividade:

- Layout adaptável.
- Menus ajustados para dispositivos móveis.
- Cartões reorganizados.
- Tabelas com rolagem horizontal quando necessário.
- Formulários responsivos.
- Chat com dimensões adaptadas à tela.

O projeto também contém arquivos relacionados à estrutura PWA:

- `public/manifest.json`
- `public/sw.js` (registrado só no build de produção)

A instalação, o funcionamento offline e o cache dependem da configuração efetiva desses arquivos e devem ser validados separadamente.

---

## 🔐 13. Segurança e limitações

O projeto considera boas práticas de desenvolvimento e separação de responsabilidades.

No assistente virtual, as mensagens são inseridas por meio de `textContent`, reduzindo o risco de interpretação de HTML enviado pelo visitante.

Também existe validação da nota antes de registrar a avaliação.

Entretanto, essas medidas não substituem controles de segurança no servidor.

### Limitações atuais

- O chatbot utiliza respostas predefinidas.
- Não existe IA generativa integrada.
- As avaliações são armazenadas localmente.
- Não existe painel centralizado de avaliações.
- O contato humano utiliza um link externo do WhatsApp.
- A autenticação segura depende do Back-End.
- A autorização de usuários ainda não está implementada no servidor.
- Os módulos administrativos utilizam dados demonstrativos.
- Os sensores ainda não estão vinculados individualmente às cargas demonstrativas.

Essas limitações fazem parte do estágio atual de desenvolvimento.

---

## 🚀 14. Próximas etapas

### Integração com Back-End

- [ ] Implementar autenticação real.
- [ ] Aplicar permissões por perfil.
- [ ] Persistir registros logísticos.
- [ ] Integrar dispositivos às cargas.
- [ ] Gerar logs reais de auditoria.

### Assistente Virtual

- [x] Criar botão flutuante.
- [x] Implementar perguntas e respostas.
- [x] Criar perguntas rápidas.
- [x] Implementar atendimento pelo WhatsApp.
- [x] Adicionar confirmação de resolução.
- [x] Implementar avaliação por estrelas.
- [x] Permitir comentário opcional.
- [x] Salvar avaliações localmente.
- [x] Validar 32 execuções automatizadas.
- [ ] Criar base de conhecimento em JSON.
- [ ] Criar API para armazenamento das avaliações.
- [ ] Desenvolver painel administrativo de satisfação.
- [ ] Implementar indicadores de atendimento.
- [ ] Avaliar futura integração com IA generativa.

### Qualidade

- [ ] Executar regressão completa após cada integração.
- [ ] Ampliar testes de acessibilidade.
- [ ] Validar recursos PWA e comportamento offline.
- [ ] Executar testes de integração com o Back-End.
- [ ] Realizar revisão de segurança antes da produção.

---

## 👥 15. Equipe do Projeto Integrador

Integrantes:

- Antonio Henzo
- Everson
- Emerson Luiz
- Gabriel Eduardo
- José Alanberg
- Marcelo Barbosa

O desenvolvimento envolve atividades de hardware, IoT, Front-End, Back-End, integração, documentação e testes.

---

## 📚 16. Referências técnicas

- [MDN Web Docs](https://developer.mozilla.org/)
- [ThingSpeak](https://thingspeak.mathworks.com/)
- [Playwright](https://playwright.dev/)
- [GitHub](https://github.com/)
- [Netlify](https://docs.netlify.com/)
- [Documentação do ESP32 — Espressif](https://docs.espressif.com/)

---

## 📄 17. Considerações finais

O ColdTrack Control demonstra a aplicação de tecnologias IoT e desenvolvimento web no acompanhamento de condições ambientais relacionadas à cadeia de frio.

O Front-End apresenta indicadores reais provenientes do ThingSpeak e módulos administrativos que representam funcionalidades previstas para a solução.

A implementação do assistente virtual acrescenta um canal de orientação aos visitantes, com respostas automáticas, atendimento humano pelo WhatsApp e avaliação de satisfação.

A validação automatizada do chat apresentou 32 execuções aprovadas, contribuindo para a confiabilidade das funcionalidades testadas.

A continuidade do projeto está concentrada na integração com o Back-End, na persistência dos dados administrativos e no desenvolvimento de mecanismos centralizados de autenticação, auditoria e acompanhamento dos atendimentos.

---

**ColdTrack Control — Projeto Integrador | 2026**
