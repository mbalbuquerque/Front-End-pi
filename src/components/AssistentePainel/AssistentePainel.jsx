// Assistente do painel: botão flutuante "Assistente" em todas as telas
// logadas (montado uma vez no PainelLayout) que abre uma conversa com a rota
// /assistente (Azure OpenAI). Responde dúvidas de uso do painel e sobre os
// dados da empresa do usuário (veículos, sensores, leituras, alertas, viagens).
// A conversa fica só em memória (conversa.js) e some ao sair. Estilo em
// styles/painel/assistente.css (importado pelo index.css da família painel).

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSessao } from "../../hooks/useSessao.jsx";
import { MAX_PERGUNTA } from "../../lib/assistente.js";
import { lerSessao } from "../../lib/sessao.js";
import {
  assinar,
  enviarPergunta,
  garantirDono,
  lerConversa,
  limparConversa,
  primeiroNome,
  SUGESTOES
} from "./conversa.js";

const SEM_CONVERSA = { mensagens: [], esperando: false };


function IconeAssistente() {

  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5v-8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M8.5 9.5h7M8.5 12.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

}


export default function AssistentePainel() {

  const { usuario } = useSessao();

  // A conversa pertence ao token desta sessão (outro login começa do zero).
  // Até o efeito trocar o dono, a conversa de outra sessão não aparece.
  const token = lerSessao()?.token ?? null;

  useLayoutEffect(() => {
    garantirDono(token);
  }, [token]);

  // Saiu da tela porque a sessão acabou (Sair ou 401): a conversa vai junto.
  // Trocar de tela com a sessão viva não apaga nada.
  useEffect(() => () => {
    if (!lerSessao()) {
      limparConversa();
    }
  }, []);

  const conversa = useSyncExternalStore(assinar, lerConversa, lerConversa);
  const { mensagens, esperando } = conversa.dono === token ? conversa : SEM_CONVERSA;

  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");

  const botaoRef = useRef(null);
  const campoRef = useRef(null);
  const listaRef = useRef(null);

  // Foco pedido por uma ação, aplicado depois do render ("campo" ou "botao").
  const focoRef = useRef(null);

  const idPainel = useId();
  const idTitulo = useId();

  const nome = primeiroNome(usuario?.nome);


  useEffect(() => {

    const alvo = focoRef.current === "campo" ? campoRef.current
      : focoRef.current === "botao" ? botaoRef.current
        : null;

    if (alvo && !alvo.disabled) {
      alvo.focus();
      focoRef.current = null;
    }

  });


  // Mensagem nova sempre visível.
  useEffect(() => {

    const lista = listaRef.current;

    if (lista) {
      lista.scrollTop = lista.scrollHeight;
    }

  }, [mensagens, esperando, aberto]);


  // Resposta chegou com o painel aberto: o campo volta a receber o foco.
  useEffect(() => {

    if (!esperando && aberto && document.activeElement === document.body) {
      campoRef.current?.focus();
    }

  }, [esperando, aberto]);


  // Escape fecha, só enquanto o painel está aberto.
  useEffect(() => {

    if (!aberto) return undefined;

    function aoTeclar(evento) {
      if (evento.key === "Escape") {
        setAberto(false);
        focoRef.current = "botao";
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return () => document.removeEventListener("keydown", aoTeclar);

  }, [aberto]);


  function abrir() {

    setAberto(true);
    focoRef.current = "campo";

  }


  function fechar() {

    setAberto(false);
    focoRef.current = "botao";

  }


  function perguntar(texto) {

    if (esperando || !String(texto).trim()) return;

    setPergunta("");
    enviarPergunta(texto);

  }


  function aoEnviar(evento) {

    evento.preventDefault();
    perguntar(pergunta);

  }


  if (!usuario) {
    return null;
  }

  return (
    <div className="assistente">

      <button
        ref={botaoRef}
        type="button"
        className="assistente-botao"
        id="assistenteBotao"
        aria-expanded={String(aberto)}
        aria-controls={idPainel}
        onClick={() => (aberto ? fechar() : abrir())}
      >
        <IconeAssistente />
        <span>Assistente</span>
      </button>

      <section
        className="assistente-painel"
        id={idPainel}
        role="dialog"
        aria-modal="false"
        aria-labelledby={idTitulo}
        hidden={!aberto}
      >

        <header className="assistente-topo">
          <div>
            <h2 id={idTitulo}>Assistente do painel</h2>
            <p>Dúvidas de uso e dados da sua empresa</p>
          </div>

          <button
            type="button"
            className="assistente-fechar"
            aria-label="Fechar assistente"
            onClick={fechar}
          >×</button>
        </header>

        <div
          ref={listaRef}
          className="assistente-mensagens"
          role="log"
          aria-live="polite"
          aria-label="Conversa com o assistente"
        >
          <p className="assistente-msg assistente-msg-assistente">
            {nome ? `Olá, ${nome}! ` : "Olá! "}
            Posso explicar como usar o painel e responder sobre os dados da sua empresa:
            veículos, sensores, últimas leituras, alertas das últimas 24 h e viagens.
          </p>

          {mensagens.length === 0 ? (
            <div className="assistente-sugestoes" role="group" aria-label="Sugestões de pergunta">
              {SUGESTOES.map(sugestao => (
                <button
                  key={sugestao}
                  type="button"
                  disabled={esperando}
                  onClick={() => perguntar(sugestao)}
                >{sugestao}</button>
              ))}
            </div>
          ) : null}

          {mensagens.map(mensagem => (
            <div key={mensagem.id} className={`assistente-msg assistente-msg-${mensagem.tipo}`}>
              {mensagem.texto}
              {mensagem.fontes?.length ? (
                <small className="assistente-fontes">Fontes: {mensagem.fontes.join(", ")}</small>
              ) : null}
            </div>
          ))}

          {esperando ? (
            <p className="assistente-msg assistente-digitando">Assistente digitando…</p>
          ) : null}
        </div>

        <form className="assistente-form" onSubmit={aoEnviar}>
          <input
            ref={campoRef}
            id="assistenteCampo"
            type="text"
            maxLength={MAX_PERGUNTA}
            placeholder="Digite sua pergunta"
            aria-label="Sua pergunta ao assistente"
            autoComplete="off"
            disabled={esperando}
            value={pergunta}
            onChange={evento => setPergunta(evento.target.value)}
          />

          <button
            type="submit"
            className="assistente-enviar"
            disabled={esperando || !pergunta.trim()}
          >Enviar</button>
        </form>

        <p className="assistente-aviso">
          Respostas geradas automaticamente. Confira os números nas telas do painel.
        </p>

      </section>

    </div>
  );

}
