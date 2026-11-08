// Cadastro de usuários (demonstrativo: valida e não chama API).
// Porte de legado/cadastro-usuario.html + legado/js/cadastro-usuario.js.

import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTitulo } from "../../hooks/useTitulo.js";
import "../../styles/cadastro-usuario/cadastro.css";
import { formatarCPF, validarCPF } from "./cpf.js";


export default function CadastroUsuario() {

  useTitulo("Cadastro de Usuários | ColdTrack");

  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const cpfRef = useRef(null);
  const emailRef = useRef(null);

  function erro(texto) {
    setSucesso(false);
    setMensagem(texto);
  }

  function enviar(evento) {

    evento.preventDefault();
    setMensagem("");
    setSucesso(false);

    const dados = Object.fromEntries(new FormData(evento.currentTarget));
    const nome = dados.nome.trim();
    const funcao = dados.funcao.trim();

    if (nome.split(/\s+/).length < 2) {
      erro("Informe o nome completo.");
      return;
    }

    if (!validarCPF(dados.cpf)) {
      erro("Informe um CPF válido.");
      cpfRef.current.focus();
      return;
    }

    if (!emailRef.current.checkValidity()) {
      erro("Informe um e-mail válido.");
      emailRef.current.focus();
      return;
    }

    if (!funcao || !dados.perfil) {
      erro("Preencha a função e o perfil de acesso.");
      return;
    }

    // Não persistir CPF nem criar contas no navegador.
    // A API deverá validar autenticação, autorização,
    // CPF, unicidade, empresa e perfil antes de salvar.

    setSucesso(true);
    setMensagem("Formulário validado. O cadastro estará disponível após a integração com a API.");

  }

  // flow-root: a margem inferior do .container ficava fora do fundo da raiz (no original, o fundo do body cobria tudo).
  return (
    <div className="escopo-cadastro-usuario raiz-pagina" style={{ display: "flow-root" }}>

      <header className="topbar">
        <Link to="/" className="brand">❄ ColdTrack<span>.</span></Link>
        <span className="admin-label">Painel Administrativo</span>
      </header>

      <main className="container">
        <div className="page-heading">
          <Link to="/" className="back-link">← Voltar</Link>
          <h1>Cadastro de Usuários</h1>
          <p>Cadastre colaboradores e configure o perfil de acesso.</p>
        </div>

        <section className="card">
          <div className="card-heading">
            <h2>Novo usuário</h2>
            <p>Preencha os dados do colaborador.</p>
          </div>

          <form id="cadastroForm" noValidate onSubmit={enviar} onReset={() => setMensagem("")}>
            <div className="form-grid">
              <div className="field full">
                <label htmlFor="nome">Nome completo *</label>
                <input type="text" id="nome" name="nome"
                  autoComplete="name"
                  placeholder="Nome e sobrenome"
                  maxLength={150} required />
              </div>

              <div className="field">
                <label htmlFor="cpf">CPF *</label>
                <input type="text" id="cpf" name="cpf" ref={cpfRef}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  maxLength={14} required
                  onInput={e => { e.target.value = formatarCPF(e.target.value); }} />
              </div>

              <div className="field">
                <label htmlFor="email">E-mail corporativo *</label>
                <input type="email" id="email" name="email" ref={emailRef}
                  autoComplete="email"
                  placeholder="nome@empresa.com"
                  maxLength={254} required />
              </div>

              <div className="field">
                <label htmlFor="funcao">Função *</label>
                <input type="text" id="funcao" name="funcao"
                  placeholder="Ex.: Supervisor de Logística"
                  maxLength={100} required />
              </div>

              <div className="field">
                <label htmlFor="perfil">Perfil de acesso *</label>
                <select id="perfil" name="perfil" required defaultValue="">
                  <option value="">Selecione um perfil</option>
                  <option value="administrador">Administrador</option>
                  <option value="gestor">Gestor Logístico</option>
                  <option value="operador">Operador</option>
                  <option value="cliente">Cliente / Consulta</option>
                </select>
              </div>
            </div>

            <div className="security-info">
              <strong>🔒 Cadastro controlado</strong>
              <p>
                A criação de usuários deverá ser autorizada pelo
                backend. Nenhuma senha será solicitada ao administrador.
              </p>
            </div>

            <p id="mensagem" className="message" role="status" aria-live="polite"
              style={sucesso ? { color: "#087d90" } : undefined}>{mensagem}</p>

            <div className="form-actions">
              <button type="reset" className="btn-secondary">Limpar</button>
              <button type="submit" className="btn-primary">
                Cadastrar usuário
              </button>
            </div>
          </form>
        </section>
      </main>

    </div>
  );

}
