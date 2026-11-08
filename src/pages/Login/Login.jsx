// Tela de login: troca e-mail e senha por um token de 8 h.
// Porte de legado/login.html + legado/js/login.js (página de referência).

import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTitulo } from "../../hooks/useTitulo.js";
import { postPublico } from "../../lib/api.js";
import { lerSessao } from "../../lib/sessao.js";
import "../../styles/login/login.css";


export default function Login() {

  useTitulo("Entrar | ColdTrack Control");

  const { usuario, entrar } = useSessao();
  const navigate = useNavigate();

  const emailRef = useRef(null);
  const senhaRef = useRef(null);

  const [mensagem, setMensagem] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [entrando, setEntrando] = useState(false);

  // Já logado: vai direto ao painel.
  if (usuario && lerSessao()) {
    return <Navigate to="/dashboard" replace />;
  }

  function esqueciSenha(evento) {
    evento.preventDefault();
    setMensagem("Peça ao gestor da sua equipe para definir uma senha nova.");
  }

  async function enviar(evento) {

    evento.preventDefault();

    setMensagem("");

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
      navigate("/dashboard", { replace: true });

    }

    catch {

      setMensagem("Sem conexão com o servidor. Confira a internet e tente de novo.");
      setEntrando(false);

    }

  }

  return (
    <div className="escopo-login raiz-pagina">
      <main className="login-layout">
        <section className="brand-panel">
          <Link className="brand" to="/">
            <span className="brand-icon">❄</span>
            <span>ColdTrack<span className="brand-accent">.</span></span>
          </Link>

          <div className="brand-content">
            <span className="eyebrow">COLDTRACK CONTROL</span>
            <h1>Inteligência e segurança para a cadeia fria.</h1>
            <p>
              Monitore cargas, acompanhe indicadores e gerencie
              suas operações em uma única plataforma.
            </p>

            <div className="feature-list">
              <div><span>✓</span> Monitoramento IoT</div>
              <div><span>✓</span> Infraestrutura em nuvem</div>
              <div><span>✓</span> Controle de acesso por perfil</div>
              <div><span>✓</span> Auditoria e rastreabilidade</div>
            </div>
          </div>

          <div className="brand-footer">
            IoT · Cloud Computing · Cyber Security
          </div>
        </section>

        <section className="form-panel">
          <div className="form-container">
            <div className="mobile-brand">❄ ColdTrack</div>

            <span className="eyebrow">ACESSO À PLATAFORMA</span>
            <h2>Bem-vindo de volta</h2>
            <p className="subtitle">
              Entre com suas credenciais para acessar o ColdTrack Control.
            </p>

            <form id="loginForm" noValidate onSubmit={enviar}>
              <div className="field">
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

              <div className="field">
                <div className="label-row">
                  <label htmlFor="password">Senha</label>
                </div>

                <div className="password-wrapper">
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
                    className="toggle-password"
                    aria-label={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
                    aria-pressed={String(senhaVisivel)}
                    onClick={() => setSenhaVisivel(v => !v)}
                  >{senhaVisivel ? "Ocultar" : "Mostrar"}</button>
                </div>
              </div>

              <div className="form-options">
                <a href="#" id="forgotPassword" onClick={esqueciSenha}>
                  Esqueceu a senha?
                </a>
              </div>

              <p id="loginMessage" className="form-message" role="status" aria-live="polite">{mensagem}</p>

              <div className="login-actions">
                <button type="submit" className="login-button" id="botaoEntrar" disabled={entrando}>
                  {entrando ? "Entrando…" : <>Entrar <span aria-hidden="true">→</span></>}
                </button>

                <Link to="/cadastro" className="register-button">
                  <span aria-hidden="true">+</span>
                  Cadastrar empresa
                </Link>
              </div>
            </form>

            <div className="security-note">
              <span aria-hidden="true">🔒</span>
              <p>
                A sessão vale por 8 horas. Sem acesso? Peça ao gestor
                da sua equipe para criar seu usuário.
              </p>
            </div>

            <div className="form-footer">
              <Link to="/">← Voltar ao início</Link>
              <span>ColdTrack Control · 2026</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );

}
