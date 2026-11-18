import { HOST_API, entrarComo, expect, respostaMotorista, simularApi, test } from "./apoio.js";

// Sensor de temperatura em falha (#52): a placa está viva e manda heartbeat,
// a API devolve `sensor: "falha"` e `sensorFalhaDesde` em GET /dispositivos e
// GET /motorista. API simulada; o estado do sensor muda entre as consultas.

const DESDE = "2026-11-17T14:02:20+00:00";

// Momento esperado na tela, pela regra de formatarMomento (o navegador do teste
// usa o fuso da máquina): só a hora no mesmo dia, "dd/mm hh:mm" em outro dia.
// Calculado no relógio da página para o teste não vencer quando a data passa.
async function horaLocal(page) {
  return page.evaluate(desde => {
    const data = new Date(desde);
    const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (data.toDateString() === new Date().toDateString()) {
      return hora;
    }
    return `${data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora}`;
  }, DESDE);
}

// Sobrepõe as duas rotas do simularApi; `estado.sensor` decide a próxima resposta.
async function simularSensor(page, estado) {

  await page.route(HOST_API, async route => {

    const pedido = route.request();
    const caminho = new URL(pedido.url()).pathname.replace(/^\/api/, "");
    const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type" };
    const falha = estado.sensor === "falha";
    const campos = { sensor: estado.sensor, sensorFalhaDesde: falha ? DESDE : null };

    if (pedido.method() === "GET" && caminho === "/dispositivos") {
      return route.fulfill({
        headers,
        json: {
          dispositivos: [
            { id: "esp32-teste-01", descricao: "Baú da van", online: true, ultimoContato: new Date().toISOString(), ...campos },
            { id: "esp32-teste-02", descricao: "Reserva", online: false, ultimoContato: null, sensor: null, sensorFalhaDesde: null }
          ]
        }
      });
    }

    if (pedido.method() === "GET" && caminho === "/motorista") {
      return route.fulfill({ headers, json: { ...respostaMotorista("NORMAL", falha ? 20 : 0), ...campos } });
    }

    return route.fallback();

  });

}


test("QA-FALHA-01 sensores: falha com a hora, continua Online e some quando o sensor volta", async ({ page }) => {

  const estado = { sensor: "falha" };
  await entrarComo(page, "gestor");
  await simularApi(page);
  await simularSensor(page, estado);
  await page.clock.install();

  await page.goto("/sensores");
  const linha = page.locator("table.tabela tbody tr").filter({ hasText: "esp32-teste-01" });

  await expect(linha.locator("[data-sensor-falha]")).toHaveText(`Sensor em falha desde ${await horaLocal(page)}`);
  await expect(linha.locator('[data-conexao="online"]')).toHaveText("Online");
  await expect(linha.locator(".sensor-temp")).toContainText("última válida");

  estado.sensor = "ok";
  await page.clock.runFor(21000);
  await expect(linha.locator("[data-sensor-falha]")).toHaveCount(0);

});


test("QA-FALHA-02 visão geral: aviso do sensor em falha com a última leitura dita antiga", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);
  await simularSensor(page, { sensor: "falha" });

  await page.goto("/dashboard");
  const aviso = page.locator("#falhaSensorAviso");
  await expect(aviso).toContainText(`Sensor em falha desde ${await horaLocal(page)}`);
  await expect(aviso).toContainText("última leitura válida, não os atuais");

});


test("QA-FALHA-03 visão geral e sensores com API antiga (sem o campo sensor): nada muda", async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);

  await page.goto("/dashboard");
  await expect(page.locator("#temperatura")).not.toHaveText("-- °C");
  await expect(page.locator("#falhaSensorAviso")).toHaveCount(0);

  await page.goto("/sensores");
  await expect(page.locator('[data-conexao="online"]')).toBeVisible();
  await expect(page.locator("[data-sensor-falha]")).toHaveCount(0);

});


test("QA-FALHA-04 motorista: falha com a hora e a última leitura válida marcada como antiga", async ({ page }) => {

  const estado = { sensor: "falha" };
  await entrarComo(page, "motorista");
  await simularApi(page);
  await simularSensor(page, estado);
  await page.clock.install();

  await page.goto("/motorista");
  await expect(page.locator("#falhaSensorMotorista")).toContainText(`Sensor em falha desde ${await horaLocal(page)}`);
  await expect(page.locator("#seloAntigo")).toHaveText("LEITURA ANTIGA");

  estado.sensor = "ok";
  await page.clock.runFor(21000);
  await expect(page.locator("#falhaSensorMotorista")).toHaveCount(0);

});
