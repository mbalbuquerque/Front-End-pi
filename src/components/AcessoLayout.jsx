// Moldura das telas de acesso (/login e /cadastro): painel navy com a marca e
// a régua de faixa (a forma que o painel usa para a temperatura da carga) e o
// formulário num cartão. No celular a marca vira uma faixa curta no topo.

import { Link } from "react-router-dom";
import Icone from "./Icone.jsx";
import "../styles/login/login.css";


export default function AcessoLayout({ children }) {

  return (
    <div className="escopo-login raiz-pagina">
      <div className="acesso">

        <section className="acesso-marca" aria-label="ColdTrack Control">
          <Link className="acesso-logo" to="/" aria-label="ColdTrack Control, página inicial">
            <Icone nome="marca" tamanho={30} />
            <span>ColdTrack Control</span>
          </Link>

          <div className="acesso-tese">
            <p>Inteligência e segurança para a cadeia fria.</p>
            <div className="regua" aria-hidden="true">
              <span className="regua-normal" />
              <span className="regua-atencao" />
              <span className="regua-critico" />
            </div>
            <ul className="regua-legenda">
              <li className="legenda-normal">Faixa segura</li>
              <li className="legenda-atencao">Atenção</li>
              <li className="legenda-critico">Crítico</li>
            </ul>
          </div>
        </section>

        <main className="acesso-lado">
          <div className="acesso-cartao">
            {children}
          </div>
        </main>

      </div>
    </div>
  );

}
