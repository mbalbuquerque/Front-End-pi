// Alertas da tela do motorista num botão só ("Ativar alertas", issue #75):
// pede a permissão de notificação, inscreve o celular no Web Push (alertas com a
// tela fechada, useAlertasPush) e liga o som e a vibração desta tela.
//
// A escolha fica gravada no aparelho (alerta.js, CHAVE_ALERTAS). Depois de
// recarregar, a notificação continua valendo sozinha, mas o navegador só deixa
// tocar som (e vibrar) depois de um toque na página: o primeiro toque em
// qualquer lugar arma o som, e até lá somArmado fica false (a tela mostra a dica).
//
// Quem ativou só o push na versão de dois botões (sem escolha gravada) já
// aparece com os alertas ligados.

import { useCallback, useEffect, useRef, useState } from "react";
import { useAlertasPush } from "../../hooks/useAlertasPush.js";
import {
  criarSom,
  gravarPreferenciaAlertas,
  lerPreferenciaAlertas,
  notificar,
  pedirPermissaoDeNotificacao,
  vibrar
} from "./alerta.js";

// Eventos que contam como toque do usuário para o navegador liberar o áudio.
const GESTOS = ["click", "touchend", "keydown"];


export function useAlertasMotorista() {

  const push = useAlertasPush();
  const [preferencia, setPreferencia] = useState(lerPreferenciaAlertas);
  const [somArmado, setSomArmado] = useState(false);
  const som = useRef(null);

  const ligado = preferencia ?? push.estado === "ativo";

  const armarSom = useCallback(() => {
    som.current = som.current || criarSom();
    som.current.ativar();
    setSomArmado(true);
  }, []);

  // Ligado e ainda sem som: o primeiro toque na página arma.
  useEffect(() => {

    if (!ligado || somArmado) {
      return undefined;
    }

    GESTOS.forEach(gesto => document.addEventListener(gesto, armarSom, true));

    return () => GESTOS.forEach(gesto => document.removeEventListener(gesto, armarSom, true));

  }, [ligado, somArmado, armarSom]);

  // disparar() fica estável para o efeito do status; lê o "ligado" atual pela ref.
  const ligadoAtual = useRef(ligado);

  useEffect(() => {
    ligadoAtual.current = ligado;
  }, [ligado]);

  const disparar = useCallback((nivel, titulo, corpo) => {

    if (!ligadoAtual.current) {
      return false;
    }

    vibrar(nivel);
    som.current?.tocar(nivel);
    notificar(titulo, corpo);

    return true;

  }, []);

  // "Testar" (aba Perfil): mostra como chega o aviso, sem depender da carga.
  function testar() {

    armarSom();
    vibrar("ATENCAO");
    som.current.tocar("ATENCAO");
    notificar("Teste de alerta", "Assim chega o aviso quando a carga sair da faixa.");

  }

  async function ativar() {

    // Ainda dentro do toque no botão: o som já fica liberado.
    armarSom();
    gravarPreferenciaAlertas(true);
    setPreferencia(true);

    // Sem Web Push (ex.: iPhone fora da tela de início), ainda pede a permissão
    // para a notificação desta tela aberta.
    if (await push.ativar() === "sem-suporte") {
      await pedirPermissaoDeNotificacao();
    }

  }

  async function desativar() {

    gravarPreferenciaAlertas(false);
    setPreferencia(false);

    if (push.estado === "ativo") {
      await push.desativar();
    }

  }

  return {
    ligado,
    somArmado,
    estadoPush: push.estado,
    ocupado: push.ocupado,
    erro: push.erro,
    ativar,
    desativar,
    testar,
    disparar
  };

}
