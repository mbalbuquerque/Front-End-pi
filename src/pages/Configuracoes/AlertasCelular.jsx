// Card "Alertas no celular" da tela de Configurações: liga e desliga o Web Push
// deste aparelho (hook useAlertasPush). A notificação chega quando um sensor da
// empresa passa para atenção ou crítico, mesmo com o painel fechado.

import { useAlertasPush } from "../../hooks/useAlertasPush.js";


export default function AlertasCelular() {

  const { estado, ocupado, erro, ativar, desativar } = useAlertasPush();

  return (
    <article className="panel alertas-celular" id="alertasCelular">
      <h2>Alertas no celular</h2>
      <p>Receba uma notificação quando um sensor da empresa sair da faixa normal (atenção ou crítico), mesmo com o painel fechado. Vale só para este aparelho.</p>

      {estado === "verificando" && <p>Verificando este aparelho…</p>}

      {estado === "sem-suporte" && (
        <div className="nota" id="pushSemSuporte">
          Este navegador não recebe alertas push. No Android, use o Chrome.{" "}
          <strong>No iPhone (iOS 16.4 ou mais novo)</strong>, adicione o ColdTrack à tela de início
          (Compartilhar → Adicionar à Tela de Início) e ative por lá.
        </div>
      )}

      {estado === "negado" && (
        <div className="nota" id="pushNegado">
          As notificações estão bloqueadas para este site. Para liberar, toque no cadeado ao lado do
          endereço (ou em Configurações do navegador → Notificações), permita o ColdTrack e recarregue
          a página.
        </div>
      )}

      {estado === "inativo" && (
        <button type="button" className="botao" id="ativarPush" disabled={ocupado !== null}
          onClick={ativar}>
          {ocupado === "ativando" ? "Ativando…" : "Ativar alertas no celular"}
        </button>
      )}

      {estado === "ativo" && (
        <>
          <p className="aviso-ok" id="pushAtivo" role="status">Alertas ativos neste aparelho.</p>
          <button type="button" className="botao secundario" id="desativarPush" disabled={ocupado !== null}
            onClick={desativar}>
            {ocupado === "desativando" ? "Desativando…" : "Desativar"}
          </button>
        </>
      )}

      <p className="erro-form" id="erroPush" role="alert" hidden={erro === null}>{erro}</p>
    </article>
  );

}
