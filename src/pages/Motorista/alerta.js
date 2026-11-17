// Alerta local do celular na tela do motorista: vibração, som curto e
// notificação do sistema. Tudo é melhor esforço: navegador sem suporte (ou sem
// permissão) simplesmente não vibra, não toca ou não notifica, e a tela segue
// mostrando o aviso.
//
// O alerta push da empresa (Configurações -> Alertas no celular) é do operador
// e do gestor; o motorista recebe este alerta enquanto a página está aberta.

const PADRAO_VIBRACAO = {
  ATENCAO: [300, 150, 300],
  CRITICO: [600, 200, 600, 200, 600]
};

// Bipes (Hz, duração em s): crítico é mais agudo e repete.
const BIPES = {
  ATENCAO: [[660, 0.25]],
  CRITICO: [[880, 0.25], [880, 0.25], [880, 0.25]]
};


export function vibrar(nivel) {

  try {
    return Boolean(navigator.vibrate?.(PADRAO_VIBRACAO[nivel] || 200));
  } catch {
    return false;
  }

}


// O navegador só deixa tocar som depois de um toque na página: ativar() é
// chamado pelo botão "Ativar alertas" e cria o AudioContext ali.
export function criarSom() {

  let contexto = null;

  return {

    ativar() {
      const Contexto = window.AudioContext || window.webkitAudioContext;
      if (!Contexto) {
        return false;
      }
      contexto = contexto || new Contexto();
      contexto.resume?.();
      return true;
    },

    tocar(nivel) {
      if (!contexto) {
        return false;
      }
      let inicio = contexto.currentTime;
      for (const [frequencia, duracao] of BIPES[nivel] || BIPES.ATENCAO) {
        const oscilador = contexto.createOscillator();
        const volume = contexto.createGain();
        oscilador.frequency.value = frequencia;
        volume.gain.value = 0.4;
        oscilador.connect(volume);
        volume.connect(contexto.destination);
        oscilador.start(inicio);
        oscilador.stop(inicio + duracao);
        inicio += duracao + 0.15;
      }
      return true;
    }

  };

}


export async function pedirPermissaoDeNotificacao() {

  if (typeof Notification === "undefined") {
    return "indisponivel";
  }

  if (Notification.permission === "default") {
    try {
      return await Notification.requestPermission();
    } catch {
      return "default";
    }
  }

  return Notification.permission;

}


// No Android a notificação precisa sair pelo service worker; sem ele, usa a API direta.
export async function notificar(titulo, corpo) {

  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return false;
  }

  const opcoes = { body: corpo, tag: "coldtrack-motorista", renotify: true, data: { url: "/motorista" } };

  try {
    const registro = await navigator.serviceWorker?.getRegistration?.();
    if (registro) {
      await registro.showNotification(titulo, opcoes);
      return true;
    }
    new Notification(titulo, opcoes);
    return true;
  } catch {
    return false;
  }

}
