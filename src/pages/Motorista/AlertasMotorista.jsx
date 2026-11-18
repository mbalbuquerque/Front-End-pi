// Bloco "Alertas" da tela do motorista: um botão só (issue #75). "Ativar alertas"
// liga a notificação (também com a tela fechada, pelo Web Push), o som e a
// vibração; "Desativar" desliga tudo e a tela fica só com o aviso visual.
// O estado vem de useAlertasMotorista (Motorista.jsx), que também dispara o alerta.
// A API só manda ao motorista os alertas do veículo vinculado a ele, e o toque
// na notificação abre /motorista.

import Icone from "../../components/Icone.jsx";


export default function AlertasMotorista({ alertas }) {

  const { ligado, estadoPush, ocupado, erro, ativar, desativar } = alertas;

  if (estadoPush === "verificando") {
    return null;
  }

  return (
    <section className="alertas-push" id="alertasMotorista" aria-labelledby="tituloAlertas">
      <h2 id="tituloAlertas">Alertas</h2>

      {ligado ? (
        <>
          <p className="alertas-ligados" id="alertasLigados" role="status">
            <Icone nome="ok" tamanho={22} />
            {estadoPush === "ativo"
              ? "Alertas ligados, também com a tela fechada."
              : "Alertas ligados com esta tela aberta."}
          </p>
          <button type="button" className="desativar-push" id="desativarAlertas" disabled={ocupado !== null}
            onClick={desativar}>
            {ocupado === "desativando" ? "Desativando…" : "Desativar"}
          </button>
        </>
      ) : (
        <>
          <p>Som, vibração e notificação quando a carga sair da faixa.</p>
          <button type="button" className="ativar-alertas" id="ativarAlertas" disabled={ocupado !== null}
            onClick={ativar}>
            {ocupado === "ativando" ? "Ativando…" : "Ativar alertas"}
          </button>
        </>
      )}

      {estadoPush === "sem-suporte" && (
        <p className="nota-push" id="pushSemSuporte">
          Este navegador não recebe alertas com a tela fechada; o som e a vibração valem com esta
          tela aberta. No Android, use o Chrome. No iPhone (iOS 16.4 ou mais novo), adicione o
          ColdTrack à tela de início (Compartilhar → Adicionar à Tela de Início) e ative por lá.
        </p>
      )}

      {estadoPush === "negado" && (
        <p className="nota-push" id="pushNegado">
          As notificações estão bloqueadas para este site. Libere nas configurações do navegador
          (Notificações → ColdTrack) e abra esta tela de novo. O som e a vibração valem com esta
          tela aberta.
        </p>
      )}

      {erro && <p className="erro-push" id="erroPush" role="alert">{erro}</p>}
    </section>
  );

}


// Dica discreta no topo enquanto o som não está liberado (depois de recarregar,
// o navegador espera um toque na página).
export function DicaSom({ alertas }) {

  if (!alertas.ligado || alertas.somArmado) {
    return null;
  }

  return (
    <p className="dica-som" id="dicaSom" role="status">
      <Icone nome="sino" tamanho={20} />
      Toque na tela para ligar o som e a vibração.
    </p>
  );

}
