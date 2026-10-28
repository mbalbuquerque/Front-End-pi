// Conversa com o sensor pelo cabo USB (Web Serial, só Chrome/Edge no computador).
// Protocolo do firmware (sketch.ino): uma linha JSON por mensagem,
// painel -> placa começa com "CT<", placa -> painel com "CT>".
// O resto da serial é o log comum do sensor e é ignorado aqui.

const serialDisponivel = "serial" in navigator;


class SensorUsb {

  constructor() {
    this.porta = null;
    this.leitor = null;
    this.escritor = null;
    this.esperando = null;      // { resolver, timer } da resposta em curso
    this.aoDesconectar = null;
    this.fimLeitura = null;
    this.fimEscrita = null;
  }


  // Abre a janela do navegador para escolher a porta. Lança NotFoundError se cancelar.
  async conectar() {

    this.porta = await navigator.serial.requestPort();
    await this.porta.open({ baudRate: 115200 });

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

    } catch (erro) {
      // Cabo tirado ou porta fechada: quem esperava resposta recebe null.
    }

    this.responder(null);

  }


  receber(linha) {

    const inicio = linha.indexOf("CT>");

    if (inicio < 0) {
      return;
    }

    try {
      this.responder(JSON.parse(linha.slice(inicio + 3)));
    } catch (erro) {
      // Linha cortada no meio do log: ignora.
    }

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


  // A placa pode reiniciar ao abrir a porta: pergunta algumas vezes.
  async info() {

    for (let tentativa = 0; tentativa < 6; tentativa++) {

      const resposta = await this.enviar({ cmd: "info" }, 2000);

      if (resposta && resposta.id) {
        return resposta;
      }

    }

    return null;

  }


  // A placa testa a rede antes de gravar (até 15 s) e só então responde.
  configurar(comando) {

    return this.enviar(comando, 25000);

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
    } catch (erro) {
      // Já estava fechada.
    }

    try {
      if (this.porta) {
        await this.porta.close();
      }
    } catch (erro) {
      // Streams ainda soltando a porta: o navegador fecha ao sair da página.
    }

    this.porta = null;

  }

}
