// Tela de login: troca e-mail e senha por um token de 8 h.
// Porte do site antigo: login.html + js/login.js (página de referência).

import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AcessoLayout from "../../components/AcessoLayout.jsx";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTitulo } from "../../hooks/useTitulo.js";
import { postPublico } from "../../lib/api.js";
import { lerSessao, rotaInicial } from "../../lib/sessao.js";


export default function Login() {

  useTitulo("Entrar | ColdTrack Control");

  const { usuario, entrar } = useSessao();
  const navigate = useNavigate();

  const emailRef = useRef(null);
  const senhaRef = useRef(null);

  const [mensagem, setMensagem] = useState("");
  // "erro" (vermelho) ou "info" (orientação, em azul).
  const [tipo, setTipo] = useState("erro");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // Já logado: vai direto ao painel (o motorista, à tela dele).
  if (usuario && lerSessao()) {
    return <Navigate to={rotaInicial(usuario)} replace />;
  }

  function esqueciSenha(evento) {
    evento.preventDefault();
    setTipo("info");
    setMensagem("Peça ao gestor da sua equipe para definir uma senha nova.");
  }

  async function enviar(evento) {

    evento.preventDefault();

    setMensagem("");
    setTipo("erro");

    const emailInput = emailRef.current;
    const email = emailInput.value.trim();
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

      entrar(dados.token, dados.usuario);
      navigate(rotaInicial(dados.usuario), { replace: true });

    }

    catch {

      setMensagem("Sem conexão com o servidor. Confira a internet e tente de novo.");
      setEntrando(false);

    }

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
