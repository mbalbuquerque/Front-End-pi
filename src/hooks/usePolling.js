// Roda fn agora e a cada `ms`, como o antigo carregar(); setInterval(carregar, ...).
// Quando algum item de deps muda, cancela o ciclo atual e recomeça na hora.
// fn recebe um AbortSignal: depois de cada await, `if (sinal.aborted) return;`
// evita gravar estado de uma rodada velha (tela trocada, filtro trocado).
// Devolve recarregar(): roda fn de novo agora (ex.: depois de salvar um formulário).

import { useCallback, useEffect, useRef } from "react";

export function usePolling(fn, ms, deps = []) {

  const fnAtual = useRef(fn);
  const controle = useRef(null);

  useEffect(() => {
    fnAtual.current = fn;
  });

  const rodar = useCallback(() => {
    const sinal = controle.current?.signal;
    if (sinal && !sinal.aborted) {
      Promise.resolve(fnAtual.current(sinal)).catch(erro => {
        console.error(erro);
      });
    }
  }, []);

  useEffect(() => {

    controle.current = new AbortController();
    rodar();

    const id = setInterval(rodar, ms);

    return () => {
      clearInterval(id);
      controle.current.abort();
    };

    // deps vêm de quem chama; o hook não tem como listá-las aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, rodar, ...deps]);

  return rodar;

}
