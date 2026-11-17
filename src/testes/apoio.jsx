// Apoio dos testes de componente: roteador em memória.

import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Renderiza `tela` em `rota`; as rotas de destino mostram só o próprio caminho.
export function renderizarNaRota(tela, rota = "/", caminhos = []) {

  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path={rota.split("?")[0]} element={tela} />
        {caminhos.map(c => <Route key={c} path={c} element={<p>{`destino ${c}`}</p>} />)}
      </Routes>
    </MemoryRouter>
  );

}
