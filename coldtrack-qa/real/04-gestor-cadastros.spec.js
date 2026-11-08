import { expect, test } from "@playwright/test";
import { desenharQr, enderecoEtiqueta } from "../../src/pages/Veiculos/etiqueta.js";
import {
  CARIMBO,
  ESTADO,
  MOTIVO_SEM_CREDENCIAIS,
  QA,
  SITE,
  TEM_CREDENCIAIS,
  aceitarDialogos,
  chamarApi,
  limparQa,
  tokenDe
} from "./apoio-real.js";

// Ida e volta dos cadastros do gestor pela tela, conferindo pela API:
// sensor -> veículo (+ etiqueta QR) -> viagem -> chave nova -> remoções.
// Tudo com o prefixo QA-<timestamp>; o afterAll apaga o que sobrar.

test.skip(!TEM_CREDENCIAIS, MOTIVO_SEM_CREDENCIAIS);
test.describe.configure({ mode: "serial" });
test.use({ storageState: ESTADO.gestor });

let primeiraChave = null;
let viagemId = null;

const api = caminho => chamarApi(caminho, { token: tokenDe("gestor") });

const linhaSensor = page => page.locator("#tabelaSensores tbody tr", {
  has: page.locator("td:first-child strong", { hasText: new RegExp(`^${QA.sensor}$`) })
});

const cardVeiculo = page => page.locator("article.item-card", {
  has: page.locator("h3", { hasText: new RegExp(`^${QA.veiculo}$`) })
});


test.afterAll(async () => {
  if (!TEM_CREDENCIAIS) return;
  const { falhas } = await limparQa(tokenDe("gestor"), { carimbo: CARIMBO });
  expect(falhas, falhas.join("\n")).toEqual([]);
});


test("REAL-GES-01: registrar sensor mostra a chave uma única vez", async ({ page }) => {

  await page.goto("/sensores");
  await expect(page.getByText("Azure conectado")).toBeVisible();

  await page.getByRole("heading", { level: 2, name: "Registrar sem cabo" }).click();
  const form = page.locator("#formSensor");
  await form.locator("input[name=id]").fill(QA.sensor);
  await form.locator("input[name=descricao]").fill(`${QA.veiculo} sensor e2e`);

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith("/api/dispositivos") && r.request().method() === "POST"),
    form.getByRole("button", { name: "Registrar sensor" }).click()
  ]);
  expect(resposta.status()).toBe(201);
  primeiraChave = (await resposta.json()).chave;
  expect(primeiraChave).toBeTruthy();

  const painel = page.locator("#chaveNova .chave-nova");
  await expect(painel.getByRole("heading")).toHaveText(`Chave do sensor ${QA.sensor}`);
  await expect(painel.locator("pre")).toHaveText(`#define DEVICE_ID  "${QA.sensor}"\n#define DEVICE_KEY "${primeiraChave}"`);

  await expect(linhaSensor(page)).toBeVisible();
  await expect(linhaSensor(page)).toContainText("nenhum");

  await page.locator("#fecharChave").click();
  await expect(painel).toHaveCount(0);

  // Recarregou: a chave não volta (o banco guarda só o hash).
  await page.reload();
  await expect(linhaSensor(page)).toBeVisible();
  await expect(page.locator("#chaveNova .chave-nova")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(primeiraChave);

  const { dados } = await api("/dispositivos");
  const gravado = dados.dispositivos.find(d => d.id === QA.sensor);
  expect(gravado).toMatchObject({ id: QA.sensor, descricao: `${QA.veiculo} sensor e2e` });
  expect(gravado.chave).toBeUndefined();
  expect(gravado.chaveHash).toBeUndefined();

});


test("REAL-GES-02: cadastrar veículo com perfil existente e ver na lista", async ({ page }) => {

  await page.goto("/veiculos");
  await expect(page.getByText("Azure conectado")).toBeVisible();

  await page.getByRole("heading", { level: 2, name: "Cadastrar veículo" }).click();
  const form = page.locator("#formVeiculo");
  await form.locator("input[name=id]").fill(QA.veiculo);
  await form.locator("input[name=tipo]").fill(`${QA.veiculo} Van refrigerada`);
  await form.locator("select[name=deviceId]").selectOption(QA.sensor);
  await form.locator("input[name=dispositivo]").fill("ESP32-C3 + DHT11 (teste)");
  await form.locator("select[name=perfil]").selectOption("manga");

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith("/api/veiculos") && r.request().method() === "POST"),
    form.getByRole("button", { name: "Cadastrar" }).click()
  ]);
  expect(resposta.status(), JSON.stringify(await resposta.json())).toBe(201);

  const card = cardVeiculo(page);
  await expect(card).toBeVisible();
  await expect(card).toContainText(`${QA.veiculo} Van refrigerada`);
  await expect(card).toContainText("Manga");
  await expect(card).toContainText(QA.sensor);
  await expect(card).toContainText("nunca enviou dados");

  const { dados } = await api("/veiculos");
  expect(dados.veiculos.find(v => v.id === QA.veiculo)).toMatchObject({
    id: QA.veiculo, deviceId: QA.sensor, perfil: "manga", dispositivo: "ESP32-C3 + DHT11 (teste)"
  });

});


test("REAL-GES-03: etiqueta QR codifica /dashboard.html?veiculo=<código> e abre o veículo", async ({ page }) => {

  await page.goto("/veiculos");
  await cardVeiculo(page).getByRole("button", { name: "Etiqueta QR" }).click();

  const dialogo = page.locator("dialog#etiqueta");
  await expect(dialogo).toBeVisible();
  await expect(dialogo.locator("strong")).toHaveText(QA.veiculo);

  // O desenho na tela é o QR exato do endereço esperado.
  const esperado = enderecoEtiqueta(QA.veiculo, SITE);
  expect(esperado).toBe(`${SITE}/dashboard.html?veiculo=${QA.veiculo}`);
  await expect(dialogo.locator("svg path")).toHaveAttribute("d", desenharQr(esperado).caminho);

  await page.locator("#fecharEtiqueta").click();
  await expect(dialogo).toHaveCount(0);

  // O endereço do QR abre o painel já neste veículo.
  await page.goto(esperado);
  await expect(page).toHaveURL(new RegExp(`/dashboard\\?veiculo=${QA.veiculo}$`));
  await expect(page.locator("#veiculoCodigo")).toHaveText(QA.veiculo);
  await expect(page.locator("#veiculoSensor")).toHaveText(QA.sensor);

});


test("REAL-GES-04: registrar viagem do veículo QA, encerrar e remover", async ({ page }) => {

  const dialogos = aceitarDialogos(page);

  await page.goto("/viagens");
  await expect(page.getByText("Azure conectado")).toBeVisible();

  await page.getByRole("heading", { level: 2, name: "Registrar viagem" }).click();
  const form = page.locator("#formViagem");
  await form.locator("select[name=veiculo]").selectOption(QA.veiculo);
  await form.locator("input[name=origem]").fill(QA.origem);
  await form.locator("input[name=destino]").fill("Porto de Suape/PE");
  await form.locator("input[name=carga]").fill("Manga Tommy Atkins (teste)");

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith("/api/viagens") && r.request().method() === "POST"),
    form.getByRole("button", { name: "Registrar" }).click()
  ]);
  expect(resposta.status(), JSON.stringify(await resposta.json())).toBe(201);
  viagemId = (await resposta.json()).id;
  expect(viagemId).toMatch(/^V-[0-9A-F]{6}$/);

  const painel = page.locator("article.panel", { has: page.getByRole("heading", { name: `${viagemId} · ${QA.veiculo}` }) });
  await expect(painel).toBeVisible();
  await expect(painel).toContainText("EM ANDAMENTO");
  await expect(painel).toContainText(QA.origem);

  await painel.getByRole("button", { name: "Encerrar viagem" }).click();
  await expect(painel).toContainText("CONCLUÍDA");
  expect(dialogos.at(-1)).toBe(`Encerrar a viagem ${viagemId} agora?`);

  let { dados } = await api("/viagens");
  const encerrada = dados.viagens.find(v => v.id === viagemId);
  expect(encerrada).toMatchObject({ veiculo: QA.veiculo, origem: QA.origem });
  expect(new Date(encerrada.fim).getTime()).toBeGreaterThan(new Date(encerrada.inicio).getTime());

  await painel.getByRole("button", { name: "Remover" }).click();
  await expect(painel).toHaveCount(0);

  ({ dados } = await api("/viagens"));
  expect(dados.viagens.some(v => v.id === viagemId)).toBe(false);

});


test("REAL-GES-05: gerar nova chave do sensor; sensor em uso não pode ser removido", async ({ page }) => {

  const dialogos = aceitarDialogos(page);

  await page.goto("/sensores");
  await expect(linhaSensor(page)).toContainText(QA.veiculo);

  const [resposta] = await Promise.all([
    page.waitForResponse(r => r.url().endsWith(`/api/dispositivos/${QA.sensor}`) && r.request().method() === "PUT"),
    linhaSensor(page).locator(`[data-nova-chave="${QA.sensor}"]`).click()
  ]);
  expect(resposta.status()).toBe(200);
  const novaChave = (await resposta.json()).chave;
  expect(novaChave).toBeTruthy();
  expect(novaChave).not.toBe(primeiraChave);

  await expect(page.locator("#chaveNova pre")).toContainText(`#define DEVICE_KEY "${novaChave}"`);
  expect(dialogos[0]).toContain(`Gerar nova chave para ${QA.sensor}?`);

  // Veículo ainda usa o sensor: a API recusa (409) e a tela avisa.
  await linhaSensor(page).locator(`[data-remover="${QA.sensor}"]`).click();
  await expect.poll(() => dialogos.length).toBe(3);
  expect(dialogos[2]).toContain(`o veículo ${QA.veiculo} usa este sensor`);
  await expect(linhaSensor(page)).toBeVisible();

});


test("REAL-GES-06: remover veículo e depois o sensor", async ({ page }) => {

  const dialogos = aceitarDialogos(page);

  await page.goto("/veiculos");
  await cardVeiculo(page).getByRole("button", { name: "Remover veículo" }).click();
  await expect(cardVeiculo(page)).toHaveCount(0);
  expect(dialogos[0]).toContain(`Remover o veículo ${QA.veiculo}?`);

  let { dados } = await api("/veiculos");
  expect(dados.veiculos.some(v => v.id === QA.veiculo)).toBe(false);

  await page.goto("/sensores");
  await expect(linhaSensor(page)).toContainText("nenhum");
  await linhaSensor(page).locator(`[data-remover="${QA.sensor}"]`).click();
  await expect(linhaSensor(page)).toHaveCount(0);

  ({ dados } = await api("/dispositivos"));
  expect(dados.dispositivos.some(d => d.id === QA.sensor)).toBe(false);

});
