// Protocolo do cabo USB (SensorUsb) com uma porta serial falsa.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRONTO_MS, SensorUsb, serialDisponivel } from "./serial.js";


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
    // Sinais pedidos pelo painel, na ordem.
    sinais: [],
    async setSignals(sinais) {
      porta.sinais.push(sinais);
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


  it("configurar espera até 50 s (scan repetido + teste de até 25 s na placa)", async () => {

    vi.useFakeTimers();
    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    let resposta = "pendente";
    usb.configurar({ cmd: "wifi", ssid: "Campus", senha: "12345678" }).then(r => { resposta = r; });

    await vi.advanceTimersByTimeAsync(49000);
    expect(resposta).toBe("pendente");
    await vi.advanceTimersByTimeAsync(1500);
    expect(resposta).toBeNull();

    vi.useRealTimers();
    await usb.fechar();

  });


  it("redes pede a lista à placa e devolve a resposta", async () => {

    const porta = criarPorta(linha => linha.includes('"redes"')
      ? 'log comum\nCT>{"ok":true,"redes":[{"ssid":"Campus","rssi":-61,"canal":6,"seguranca":"wpa2"}]}\n'
      : null);
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const resposta = await usb.redes();

    expect(porta.escrito).toEqual(['CT<{"cmd":"redes"}\n']);
    expect(resposta).toEqual({ ok: true, redes: [{ ssid: "Campus", rssi: -61, canal: 6, seguranca: "wpa2" }] });

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


  it("info pergunta a cada 2 s e desiste com null depois de 20 s", async () => {

    vi.useFakeTimers();
    const usb = new SensorUsb();
    usb.enviar = vi.fn(async (comando, tempoMs) => {
      await new Promise(r => setTimeout(r, tempoMs));
      return null;
    });

    let info = "pendente";
    usb.info().then(r => { info = r; });

    await vi.advanceTimersByTimeAsync(PRONTO_MS - 100);
    expect(info).toBe("pendente");
    await vi.advanceTimersByTimeAsync(200);

    expect(info).toBeNull();
    expect(PRONTO_MS).toBe(20000);
    expect(usb.enviar).toHaveBeenCalledTimes(10);
    expect(usb.enviar).toHaveBeenCalledWith({ cmd: "info" }, 2000);
    vi.useRealTimers();

  });


  it("solta RTS antes de DTR, em duas chamadas, logo depois de abrir", async () => {

    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    // RTS ativo com DTR inativo reinicia o ESP32-C3: a ordem evita esse estado.
    expect(porta.sinais).toEqual([{ requestToSend: false }, { dataTerminalReady: false }]);
    expect(porta.escrito).toEqual([]);

    await usb.fechar();

  });


  it("porta sem setSignals, ou que recusa, segue funcionando", async () => {

    for (const setSignals of [undefined, async () => { throw new Error("NotSupported"); }]) {

      const porta = criarPorta(linha => linha.includes('"info"') ? 'CT>{"id":"x"}\n' : null);
      porta.setSignals = setSignals;
      instalarSerial(porta);

      const usb = new SensorUsb();
      await usb.conectar();
      expect(await usb.info()).toEqual({ id: "x" });
      await usb.fechar();

    }

  });


  it("placa que reiniciou ao abrir: espera o boot e a linha de prontidão antes de seguir", async () => {

    vi.useFakeTimers();

    // Durante o boot a placa não lê a serial: o info se perde. Ao fim do setup ela
    // manda a linha de prontidão e passa a responder.
    let pronta = false;
    const porta = criarPorta(linha => pronta && linha.includes('"info"')
      ? 'CT>{"id":"coldtrack-ab12","fw":"2026.11.16.3"}\n'
      : null);
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    let info = "pendente";
    usb.info().then(r => { info = r; });

    porta.placa("ESP-ROM:esp32c3-api1-20210207\r\nrst:0x15 (USB_UART_CHIP_RESET)\r\n");
    await vi.advanceTimersByTimeAsync(3000);
    porta.placa("Conectando ao Wi-Fi Campus..........\r\n");
    await vi.advanceTimersByTimeAsync(6500);
    expect(info).toBe("pendente");

    pronta = true;
    porta.placa('Sistema iniciado.\r\nCT>{"pronto":true,"fw":"2026.11.16.3"}\r\n');
    await vi.advanceTimersByTimeAsync(50);

    // A linha de prontidão corta a espera: o info sai de novo na hora, sem esperar os 2 s.
    expect(info).toEqual({ id: "coldtrack-ab12", fw: "2026.11.16.3" });
    expect(usb.pronta).toBe(true);
    expect(porta.escrito.every(l => l === 'CT<{"cmd":"info"}\n')).toBe(true);

    vi.useRealTimers();
    await usb.fechar();

  });


  it("linha de prontidão no meio de um comando não vira resposta dele", async () => {

    const porta = criarPorta();
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const pendente = usb.enviar({ cmd: "redes" }, 5000);
    porta.placa('CT>{"pronto":true,"fw":"2026.11.16.3"}\n');

    // Placa reiniciou: o comando se perdeu, quem esperava recebe null.
    expect(await pendente).toBeNull();

    await usb.fechar();

  });


  it("redes repete uma vez quando o scan foi recusado", async () => {

    let pedidos = 0;
    const porta = criarPorta(linha => {
      if (!linha.includes('"redes"')) {
        return null;
      }
      pedidos += 1;
      return pedidos === 1
        ? 'CT>{"ok":false,"erro":"scan_falhou"}\n'
        : 'CT>{"ok":true,"redes":[{"ssid":"Campus","rssi":-61,"canal":6,"seguranca":"wpa2"}]}\n';
    });
    instalarSerial(porta);

    const usb = new SensorUsb();
    await usb.conectar();

    const resposta = await usb.redes();

    expect(porta.escrito).toEqual(['CT<{"cmd":"redes"}\n', 'CT<{"cmd":"redes"}\n']);
    expect(resposta.ok).toBe(true);

    await usb.fechar();

  });


  it("redes não repete mais de uma vez nem repete outro erro", async () => {

    const usb = new SensorUsb();

    usb.enviar = vi.fn(async () => ({ ok: false, erro: "scan_falhou" }));
    expect(await usb.redes()).toEqual({ ok: false, erro: "scan_falhou" });
    expect(usb.enviar).toHaveBeenCalledTimes(2);
    expect(usb.enviar).toHaveBeenCalledWith({ cmd: "redes" }, 20000);

    usb.enviar = vi.fn(async () => ({ ok: false, erro: "comando_desconhecido" }));
    await usb.redes();
    expect(usb.enviar).toHaveBeenCalledTimes(1);

  });


  it("serialDisponivel segue o navigator", () => {

    vi.stubGlobal("navigator", {});
    expect(serialDisponivel()).toBe(false);

    vi.stubGlobal("navigator", { serial: {} });
    expect(serialDisponivel()).toBe(true);

  });

});
