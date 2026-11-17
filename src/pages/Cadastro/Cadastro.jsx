// Cadastro de empresa nova: cria a empresa e o primeiro gestor, e já entra.
// Porte do site antigo: cadastro.html + js/cadastro.js.

import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AcessoLayout from "../../components/AcessoLayout.jsx";
import { useSessao } from "../../hooks/useSessao.jsx";
import { useTitulo } from "../../hooks/useTitulo.js";
import { postPublico } from "../../lib/api.js";
import { lerSessao } from "../../lib/sessao.js";


export default function Cadastro() {

  useTitulo("Cadastrar empresa · ColdTrack Control");

  const { usuario, entrar } = useSessao();
  const navigate = useNavigate();

  const [erro, setErro] = useState("");
  const [cadastrando, setCadastrando] = useState(false);

  // Depois do cadastro a sessão já existe: não deixa o "já logado" desviar
  // para o dashboard antes de chegar em /sensores.
  const cadastrouRef = useRef(false);

  // Já logado: vai direto ao painel (o antigo location.replace("dashboard.html")).
  if (!cadastrouRef.current && usuario && lerSessao()) {
    return <Navigate to="/dashboard" replace />;
  }

  async function enviar(evento) {

    evento.preventDefault();

    const dados = Object.fromEntries(new FormData(evento.currentTarget));

    if (Object.values(dados).some(v => !String(v).trim())) {
      setErro("Preencha todos os campos.");
      return;
    }

    setErro("");
    setCadastrando(true);

    try {

      const { ok, dados: resposta } = await postPublico("/empresas", dados);

      if (!ok) {
        setErro((resposta.erros || ["Não foi possível cadastrar."]).join(" · "));
        setCadastrando(false);
        return;
      }

      cadastrouRef.current = true;
      entrar(resposta.token, resposta.usuario);
      navigate("/sensores", { replace: true });

    }

    catch {

      setErro("Sem conexão com o servidor. Confira a internet e tente de novo.");
      setCadastrando(false);

    }

  }

  return (
    <AcessoLayout>

      <h1>Cadastrar empresa</h1>
      <p className="acesso-intro">Crie o acesso da sua transportadora. Você entra como gestor e depois registra sensores, veículos e a equipe.</p>

      <form className="acesso-form" id="formCadastro" noValidate onSubmit={enviar}>

        <label className="campo">
          <span>Nome da empresa</span>
          <input name="empresa" autoComplete="organization" required />
        </label>

        <label className="campo">
          <span>Seu nome</span>
          <input name="nome" autoComplete="name" required />
        </label>

        <label className="campo">
          <span>E-mail</span>
          <input type="email" name="email" autoComplete="username" required />
        </label>

        <label className="campo">
          <span>Senha (mínimo 8 caracteres)</span>
          <input type="password" name="senha" autoComplete="new-password" minLength={8} required />
        </label>

        <button type="submit" className="botao-primario" id="botaoCadastrar" disabled={cadastrando}>
          {cadastrando ? "Cadastrando…" : "Cadastrar empresa"}
        </button>

        <p className="aviso" id="erroCadastro" role="alert" hidden={!erro}>{erro}</p>

        <p className="acesso-secundario">Já tem acesso? <Link to="/login" className="link">Entrar</Link></p>

      </form>

      <div className="acesso-rodape">
        <Link to="/" className="voltar">
          <span aria-hidden="true">←</span> Voltar ao início
        </Link>
      </div>

    </AcessoLayout>
  );

}
