// Seção "Verificação em duas etapas" da tela de Configurações: liga o TOTP
// (QR Code + primeiro código), mostra os 10 códigos de recuperação uma vez só
// e desliga (senha + código). Rotas: /2fa/iniciar, /2fa/ativar, /2fa/desativar.
//
// Segurança: o QR é desenhado aqui no navegador (qrcode-generator), o segredo
// nunca vai para site de terceiros; segredo e códigos ficam só no estado deste
// componente (nada em localStorage, nada no console) e somem ao sair da tela.

import { useState } from "react";
import { api } from "../../lib/api.js";
import { agruparSegredo, limparCodigo, segredoDaUri, textoCodigos } from "../../lib/doisFatores.js";
import { desenharQr } from "../Veiculos/etiqueta.js";
import Secao from "./Secao.jsx";


// ativo: true ou false quando a API informa (totpAtivo); null quando não se sabe.
// Sem a informação, a seção mostra o caminho de ativar e deixa o de desativar à mão.
export default function DoisFatores({ ativo = null }) {

  // "inicio" (desligada ou desconhecida), "qr", "codigos" ou "ativo".
  const [etapa, setEtapa] = useState(ativo === true ? "ativo" : "inicio");
  const [conhecido, setConhecido] = useState(ativo !== null);
  const [uri, setUri] = useState(null);
  const [codigos, setCodigos] = useState(null);
  const [desligando, setDesligando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  function limparMensagens() {
    setErro(null);
    setAviso(null);
  }

  async function iniciar() {

    limparMensagens();
    setOcupado(true);

    try {

      const { uri: novaUri } = await api("/2fa/iniciar", { metodo: "POST" });
      setUri(novaUri);
      setEtapa("qr");

    } catch (falha) {

      setErro(falha.message);

    } finally {

      setOcupado(false);

    }

  }

  function cancelar() {
    setUri(null);
    setEtapa("inicio");
    limparMensagens();
  }

  async function ativar(codigo) {

    limparMensagens();
    setOcupado(true);

    try {

      const { recuperacao } = await api("/2fa/ativar", {
        metodo: "POST",
        corpo: { codigo },
        sessaoNo401: false
      });

      setUri(null);
      setCodigos(recuperacao || []);
      setEtapa("codigos");
      setConhecido(true);
      return true;

    } catch (falha) {

      setErro(falha.message);
      return false;

    } finally {

      setOcupado(false);

    }

  }

  function guardados() {
    setCodigos(null);
    setEtapa("ativo");
    limparMensagens();
  }

  async function desativar(senha, codigo) {

    limparMensagens();
    setOcupado(true);

    try {

      await api("/2fa/desativar", {
        metodo: "POST",
        corpo: { senha, codigo },
        sessaoNo401: false
      });

      setDesligando(false);
      setEtapa("inicio");
      setConhecido(true);
      setAviso("Verificação em duas etapas desativada. O login volta a pedir só e-mail e senha.");
      return true;

    } catch (falha) {

      setErro(falha.message);
      return false;

    } finally {

      setOcupado(false);

    }

  }

  return (
    <Secao
      id="doisFatores"
      className="dois-fatores"
      titulo="Verificação em duas etapas"
      apoio={<p>Além da senha, o login pede um código de 6 dígitos que muda a cada 30 segundos no aplicativo autenticador do seu celular (Google Authenticator, Microsoft Authenticator ou outro).</p>}
    >

      {etapa === "inicio" && !desligando && (
        <>
          {conhecido && <p>A verificação em duas etapas está desligada nesta conta.</p>}
          <div className="dois-fatores-acoes">
            <button type="button" className="botao" id="ativar2fa" disabled={ocupado} onClick={iniciar}>
              {ocupado ? "Preparando…" : "Ativar verificação em duas etapas"}
            </button>
            {!conhecido && (
              <button type="button" className="botao secundario" id="abrirDesativar2fa"
                onClick={() => { limparMensagens(); setDesligando(true); }}>
                Já está ativa? Desativar
              </button>
            )}
          </div>
        </>
      )}

      {etapa === "qr" && uri && (
        <LerQr uri={uri} ocupado={ocupado} aoConfirmar={ativar} aoCancelar={cancelar} />
      )}

      {etapa === "codigos" && codigos && (
        <CodigosRecuperacao codigos={codigos} aoConcluir={guardados} aoAvisar={setAviso} aoErrar={setErro} />
      )}

      {etapa === "ativo" && !desligando && (
        <>
          <p className="aviso-ok" id="ativo2fa">Verificação em duas etapas ativa. O login pede o código do aplicativo.</p>
          <div className="dois-fatores-acoes">
            <button type="button" className="botao secundario" id="abrirDesativar2fa"
              onClick={() => { limparMensagens(); setDesligando(true); }}>
              Desativar
            </button>
          </div>
        </>
      )}

      {desligando && (
        <Desativar ocupado={ocupado} aoConfirmar={desativar}
          aoCancelar={() => { setDesligando(false); limparMensagens(); }} />
      )}

      <p className="aviso-ok" id="aviso2fa" role="status" hidden={aviso === null}>{aviso}</p>
      <p className="erro-form" id="erro2fa" role="alert" hidden={erro === null}>{erro}</p>

    </Secao>
  );

}


// Campo de 6 dígitos usado ao ativar e ao desativar.
function CampoCodigo({ id, valor, aoMudar, rotulo = "Código de 6 dígitos do aplicativo", focar = false }) {

  return (
    <label className="campo campo-codigo" htmlFor={id}>
      <span>{rotulo}</span>
      <input
        id={id}
        name="codigo"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="000000"
        value={valor}
        onChange={evento => aoMudar(limparCodigo(evento.target.value))}
        autoFocus={focar}
        required
      />
    </label>
  );

}


function LerQr({ uri, ocupado, aoConfirmar, aoCancelar }) {

  const [codigo, setCodigo] = useState("");
  const [faltando, setFaltando] = useState(false);

  const qr = desenharQr(uri);
  const segredo = agruparSegredo(segredoDaUri(uri));

  async function enviar(evento) {

    evento.preventDefault();

    if (codigo.length !== 6) {
      setFaltando(true);
      return;
    }

    setFaltando(false);

    if (!(await aoConfirmar(codigo))) {
      setCodigo("");
    }

  }

  return (
    <div className="dois-fatores-qr">

      <ol className="dois-fatores-passos">
        <li>Instale um aplicativo autenticador no celular, se ainda não tiver.</li>
        <li>No aplicativo, escolha adicionar conta e leia o QR Code abaixo.</li>
        <li>Digite o código de 6 dígitos que aparecer para confirmar.</li>
      </ol>

      <div className="dois-fatores-codigo-qr">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${qr.tamanho} ${qr.tamanho}`}
          role="img"
          aria-label="QR Code para cadastrar o ColdTrack no aplicativo autenticador"
        >
          <rect width="100%" height="100%" fill="white" />
          <path d={qr.caminho} stroke="transparent" fill="black" />
        </svg>
      </div>

      {segredo && (
        <p>
          Sem câmera? Digite esta chave no aplicativo:{" "}
          <code className="dois-fatores-segredo" id="segredo2fa">{segredo}</code>
        </p>
      )}

      <form className="config-form" noValidate onSubmit={enviar}>
        <CampoCodigo id="codigoAtivar2fa" valor={codigo} aoMudar={setCodigo} focar />
        <p className="erro-form" role="alert" hidden={!faltando}>Digite os 6 dígitos que aparecem no aplicativo.</p>
        <div className="dois-fatores-acoes">
          <button type="submit" className="botao" id="confirmarAtivar2fa" disabled={ocupado}>
            {ocupado ? "Confirmando…" : "Confirmar e ativar"}
          </button>
          <button type="button" className="botao secundario" onClick={aoCancelar} disabled={ocupado}>
            Cancelar
          </button>
        </div>
      </form>

    </div>
  );

}


function CodigosRecuperacao({ codigos, aoConcluir, aoAvisar, aoErrar }) {

  async function copiar() {

    aoErrar(null);

    try {

      await navigator.clipboard.writeText(codigos.join("\n"));
      aoAvisar("Códigos copiados. Cole num lugar seguro antes de continuar.");

    } catch {

      aoAvisar(null);
      aoErrar("Não foi possível copiar. Use Baixar .txt ou anote os códigos.");

    }

  }

  function baixar() {

    const arquivo = new Blob([textoCodigos(codigos)], { type: "text/plain;charset=utf-8" });
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = endereco;
    link.download = "coldtrack-codigos-de-recuperacao.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(endereco);

  }

  return (
    <div className="dois-fatores-codigos">

      <p className="aviso-ok">Verificação em duas etapas ativada.</p>

      <div className="nota dois-fatores-alerta" id="avisoCodigos2fa">
        <strong>Guarde estes códigos agora: eles não aparecem de novo.</strong>{" "}
        Se perder o celular, cada código entra uma vez só no lugar do código do aplicativo.
      </div>

      <ol className="codigos-recuperacao" aria-label="Códigos de recuperação">
        {codigos.map(codigo => <li key={codigo}><code>{codigo}</code></li>)}
      </ol>

      <div className="dois-fatores-acoes">
        <button type="button" className="botao secundario" id="copiarCodigos2fa" onClick={copiar}>Copiar</button>
        <button type="button" className="botao secundario" id="baixarCodigos2fa" onClick={baixar}>Baixar .txt</button>
        <button type="button" className="botao" id="concluir2fa" onClick={aoConcluir}>Já guardei os códigos</button>
      </div>

    </div>
  );

}


function Desativar({ ocupado, aoConfirmar, aoCancelar }) {

  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [faltando, setFaltando] = useState(null);

  async function enviar(evento) {

    evento.preventDefault();

    if (!senha) {
      setFaltando("Informe sua senha.");
      return;
    }

    if (codigo.length !== 6) {
      setFaltando("Digite os 6 dígitos que aparecem no aplicativo.");
      return;
    }

    setFaltando(null);

    if (!(await aoConfirmar(senha, codigo))) {
      setCodigo("");
    }

  }

  return (
    <form className="config-form" id="formDesativar2fa" noValidate onSubmit={enviar}>
      <p>Para desligar, confirme sua senha e um código do aplicativo.</p>
      <label className="campo" htmlFor="senhaDesativar2fa">
        <span>Senha atual</span>
        <input id="senhaDesativar2fa" name="senha" type="password" autoComplete="current-password"
          value={senha} onChange={evento => setSenha(evento.target.value)} required />
      </label>
      <CampoCodigo id="codigoDesativar2fa" valor={codigo} aoMudar={setCodigo} />
      <p className="erro-form" role="alert" hidden={faltando === null}>{faltando}</p>
      <div className="dois-fatores-acoes">
        <button type="submit" className="botao" id="confirmarDesativar2fa" disabled={ocupado}>
          {ocupado ? "Desativando…" : "Desativar verificação"}
        </button>
        <button type="button" className="botao secundario" onClick={aoCancelar} disabled={ocupado}>
          Cancelar
        </button>
      </div>
    </form>
  );

}
