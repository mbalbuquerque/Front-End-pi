// Gestão de usuários (demonstrativa, dados de exemplo).
// Porte do site antigo: usuarios.html + js/usuarios.js. Os usuários reais da
// empresa ficam em Configurações > Usuários (gestor).

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icone from "../../components/Icone.jsx";
import PainelLayout from "../../components/PainelLayout.jsx";
import "../../styles/gestao/gestao.css";
import { NOMES_PERFIS, USUARIOS, filtrarUsuarios } from "./usuarios.js";


export default function Usuarios() {

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
  const ativos = USUARIOS.filter(u => u.status === "ativo").length;

  const campos = detalhe && [
    ["Nome", detalhe.nome],
    ["E-mail", detalhe.email],
    ["Função", detalhe.funcao],
    ["Perfil", NOMES_PERFIS[detalhe.perfil]],
    ["Status", detalhe.status === "ativo" ? "Ativo" : "Inativo"]
  ];

  function acao(texto) {
    setFeedback(`A ação "${texto}" será integrada à API ColdTrack.`);
  }

  return (
    <PainelLayout
      titulo="Gestão de Usuários"
      subtitulo="Colaboradores, funções e perfis de acesso"
      familia="gestao"
      extraTopo={
        <Link to="/cadastro-usuario" className="botao-g primario">
          <Icone nome="adicionar" tamanho={20} />
          Novo usuário
        </Link>
      }
    >

      <div className="gestao">

        <p className="aviso-demo" role="note">
          <Icone nome="info" />
          <span>Interface demonstrativa: os usuários listados são dados de exemplo.</span>
        </p>

        <section className="kpis" aria-label="Indicadores">
          <article className="kpi">
            <div>
              <span className="kpi-rotulo">Total de usuários</span>
              <strong id="totalUsuarios">{USUARIOS.length}</strong>
            </div>
            <span className="kpi-icone"><Icone nome="usuarios" /></span>
          </article>

          <article className="kpi normal">
            <div>
              <span className="kpi-rotulo">Usuários ativos</span>
              <strong id="usuariosAtivos">{ativos}</strong>
            </div>
            <span className="kpi-icone"><Icone nome="ok" /></span>
          </article>

          <article className="kpi">
            <div>
              <span className="kpi-rotulo">Usuários inativos</span>
              <strong id="usuariosInativos">{USUARIOS.length - ativos}</strong>
            </div>
            <span className="kpi-icone"><Icone nome="usuario" /></span>
          </article>
        </section>

        <section className="cartao" aria-labelledby="tituloUsuarios">
          <div className="cartao-topo">
            <div>
              <h2 id="tituloUsuarios">Usuários cadastrados</h2>
              <p>Exibição de exemplo para desenvolvimento da interface.</p>
            </div>
            <span className="selo-demo">DADOS DEMONSTRATIVOS</span>
          </div>

          <div className="filtros">
            <label className="filtro-campo busca">
              Pesquisar
              <input
                id="pesquisa"
                type="search"
                placeholder="Nome, e-mail ou função"
                value={termo}
                onChange={e => setTermo(e.target.value)}
              />
            </label>

            <label className="filtro-campo">
              Perfil
              <select id="filtroPerfil" value={perfil} onChange={e => setPerfil(e.target.value)}>
                <option value="">Todos os perfis</option>
                <option value="administrador">Administrador</option>
                <option value="gestor">Gestor Logístico</option>
                <option value="operador">Operador</option>
                <option value="cliente">Cliente</option>
              </select>
            </label>

            <label className="filtro-campo">
              Situação
              <select id="filtroStatus" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
          </div>

          <div className="tabela-rolagem">
            <table className="tabela-g tabela-cartoes">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Função</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th className="acoes-linha">Ações</th>
                </tr>
              </thead>
              <tbody id="usuariosTabela">
                {filtrados.map(usuario => {
                  const textoStatus = usuario.status === "ativo" ? "Desativar" : "Ativar";
                  return (
                    <tr key={usuario.id}>
                      <td className="nome-com-apoio">
                        <strong>{usuario.nome}</strong>
                        <span>{usuario.email}</span>
                      </td>
                      <td data-rotulo="Função">{usuario.funcao}</td>
                      <td data-rotulo="Perfil"><span className="pilula info sem-ponto">{NOMES_PERFIS[usuario.perfil]}</span></td>
                      <td data-rotulo="Status">
                        <span className={`pilula ${usuario.status === "ativo" ? "normal" : "offline"}`}>
                          {usuario.status === "ativo" ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td>
                        <div className="acoes-linha">
                          <button type="button" className="botao-g texto" onClick={() => setDetalhe(usuario)}>Visualizar</button>
                          <button type="button" className="botao-g texto" onClick={() => acao("Editar")}>Editar</button>
                          <button type="button" className="botao-g texto" onClick={() => acao(textoStatus)}>{textoStatus}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p id="semResultados" className="vazio" hidden={filtrados.length !== 0}>
            Nenhum usuário encontrado. Limpe a pesquisa ou escolha outro perfil.
          </p>

          <p id="feedback" className="retorno" role="status" aria-live="polite">{feedback}</p>
        </section>
      </div>

      <dialog id="detalhesDialog" className="dialogo" ref={dialogRef} aria-labelledby="tituloDetalhesUsuario" onClose={() => setDetalhe(null)}>
        <div className="dialogo-topo">
          <h2 id="tituloDetalhesUsuario">Detalhes do usuário</h2>
        </div>
        <div className="dialogo-corpo">
          <dl id="detalhesConteudo" className="detalhes">
            {campos && campos.map(([rotulo, valor]) => (
              <div key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></div>
            ))}
          </dl>
        </div>
        <div className="dialogo-rodape">
          <button type="button" id="fecharDialog" className="botao-g primario" onClick={() => dialogRef.current.close()}>
            Fechar
          </button>
        </div>
      </dialog>

    </PainelLayout>
  );

}
