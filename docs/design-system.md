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
| Barra lateral | navy, logo + "ColdTrack Control"; grupos Operação (Visão geral, Veículos, Sensores, Viagens, Alertas, Relatórios) e Gestão (Logística, Usuários, Auditoria, Monitoramento ThingSpeak, Configurações); rodapé com usuário e "Sair" |
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
