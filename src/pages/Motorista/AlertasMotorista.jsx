// Cartão "Alertas no celular" da aba Perfil: um botão só (issue #75). "Ativar alertas"
// liga a notificação (também com a tela fechada, pelo Web Push), o som e a
// vibração; "Desativar" desliga tudo e a tela fica só com o aviso visual.
// O estado vem de useAlertasMotorista (Motorista.jsx), que também dispara o alerta.
// "Testar" mostra como o aviso chega; as linhas de baixo dizem se a tela fica
// acesa (Wake Lock) e se o som já foi liberado.
// A API só manda ao motorista os alertas do veículo vinculado a ele, e o toque
// na notificação abre /motorista.

import Icone from "../../components/Icone.jsx";


// Estado da tela acesa (Wake Lock) em uma palavra, para a linha do cartão.
const TELA_ACESA = {
  ativa: { texto: "Ligada", classe: "ok", apoio: "Evita que a tela apague no suporte." },
  recusada: { texto: "Desligada", classe: "neutro", apoio: "O celular pode apagar a tela." },
  indisponivel: { texto: "Indisponível", classe: "neutro", apoio: "Este navegador não permite." }
};


export default function AlertasMotorista({ alertas, telaAcesa }) {

  const { ligado, somArmado, estadoPush, ocupado, erro, ativar, desativar, testar } = alertas;

  if (estadoPush === "verificando") {
    return null;
  }

  const tela = TELA_ACESA[telaAcesa];

  let som = { texto: "Desligados", classe: "neutro", apoio: "Ligam junto com os alertas." };
  if (ligado) {
    som = somArmado
      ? { texto: "Ligados", classe: "ok", apoio: "Deixe o volume alto na cabine." }
      : { texto: "Esperando toque", classe: "neutro", apoio: "Toque na tela uma vez para liberar o som." };
  }

  return (
    <section className="cartao alertas-push" id="alertasMotorista" aria-labelledby="tituloAlertas">
      <h2 className="rotulo-cartao" id="tituloAlertas">Alertas no celular</h2>

      <div className="ajuste">
        <span className="ajuste-texto">
          <strong>Alertas de temperatura</strong>
          Som, vibração e notificação quando a carga sair da faixa.
        </span>
      </div>

      {ligado ? (
        <>
          <p className="alertas-ligados" id="alertasLigados" role="status">
            <Icone nome="ok" tamanho={22} />
            {estadoPush === "ativo"
              ? "Alertas ligados, também com a tela fechada."
              : "Alertas ligados com esta tela aberta."}
          </p>
          <div className="alertas-acoes">
            <button type="button" className="botao-contorno" id="testarAlertas" onClick={testar}>
              Testar
            </button>
            <button type="button" className="botao-contorno" id="desativarAlertas" disabled={ocupado !== null}
              onClick={desativar}>
              {ocupado === "desativando" ? "Desativando…" : "Desativar"}
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="ativar-alertas" id="ativarAlertas" disabled={ocupado !== null}
          onClick={ativar}>
          {ocupado === "ativando" ? "Ativando…" : "Ativar alertas"}
        </button>
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

      {tela && (
        <div className="ajuste">
          <span className="ajuste-texto">
            <strong>Tela sempre acesa</strong>
            {tela.apoio}
          </span>
          <span className={`pilula-estado ${tela.classe}`} id="telaAcesa">{tela.texto}</span>
        </div>
      )}

      <div className="ajuste">
        <span className="ajuste-texto">
          <strong>Som e vibração</strong>
          {som.apoio}
        </span>
        <span className={`pilula-estado ${som.classe}`} id="somVibracao">{som.texto}</span>
      </div>
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
