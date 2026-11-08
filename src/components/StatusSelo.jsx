// Selo NORMAL / ATENÇÃO / CRÍTICO / SEM DADOS (antigo seloStatus()).

import { infoStatus } from "../lib/formatar.js";

export default function StatusSelo({ status }) {

  const info = infoStatus(status);

  return <span className={`status ${info.classe}`}>{info.texto}</span>;

}
