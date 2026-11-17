# ColdTrack Control — design system

Referência visual do painel (telas internas e app). A landing page pública fica fora deste
documento. Valor visual que não está aqui não se inventa no arquivo de tela: ou entra aqui
primeiro, com o motivo, ou usa o que já existe.

## 1. Produto e público

- Monitoramento da cadeia fria em caminhões refrigerados que levam manga e uva do Vale do São
  Francisco até os portos.
- **Gestor de logística** no computador: acompanha vários veículos, cadastra, audita.
- **Operador e motorista** no celular, muitas vezes ao sol: precisam ler o número de longe.
- Idioma: português do Brasil.

## 2. Princípios

1. **Calmo por padrão, alto só quando algo está errado.** Superfícies neutras; cor fica
   reservada para status.
2. **O número é o herói.** Em toda tela de monitoramento, a temperatura atual é o maior
   elemento.
3. **Status nunca só por cor.** Sempre texto + ícone ou forma: NORMAL / ATENÇÃO / CRÍTICO,
   Online / Offline.
4. **Pouco cromo.** Sem gradiente decorativo, vidro, ilustração de banco de imagem, avatar ou
   função de mentira.
5. **Forma com significado.** A faixa de temperatura é uma régua horizontal com zonas (segura,
   atenção, crítica) e um marcador no valor atual; sensores são pílulas; viagens são linha do
   tempo; cargas são quadro por situação.
6. **Uma navegação só.** Barra lateral com dois grupos (Operação e Gestão) no computador;
   barra inferior com 5 itens no celular. Não existem mais "duas áreas" com menus diferentes.

## 3. Cores (tokens)

| token | valor | uso |
|---|---|---|
| `navy-900` | `#0B1F3A` | barra lateral, texto principal sobre claro |
| `blue-700` | `#0B5CAD` | ação primária, link |
| `cyan-500` | `#0EA5E9` | marca, anel de foco, indicador "ao vivo" — nunca texto de corpo sobre branco |
| `surface` | `#FFFFFF` | cartões |
| `canvas` | `#F4F7FA` | fundo da página |
| `border` | `#DCE3EA` | bordas de 1 px |
| `muted` | `#475569` | texto de apoio (≥ 4,5:1 sobre branco) |
| `status-normal` | `#0F7A4A` sobre `#E3F6EC` | NORMAL, Online, sucesso |
| `status-atencao` | `#8A5A00` sobre `#FFF4D6` | ATENÇÃO |
| `status-critico` | `#B42318` sobre `#FDE7E6` | CRÍTICO, erro, ação destrutiva |
| `status-offline` | `#3F4A54` sobre `#E6EBEF` | Offline, sem contato |

Faixa offline (sem internet): barra `#8F1D1D` com texto branco (contraste ~8:1).

Tons de apoio, acrescentados na implementação (todos derivados da paleta acima):

| token | valor | uso e motivo |
|---|---|---|
| `navy-800` | `#132C4D` | item da barra lateral sob o ponteiro (texto `on-navy-muted` 6,9:1) |
| `navy-700` | `#1D3A5F` | divisória sobre navy |
| `blue-50` | `#E8F1FB` | fundo de selo/destaque azul (`blue-700` sobre ele: 5,9:1) |
| `subtle` | `#F8FAFC` | bloco dentro de cartão |
| `border-strong` | `#C3CED9` | borda de campo de formulário |
| `on-navy` | `#E2E8F0` | texto principal sobre navy (13,4:1) |
| `on-navy-muted` | `#A9B8C9` | texto de apoio sobre navy (8,2:1) |
| `atencao-borda` | `#E5A500` | forma de ATENÇÃO (barra, ponto, linha de limite); nunca texto |
| `critico-borda` | `#F3CACA` | borda de caixa de erro |
| `disabled` | `#9AA6B1` | fundo de botão desabilitado (fora da regra de contraste, WCAG 1.4.3) |

### Implementação

Todos os tokens moram em `src/styles/tokens.css`, como custom properties `--ct-*` no `:root`
(fora das pastas de família, então sem prefixo de escopo). As variáveis antigas de cada família
(`--navy`, `--muted`, `--border`...) apontam para eles. Valor novo de cor, fonte, raio, sombra
ou movimento entra primeiro aqui e em `tokens.css`, nunca solto no CSS da tela.

## 4. Tipografia

- **Títulos e números grandes:** Barlow Condensed 700 (fonte da casa para produto; compacta,
  boa para números densos).
- **Corpo, rótulos e tabelas:** Inter.
- As duas fontes são servidas pelo próprio site (pacotes `@fontsource`, subconjunto latino,
  importados em `src/main.jsx`); a CSP fica com `font-src 'self'`, sem Google Fonts.
- Números com algarismos tabulares (`font-variant-numeric: tabular-nums`).

| nível | fonte | tamanho | peso | altura de linha |
|---|---|---|---|---|
| display (temperatura herói) | Barlow Condensed | 56–120 px | 700 | 1,05 |
| headline (título da página) | Barlow Condensed | 32 px | 700 | 1,15 |
| title (título de cartão) | Barlow Condensed | 22 px | 700 | 1,2 |
| body | Inter | 16 px | 500 | 1,5 |
| label | Inter | 13 px | 600 | 1,4 |
| caption | Inter | 12 px | 600 | 1,4 |

**Piso (não se fura sem perguntar):** corpo ≥ 15 px; texto pequeno ≥ 12 px e sempre peso ≥ 600;
título e botão nunca peso 300/400; `letter-spacing` negativo só acima de 24 px e no máximo
-0,5 px; contraste do texto ≥ 4,5:1.

## 5. Forma, espaço e elevação

- Raio: 8 px (botão, campo), 12 px (cartão), pílula = 9999 px.
- Espaçamento: 4 / 8 / 16 / 24 / 32 / 48.
- Elevação: cartões planos com borda de 1 px; **um** nível de sombra, só para sobreposições
  (diálogo, gaveta, toast).

## 6. Movimento

- Transições de UI de 150 a 250 ms com `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out forte).
- Gaveta: 280 ms com `cubic-bezier(0.32, 0.72, 0, 1)` (abaixo do teto de 300 ms da casa).
- Tokens: `--ct-dur-fast` 150 ms, `--ct-dur-base` 200 ms, `--ct-dur-slow` 250 ms,
  `--ct-dur-drawer` 280 ms, `--ct-ease-out`, `--ct-ease-drawer`, `--ct-enter-scale` 0,96. Com
  `prefers-reduced-motion` as durações vão a zero no próprio `tokens.css`.
- **Proibido:** `ease-in` em UI e `scale(0)`. Entrada a partir de `scale(0.96)` + opacidade.
- Valor ao vivo mudou: destaque de 200 ms, sem pulo.
- Ação usada muitas vezes por dia (trocar aba, filtrar) não anima.
- `prefers-reduced-motion` desliga junto.

## 7. Componentes

| componente | regra |
|---|---|
| Barra lateral | navy, logo + "ColdTrack Control"; grupos Operação (Visão geral, Veículos, Sensores, Viagens, Alertas, Relatórios) e Gestão (Usuários, só para o gestor, Monitoramento ThingSpeak, Configurações); rodapé com usuário e "Sair" |
| Barra superior | título da página, seletor de veículo, pílula "Azure conectado" e "atualizado há N s" |
| Navegação inferior (celular) | Visão geral, Alertas, Sensores, Viagens, Mais; alvo ≥ 44 px |
| Cartão herói de temperatura | número display, pílula de status, régua de faixa com marcador |
| Régua de faixa | zonas segura / atenção / crítica com tom claro da cor de status, marcador com o valor |
| Tile de KPI | rótulo label, valor title/headline, uma linha de apoio |
| Pílula de status | texto em maiúsculas + ícone; cores da seção 3 |
| Selo Online/Offline | ponto + texto + "Último contato dd/mm HH:MM" |
| Tabela | cabeçalho fixo, linhas de 48 px, números alinhados à direita |
| Gráfico | linhas tracejadas de limite (Atenção, Crítico), faixa segura sombreada, pico marcado |
| Linha do tempo | ocorrências de alerta, viagens e auditoria agrupadas por dia |
| Quadro | cargas por situação (Aguardando, Em transporte, Em atenção) |
| Diálogo | centralizado, fundo escurecido, um nível de sombra |
| Gaveta | cadastros com poucos campos (veículo, viagem) abrem à direita |
| Estado vazio | uma frase + uma ação |
| Estado de erro | faixa vermelha com ícone e a mensagem da API |
| Faixa offline | topo fixo, `#8F1D1D`, "Sem conexão — exibindo os últimos dados recebidos às HH:MM" |
| Tela do motorista | sem navegação; fundo tingido pelo status; número herói gigante; botões ≥ 56 px |

### Shell implementado (`components/PainelLayout.jsx`, `styles/shell/shell.css`)

- Uma barra lateral `#sidebar` de 256 px; até 720 px ela mesma vira a navegação inferior (um só
  `nav` "Menu principal" nos dois tamanhos). "Mais" abre o menu inteiro como gaveta de baixo
  (280 ms, `ease-drawer`), com véu; Escape, o véu ou um item fecham.
- Ícones de traço em SVG no próprio código (`components/Icone.jsx`): sem fonte de ícones externa.
- Barra superior clara também no celular: o protótipo de celular troca o título por uma barra
  navy só com logo, mas o `<h1>` da tela precisa continuar visível.
- Rótulo da navegação inferior em 12 px/600 (o protótipo usa 10 px, abaixo do piso).
- "atualizado às HH:MM" (hora real da última resposta da API) no lugar de "atualizado há N s".

### Telas de acesso implementadas (`components/AcessoLayout.jsx`, `styles/login/login.css`)

- `/login` e `/cadastro` dividem a mesma moldura: painel navy (45%) com a marca e a régua de faixa
  (segura, atenção, crítica) e o formulário num cartão. No celular a marca vira faixa curta no topo.
- Frase do painel: a da equipe ("Inteligência e segurança para a cadeia fria."), não a do protótipo.
- Mensagem da tela em caixa com ícone: vermelha para erro (texto da API), azul para orientação
  ("Esqueceu a senha?"). O aviso de sessão de 8 horas continua abaixo do formulário.

### Veículos, viagens e relatórios implementados (`styles/painel/frota.css`)

- **Gaveta** (`components/Gaveta.jsx`): `<dialog>` modal de 420 px à direita (largura toda no
  celular), topo com título e X de 44 px, campos empilhados, rodapé com Cancelar e a ação. Entra em
  280 ms com `ease-drawer`; sai na hora. Erro da API em caixa vermelha dentro da gaveta.
- **Veículos**: contagem da frota + "Cadastrar veículo" no topo; cartão com a temperatura em
  display (56 px) como maior elemento, umidade e última comunicação, perfil/dispositivo/sensor e as
  ações (Ver no painel, Etiqueta QR; Remover sozinho na linha de baixo).
- **Viagens**: linha do tempo origem → destino. Sem GPS não há posição real: a linha só diz a
  situação (tracejada "Em trânsito", cheia "Encerrada"). No celular ela fica de pé. Quatro blocos
  (início, duração, faixa registrada, tempo fora da faixa, este com borda de atenção quando houve
  ocorrência), gráfico em caixa e rodapé com Remover à esquerda e Encerrar viagem à direita.
- **Relatórios**: filtro segmentado (trilho neutro, opção marcada em branco), Baixar CSV como botão
  secundário com ícone, KPIs em display com borda de status quando o número pede atenção (2 x 2 no
  celular), tabela com cabeçalho fixo dentro de uma área rolável (560 px), linhas de 48 px e marca de
  4 px na borda da linha fora da faixa.
- Desvios do protótipo: sem a barra de progresso falsa do cartão do veículo (não há dado que ela
  meça); selo "PLANEJADO" uma vez no fim da lista, não por viagem; sem paginação na tabela (a API
  devolve até 500 leituras e a tabela rola); "Salvar" do protótipo continua "Cadastrar"/"Registrar"
  (o nome da ação não muda); rótulos em 13 px/600 em vez de 12 px em caixa alta.

### Visão geral implementada (`pages/Dashboard`)

- Cartão herói: rótulo "Carga atual" com o perfil real, pílula de status com ícone, temperatura em
  Barlow Condensed 64–104 px (a maior coisa da tela) e a frase de status abaixo.
- Régua de faixa (`ReguaFaixa.jsx` + `regua.js`): zonas calculadas da faixa da carga (só máximo:
  segura, atenção, crítica; com mínimo: as cinco zonas), escala de 0 °C (ou abaixo, se preciso) até
  máximo + 2 margens, esticada quando a leitura sai dela; marcador com o valor e legenda em texto.
- Tiles de umidade, sinal Wi-Fi e sensor (selo Online/Sem contato com a hora do último contato).
- Desvios do protótipo: sem "Ideal para uva", "MQTT/IoT Hub", "Abertura de porta" nem nome de
  variedade; o gráfico, o risco térmico e o calor na rota continuam como estão (fase própria).

### Tela do motorista implementada (`pages/Motorista/Motorista.jsx`, `styles/motorista/motorista.css`)

- Fundo da tela inteira no tom claro do status (`normal-bg`, `atencao-bg`, `critico-bg`,
  `offline-bg` para SEM SINAL); barra superior navy só com o veículo e "Sair".
- Pílula de status cheia na cor do status, com ícone e texto (branco: 5,4:1 a 9,1:1).
- Temperatura em Barlow Condensed 700, 112–184 px, sempre em `navy-900` (14:1 no fundo crítico);
  a unidade fica na cor do status. Leitura antiga: número em `status-offline` (7,6:1 ou mais) e
  selo "LEITURA ANTIGA".
- Régua da faixa da carga com zonas crítica / atenção / segura (`atencao-borda` só como forma) e
  marcador navy no valor atual; os limites em °C escritos embaixo. A escala vai uma margem além do
  último limite e cresce para caber a leitura.
- Piso reforçado: corpo ≥ 17 px peso ≥ 600, rótulo ≥ 15 px, botões ≥ 56 px (inclusive "Sair").
- Nada se move: sem transição nem animação (dado novo troca no lugar); o e2e confere.
- Desvios do protótipo: sem a chave "Manter tela acesa" (o Wake Lock é automático; a tela diz se
  está ligado), sem "próxima leitura em N s", número com o separador decimal que o resto do painel
  usa, cores do protótipo (verde do Tailwind) trocadas pelos tokens.

### Telas de gestão implementadas (`styles/gestao/gestao.css`, `styles/painel/configuracoes.css`)

- Todas usam a barra superior do shell (título e apoio); Monitoramento é uma família própria
  (`gestao`), sem o assistente. As telas de exemplo (Usuários, Auditoria, Logística, Novo usuário)
  foram retiradas: o produto não mostra dado inventado; usuários ficam em Configurações.
- **Diálogo** (`.dialogo`): centralizado, 520 px, topo com título (e X de 44 px quando o protótipo
  tem), corpo e rodapé com as ações à direita; entra de `scale(0.96)` + opacidade em 200 ms e sai na
  hora. Detalhes em lista rótulo/valor.
- **Monitoramento ThingSpeak**: "Atualizar leituras" na barra superior; temperatura em display
  (56 px, cor do status) como maior número; gráfico com limites tracejados (verde 15 °C, âmbar
  20 °C) e legenda em HTML; abaixo de 1100 px os rótulos de dentro do SVG somem (ficariam com
  menos de 12 px) e a legenda carrega a informação.
- **Configurações**: seções com título e explicação à esquerda e conteúdo à direita (empilha abaixo
  de 900 px); Faixas e Usuários ocupam a largura toda. Faixas com pílula de cor por zona; Usuários
  com "você" em selo, Trocar veículo/Redefinir senha/Remover e o bloco "Novo usuário" logo abaixo
  da lista; "Excluir empresa" em seção de borda vermelha.
- Desvios do protótipo: o formulário de novo usuário continua na própria tela, não num
  diálogo (o fluxo e os testes preenchem o formulário direto); título "Monitoramento de sensores" mantido; sem "Azure
  conectado" nas telas que não falam com a API; sem avatar com iniciais; sem a frase "placa física
  via MQTT" nem "Auditoria contínua da cadeia de custódia" (texto inventado).

## 8. Acessibilidade

- Contraste ≥ 4,5:1 em todo texto.
- Alvo de toque ≥ 44 px no celular (≥ 56 px na tela do motorista).
- Anel de foco de 2 px com 2 px de afastamento: `blue-700` sobre superfície clara e `cyan-500`
  sobre navy (cyan sobre branco dá 2,8:1, abaixo dos 3:1 de WCAG 1.4.11).
- Botão só com ícone tem rótulo de texto ou `aria-label`.

## 9. Desvios permitidos ao implementar a partir do protótipo

O HTML de cada tela é a especificação (estrutura, tokens, espaçamento). Pode desviar só em:

- dado real no lugar do exemplo do protótipo;
- remover texto que o protótipo inventou (ex.: "abertura de porta", nome de variedade da fruta,
  "MQTT/IoT Hub");
- seletores dos testes e2e mantidos;
- piso de legibilidade e de movimento acima.

Todo desvio fica listado no PR.
