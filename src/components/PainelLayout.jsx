// Moldura única das telas internas (design system, seção 7): barra lateral com
// os grupos Operação e Gestão, barra superior com título, conteúdo extra
// (seletor de veículo) e indicador de conexão, faixa offline e rodapé. No
// celular a mesma barra lateral vira a navegação inferior (Visão geral,
// Alertas, Sensores, Viagens e "Mais", que abre o resto do menu).
//
//   <PainelLayout titulo="Alertas" subtitulo="Leituras fora da faixa normal da carga"
//                 conexao={conexao} extraTopo={<SeletorVeiculo ... />}>
//     <div id="conteudo" className="page-grid">...</div>
//   </PainelLayout>
//
// familia: família de CSS do conteúdo (src/styles/<familia>/). As telas de
// gestão (Monitoramento) passam a própria família e o próprio
// cabeçalho: sem "titulo", a barra superior não repete o <h1> da tela.
// Sem "conexao" (undefined), a tela não fala com a API e o indicador some.
//
// O assistente do painel (botão flutuante "Assistente") vem montado aqui nas
// telas da família painel, então aparece em toda tela logada sem a tela fazer nada.
//
// dialogos: elementos que precisam ser filhos diretos da raiz da família, fora
// do <main>. Ex.: a <dialog className="etiqueta"> de Veículos, porque a regra
// de impressão é ".escopo-painel:has(.etiqueta[open]) > *:not(.etiqueta)".

import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useOnline, useUltimaRecepcao } from "../lib/conectividade.js";
import { formatarHora } from "../lib/formatar.js";
import { useSessao } from "../hooks/useSessao.jsx";
import { useTitulo } from "../hooks/useTitulo.js";
import { ehGestor, nomeDoPerfil } from "../lib/sessao.js";
import { GRUPOS_PAINEL } from "../rotas.js";
import FaixaOffline from "./FaixaOffline.jsx";
import Icone from "./Icone.jsx";
import AssistentePainel from "./AssistentePainel/AssistentePainel.jsx";
import "../styles/painel/index.css";
import "../styles/shell/shell.css";


// conexao: null = "Conectando...", true = Azure respondeu, false = falhou.
export function IndicadorConexao({ conexao }) {

  const online = useOnline();
  const ultima = useUltimaRecepcao();
  const falhou = conexao === false || !online;
  const estado = falhou ? "falha" : conexao ? "ok" : "aguardando";

  return (
    <div className="ct-conexao">
      <div className={`connection ct-pilula ct-pilula--${estado}`}>
        <span className="online-dot" aria-hidden="true" />
        <span id="fonteDados">
          {!online ? "Sem internet" : conexao === null ? "Conectando..." : conexao ? "Azure conectado" : "Sem conexão com Azure"}
        </span>
      </div>
      {ultima && online && conexao ? (
        <span className="ct-atualizado">atualizado às {formatarHora(ultima)}</span>
      ) : null}
    </div>
  );

}


function ativa(pagina, caminho) {

  return pagina.rota === caminho || (pagina.tambem || []).includes(caminho);

}


export default function PainelLayout({
  titulo,
  subtitulo,
  tituloDocumento = titulo ? `${titulo} · ColdTrack Control` : null,
  conexao,
  extraTopo = null,
  dialogos = null,
  familia = "painel",
  children
}) {

  const { usuario, sair } = useSessao();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);
  const idMenu = useId();

  useTitulo(tituloDocumento);

  // "Mais" aberto no celular: Escape fecha.
  useEffect(() => {

    if (!menuAberto) {
      return undefined;
    }

    function tecla(evento) {
      if (evento.key === "Escape") {
        setMenuAberto(false);
      }
    }

    document.addEventListener("keydown", tecla);

    return () => document.removeEventListener("keydown", tecla);

  }, [menuAberto]);

  const painel = familia === "painel";
  const temTopo = Boolean(titulo) || Boolean(extraTopo) || conexao !== undefined;

  return (
    <div className={`escopo-shell raiz-pagina ct-shell${menuAberto ? " ct-shell--menu-aberto" : ""}`}>

      <aside className="ct-sidebar" id="sidebar">

        <Link to="/" className="ct-marca" aria-label="ColdTrack Control, página inicial">
          <span className="ct-marca-icone"><Icone nome="marca" tamanho={24} /></span>
          <span className="ct-marca-texto">
            <strong>ColdTrack Control</strong>
            <span>Monitoramento da cadeia fria</span>
          </span>
        </Link>

        <nav aria-label="Menu principal" className="ct-nav" id={idMenu}>
          {GRUPOS_PAINEL.map(grupo => (
            <div className="ct-nav-grupo" key={grupo.nome}>
              <span className="ct-nav-titulo">{grupo.nome}</span>
              {grupo.paginas.filter(pagina => !pagina.gestor || ehGestor(usuario)).map(pagina => {
                const atual = ativa(pagina, pathname);
                return (
                  <Link
                    key={pagina.rota}
                    to={pagina.rota}
                    className={`ct-nav-item${pagina.celular ? " ct-nav-item--celular" : ""}${atual ? " active" : ""}`}
                    aria-current={atual ? "page" : undefined}
                    style={pagina.celular ? { "--ordem": pagina.celular } : undefined}
                    onClick={() => setMenuAberto(false)}
                  >
                    <Icone nome={pagina.icone} />
                    <span>{pagina.nome}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="ct-mais"
          aria-expanded={menuAberto}
          aria-controls={idMenu}
          onClick={() => setMenuAberto(aberto => !aberto)}
        >
          <Icone nome={menuAberto ? "fechar" : "mais"} />
          <span>{menuAberto ? "Fechar" : "Mais"}</span>
        </button>

        <div className="ct-sidebar-rodape">
          {usuario ? (
            <div className="ct-usuario">
              <Icone nome="usuario" tamanho={26} />
              <span className="ct-usuario-texto">
                <strong>{usuario.nome || ""}</strong>
                <span>{nomeDoPerfil(usuario.perfil)}</span>
                <span>{usuario.empresa || ""}</span>
              </span>
            </div>
          ) : null}
          <button type="button" className="ct-sair" id="botaoSair" onClick={sair}>
            <Icone nome="sair" />
            <span>Sair</span>
          </button>
        </div>

      </aside>

      <button
        type="button"
        className="ct-veu"
        aria-label="Fechar menu"
        tabIndex={-1}
        onClick={() => setMenuAberto(false)}
      />

      <div className={`escopo-${familia} ct-area`}>

        <FaixaOffline />

        {temTopo ? (
          <header className="ct-topbar">
            {titulo ? (
              <div className="ct-titulo">
                <h1>{titulo}</h1>
                {subtitulo ? <p>{subtitulo}</p> : null}
              </div>
            ) : null}

            {extraTopo ? <div className="ct-topbar-extra">{extraTopo}</div> : null}

            {conexao !== undefined ? <IndicadorConexao conexao={conexao} /> : null}
          </header>
        ) : null}

        <main className="ct-conteudo">

          {children}

          {painel ? (
            <footer>
              ColdTrack Edge • Projeto Integrador 2026
            </footer>
          ) : null}

        </main>

        {dialogos}

        {/* Botão flutuante do assistente: em toda tela logada, fora da impressão. */}
        {painel ? <AssistentePainel /> : null}

      </div>

    </div>
  );

}
