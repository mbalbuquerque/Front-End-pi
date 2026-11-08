// Marcador das telas ainda não migradas. Quem portar a tela troca o
// conteúdo do arquivo da página inteiro; este componente some no fim da migração.

import { Link } from "react-router-dom";
import { useTitulo } from "../hooks/useTitulo.js";

export default function EmConstrucao({ nome, legado }) {

  useTitulo(`${nome} · ColdTrack Control`);

  return (
    <main className="em-construcao">
      <h1>{nome}</h1>
      <p>Tela em migração para React{legado ? ` (origem: legado/${legado})` : ""}.</p>
      <p><Link to="/">Voltar ao início</Link></p>
    </main>
  );

}
