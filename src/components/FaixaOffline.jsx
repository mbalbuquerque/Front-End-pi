// Faixa fixa no topo das telas logadas quando o navegador está sem internet.
// Some sozinha ao voltar a conexão. O que está na tela é da última resposta da
// API (a telemetria nunca vai para o cache do service worker), por isso a faixa
// diz de que hora são os dados em vez de deixá-los passar por atuais.

import { useOnline, useUltimaRecepcao } from "../lib/conectividade.js";
import { formatarHora } from "../lib/formatar.js";

export default function FaixaOffline() {

  const online = useOnline();
  const ultima = useUltimaRecepcao();

  if (online) {
    return null;
  }

  return (
    <div className="faixa-offline" role="status" aria-live="polite" id="faixaOffline">
      {ultima
        ? `Sem conexão — exibindo os últimos dados recebidos às ${formatarHora(ultima)}`
        : "Sem conexão — nenhum dado foi recebido nesta sessão"}
    </div>
  );

}
