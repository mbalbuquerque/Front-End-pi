// Título da aba do navegador (o <title> de cada página antiga). Vazio/null não
// mexe no título: a moldura (PainelLayout) sem título deixa a tela decidir.

import { useEffect } from "react";

export function useTitulo(titulo) {

  useEffect(() => {
    if (titulo) {
      document.title = titulo;
    }
  }, [titulo]);

}
