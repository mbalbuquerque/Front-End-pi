// Gestão de usuários (demonstrativa, dados de exemplo).
// Porte do site antigo: usuarios.html + js/usuarios.js.

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTitulo } from "../../hooks/useTitulo.js";
import "../../styles/usuarios/usuarios.css";
import { NOMES_PERFIS, USUARIOS, filtrarUsuarios } from "./usuarios.js";


export default function Usuarios() {

  useTitulo("Gestão de Usuários | ColdTrack");

  const [termo, setTermo] = useState("");
  const [perfil, setPerfil] = useState("");
  const [status, setStatus] = useState("");
  const [feedback, setFeedback] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const dialogRef = useRef(null);

  // Abre o diálogo modal quando há um usuário escolhido.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (detalhe && !dialog.open) dialog.showModal();
  }, [detalhe]);

  const filtrados = filtrarUsuarios(USUARIOS, { termo, perfil, status });

  const campos = detalhe && [
    ["Nome", detalhe.nome],
    ["E-mail", detalhe.email],
    ["Função", detalhe.funcao],
    ["Perfil", NOMES_PERFIS[detalhe.perfil]],
    ["Status", detalhe.status]
  ];

  function acao(texto) {
    setFeedback(`A ação "${texto}" será integrada à API ColdTrack.`);
  }

  return (
    <div className="escopo-usuarios raiz-pagina">

      <div className="app-layout">
        <aside className="sidebar">
          <Link className="brand" to="/">❄ ColdTrack<span>.</span></Link>
          <p className="sidebar-label">ADMINISTRAÇÃO</p>

          <nav aria-label="Menu administrativo">
            <Link to="/">⌂ Início</Link>
            <Link to="/dashboard">◫ Dashboard</Link>
            <Link to="/logistica">▣ Gestão Logística</Link>
            <Link to="/usuarios" className="active" aria-current="page">♙ Usuários</Link>
            <Link to="/cadastro-usuario">＋ Novo usuário</Link>
            <Link to="/auditoria">▤ Auditoria</Link>
            <Link to="/monitoramento">◉ Monitoramento</Link>
          </nav>

          <div className="sidebar-footer">
            <span>ColdTrack Control</span>
            <small>Interface demonstrativa</small>
          </div>
        </aside>

        <main className="main-content">
          <header className="page-header">
            <div>
              <p className="eyebrow">CONTROLE DE ACESSO</p>
              <h1>Gestão de Usuários</h1>
              <p>Gerencie colaboradores, funções e perfis de acesso.</p>
            </div>

            <Link to="/cadastro-usuario" className="btn-primary">
              + Novo usuário
            </Link>
          </header>

          <section className="stats" aria-label="Indicadores">
            <article className="stat-card">
              <span>Total de usuários</span>
              <strong id="totalUsuarios">{USUARIOS.length}</strong>
            </article>

            <article className="stat-card">
              <span>Usuários ativos</span>
              <strong id="usuariosAtivos">{USUARIOS.filter(u => u.status === "ativo").length}</strong>
            </article>

            <article className="stat-card">
              <span>Usuários inativos</span>
              <strong id="usuariosInativos">{USUARIOS.filter(u => u.status === "inativo").length}</strong>
            </article>
          </section>

          <section className="table-card">
            <div className="table-heading">
              <div>
                <h2>Usuários cadastrados</h2>
                <p>Exibição de exemplo para desenvolvimento da interface.</p>
              </div>
              <span className="demo-label">DADOS DEMONSTRATIVOS</span>
            </div>

            <div className="filters">
              <label>
                Pesquisar
                <input
                  id="pesquisa"
                  type="search"
                  placeholder="Nome, e-mail ou função"
                  value={termo}
                  onChange={e => setTermo(e.target.value)}
                />
              </label>

              <label>
                Perfil
                <select id="filtroPerfil" value={perfil} onChange={e => setPerfil(e.target.value)}>
                  <option value="">Todos os perfis</option>
                  <option value="administrador">Administrador</option>
                  <option value="gestor">Gestor Logístico</option>
                  <option value="operador">Operador</option>
                  <option value="cliente">Cliente</option>
                </select>
              </label>

              <label>
                Situação
                <select id="filtroStatus" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </label>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Função</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody id="usuariosTabela">
                  {filtrados.map(usuario => {
                    const textoStatus = usuario.status === "ativo" ? "Desativar" : "Ativar";
                    return (
                      <tr key={usuario.id}>
                        <td className="user-name">
                          {usuario.nome}
                          <span className="user-email">{usuario.email}</span>
                        </td>
                        <td>{usuario.funcao}</td>
                        <td>{NOMES_PERFIS[usuario.perfil]}</td>
                        <td>
                          <span className={`status ${usuario.status}`}>
                            {usuario.status === "ativo" ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="action-button" onClick={() => setDetalhe(usuario)}>Visualizar</button>
                          <button type="button" className="action-button" onClick={() => acao("Editar")}>Editar</button>
                          <button type="button" className="action-button" onClick={() => acao(textoStatus)}>{textoStatus}</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p id="semResultados" className="empty-state" hidden={filtrados.length !== 0}>
              Nenhum usuário encontrado.
            </p>

            <p id="feedback" className="feedback" role="status" aria-live="polite">{feedback}</p>
          </section>
        </main>
      </div>

      <dialog id="detalhesDialog" ref={dialogRef} onClose={() => setDetalhe(null)}>
        <div className="dialog-content">
          <h2>Detalhes do usuário</h2>
          <div id="detalhesConteudo">
            {campos && campos.map(([rotulo, valor]) => (
              <p key={rotulo}><strong>{rotulo}: </strong>{valor}</p>
            ))}
          </div>
          <button type="button" id="fecharDialog" className="btn-primary" onClick={() => dialogRef.current.close()}>
            Fechar
          </button>
        </div>
      </dialog>

    </div>
  );

}
