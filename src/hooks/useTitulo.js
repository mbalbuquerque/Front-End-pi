// Título da aba do navegador (o <title> de cada página antiga).

import { useEffect } from "react";

export function useTitulo(titulo) {

  useEffect(() => {
    document.title = titulo;
  }, [titulo]);

}
