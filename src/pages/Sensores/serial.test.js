// Protocolo do cabo USB (SensorUsb) com uma porta serial falsa.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SensorUsb, serialDisponivel } from "./serial.js";


// Porta falsa: guarda o que o painel escreveu e deixa o teste mandar bytes "da placa".
// responder(linhaEscrita) devolve o texto que a placa manda de volta (ou nada).
function criarPorta(responder = () => null) {

  const decodificador = new TextDecoder();
  const codificador = new TextEncoder();
  let controle;

  const porta = {
    escrito: [],
    aberta: null,
    fechada: false,
    readable: new ReadableStream({
      start(c) {
        controle = c;
      }
    }),
    writable: new WritableStream({
      write(pedaco) {
        const texto = decodificador.decode(pedaco);
        porta.escrito.push(texto);
        const resposta = responder(texto);
        if (resposta) {
          setTimeout(() => porta.placa(resposta), 0);
        }
      }
    }),
    async open(opcoes) {
      porta.aberta = opcoes;
    },
    async close() {
      porta.fechada = true;
    },
    // Bytes vindos da placa.
    placa(texto) {
      controle.enqueue(codificador.encode(texto));
    },
    // Cabo tirado: fim do fluxo de leitura.
    encerrar() {
      controle.close();
    }
  };

  return porta;

}


function instalarSerial(porta) {

  const ouvintes = [];

  const serial = {
    requestPort: vi.fn(async () => porta),
    addEventListener: (nome, fn) => ouvintes.push({ nome, fn }),
    disparar(nome, alvo) {
      ouvintes.filter(o => o.nome === nome).forEach(o => o.fn({ target: alvo }));
    }
  };

  vi.stubGlobal("navigator", { ...globalThis.navigator, serial });

  return serial;

}


describe("SensorUsb", () => {

  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });


  it("abre a porta a 115200 e manda o info no formato CT<{json}\\n", async () => {

    const porta = criarPorta(linha => linha.includes('"info"')
      ? 'CT>{"id":"COLDTRACK-AB12","fw":"1.2","configurado":false}\n'
      : null);
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const info = await usb.info();

    expect(porta.aberta).toEqual({ baudRate: 115200 });
    expect(porta.escrito[0]).toBe('CT<{"cmd":"info"}\n');
    expect(info).toEqual({ id: "COLDTRACK-AB12", fw: "1.2", configurado: false });

    await usb.fechar();
    expect(porta.fechada).toBe(true);

  });


  it("ignora o log comum e junta resposta que chega em pedaços", async () => {

    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const pendente = usb.enviar({ cmd: "info" }, 1000);

    porta.placa("[boot] DHT11 ok\nWiFi: tentando...\nCT>{\"id\":\"x");
    porta.placa("1\",\"ok\":true}\r\n");

    expect(await pendente).toEqual({ id: "x1", ok: true });

    await usb.fechar();

  });


  it("acha o CT> no meio da linha e ignora JSON cortado", async () => {

    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const pendente = usb.enviar({ cmd: "info" }, 1000);

    porta.placa("lixo CT>{\"id\":\n");                  // cortado: ignorado
    porta.placa("12:00:01 CT>{\"id\":\"ok\"}\n");       // prefixo de log antes do CT>

    expect(await pendente).toEqual({ id: "ok" });

    await usb.fechar();

  });


  it("devolve null quando a placa não responde a tempo", async () => {

    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    expect(await usb.enviar({ cmd: "info" }, 30)).toBeNull();

    await usb.fechar();

  });


  it("configurar manda ssid, senha, id e chave só para a placa", async () => {

    const porta = criarPorta(linha => linha.includes('"config"')
      ? 'CT>{"ok":true,"rssi":-58}\n'
      : null);
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const comando = { cmd: "config", ssid: "Casa", senha: "12345678", id: "coldtrack-ab12", chave: "k" };
    const resposta = await usb.configurar(comando);

    expect(porta.escrito).toEqual([`CT<${JSON.stringify(comando)}\n`]);
    expect(resposta).toEqual({ ok: true, rssi: -58 });

    await usb.fechar();

  });


  it("cabo tirado: quem esperava resposta recebe null", async () => {

    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const pendente = usb.enviar({ cmd: "info" }, 5000);
    porta.encerrar();

    expect(await pendente).toBeNull();

  });


  it("evento disconnect da própria porta chama aoDesconectar", async () => {

    const porta = criarPorta();
    const serial = instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const aoDesconectar = vi.fn();
    usb.aoDesconectar = aoDesconectar;

    serial.disparar("disconnect", { outra: true });
    expect(aoDesconectar).not.toHaveBeenCalled();

    serial.disparar("disconnect", porta);
    expect(aoDesconectar).toHaveBeenCalledTimes(1);

    await usb.fechar();

  });


  it("info tenta 6 vezes e desiste com null", async () => {

    const usb = new SensorUsb();
    usb.enviar = vi.fn(async () => null);

    expect(await usb.info()).toBeNull();
    expect(usb.enviar).toHaveBeenCalledTimes(6);
    expect(usb.enviar).toHaveBeenCalledWith({ cmd: "info" }, 2000);

  });


  it("serialDisponivel segue o navigator", () => {

    vi.stubGlobal("navigator", {});
    expect(serialDisponivel()).toBe(false);

    vi.stubGlobal("navigator", { serial: {} });
    expect(serialDisponivel()).toBe(true);

  });

});
