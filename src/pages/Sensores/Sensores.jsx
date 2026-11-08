// Tela de sensores: situação de cada sensor (online, sinal, última temperatura),
// configuração pelo cabo USB (gestor) e registro manual para o simulador.
// A chave aparece uma vez só: o servidor guarda apenas uma impressão dela.
// Wi-Fi e senha da rede vão direto para o sensor pelo cabo, nunca para a API.
// Porte de legado/sensores.html + legado/js/sensores.js + legado/js/serial.js.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ErroAzure } from "../../components/Estado.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import { usePolling } from "../../hooks/usePolling.js";
import { useSessao } from "../../hooks/useSessao.jsx";
import { api } from "../../lib/api.js";
import { UPDATE_INTERVAL } from "../../lib/config.js";
import { formatarDataHora, formatarTemp } from "../../lib/formatar.js";
import { buscarLeituras, horarioDe } from "../../lib/leituras.js";
import { ehGestor } from "../../lib/sessao.js";
import { SensorUsb, serialDisponivel } from "./serial.js";
import {
  EXPLICACAO,
  descreverSinal,
  mensagemDeErro,
  situacaoDaPlaca,
  situacaoDoSensor,
  trechoSecrets
} from "./sensores.js";


export default function Sensores() {

  const { usuario } = useSessao();
  const gestor = ehGestor(usuario);

  const [conexao, setConexao] = useState(null);

  // { tipo: "carregando" | "erro" | "ok", dispositivos, veiculos, ultimas, agora }
  const [tabela, setTabela] = useState({ tipo: "carregando" });

  // Chave recém-gerada (mostrada uma vez): { id, chave, n } ou null.
  const [chaveNova, setChaveNova] = useState(null);

  // Etapa do painel do cabo; n muda a cada troca de etapa (remonta o formulário).
  const [cabo, setCabo] = useState({ etapa: "inicio", erro: null, n: 0 });

  // Erro do "Registrar sem cabo"; null = escondido.
  const [erroManual, setErroManual] = useState(null);

  const ajudaRef = useRef(null);
  const chaveRef = useRef(null);

  const montado = useRef(false);
  const primeiraCarga = useRef(true);
  const dispositivosAtuais = useRef([]);

  const sensorUsb = useRef(null);
  const infoPlaca = useRef(null);
  const chavePendente = useRef(null);   // chave já gerada na API, ainda não gravada na placa
  const etapa = useRef(0);              // contador de etapas do cabo (antigo "esperaLeitura existe?")


  // ---------------------------------------------------------
  // TABELA COM A SITUAÇÃO DE CADA SENSOR
  // ---------------------------------------------------------

  const atualizarTabela = useCallback(async sinal => {

    const parado = () => (sinal && sinal.aborted) || !montado.current;

    try {

      const [{ dispositivos }, { veiculos }] = await Promise.all([
        api("/dispositivos"),
        api("/veiculos")
      ]);
      if (parado()) return;

      dispositivos.sort((a, b) => a.id.localeCompare(b.id));
      dispositivosAtuais.current = dispositivos;

      const ultimas = await Promise.all(
        dispositivos.map(d =>
          buscarLeituras({ deviceId: d.id, limite: 1 }).then(l => l[0] || null)
        )
      );
      if (parado()) return;

      setConexao(true);

      if (primeiraCarga.current) {
        primeiraCarga.current = false;
        // Empresa sem sensor: a ajuda já abre mostrando o caminho.
        if (ajudaRef.current) {
          ajudaRef.current.open = dispositivos.length === 0;
        }
      }

      setTabela({ tipo: "ok", dispositivos, veiculos, ultimas, agora: Date.now() });

    }

    catch (erro) {

      if (parado()) return;
      console.error("Erro ao carregar sensores:", erro);
      setConexao(false);

      // Já tinha tabela: mantém a última e só marca o selo do topo.
      if (primeiraCarga.current) {
        setTabela({ tipo: "erro" });
      }

    }

  }, []);


  // ---------------------------------------------------------
  // CONECTAR PELO CABO (gestor)
  // ---------------------------------------------------------

  // Troca a etapa do painel do cabo; devolve o número da etapa nova.
  const mostrarCabo = useCallback(estado => {

    etapa.current += 1;
    setCabo({ ...estado, n: etapa.current });
    return etapa.current;

  }, []);


  const encerrarCabo = useCallback(async () => {

    if (sensorUsb.current) {
      const usb = sensorUsb.current;
      sensorUsb.current = null;
      usb.aoDesconectar = null;
      await usb.fechar();
    }

  }, []);


  useEffect(() => {

    montado.current = true;

    // Saiu da tela (no antigo, o navegador fechava a porta ao sair da página).
    return () => {
      montado.current = false;
      etapa.current += 1;
      encerrarCabo();
    };

  }, [encerrarCabo]);


  usePolling(sinal => atualizarTabela(sinal), UPDATE_INTERVAL, []);


  // Mostra a chave com o trecho pronto para o secrets.h do firmware.
  function mostrarChave(id, chave) {

    setChaveNova({ id, chave, n: Date.now() });

  }

  useEffect(() => {

    if (chaveNova && chaveRef.current) {
      chaveRef.current.scrollIntoView({ block: "start" });
    }

  }, [chaveNova]);


  function abrirAjuda(item) {

    const painel = ajudaRef.current;
    painel.open = true;

    const alvo = painel.querySelector(`#ajuda-${item}`) || painel;
    alvo.scrollIntoView({ block: "start" });

  }


  function mostrarInicioCabo(erro = null) {

    mostrarCabo({ etapa: "inicio", erro });

  }


  function mostrarFormularioRede(erro = null, rede = "") {

    mostrarCabo({
      etapa: "formulario",
      situacao: situacaoDaPlaca({
        chavePendente: chavePendente.current,
        dispositivos: dispositivosAtuais.current,
        info: infoPlaca.current
      }),
      info: infoPlaca.current,
      erro,
      rede
    });

  }


  async function conectarPeloCabo() {

    await encerrarCabo();

    const usb = new SensorUsb();
    sensorUsb.current = usb;

    usb.aoDesconectar = () => {
      encerrarCabo();
      mostrarInicioCabo({ texto: "O cabo foi desconectado. Ligue o sensor de novo e clique em “Conectar sensor pelo cabo”.", ajuda: null });
    };

    try {
      await usb.conectar();
    } catch (erro) {

      sensorUsb.current = null;

      // Fechou a janela sem escolher: não é erro.
      if (erro.name === "NotFoundError") {
        mostrarInicioCabo();
        return;
      }

      mostrarInicioCabo({
        texto: `Não foi possível abrir a porta (${erro.message}). Feche a Arduino IDE ou outra aba que esteja usando o sensor e tente de novo.`,
        ajuda: "porta"
      });
      return;

    }

    mostrarCabo({ etapa: "conversando" });

    infoPlaca.current = await usb.info();

    if (!infoPlaca.current) {
      await encerrarCabo();
      mostrarInicioCabo({
        texto: "O sensor não respondeu. Confira se ele está com o firmware ColdTrack atualizado.",
        ajuda: "porta"
      });
      return;
    }

    chavePendente.current = null;
    mostrarFormularioRede();

  }


  async function enviarConfiguracao(situacao, dados) {

    const ssid = String(dados.get("ssid") || "").trim();
    const senha = String(dados.get("senha") || "");

    if (!ssid) {
      mostrarFormularioRede({ texto: "Informe o nome da rede Wi-Fi.", ajuda: null }, ssid);
      return;
    }

    if (senha && senha.length < 8) {
      mostrarFormularioRede({ texto: "Senha de Wi-Fi tem pelo menos 8 caracteres. Rede aberta: deixe a senha em branco.", ajuda: null }, ssid);
      return;
    }

    const id = infoPlaca.current.id.toLowerCase();
    let comando;

    try {

      if (situacao === "trocar-rede") {

        comando = { cmd: "wifi", ssid, senha };

      } else {

        // A chave sai da API uma vez; se a rede falhar, reaproveita na próxima tentativa.
        // Para a API vão só id e descrição: rede e senha ficam no cabo.
        if (!chavePendente.current) {

          mostrarCabo({ etapa: "registrando" });

          const resposta = situacao === "novo"
            ? await api("/dispositivos", { metodo: "POST", corpo: { id, descricao: String(dados.get("descricao") || "").trim() } })
            : await api(`/dispositivos/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: {} });

          chavePendente.current = resposta.chave;
          await atualizarTabela();

        }

        comando = { cmd: "config", ssid, senha, id, chave: chavePendente.current };

      }

    } catch (falha) {

      if (falha.status === 409) {
        mostrarFormularioRede({ texto: `O sensor ${id} está registrado em outra empresa. Peça para essa empresa remover o sensor antes.`, ajuda: null }, ssid);
      } else {
        mostrarFormularioRede({ texto: `Não foi possível registrar o sensor: ${falha.message}`, ajuda: null }, ssid);
      }
      return;

    }

    mostrarCabo({ etapa: "testando", ssid });

    const usb = sensorUsb.current;
    const resposta = usb ? await usb.configurar(comando) : null;

    if (!resposta) {
      mostrarFormularioRede({ texto: "O sensor não respondeu. Confira se o cabo continua ligado e tente de novo.", ajuda: "porta" }, ssid);
      return;
    }

    if (!resposta.ok) {
      mostrarFormularioRede(mensagemDeErro(resposta.erro, ssid), ssid);
      return;
    }

    chavePendente.current = null;
    infoPlaca.current = { ...infoPlaca.current, configurado: true, ssid };
    esperarPrimeiraLeitura(id, ssid, resposta.rssi);

  }


  // Rede ok: agora espera a primeira leitura chegar na nuvem.
  async function esperarPrimeiraLeitura(id, ssid, rssi) {

    const inicio = Date.now();

    const minhaEtapa = mostrarCabo({ etapa: "esperando", id, ssid, rssi, semLeitura: false });

    // O sensor manda na hora e depois a cada 20 s; 2 min cobre relógio e reenvio.
    while (Date.now() - inicio < 120000) {

      await new Promise(r => setTimeout(r, 5000));

      if (etapa.current !== minhaEtapa) {
        return;   // gestor já saiu desta etapa
      }

      try {

        const [ultima] = await buscarLeituras({ deviceId: id, limite: 1 });

        // Só vale leitura recebida depois desta configuração.
        const recebida = new Date(ultima ? ultima.recebidoEm || horarioDe(ultima) : 0);

        if (ultima && recebida.getTime() >= inicio - 5000) {

          await encerrarCabo();
          atualizarTabela();

          mostrarCabo({ etapa: "online", id, ultima });
          return;

        }

      } catch {
        // Falha momentânea da API: tenta de novo no próximo ciclo.
      }

    }

    await encerrarCabo();

    if (etapa.current === minhaEtapa) {
      setCabo(atual => ({ ...atual, semLeitura: true }));
    }

  }


  async function cancelarCabo() {

    await encerrarCabo();
    mostrarInicioCabo();

  }


  // ---------------------------------------------------------
  // AÇÕES DA TABELA (gestor)
  // ---------------------------------------------------------

  async function gerarNovaChave(id) {

    if (!window.confirm(`Gerar nova chave para ${id}? A chave atual para de funcionar na hora e o sensor precisa ser conectado no cabo de novo.`)) {
      return;
    }

    try {
      const { chave } = await api(`/dispositivos/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: {} });
      mostrarChave(id, chave);
    } catch (falha) {
      window.alert(falha.message);
    }

  }


  async function remover(id) {

    if (!window.confirm(`Remover o sensor ${id}? Ele para de enviar dados. As leituras já gravadas continuam guardadas.`)) {
      return;
    }

    try {
      await api(`/dispositivos/${encodeURIComponent(id)}`, { metodo: "DELETE" });
      atualizarTabela();
    } catch (falha) {
      window.alert(falha.message);
    }

  }


  // ---------------------------------------------------------
  // REGISTRO SEM CABO (simulador Wokwi e desenvolvimento)
  // ---------------------------------------------------------

  async function registrarManual(evento) {

    evento.preventDefault();

    const form = evento.currentTarget;
    setErroManual(null);

    try {
      const sensor = await api("/dispositivos", {
        metodo: "POST",
        corpo: Object.fromEntries(new FormData(form))
      });
      form.reset();
      await atualizarTabela();
      mostrarChave(sensor.id, sensor.chave);
    } catch (falha) {
      setErroManual(falha.message);
    }

  }


  return (
    <PainelLayout
      titulo="Sensores"
      subtitulo="Situação de cada sensor e conexão de sensor novo pelo cabo USB"
      conexao={conexao}
    >
      <div id="conteudo" className="page-grid">

        <div id="chaveNova" ref={chaveRef}>
          {chaveNova && (
            <ChaveNova
              key={chaveNova.n}
              id={chaveNova.id}
              chave={chaveNova.chave}
              aoFechar={() => setChaveNova(null)}
            />
          )}
        </div>

        {gestor && (
          <article className="panel" id="painelCabo">
            <h2>Conectar sensor pelo cabo</h2>
            <PainelCabo
              cabo={cabo}
              abrirAjuda={abrirAjuda}
              aoConectar={conectarPeloCabo}
              aoEnviar={enviarConfiguracao}
              aoCancelar={cancelarCabo}
            />
          </article>
        )}

        <article className="panel">
          <h2>Sensores registrados</h2>
          <p>
            A situação se atualiza sozinha a cada {UPDATE_INTERVAL / 1000} s.{" "}
            Depois de conectar, ligue o sensor a um veículo em <Link to="/veiculos">Veículos</Link>.
          </p>
          <div id="tabelaSensores">
            {tabela.tipo === "carregando" && <div className="estado">Carregando sensores…</div>}
            {tabela.tipo === "erro" && <ErroAzure />}
            {tabela.tipo === "ok" && (
              <TabelaSensores
                {...tabela}
                gestor={gestor}
                aoGerarChave={gerarNovaChave}
                aoRemover={remover}
              />
            )}
          </div>
        </article>

        <Ajuda ajudaRef={ajudaRef} />

        {gestor && (
          <details className="panel">
            <summary><h2>Registrar sem cabo</h2></summary>
            <p>
              Para o simulador Wokwi ou para gravar o sensor pela Arduino IDE: gera o ID e a chave{" "}
              para colar no <code>secrets.h</code>. Com o sensor em mãos, prefira “Conectar sensor pelo cabo”.
            </p>

            <form id="formSensor" className="form-grade" noValidate onSubmit={registrarManual}>
              <label className="campo"><span>ID do sensor</span><input name="id" placeholder="coldtrack-02" required /></label>
              <label className="campo"><span>Descrição</span><input name="descricao" placeholder="ESP32-C3 + DHT22, simulador" /></label>
              <button type="submit" className="botao">Registrar sensor</button>
            </form>

            <p className="erro-form" id="erroSensor" role="alert" hidden={erroManual === null}>{erroManual}</p>
          </details>
        )}

      </div>
    </PainelLayout>
  );

}


function TabelaSensores({ dispositivos, veiculos, ultimas, agora, gestor, aoGerarChave, aoRemover }) {

  if (!dispositivos.length) {
    return (
      <div className="estado">
        <strong>Nenhum sensor registrado.</strong>
        {gestor
          ? "Ligue o sensor no cabo USB e use “Conectar sensor pelo cabo” acima."
          : "Peça ao gestor para conectar os sensores."}
      </div>
    );
  }

  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Descrição</th>
            <th>Veículo</th>
            <th>Situação</th>
            <th>Sinal Wi-Fi</th>
            <th>Última temperatura</th>
            {gestor && <th></th>}
          </tr>
        </thead>
        <tbody>
          {dispositivos.map((d, i) => {

            const veiculo = veiculos.find(v => v.deviceId === d.id);
            const ultima = ultimas[i];
            const situacao = situacaoDoSensor(ultima, agora);

            return (
              <tr key={d.id}>
                <td><strong>{d.id}</strong></td>
                <td>{d.descricao || "--"}</td>
                <td>{veiculo ? veiculo.id : "nenhum"}</td>
                <td>
                  <span className={`status ${situacao.classe}`}>{situacao.texto}</span>
                  {ultima && <small className="linha-apoio">último envio {formatarDataHora(horarioDe(ultima))}</small>}
                </td>
                <td>{ultima ? descreverSinal(ultima.rssi) : "--"}</td>
                <td>{ultima ? formatarTemp(ultima.temperatura) : "--"}</td>
                {gestor && (
                  <td className="acoes-tabela">
                    <button type="button" className="botao secundario" data-nova-chave={d.id} onClick={() => aoGerarChave(d.id)}>Gerar nova chave</button>
                    <button type="button" className="botao perigo" data-remover={d.id} onClick={() => aoRemover(d.id)}>Remover</button>
                  </td>
                )}
              </tr>
            );

          })}
        </tbody>
      </table>
    </div>
  );

}


// Link "Ver ajuda" / "Como funciona": abre a seção de ajuda no item certo.
function LinkAjuda({ item, abrirAjuda, children }) {

  return (
    <a
      href="#"
      data-ajuda={item}
      onClick={evento => {
        evento.preventDefault();
        abrirAjuda(item);
      }}
    >
      {children}
    </a>
  );

}


function Mensagem({ erro, abrirAjuda }) {

  if (!erro) {
    return null;
  }

  return (
    <p className="erro-form" role="alert">
      {erro.texto}
      {erro.ajuda && <>{" "}<LinkAjuda item={erro.ajuda} abrirAjuda={abrirAjuda}>Ver ajuda</LinkAjuda></>}
    </p>
  );

}


function PainelCabo({ cabo, abrirAjuda, aoConectar, aoEnviar, aoCancelar }) {

  if (cabo.etapa === "inicio") {

    if (!serialDisponivel()) {
      return (
        <>
          <p>
            Este navegador não conversa com o cabo USB. Abra o painel no{" "}
            <strong>Chrome ou Edge, no computador</strong>, para configurar o sensor.{" "}
            No celular, Firefox e Safari isso não funciona.
          </p>
          <p>Para o simulador Wokwi, use “Registrar sem cabo”, no fim da página.</p>
        </>
      );
    }

    return (
      <>
        <p>
          Ligue o sensor no computador pelo cabo USB. O painel reconhece o sensor,{" "}
          cadastra na sua empresa e grava nele a rede Wi-Fi que ele vai usar.
        </p>
        <div className="acoes-item">
          <button type="button" className="botao" id="botaoCabo" onClick={aoConectar}>Conectar sensor pelo cabo</button>
          <LinkAjuda item="passos" abrirAjuda={abrirAjuda}>Como funciona</LinkAjuda>
        </div>
        <Mensagem erro={cabo.erro} abrirAjuda={abrirAjuda} />
      </>
    );

  }

  if (cabo.etapa === "conversando") {
    return <div className="estado">Conversando com o sensor…</div>;
  }

  if (cabo.etapa === "registrando") {
    return <div className="estado">Registrando o sensor na sua empresa…</div>;
  }

  if (cabo.etapa === "testando") {
    return <div className="estado">Testando a rede “{cabo.ssid}” no sensor. Isso leva até 15 s…</div>;
  }

  if (cabo.etapa === "formulario") {
    return (
      <FormularioRede
        key={cabo.n}
        cabo={cabo}
        abrirAjuda={abrirAjuda}
        aoEnviar={aoEnviar}
        aoCancelar={aoCancelar}
      />
    );
  }

  if (cabo.etapa === "esperando") {
    return (
      <>
        <p>
          <span className="status normal">CONECTADO</span>{" "}
          Sensor <strong>{cabo.id}</strong> na rede “{cabo.ssid}” · sinal {descreverSinal(cabo.rssi)}.
        </p>
        <div className="estado" id="esperaLeitura">
          {cabo.semLeitura
            ? <>O sensor entrou na rede, mas nenhuma leitura chegou em 2 min.{" "}<LinkAjuda item="online" abrirAjuda={abrirAjuda}>Ver ajuda</LinkAjuda></>
            : "Aguardando a primeira leitura chegar no Azure…"}
        </div>
      </>
    );
  }

  // online
  return (
    <>
      <p>
        <span className="status normal">ONLINE</span>{" "}
        Sensor <strong>{cabo.id}</strong> enviando: {formatarTemp(cabo.ultima.temperatura)} às {formatarDataHora(horarioDe(cabo.ultima))}.
      </p>
      <p>Pode tirar o sensor do computador e ligar num carregador. Ele lembra da rede.</p>
      <div className="acoes-item">
        <button type="button" className="botao" id="outroSensor" onClick={aoConectar}>Conectar outro sensor</button>
      </div>
    </>
  );

}


// Remontado a cada exibição (key): senha em branco, "mostrar senha" desmarcado,
// foco no nome da rede, como o formulário recriado do original.
function FormularioRede({ cabo, abrirAjuda, aoEnviar, aoCancelar }) {

  const { situacao, info, erro, rede } = cabo;

  const ssidRef = useRef(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    ssidRef.current.focus();
  }, []);

  function enviar(evento) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    aoEnviar(dados.get("novaChave") ? "nova-chave" : situacao, dados);
  }

  return (
    <>
      <p>
        <span className="status normal">SENSOR RECONHECIDO</span>{" "}
        <strong>{info.id}</strong> · firmware {info.fw || "--"}
        {info.ssid ? ` · rede atual: ${info.ssid}` : ""}
      </p>
      <p>{EXPLICACAO[situacao]}</p>

      <form id="formCabo" className="form-grade" noValidate autoComplete="off" onSubmit={enviar}>
        {situacao === "novo" && (
          <label className="campo"><span>Descrição (opcional)</span>
            <input name="descricao" maxLength={60} placeholder="ESP32-C3 + DHT11, baú do CT-002" /></label>
        )}
        <label className="campo"><span>Nome da rede Wi-Fi</span>
          <input ref={ssidRef} name="ssid" maxLength={32} required defaultValue={rede || ""} placeholder="Hotspot do celular" /></label>
        <label className="campo"><span>Senha da rede</span>
          <input name="senha" type={mostrarSenha ? "text" : "password"} maxLength={63} autoComplete="new-password" /></label>
        <button type="submit" className="botao">{situacao === "trocar-rede" ? "Trocar rede" : "Conectar sensor"}</button>
      </form>

      <label className="opcao">
        <input type="checkbox" id="mostrarSenha" checked={mostrarSenha} onChange={evento => setMostrarSenha(evento.target.checked)} />
        Mostrar a senha (para conferir o que foi digitado)
      </label>

      {situacao === "trocar-rede" && (
        <label className="opcao">
          <input type="checkbox" form="formCabo" name="novaChave" />
          Gerar chave nova e gravar no sensor (use se ele parou de enviar depois de “Gerar nova chave”)
        </label>
      )}

      <Mensagem erro={erro} abrirAjuda={abrirAjuda} />

      <div className="acoes-item">
        <button type="button" className="botao secundario" id="cancelarCabo" onClick={aoCancelar}>Cancelar</button>
      </div>
    </>
  );

}


function ChaveNova({ id, chave, aoFechar }) {

  const trecho = trechoSecrets(id, chave);
  const [rotuloCopiar, setRotuloCopiar] = useState("Copiar");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(trecho);
      setRotuloCopiar("Copiado");
    } catch {
      setRotuloCopiar("Selecione e copie o texto acima");
    }
  }

  return (
    <article className="panel chave-nova" role="status">
      <h2>Chave do sensor {id}</h2>
      <p>
        <strong>Copie agora: a chave não aparece de novo.</strong>{" "}
        Com o sensor em mãos, o jeito mais fácil é “Conectar sensor pelo cabo”, que grava a chave sozinho.{" "}
        Para o simulador, cole estas linhas no <code>secrets.h</code>.
      </p>

      <pre className="trecho-codigo">{trecho}</pre>

      <div className="acoes-item">
        <button type="button" className="botao" id="copiarChave" onClick={copiar}>{rotuloCopiar}</button>
        <button type="button" className="botao secundario" id="fecharChave" onClick={aoFechar}>Já copiei</button>
      </div>
    </article>
  );

}


function Ajuda({ ajudaRef }) {

  return (
    <details className="panel ajuda" id="ajuda" ref={ajudaRef}>
      <summary><h2>Como conectar um sensor</h2></summary>

      <ol className="passos" id="ajuda-passos">
        <li>Abra o painel no <strong>Chrome ou Edge, no computador</strong>, com a conta de gestor.</li>
        <li>Ligue o hotspot do celular (ou use o Wi-Fi do local) na banda de <strong>2.4 GHz</strong>. No iPhone: “Maximizar compatibilidade”.</li>
        <li>Ligue o sensor no computador pelo cabo USB.</li>
        <li>Clique em <strong>Conectar sensor pelo cabo</strong> e escolha a porta do sensor na janela que o navegador abre.</li>
        <li>Digite o nome e a senha da rede. O sensor testa a rede antes de gravar.</li>
        <li>Espere aparecer <strong>ONLINE</strong>. Pode tirar do cabo e ligar num carregador: ele lembra da rede.</li>
        <li>Em <Link to="/veiculos">Veículos</Link>, ligue o sensor ao veículo que vai levar a carga.</li>
      </ol>

      <h3>Se der errado</h3>
      <dl className="problemas">
        <dt id="ajuda-porta">A porta não aparece ou o sensor não responde</dt>
        <dd>
          Use um cabo de dados (alguns só carregam). Feche a Arduino IDE e outras abas que estejam usando o sensor.{" "}
          O sensor precisa estar com o firmware ColdTrack gravado, com “USB CDC On Boot” ligado na Arduino IDE.
        </dd>

        <dt id="ajuda-senha">Senha errada</dt>
        <dd>Confira maiúsculas e minúsculas. Nada é gravado quando a rede falha: o sensor continua na rede anterior.</dd>

        <dt id="ajuda-rede">Rede não encontrada ou demorou demais</dt>
        <dd>O sensor só enxerga redes de 2.4 GHz. Confira o nome exato da rede e deixe o celular perto do sensor.</dd>

        <dt id="ajuda-online">Entrou na rede mas nunca ficou ONLINE</dt>
        <dd>
          Confira se a rede tem internet (o hotspot precisa de dados móveis). Se o sensor foi removido{" "}
          ou ganhou chave nova, conecte pelo cabo de novo.
        </dd>

        <dt id="ajuda-troca">Trocar de rede (de casa para o celular)</dt>
        <dd>Ligue o sensor no cabo e conecte de novo: o painel reconhece o sensor e pede só a rede nova.</dd>
      </dl>
    </details>
  );

}
