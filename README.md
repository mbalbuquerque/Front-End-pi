# ❄️ ColdTrack Control

### Dashboard PWA para Monitoramento IoT de Transporte Refrigerado

O **ColdTrack Control** é a interface web do projeto **ColdTrack Edge**, desenvolvido como parte do **Projeto Integrador – 4º Período**.

A aplicação permite visualizar dados de **temperatura, umidade relativa e qualidade do sinal Wi-Fi** coletados por um nó sensor baseado em **ESP32-C3** e enviados para a plataforma **ThingSpeak**.

O projeto tem como cenário de aplicação o **monitoramento da cadeia fria durante o transporte refrigerado de mercadorias**, especialmente produtos sensíveis às condições ambientais.

---

## 🚚 Visão Geral

O ColdTrack foi concebido para monitorar as condições ambientais dentro de veículos e compartimentos refrigerados.

A arquitetura atual funciona da seguinte forma:

```text
Sensor DHT11 / DHT22
        ↓
     ESP32-C3
        ↓
 Processamento Edge
        ↓
       Wi-Fi
        ↓
    ThingSpeak
        ↓
     API REST
        ↓
 ColdTrack Control
        ↓
       PWA
```

O **DHT22** é utilizado atualmente na simulação Wokwi, enquanto o **DHT11** é destinado ao protótipo físico.

---

## 📊 Funcionalidades

A versão atual do ColdTrack Control possui:

- 🌡️ Visualização da temperatura;
- 💧 Monitoramento da umidade relativa;
- 📶 Monitoramento do RSSI Wi-Fi;
- 🚦 Classificação do estado da carga;
- ☁️ Integração com ThingSpeak;
- 🔄 Atualização automática da telemetria;
- ⚠️ Indicação de condições de atenção e críticas;
- 📱 Layout responsivo;
- 📲 Estrutura de Progressive Web App (PWA);
- 💾 Service Worker para armazenamento dos arquivos principais da aplicação.

---

## 🚦 Classificação Edge

Para fins de demonstração do protótipo, foram definidos os seguintes limites:

| Temperatura | Status |
|---|---|
| Até 15 °C | 🟢 NORMAL |
| Acima de 15 °C até 20 °C | 🟡 ATENÇÃO |
| Acima de 20 °C | 🔴 CRÍTICO |

> **Importante:** esses valores são demonstrativos. Em uma aplicação real, os limites deverão ser configurados conforme o tipo de mercadoria, requisitos técnicos e condições operacionais da cadeia fria.

---

## ☁️ Integração com ThingSpeak

A telemetria é armazenada em um canal ThingSpeak.

Os campos utilizados são:

| Field | Informação |
|---|---|
| Field 1 | Temperatura (°C) |
| Field 2 | Umidade Relativa (%) |
| Field 3 | RSSI Wi-Fi (dBm) |

O front-end consulta a API do ThingSpeak periodicamente e atualiza automaticamente o dashboard.

## ☁️ Integração com Azure

Com `DATA_SOURCE: "azure"` (padrão), o dashboard lê as leituras gravadas no Azure Cosmos DB pela rota pública de consulta da Azure Function:

```text
GET https://func-coldtrack-7319.azurewebsites.net/api/leituras?deviceId=coldtrack-01&limite=20
```

A rota é somente leitura e liberada via CORS para o Live Server (`http://127.0.0.1:5500` e `http://localhost:5500`) e para o endereço publicado. Ao publicar o dashboard em outro endereço, esse endereço precisa ser adicionado ao CORS do Function App.

### Publicação

O site está publicado no Azure Storage (site estático, região Brazil South):

**https://stcoldtrackweb7319.z15.web.core.windows.net**

O Azure Static Web Apps não está disponível nas regiões liberadas para a assinatura Azure for Students da instituição, por isso foi usado o site estático do Storage. Para publicar uma nova versão:

```bash
az storage blob upload-batch --account-name stcoldtrackweb7319 -s <pasta-do-site> -d '$web' --overwrite
```

O dashboard fica em `dashboard.html` (acessado pelo botão da página inicial).

### Telas

| tela | o que mostra |
|---|---|
| `dashboard.html` | leitura atual e gráfico dos últimos 30 min com a faixa normal e os limites |
| `alertas.html` | ocorrências fora da faixa (leituras seguidas viram uma ocorrência), com duração e pico |
| `relatorios.html` | resumo de 24 h ou 7 dias, gráfico, tabela de leituras e exportação em CSV |
| `veiculos.html` | situação atual de cada veículo, com aviso de sensor sem sinal |
| `viagens.html` | condição da carga do início ao fim de cada trajeto |
| `configuracoes.html` | faixas de temperatura, dispositivo e fonte de dados (somente leitura) |

Arquivos compartilhados: `js/comum.js` (menu, consulta à API, formatação), `js/grafico.js` (gráfico de temperatura) e `css/telas.css`.
Frota, viagens e perfis de carga do piloto ficam em `js/config.js` até existir o cadastro com login.

---

## 🛠️ Tecnologias

### Hardware / Edge

- ESP32-C3
- DHT11
- DHT22 na simulação
- Wi-Fi
- Arduino Framework
- Wokwi

### Cloud

- ThingSpeak
- API REST

### Front-End

- HTML5
- CSS3
- JavaScript
- Fetch API
- Web App Manifest
- Service Worker
- PWA

---

## 📁 Estrutura do Projeto

```text
Front-End-pi/
│
├── index.html
├── manifest.json
├── sw.js
│
├── css/
│   └── style.css
│
└── js/
    ├── config.js
    └── app.js
```

### `index.html`

Interface principal do dashboard.

### `css/style.css`

Identidade visual, layout, cards, estados da carga e responsividade.

### `js/config.js`

Configurações públicas da aplicação, como:

- fonte da telemetria (`DATA_SOURCE`: `"azure"` ou `"thingspeak"`);
- endereço da API de leitura no Azure e ID do dispositivo;
- ID do canal ThingSpeak;
- intervalo de atualização;
- limites demonstrativos de temperatura.

### `js/app.js`

Responsável por:

- consultar o ThingSpeak;
- processar a telemetria;
- atualizar os indicadores;
- classificar a temperatura;
- controlar alertas;
- apresentar informações da última leitura.

### `manifest.json`

Configurações da Progressive Web App.

### `sw.js`

Service Worker responsável pelo cache dos arquivos essenciais da interface.

---

## ▶️ Executando Localmente

Clone o repositório:

```bash
git clone https://github.com/mbalbuquerque/Front-End-pi.git
```

Entre na pasta:

```bash
cd Front-End-pi
```

Para desenvolvimento, recomenda-se executar o projeto através de um servidor HTTP local, como a extensão **Live Server** do Visual Studio Code.

Abra:

```text
index.html
```

utilizando:

```text
Open with Live Server
```

---

## 🔐 Segurança

Credenciais privadas não devem ser armazenadas no front-end.

O dashboard utiliza somente informações necessárias para leitura dos dados públicos.

Chaves privadas de escrita do ThingSpeak, senhas Wi-Fi e outras credenciais do dispositivo Edge **não devem ser adicionadas a este repositório**.

No firmware do ESP32, essas informações devem permanecer em arquivo separado e ignorado pelo Git.

---

## 📱 PWA

O ColdTrack Control está sendo desenvolvido como uma **Progressive Web App**.

A estrutura inclui:

```text
manifest.json
sw.js
```

Isso permitirá que, após publicação em ambiente HTTPS compatível, a aplicação possa ser utilizada como uma experiência semelhante a um aplicativo em dispositivos compatíveis.

---

## 🔮 Próximas Etapas

O roadmap do ColdTrack Control inclui:

- 📈 gráficos históricos de temperatura e umidade;
- 🚚 cadastro e monitoramento de veículos;
- 📦 cadastro de cargas;
- 🗺️ origem e destino das viagens;
- ⚠️ central de alertas;
- 📑 relatórios por viagem;
- 🔔 notificações;
- 🛰️ localização GPS;
- 🔐 autenticação de usuários;
- ☁️ evolução da infraestrutura Cloud;
- 🤖 modelos preditivos para identificação de riscos à qualidade da carga.

---

## 🌱 Aplicação no Agronegócio

O projeto foi concebido considerando o ecossistema do agronegócio do **Vale do São Francisco**, especialmente as regiões de **Petrolina/PE e Juazeiro/BA**.

Uma possível aplicação é o acompanhamento das condições ambientais durante o transporte de produtos agrícolas sensíveis, contribuindo para rastreabilidade e monitoramento da cadeia fria.

---

## 👥 Equipe

**Projeto Integrador – 4º Período**

- Antonio Henzo
- Everson
- Emerson Luiz
- Gabriel Eduardo
- José Alanberg
- Marcelo Barbosa

---

## ⚠️ Status

O ColdTrack Edge e o ColdTrack Control encontram-se em fase de **protótipo acadêmico / prova de conceito**.

O sistema atual não deve ser considerado um equipamento industrial certificado.

Para utilização comercial seriam necessárias etapas adicionais de engenharia, calibração, validação, segurança, conectividade e atendimento aos requisitos técnicos e regulatórios aplicáveis.

---

## 📄 Licença

Projeto desenvolvido para fins acadêmicos no **Projeto Integrador – 4º Período – 2026**.

---

# ❄️ ColdTrack

> **Da origem ao destino, sua carga monitorada.**