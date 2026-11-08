// Veículo da tela ligado à rota: lê ?veiculo= da URL e troca pelo seletor.
//
//   const { escolher, chave, trocarVeiculo } = useVeiculoEscolhido();
//   usePolling(async sinal => {
//     const escolha = await escolher();   // { veiculos, veiculo, perfil, faixa }
//     if (sinal.aborted) return;
//     ...
//   }, UPDATE_INTERVAL, [chave]);
//
// trocarVeiculo(id) guarda a escolha, tira o ?veiculo= da URL (senão a URL
// ganharia da escolha) e muda `chave`, que faz o polling recarregar.

import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { escolherVeiculo, lembrarVeiculo } from "../lib/veiculo.js";

export function useVeiculoEscolhido() {

  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [versao, setVersao] = useState(0);

  const escolher = useCallback(() => escolherVeiculo(search), [search]);

  const trocarVeiculo = useCallback(id => {
    lembrarVeiculo(id);
    navigate(pathname);
    setVersao(v => v + 1);
  }, [navigate, pathname]);

  return { escolher, chave: `${search}#${versao}`, trocarVeiculo };

}
