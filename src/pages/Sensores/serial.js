// Conversa com o sensor pelo cabo USB (Web Serial, só Chrome/Edge no computador).
// Protocolo do firmware (sketch.ino): uma linha JSON por mensagem,
// painel -> placa começa com "CT<", placa -> painel com "CT>".
// O resto da serial é o log comum do sensor e é ignorado aqui.
// Porte do site antigo: js/serial.js (mesmo comportamento, agora como módulo).
//
// Abrir a porta pode reiniciar a placa: no ESP32-C3 o controlador USB
// Serial/JTAG reinicia o chip enquanto RTS está ativo com DTR inativo (a mesma
// lógica do circuito de auto-reset com dois transistores; os dois ativos não
// reiniciam). Depois do boot a placa passa segundos conectando ao Wi-Fi salvo,
// e comando que chega nesse meio tempo se perde ou falha. Por isso o painel
// espera a placa ficar pronta (linha CT>{"pronto":true,...} do fim do setup,
// ou um "info" respondido) antes de mandar qualquer outro comando.

// Tempo máximo esperando a placa ficar pronta depois de abrir a porta: boot,
// 1 s de espera do setup e até 10 s tentando o Wi-Fi salvo.
export const PRONTO_MS = 20000;

// Intervalo entre os "info" enquanto espera a placa.
const INFO_MS = 2000;

// Lido na hora (e não no carregamento do módulo) para valer o navegador atual.
export function serialDisponivel() {

  return typeof navigator !== "undefined" && "serial" in navigator;

}


export class SensorUsb {

  constructor() {
    this.porta = null;
    this.leitor = null;
    this.escritor = null;
    this.esperando = null;      // { resolver, timer } da resposta em curso
    this.aoDesconectar = null;
    this.fimLeitura = null;
    this.fimEscrita = null;
    this.pronta = false;        // viu a linha de prontidão desde que abriu
  }


  // Abre a janela do navegador para escolher a porta. Lança NotFoundError se cancelar.
  async conectar() {

    this.porta = await navigator.serial.requestPort();
    await this.porta.open({ baudRate: 115200 });
    await this.soltarSinais();

    const codificador = new TextEncoderStream();
    this.fimEscrita = codificador.readable.pipeTo(this.porta.writable).catch(() => {});
    this.escritor = codificador.writable.getWriter();

    this.lerLinhas();

    navigator.serial.addEventListener("disconnect", evento => {
      if (evento.target === this.porta && this.aoDesconectar) {
        this.aoDesconectar();
      }
    });

  }


  // Deixa RTS e DTR inativos depois de abrir, em duas chamadas e com o RTS
  // primeiro: assim a linha nunca passa por RTS ativo com DTR inativo, que é o
  // estado que reinicia a placa. Se o próprio open já reiniciou a placa, isso
  // não desfaz; a espera por "pronto" cobre esse caso. Navegador sem
  // setSignals segue sem ele.
  async soltarSinais() {

    if (typeof this.porta.setSignals !== "function") {
      return;
    }

    try {
      await this.porta.setSignals({ requestToSend: false });
      await this.porta.setSignals({ dataTerminalReady: false });
    } catch {
      // Porta não aceita mudar os sinais: segue com os que estão.
    }

  }


  async lerLinhas() {

    const decodificador = new TextDecoderStream();
    this.fimLeitura = this.porta.readable.pipeTo(decodificador.writable).catch(() => {});
    this.leitor = decodificador.readable.getReader();

    let resto = "";

    try {

      while (true) {

        const { value, done } = await this.leitor.read();

        if (done) {
          break;
        }

        resto += value;

        const linhas = resto.split("\n");
        resto = linhas.pop();

        for (const linha of linhas) {
          this.receber(linha.trim());
        }

      }

    } catch {
      // Cabo tirado ou porta fechada: quem esperava resposta recebe null.
    }

    this.responder(null);

  }


  receber(linha) {

    const inicio = linha.indexOf("CT>");

    if (inicio < 0) {
      return;
    }

    let mensagem;

    try {
      mensagem = JSON.parse(linha.slice(inicio + 3));
    } catch {
      return;   // linha cortada no meio do log
    }

    // Linha de prontidão não é resposta de comando: a placa acabou de (re)iniciar,
    // e o comando em curso, se houver, se perdeu no boot. Quem esperava recebe
    // null e pode mandar de novo.
    if (mensagem && mensagem.pronto === true) {
      this.pronta = true;
      this.responder(null);
      return;
    }

    this.responder(mensagem);

  }


  responder(resposta) {

    if (!this.esperando) {
      return;
    }

    clearTimeout(this.esperando.timer);
    const { resolver } = this.esperando;
    this.esperando = null;
    resolver(resposta);

  }


  // Manda um comando e espera a resposta; null se passar do tempo.
  enviar(comando, tempoMs) {

    this.responder(null);

    return new Promise(resolver => {

      this.esperando = {
        resolver,
        timer: setTimeout(() => this.responder(null), tempoMs)
      };

      this.escritor.write(`CT<${JSON.stringify(comando)}\n`).catch(() => this.responder(null));

    });

  }


  // Espera a placa ficar pronta e devolve o info dela (null se passar de limiteMs).
  // Pergunta "info" a cada 2 s: placa que não reiniciou ao abrir a porta não
  // manda a linha de prontidão, mas responde o info. A linha de prontidão que
  // chega no meio de uma pergunta corta a espera e o info sai de novo na hora.
  async info(limiteMs = PRONTO_MS) {

    const fim = Date.now() + limiteMs;

    while (Date.now() < fim) {

      const resposta = await this.enviar({ cmd: "info" }, Math.min(INFO_MS, fim - Date.now()));

      if (resposta && resposta.id) {
        return resposta;
      }

    }

    return null;

  }


  // A placa procura a rede (scan, até ~4 s, que ela repete se o rádio estiver
  // ocupado), testa antes de gravar (até 25 s) e só então responde.
  configurar(comando) {

    return this.enviar(comando, 50000);

  }


  // Redes 2.4 GHz que a placa enxerga: { ok, redes: [{ ssid, rssi, canal, seguranca }] }.
  // Firmware antigo responde { ok: false, erro: "comando_desconhecido" }.
  // Scan recusado (rádio no meio de uma conexão, firmware antigo) vale uma
  // segunda tentativa antes de mostrar o erro.
  async redes() {

    const resposta = await this.enviar({ cmd: "redes" }, 20000);

    if (resposta && resposta.ok === false && resposta.erro === "scan_falhou") {
      return this.enviar({ cmd: "redes" }, 20000);
    }

    return resposta;

  }


  async fechar() {

    this.responder(null);

    // A porta só fecha depois que os dois fluxos soltam ela.
    try {
      if (this.leitor) {
        await this.leitor.cancel();
        await this.fimLeitura;
      }
      if (this.escritor) {
        await this.escritor.close();
        await this.fimEscrita;
      }
    } catch {
      // Já estava fechada.
    }

    try {
      if (this.porta) {
        await this.porta.close();
      }
    } catch {
      // Streams ainda soltando a porta: o navegador fecha ao sair da página.
    }

    this.porta = null;

  }

}
