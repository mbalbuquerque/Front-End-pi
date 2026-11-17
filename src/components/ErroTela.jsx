// Limite de erro das rotas (issue #69): se uma tela não carrega (pedaço do
// bundle de uma publicação anterior que a recarga automática não resolveu) ou
// quebra ao montar, mostra o aviso com "Atualizar" no lugar da página em
// branco. Mudar de rota limpa o erro.
//
//   <ErroTela local={pathname}><Suspense>...</Suspense></ErroTela>

import { Component } from "react";
import { ehErroDeVersao } from "../lib/versao.js";
import "../styles/erro-tela.css";


export default class ErroTela extends Component {

  constructor(props) {
    super(props);
    this.state = { erro: null, local: props.local };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  static getDerivedStateFromProps(props, state) {
    return props.local !== state.local ? { erro: null, local: props.local } : null;
  }

  render() {

    const { erro } = this.state;
    const { atualizar = () => window.location.reload(), children } = this.props;

    if (!erro) {
      return children;
    }

    const versao = ehErroDeVersao(erro);

    return (
      <main className="erro-tela" role="alert">
        <div className="erro-tela-cartao">
          <h1>{versao ? "Há uma versão nova do ColdTrack" : "Não foi possível abrir esta tela"}</h1>
          <p>
            {versao
              ? "O painel foi atualizado enquanto esta página estava aberta. Atualize para carregar a versão nova."
              : "Algo deu errado ao montar a tela. Atualize a página; se continuar, verifique a conexão."}
          </p>
          <button type="button" className="erro-tela-botao" onClick={atualizar}>Atualizar</button>
        </div>
      </main>
    );

  }

}
