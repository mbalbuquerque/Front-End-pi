# Evidências do painel (issue #84)

Prints gerados em 23/11/2026 com a API simulada dos testes e2e (dados sintéticos, sem conta de produção); o mesmo fluxo roda ao vivo em produção.

Captura em tela de computador (1366 × 900, página inteira), com o build publicado (`vite preview`) e a API interceptada por `coldtrack-qa/tests/apoio.js` (`entrarComo`, `simularApi`). Os testes e2e que cobrem cada item estão em [`coldtrack-qa/`](../../../coldtrack-qa/README.md).

| print | o que mostra | item da #84 |
|---|---|---|
| [`login.png`](login.png) | tela de entrada com e-mail e senha; a sessão vale 8 horas | login com perfis |
| [`visao-geral.png`](visao-geral.png) | gestor na Visão Geral: valor atual (6.0 °C), faixa da carga, sensor Online com último contato, previsão de 10 min do sensor e risco térmico da saída | resultado da IA (risco e previsão do sensor), status online |
| [`alertas.png`](alertas.png) | ocorrência de ATENÇÃO (pico 17.5 °C) acima do limiar de 15 °C da carga | alertas por limiar visíveis |
| [`relatorios-24h.png`](relatorios-24h.png) | histórico do sensor do VAN-01 (`VAN-01 · sensor esp32-teste-01`) com o filtro "Últimas 24 h" | histórico com filtro por período e sensor |
| [`relatorios-7dias.png`](relatorios-7dias.png) | o mesmo histórico com o filtro "Últimos 7 dias" ativo | histórico com filtro por período |
| [`sensores.png`](sensores.png) | lista de sensores com selo Online (último contato) e Offline (sem contato) | status online/offline |
| [`sem-dados.png`](sem-dados.png) | Visão Geral com a última leitura antiga: aviso "Sem dados desde 22:06" e sensor "Sem contato" | status online/offline |
| [`motorista.png`](motorista.png) | perfil motorista: tela própria com o status da carga, a faixa e a previsão de 10 min | login com perfis |
| [`operador-sem-controles.png`](operador-sem-controles.png) | perfil operador em Configurações: sem o item Usuários no menu e sem o cadastro de usuários e a exclusão da empresa, que só o gestor vê | login com perfis |

A API simulada devolve as mesmas leituras para qualquer período; nos prints de Relatórios o que muda é o filtro escolhido e o resumo ("últimas 24 h" / "últimos 7 dias"). O pedido à API com `horas=24` e `horas=168` é conferido pelo teste `relatorios-filtro.spec.js`.
