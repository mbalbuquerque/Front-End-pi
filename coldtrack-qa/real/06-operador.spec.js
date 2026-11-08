import { expect, test } from "@playwright/test";
import { CARIMBO, ESTADO, MOTIVO_SEM_CREDENCIAIS, TEM_CREDENCIAIS, chamarApi, errosDoConsole, tokenDe } from "./apoio-real.js";

// Operador: só consulta. Na tela, nenhum controle de gestor; na API, as ações
// de gestor respondem 403. Os pedidos de escrita usam ids que não existem e
// corpos inválidos: mesmo que a checagem de perfil falhasse, nada seria gravado.

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);
test.use({ storageState: ESTADO.operador });

const TELAS = [
  { rota: "/dashboard", titulo: "Visão Geral", ausentes: [] },
  { rota: "/alertas", titulo: "Alertas", ausentes: [] },
  { rota: "/relatorios", titulo: "Relatórios", ausentes: [] },
  { rota: "/veiculos", titulo: "Veículos", ausentes: ["#painelNovo", "#formVeiculo", "button.perigo"] },
  { rota: "/sensores", titulo: "Sensores", ausentes: ["#painelCabo", "#formSensor", "[data-nova-chave]", "[data-remover]"] },
  { rota: "/viagens", titulo: "Viagens", ausentes: ["#painelNovo", "#formViagem", "button.perigo"] },
  { rota: "/configuracoes", titulo: "Configurações", ausentes: ["#painelUsuarios", "#formUsuario"] }
];


for (const tela of TELAS) {

  test(`REAL-OPE-01 ${tela.rota}: operador lê a tela sem controles de gestor`, async ({ page }) => {

    const erros = errosDoConsole(page);

    await page.goto(tela.rota);
    await expect(page.getByRole("heading", { level: 1, name: tela.titulo })).toBeVisible();
    await expect(page.getByText("Azure conectado")).toBeVisible();
    await expect(page.locator(".usuario-menu")).toContainText("Operador logístico");

    for (const seletor of tela.ausentes) {
      await expect(page.locator(seletor), `${seletor} não deveria aparecer para o operador`).toHaveCount(0);
    }

    expect(erros, erros.join("\n")).toEqual([]);

  });

}


test("REAL-OPE-02: API permite leitura ao operador", async () => {

  const token = tokenDe("operador");

  const eu = await chamarApi("/eu", { token });
  expect(eu.status).toBe(200);
  expect(eu.dados.perfil).toBe("operador");

  for (const rota of ["/veiculos", "/dispositivos", "/viagens", "/perfis"]) {
    const { status } = await chamarApi(rota, { token });
    expect(status, rota).toBe(200);
  }

});


test("REAL-OPE-03: API recusa com 403 as ações de gestor feitas pelo operador", async () => {

  const token = tokenDe("operador");
  const inexistente = `qa-${CARIMBO}-inexistente`;

  const pedidos = [
    ["GET", "/usuarios"],
    ["POST", "/usuarios", {}],
    ["PUT", `/usuarios/${inexistente}@teste.coldtrack.app`, {}],
    ["DELETE", `/usuarios/${inexistente}@teste.coldtrack.app`],
    ["POST", "/veiculos", {}],
    ["PUT", `/veiculos/QA-${CARIMBO}-X`, {}],
    ["DELETE", `/veiculos/QA-${CARIMBO}-X`],
    ["POST", "/dispositivos", {}],
    ["PUT", `/dispositivos/${inexistente}`, {}],
    ["DELETE", `/dispositivos/${inexistente}`],
    ["POST", "/viagens", {}],
    ["DELETE", "/viagens/V-QA0000"]
  ];

  for (const [metodo, rota, corpo] of pedidos) {
    const { status, dados } = await chamarApi(rota, { metodo, token, corpo });
    expect(status, `${metodo} ${rota}`).toBe(403);
    expect(dados, `${metodo} ${rota}`).toEqual({ erros: ["seu perfil não tem acesso a esta ação"] });
  }

});
