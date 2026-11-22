// Tela de login: troca e-mail e senha por um token de 8 h.
// Porte do site antigo: login.html + js/login.js (página de referência).
// Com a verificação em duas etapas ligada, a API devolve { exige2fa, desafio }
// no lugar do token, e a tela pede o código do aplicativo autenticador
// (ou um código de recuperação) antes de entrar.

import { useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import AcessoLayout from "../../components/AcessoLayout.jsx";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTitulo } from "../../hooks/useTitulo.js";
import { postPublico } from "../../lib/api.js";
import { limparCodigo, limparRecuperacao } from "../../lib/doisFatores.js";
import { lerSessao, rotaInicial } from "../../lib/sessao.js";


export default function Login() {

  useTitulo("Entrar | ColdTrack Control");

  const { usuario, entrar } = useSessao();
  const navigate = useNavigate();
  const local = useLocation();

  const emailRef = useRef(null);
  const senhaRef = useRef(null);

  const [mensagem, setMensagem] = useState(local.state?.aviso || "");
  // "erro" (vermelho) ou "info" (orientação, em azul). O aviso vindo de outra tela é info.
  const [tipo, setTipo] = useState(local.state?.aviso ? "info" : "erro");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // Segundo passo: o desafio (JWT de 5 min) vem do /login quando o usuário tem 2FA.
  const [desafio, setDesafio] = useState(null);
  const [emailDigitado, setEmailDigitado] = useState("");

  // Já logado: vai direto ao painel (o motorista, à tela dele).
  if (usuario && lerSessao()) {
    return <Navigate to={rotaInicial(usuario)} replace />;
  }

  function esqueciSenha(evento) {
    evento.preventDefault();
    setTipo("info");
    setMensagem("Peça ao gestor da sua equipe para definir uma senha nova.");
  }

  function voltar() {
    setDesafio(null);
    setMensagem("");
    setTipo("erro");
    setEntrando(false);
  }

  function concluir(dados) {
    entrar(dados.token, dados.usuario);
    navigate(rotaInicial(dados.usuario), { replace: true });
  }

  async function enviar(evento) {

    evento.preventDefault();

    setMensagem("");
    setTipo("erro");

    const emailInput = emailRef.current;
    const email = emailInput.value.trim();
    setEmailDigitado(email);
    const senha = senhaRef.current.value;

    if (!email || !emailInput.checkValidity()) {
      setMensagem("Informe um e-mail válido.");
      emailInput.focus();
      return;
    }

    if (!senha) {
      setMensagem("Informe sua senha.");
      senhaRef.current.focus();
      return;
    }

    setEntrando(true);

    try {

      // Chamada pública (sem api()): 401 aqui é senha errada, não sessão vencida.
      const { ok, dados } = await postPublico("/login", { email, senha });

      if (!ok) {
        setMensagem((dados.erros || ["Não foi possível entrar."]).join(" "));
        setEntrando(false);
        return;
      }

      if (dados.exige2fa) {
        setDesafio(dados.desafio);
        setEntrando(false);
        return;
      }

      concluir(dados);

    }

    catch {

      setMensagem("Sem conexão com o servidor. Confira a internet e tente de novo.");
      setEntrando(false);

    }

  }

  if (desafio) {
    return (
      <AcessoLayout>
        <SegundoPasso desafio={desafio} aoEntrar={concluir} aoVoltar={voltar} />
      </AcessoLayout>
    );
  }

  return (
    <AcessoLayout>

      <h1>Entrar</h1>

      <form id="loginForm" className="acesso-form" noValidate onSubmit={enviar}>

        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            ref={emailRef}
            type="email"
            id="email"
            name="email"
            placeholder="seuemail@empresa.com"
            autoComplete="username"
            defaultValue={emailDigitado}
            maxLength={254}
            required
          />
        </div>

        <div className="campo">
          <div className="campo-topo">
            <label htmlFor="password">Senha</label>
            <a href="#" id="forgotPassword" className="link" onClick={esqueciSenha}>
              Esqueceu a senha?
            </a>
          </div>

          <div className="senha">
            <input
              ref={senhaRef}
              type={senhaVisivel ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              id="togglePassword"
              className="senha-mostrar"
              aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={String(senhaVisivel)}
              onClick={() => setSenhaVisivel(v => !v)}
            >{senhaVisivel ? "Ocultar" : "Mostrar"}</button>
          </div>
        </div>

        <button type="submit" className="botao-primario" id="botaoEntrar" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>

        <p className="acesso-secundario">
          <Link to="/cadastro" className="link">Cadastrar empresa</Link>
        </p>

        <p
          id="loginMessage"
          className={tipo === "info" ? "aviso aviso-info" : "aviso"}
          role="status"
          aria-live="polite"
        >{mensagem}</p>

      </form>

      <p className="acesso-nota">
        A sessão vale por 8 horas. Sem acesso? Peça ao gestor da sua equipe para criar seu usuário.
      </p>

      <div className="acesso-rodape">
        <Link to="/" className="voltar">
          <span aria-hidden="true">←</span> Voltar ao início
        </Link>
      </div>

    </AcessoLayout>
  );

}


// Segundo passo do login: código de 6 dígitos do aplicativo autenticador ou,
// sem o celular, um código de recuperação de uso único.
function SegundoPasso({ desafio, aoEntrar, aoVoltar }) {

  const campoRef = useRef(null);

  // "codigo" (6 dígitos do aplicativo) ou "recuperacao" (8 caracteres, uso único).
  const [modo, setModo] = useState("codigo");
  const [valor, setValor] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);

  const recuperacao = modo === "recuperacao";

  function trocarModo() {
    setModo(recuperacao ? "codigo" : "recuperacao");
    setValor("");
    setMensagem("");
  }

  function mudar(evento) {
    const texto = evento.target.value;
    setValor(recuperacao ? limparRecuperacao(texto) : limparCodigo(texto));
  }

  function falhar(texto) {
    setMensagem(texto);
    setValor("");
    setEnviando(false);
    campoRef.current?.focus();
  }

  async function confirmar(evento) {

    evento.preventDefault();
    setMensagem("");

    if (!recuperacao && valor.length !== 6) {
      falhar("Digite os 6 dígitos que aparecem no aplicativo.");
      return;
    }

    if (recuperacao && valor.length !== 8) {
      falhar("Digite os 8 caracteres do código de recuperação.");
      return;
    }

    setEnviando(true);

    try {

      const corpo = recuperacao ? { desafio, recuperacao: valor } : { desafio, codigo: valor };
      const { ok, status, dados } = await postPublico("/login/2fa", corpo);

      if (ok) {
        aoEntrar(dados);
        return;
      }

      if (status === 429) {
        falhar((dados.erros || ["Muitas tentativas. Aguarde alguns minutos e tente de novo."]).join(" "));
        return;
      }

      // Errado, vencido ou já usado: a API devolve a mesma mensagem para os três.
      falhar((dados.erros || ["Código inválido ou vencido."]).join(" "));

    }

    catch {

      falhar("Sem conexão com o servidor. Confira a internet e tente de novo.");

    }

  }

  return (
    <>

      <h1>Verificação em duas etapas</h1>

      <p className="acesso-intro">
        {recuperacao
          ? "Digite um dos códigos de recuperação que você guardou ao ativar a verificação. Cada um entra uma vez só."
          : "Abra o aplicativo autenticador no celular e digite o código de 6 dígitos do ColdTrack."}
      </p>

      <form id="form2fa" className="acesso-form" noValidate onSubmit={confirmar}>

        <div className="campo campo-codigo">
          <label htmlFor="codigo2fa">
            {recuperacao ? "Código de recuperação" : "Código do aplicativo autenticador"}
          </label>
          {/* key troca o campo inteiro ao mudar de modo: o foco automático vale de novo.
              Sem maxLength: o navegador cortaria "123 456" colado antes de limpar o espaço;
              o limite de 6 (ou 8) fica em limparCodigo / limparRecuperacao. */}
          <input
            key={modo}
            ref={campoRef}
            id="codigo2fa"
            name={recuperacao ? "recuperacao" : "codigo"}
            type="text"
            inputMode={recuperacao ? "text" : "numeric"}
            autoComplete={recuperacao ? "off" : "one-time-code"}
            autoCapitalize="none"
            spellCheck={false}
            placeholder={recuperacao ? "a1b2c3d4" : "000000"}
            value={valor}
            onChange={mudar}
            autoFocus
            required
          />
        </div>

        <button type="button" className="link link-botao" id="trocarModo2fa" onClick={trocarModo}>
          {recuperacao ? "Usar código do aplicativo" : "Usar código de recuperação"}
        </button>

        <button type="submit" className="botao-primario" id="botaoConfirmar2fa" disabled={enviando}>
          {enviando ? "Confirmando…" : "Confirmar"}
        </button>

        <p className="acesso-secundario">
          <button type="button" className="link link-botao" id="voltar2fa" onClick={aoVoltar}>
            Voltar
          </button>
        </p>

        <p id="loginMessage" className="aviso" role="status" aria-live="polite">{mensagem}</p>

      </form>

      <p className="acesso-nota">
        O código do aplicativo muda a cada 30 segundos. Esta etapa vale por 5 minutos; se passar disso, volte e entre de novo.
      </p>

    </>
  );

}
