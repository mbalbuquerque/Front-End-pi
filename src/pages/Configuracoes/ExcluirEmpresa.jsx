// Só para o gestor: exclui a empresa e todos os dados dela (DELETE /empresa).
// Irreversível. A API pode responder 202 (exclusão em andamento): o mesmo
// pedido é repetido até o 200. Ao concluir, a sessão local é encerrada.

import { useEffect, useRef, useState } from "react";
import { useSessao } from "../../hooks/useSessao.jsx";
import { api } from "../../lib/api.js";
import "./ExcluirEmpresa.css";

// Teto de repetições: cada pedido trabalha até 120 s no servidor.
const MAX_PEDIDOS = 60;

export const AVISO_EMPRESA_EXCLUIDA = "Empresa excluída. Todos os dados dela foram apagados.";


export default function ExcluirEmpresa() {

  const [aberto, setAberto] = useState(false);

  return (
    <article className="panel zona-perigo" id="excluirEmpresa">
      <h2>Excluir empresa</h2>
      <p>Apaga a empresa e todos os dados dela: usuários, veículos, sensores, viagens e leituras. Não há como desfazer.</p>
      <button type="button" className="botao botao-destrutivo" onClick={() => setAberto(true)}>Excluir empresa</button>
      {aberto && <DialogoExcluir aoFechar={() => setAberto(false)} />}
    </article>
  );

}


function DialogoExcluir({ aoFechar }) {

  const { usuario, encerrarLocal } = useSessao();

  const dialogo = useRef(null);
  const viva = useRef(true);

  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);

  // null = parado; número = pedidos já feitos (mostra o progresso).
  const [pedidos, setPedidos] = useState(null);

  const esperado = (usuario?.empresa || "").trim().toLowerCase();
  const confere = esperado !== "" && nome.trim().toLowerCase() === esperado;
  const excluindo = pedidos !== null;

  useEffect(() => {
    viva.current = true;
    // StrictMode roda o efeito duas vezes no dev: não reabre o que já está aberto.
    if (!dialogo.current.open) dialogo.current.showModal();
    return () => {
      viva.current = false;
    };
  }, []);

  async function excluir(evento) {

    evento.preventDefault();

    if (!confere || !senha || excluindo) return;

    setErro(null);

    let feitos = 0;
    let continuou = false;

    try {

      for (;;) {

        feitos += 1;
        setPedidos(feitos);

        const resposta = await api("/empresa", {
          metodo: "DELETE",
          corpo: { confirmacao: nome.trim(), senha }
        });

        if (!viva.current) return;

        if (resposta.excluida !== false) {
          encerrarLocal(AVISO_EMPRESA_EXCLUIDA);
          return;
        }

        continuou = true;

        if (feitos >= MAX_PEDIDOS) {
          throw new Error("A exclusão está demorando. Abra o diálogo e tente de novo para continuar.");
        }

      }

    } catch (falha) {

      if (!viva.current) return;

      // Depois de um 202, o 401 quer dizer que a conta já sumiu: terminou.
      if (continuou && falha.status === 401) {
        encerrarLocal(AVISO_EMPRESA_EXCLUIDA);
        return;
      }

      // Mantém o nome digitado; a senha nunca fica na tela.
      setSenha("");
      setPedidos(null);
      setErro(falha.message);

    }

  }

  return (
    <dialog
      id="excluirEmpresaDialogo"
      className="etiqueta"
      ref={dialogo}
      onClose={aoFechar}
      onCancel={evento => { if (excluindo) evento.preventDefault(); }}
    >
      <form className="dialogo-form" noValidate onSubmit={excluir}>
        <h2>Excluir empresa</h2>
        <p>
          Vai apagar para sempre a empresa <strong>{usuario?.empresa}</strong> e tudo o que é dela:
          usuários, veículos, sensores, viagens e leituras. Todos saem do painel na hora.
          Esta ação não pode ser desfeita.
        </p>
        <label className="campo">
          <span>Digite o nome da empresa para confirmar</span>
          <input name="confirmacao" type="text" autoComplete="off" value={nome} disabled={excluindo} onChange={e => setNome(e.target.value)} />
        </label>
        <label className="campo">
          <span>Sua senha atual</span>
          <input name="senha" type="password" autoComplete="current-password" maxLength={128} value={senha} disabled={excluindo} onChange={e => setSenha(e.target.value)} />
        </label>
        <p className="erro-form" role="alert" hidden={erro === null}>{erro}</p>
        <p className="aviso-ok" role="status" hidden={!excluindo}>
          Excluindo… pedido {pedidos}. Pode levar alguns minutos; não feche esta janela.
        </p>
        <div className="acoes-item">
          <button type="submit" className="botao botao-destrutivo" disabled={!confere || !senha || excluindo}>
            {excluindo ? "Excluindo…" : "Excluir empresa para sempre"}
          </button>
          <button type="button" className="botao secundario" disabled={excluindo} onClick={() => dialogo.current.close()}>Cancelar</button>
        </div>
      </form>
    </dialog>
  );

}
