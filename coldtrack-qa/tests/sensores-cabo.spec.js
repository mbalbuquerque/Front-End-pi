import { entrarComo, expect, simularApi, test } from "./apoio.js";

// Tela de Sensores, conexão pelo cabo USB com uma porta serial falsa no
// navegador (navigator.serial simulado): a "placa" responde ao protocolo
// CT< / CT> do firmware. Nada sai para a API de escrita: o sensor já é da
// empresa (troca só a rede, comando "wifi").

test.beforeEach(async ({ page }) => {

  await entrarComo(page, "gestor");
  await simularApi(page);

  await page.addInitScript(() => {

    const codificador = new TextEncoder();
    const decodificador = new TextDecoder();
    let controle;
    let resto = "";

    window.__comandosPlaca = [];

    const respostas = {
      info: () => ({ id: "esp32-teste-01", chip: "esp32-teste-01", configurado: true, ssid: "Casa", wifi: true, fw: "2026.11.16.2" }),
      redes: () => ({
        ok: true,
        redes: [
          { ssid: "Senac-Visitantes", rssi: -84, canal: 11, seguranca: "wpa2" },
          { ssid: "Senac-Login", rssi: -66, canal: 1, seguranca: "enterprise" }
        ].sort((a, b) => b.rssi - a.rssi)
      }),
      wifi: () => ({ ok: false, erro: "sinal_fraco", motivo: 15, rssi: -84, canal: 11, seguranca: "wpa2" })
    };

    function placa(objeto) {
      // Log comum antes da resposta, como na placa de verdade.
      controle.enqueue(codificador.encode(`WIFI: log da placa\r\nCT>${JSON.stringify(objeto)}\r\n`));
    }

    const porta = {
      readable: new ReadableStream({ start(c) { controle = c; } }),
      writable: new WritableStream({
        write(pedaco) {
          resto += decodificador.decode(pedaco);
          const linhas = resto.split("\n");
          resto = linhas.pop();
          for (const linha of linhas) {
            if (!linha.startsWith("CT<")) {
              continue;
            }
            const comando = JSON.parse(linha.slice(3));
            window.__comandosPlaca.push(comando);
            const responder = respostas[comando.cmd];
            setTimeout(() => placa(responder ? responder() : { ok: false, erro: "comando_desconhecido" }), 50);
          }
        }
      }),
      async open() {},
      async close() {}
    };

    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: {
        requestPort: async () => porta,
        addEventListener() {},
        removeEventListener() {}
      }
    });

  });

});


test("QA-SENSORES cabo: lista as redes que o sensor enxerga e explica a falha com sinal, canal e motivo", async ({ page }) => {

  await page.goto("/sensores");

  await page.getByRole("button", { name: "Conectar sensor pelo cabo" }).click();
  await expect(page.locator("#formCabo")).toBeVisible();

  await page.getByRole("button", { name: "Ver redes que o sensor enxerga" }).click();

  const linhas = page.locator("#tabelaRedes tbody tr");
  await expect(linhas).toHaveCount(2);
  await expect(linhas.nth(0)).toContainText("Senac-Login");
  await expect(linhas.nth(0)).toContainText("Login (Enterprise): não suportada");
  await expect(linhas.nth(0).getByRole("button")).toHaveCount(0);
  await expect(linhas.nth(1)).toContainText("Fraco (-84 dBm)");

  await linhas.nth(1).getByRole("button", { name: "Usar esta rede" }).click();
  await expect(page.locator("#formCabo input[name=ssid]")).toHaveValue("Senac-Visitantes");
  await expect(page.locator("#formCabo input[name=senha]")).toBeFocused();

  await page.locator("#formCabo input[name=senha]").fill("senha-da-rede");
  await page.getByRole("button", { name: "Trocar rede" }).click();

  const alerta = page.locator("#painelCabo .erro-form[role=alert]");
  await expect(alerta).toContainText("O sinal da rede “Senac-Visitantes” chega fraco no sensor");
  await expect(alerta).toContainText("Sinal no sensor: Fraco (-84 dBm), canal 11. (motivo 15)");

  await alerta.getByRole("link", { name: "Ver ajuda" }).click();
  await expect(page.locator("#ajuda-sinal")).toBeVisible();

  // A busca de redes não leva senha; a senha só vai no comando de troca de rede.
  const comandos = await page.evaluate(() => window.__comandosPlaca);
  expect(comandos.map(c => c.cmd)).toEqual(["info", "redes", "wifi"]);
  expect(comandos[1]).toEqual({ cmd: "redes" });
  expect(comandos[2]).toEqual({ cmd: "wifi", ssid: "Senac-Visitantes", senha: "senha-da-rede" });

});
