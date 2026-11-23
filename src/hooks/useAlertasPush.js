// Estado do Web Push deste aparelho (src/lib/push.js), para o card de
// Configurações (operador e gestor) e para a tela do motorista.
//
// estado:  "verificando" | "sem-suporte" | "negado" | "inativo" | "ativo"
// ocupado: null | "ativando" | "desativando"
// erro:    mensagem da última ação que falhou, ou null
// ativar() e desativar() devolvem o estado novo (null se a ação falhou).

import { useEffect, useState } from "react";
import { ativarPush, desativarPush, estadoPush } from "../lib/push.js";


export function useAlertasPush() {

  const [estado, setEstado] = useState("verificando");
  const [ocupado, setOcupado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {

    let ativo = true;

    estadoPush()
      .catch(() => "inativo")
      .then(novo => {
        if (ativo) setEstado(novo);
      });

    return () => {
      ativo = false;
    };

  }, []);

  async function trocar(acao, rotulo) {

    setErro(null);
    setOcupado(rotulo);

    try {
      const novo = await acao();
      setEstado(novo);
      return novo;
    } catch (falha) {
      setErro(falha.message);
      return null;
    } finally {
      setOcupado(null);
    }

  }

  return {
    estado,
    ocupado,
    erro,
    ativar: () => trocar(ativarPush, "ativando"),
    desativar: () => trocar(desativarPush, "desativando")
  };

}
