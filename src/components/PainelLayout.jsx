// Moldura das telas logadas (família painel): menu lateral, topo com título
// e indicador de conexão, rodapé. Porte do montarMenu() + HTML comum das páginas.
//
//   <PainelLayout titulo="Alertas" subtitulo="Leituras fora da faixa normal da carga"
//                 conexao={conexao} extraTopo={<SeletorVeiculo ... />}>
//     <div id="conteudo" className="page-grid">...</div>
//   </PainelLayout>
//
// dialogos: elementos que precisam ser filhos diretos da raiz do escopo, fora
// do <main>. Ex.: a <dialog className="etiqueta"> de Veículos, porque a regra
// de impressão é ".escopo-painel:has(.etiqueta[open]) > *:not(.etiqueta)".

import { NavLink } from "react-router-dom";
import { useSessao } from "../hooks/useSessao.jsx";
import { useTitulo } from "../hooks/useTitulo.js";
import { PAGINAS_PAINEL } from "../rotas.js";
import "../styles/painel/index.css";


// conexao: null = "Conectando...", true = Azure respondeu, false = falhou.
export function IndicadorConexao({ conexao }) {

  return (
    <div className="connection">
      <span className="online-dot" style={conexao === false ? { background: "var(--red)" } : undefined} />
      <span id="fonteDados">
        {conexao === null ? "Conectando..." : conexao ? "Azure conectado" : "Sem conexão com Azure"}
      </span>
    </div>
  );

}


export default function PainelLayout({
  titulo,
  subtitulo,
  tituloDocumento = `${titulo} · ColdTrack Control`,
  conexao = null,
  extraTopo = null,
  dialogos = null,
  children
}) {

  const { usuario, sair } = useSessao();

  useTitulo(tituloDocumento);

  return (
    <div className="escopo-painel raiz-pagina">

      <aside className="sidebar" id="sidebar">

        <div className="brand">
          <div className="brand-icon">❄</div>
          <div>
            <strong>ColdTrack</strong>
            <span>CONTROL</span>
          </div>
        </div>

        <nav aria-label="Menu principal">
          {PAGINAS_PAINEL.map(pagina => (
            <NavLink key={pagina.rota} to={pagina.rota}>
              {pagina.icone} {pagina.nome}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="usuario-menu">
            <strong>{usuario?.nome || ""}</strong>
            <span>{usuario?.perfil === "gestor" ? "Gestor" : "Operador logístico"}</span>
            <span>{usuario?.empresa || ""}</span>
          </div>
          <button type="button" className="sair" id="botaoSair" onClick={sair}>Sair</button>
        </div>

      </aside>

      <main className="main">

        <header className="topbar">
          <div>
            <h1>{titulo}</h1>
            <p>{subtitulo}</p>
          </div>

          {extraTopo}

          <IndicadorConexao conexao={conexao} />
        </header>

        {children}

        <footer>
          ColdTrack Edge • Projeto Integrador 2026
        </footer>

      </main>

      {dialogos}

    </div>
  );

}
