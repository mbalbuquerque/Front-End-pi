# ColdTrack Control: design system (Stitch)

Exportado do projeto "ColdTrack redesign" no Google Stitch (design system `assets/12104712681961130730`),
usado para gerar a tela do motorista (`stitch-motorista.html` e `stitch-motorista.png`, nesta pasta).
A implementação em React fica em `src/pages/Motorista/` e segue `docs/design-system.md` do painel;
onde os dois divergem, vale o do painel (fonte Inter em tudo, sem Barlow Condensed).

Produto: monitoramento B2B da cadeia fria em caminhões refrigerados que levam manga e uva do Vale do
São Francisco aos portos. Usuários: gestor de logística no computador; operador e motorista no
celular, muitas vezes ao ar livre e sob sol forte. Idioma: português do Brasil.

## Princípios
1. Calmo por padrão, chamativo só quando algo está errado. Superfícies neutras; a cor é reservada
   para o status.
2. O número é o herói: a temperatura atual é o maior elemento de qualquer tela de monitoramento.
3. Status nunca só por cor: sempre texto + ícone ou forma (NORMAL / ATENÇÃO / CRÍTICO, Online / Offline).
4. Pouco enfeite: sem gradiente decorativo, sem glassmorphism, sem ilustração de banco de imagem,
   sem avatar, sem funcionalidade de mentira.
5. Formas carregam significado: a faixa de temperatura é uma barra horizontal (zona segura) com o
   valor atual como marcador; sensores como pílulas; viagens como linha do tempo.

## Cores
| token | valor | uso |
|---|---|---|
| navy-900 | `#0B1F3A` | barra lateral, texto principal sobre claro |
| blue-700 | `#0B5CAD` | ações principais, links |
| cyan-500 | `#0EA5E9` | destaque da marca, anel de foco, indicador "ao vivo"; nunca texto sobre branco |
| surface / canvas | `#FFFFFF` / `#F4F7FA` | cartões / fundo |
| border | `#DCE3EA` | borda de cartão |
| muted | `#475569` | texto de apoio (≥ 4.5:1 no branco) |
| normal | `#0F7A4A` sobre `#E3F6EC` | status |
| atenção | `#8A5A00` sobre `#FFF4D6` | status |
| crítico | `#B42318` sobre `#FDE7E6` | status |
| offline | `#3F4A54` sobre `#E6EBEF` | status |

## Tipografia
Inter. Corpo ≥ 15 px (16 px padrão; 17 px na tela do motorista), texto pequeno ≥ 12 px sempre com
peso ≥ 600, line-height 1.4 a 1.5, letter-spacing negativo só acima de 24 px e nunca abaixo de
-0.5 px. Números com algarismos tabulares.

## Forma, espaço, elevação
Raio 8 px (cartões 12 px, bloco de status 16 px, pílulas totalmente arredondadas). Escala de espaço
4/8/16/24/32/48. Cartões planos com borda de 1 px; sombra só em sobreposição (diálogo, gaveta, toast).

## Movimento
Transições de UI de 150 a 250 ms, `ease-out` `cubic-bezier(0.23, 1, 0.32, 1)`; gaveta
`cubic-bezier(0.32, 0.72, 0, 1)` 300 ms; nunca `ease-in`, nunca `scale(0)` (entra de 0.96 + opacidade).
Dado novo a cada 20 s não anima. Respeita `prefers-reduced-motion`.

## Componentes
Barra lateral (desktop) / navegação inferior (celular); barra do topo com pílula de conexão; bloco de
KPI; régua da faixa de temperatura; pílula de status; linha de sensor com selo online e último
contato; tabela com cabeçalho fixo; cartão de gráfico com linhas de limite; diálogo; gaveta; toast;
estado vazio (uma frase + uma ação); estado de erro; faixa offline (barra vermelho-escura, texto branco).

## Acessibilidade
Contraste ≥ 4.5:1 em todo texto; alvos de toque ≥ 44 px no celular; anel de foco de 2 px cyan-500
com 2 px de afastamento; todo botão só com ícone tem rótulo em texto ou `aria-label`.

## Tela do motorista (o que o Stitch gerou)
De cima para baixo, pensada para o celular no suporte:
1. Barra navy com o veículo e o botão Sair (44 px).
2. Bloco de status na cor do estado: pílula com ícone e texto, temperatura gigante, frase do que
   fazer e um selo "há 20 s".
3. Cartão da faixa da carga com a régua e o marcador no valor atual.
4. Mini gráfico dos últimos 30 min com a banda segura, linhas de limite tracejadas com rótulo direto
   e um selo de tendência ("subindo +1,2 °C em 10 min").
5. Dois blocos: umidade e horário da última leitura.
6. Cartão da viagem com linha do tempo de dois pontos (origem e destino), carga e tempo de viagem.
7. Lista de alertas da viagem, mais novo primeiro, com ponto colorido + texto do status.
8. Rodapé: "Use com o celular no suporte" e o estado da tela sempre acesa.
