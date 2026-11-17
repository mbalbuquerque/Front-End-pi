// Mantém a tela do celular acesa enquanto a página está aberta (Screen Wake
// Lock API). O navegador solta a trava quando a aba vai para segundo plano;
// ao voltar, a trava é pedida de novo. Sem suporte, a tela funciona igual.
//
// Devolve "ativa" | "indisponivel" | "recusada".

import { useEffect, useState } from "react";

export function useTelaAcesa() {

  const suportado = typeof navigator !== "undefined" && Boolean(navigator.wakeLock?.request);
  const [estado, setEstado] = useState(suportado ? "recusada" : "indisponivel");

  useEffect(() => {

    if (!suportado) {
      return undefined;
    }

    let trava = null;
    let ativo = true;

    async function pedir() {
      if (document.visibilityState !== "visible") {
        return;
      }
      try {
        trava = await navigator.wakeLock.request("screen");
        if (!ativo) {
          trava.release?.();
          return;
        }
        setEstado("ativa");
        trava.addEventListener?.("release", () => {
          if (ativo) setEstado("recusada");
        });
      } catch {
        // Bateria fraca, aba sem foco ou política do navegador.
        if (ativo) setEstado("recusada");
      }
    }

    pedir();
    document.addEventListener("visibilitychange", pedir);

    return () => {
      ativo = false;
      document.removeEventListener("visibilitychange", pedir);
      trava?.release?.();
    };

  }, [suportado]);

  return estado;

}
