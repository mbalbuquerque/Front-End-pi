// Gaveta lateral de cadastro (design system, seção 7: "cadastros com poucos
// campos abrem à direita"). É um <dialog> modal: o navegador cuida do foco
// preso dentro dela, do Escape e de esconder o resto da tela do leitor de tela.
//
//   <Gaveta id="painelNovo" titulo="Cadastrar veículo" aberta={aberta} aoFechar={() => setAberta(false)}>
//     <form>...</form>
//   </Gaveta>
//
// Fica no DOM mesmo fechada (o formulário e os seletores dos testes continuam
// existindo); "aberta" só chama showModal()/close(). Escape, o X, o clique no
// véu e o close() de quem a usa terminam todos em aoFechar.

import { useEffect, useId, useRef } from "react";
import Icone from "./Icone.jsx";

export default function Gaveta({ id, titulo, aberta, aoFechar, children }) {

  const dialogoRef = useRef(null);
  const tituloId = useId();

  useEffect(() => {
    const dialogo = dialogoRef.current;
    if (aberta && !dialogo.open) {
      dialogo.showModal();
    } else if (!aberta && dialogo.open) {
      dialogo.close();
    }
  }, [aberta]);

  // Clique no véu (fora da folha) fecha; clique dentro da folha não.
  function aoClicar(evento) {
    if (evento.target === dialogoRef.current) {
      dialogoRef.current.close();
    }
  }

  return (
    <dialog
      id={id}
      className="gaveta"
      ref={dialogoRef}
      aria-labelledby={tituloId}
      onClose={aoFechar}
      onClick={aoClicar}
    >
      <div className="gaveta-folha">
        <header className="gaveta-topo">
          <h2 id={tituloId}>{titulo}</h2>
          <button
            type="button"
            className="gaveta-fechar"
            aria-label="Fechar"
            onClick={() => dialogoRef.current.close()}
          >
            <Icone nome="fechar" tamanho={22} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );

}
