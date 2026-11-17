// Alertas no celular (Web Push) da tela do motorista: mesmo hook do card de
// Configurações, com o texto e o visual da tela do celular no suporte.
// A API só manda ao motorista os alertas do veículo vinculado a ele, e o toque
// na notificação abre /motorista. O alerta local (vibração, bipe) continua
// valendo com a tela aberta; o push cobre a tela fechada ou o celular bloqueado.

import { useAlertasPush } from "../../hooks/useAlertasPush.js";


export default function AlertasPushMotorista() {

  const { estado, ocupado, erro, ativar, desativar } = useAlertasPush();

  if (estado === "verificando") {
    return null;
  }

  return (
    <section className="alertas-push" id="alertasPushMotorista" aria-labelledby="tituloAlertasPush">
      <h2 id="tituloAlertasPush">Alertas com a tela fechada</h2>

      {estado === "sem-suporte" && (
        <p className="nota-push" id="pushSemSuporte">
          Este navegador não recebe alertas com a tela fechada. No Android, use o Chrome.
          No iPhone (iOS 16.4 ou mais novo), adicione o ColdTrack à tela de início
          (Compartilhar → Adicionar à Tela de Início) e ative por lá.
        </p>
      )}

      {estado === "negado" && (
        <p className="nota-push" id="pushNegado">
          As notificações estão bloqueadas para este site. Libere nas configurações do navegador
          (Notificações → ColdTrack) e abra esta tela de novo.
        </p>
      )}

      {estado === "inativo" && (
        <>
          <p>Receba no celular o alerta do seu veículo mesmo com esta tela fechada.</p>
          <button type="button" className="ativar-alertas" id="ativarPush" disabled={ocupado !== null}
            onClick={ativar}>
            {ocupado === "ativando" ? "Ativando…" : "Ativar alertas no celular"}
          </button>
        </>
      )}

      {estado === "ativo" && (
        <>
          <p className="push-ativo" id="pushAtivo" role="status">Alertas ativos neste celular.</p>
          <button type="button" className="desativar-push" id="desativarPush" disabled={ocupado !== null}
            onClick={desativar}>
            {ocupado === "desativando" ? "Desativando…" : "Desativar"}
          </button>
        </>
      )}

      {erro && <p className="erro-push" id="erroPush" role="alert">{erro}</p>}
    </section>
  );

}
