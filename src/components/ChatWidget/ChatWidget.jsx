// Assistente virtual da página inicial: respostas prontas, confirmação de
// dúvida resolvida, avaliação de 1 a 5 estrelas (salva no navegador) e link
// para o WhatsApp do desenvolvedor. Porte de legado/js/chat.js.

import { useEffect, useRef, useState } from "react";
import infografico from "../../assets/images/coldtrack-infografico.webp";
import { gravarJSON, ler, lerJSON } from "../../lib/armazenamento.js";
import {
  AVALIACOES_KEY,
  AVISO_WHATSAPP,
  linkWhatsApp,
  MANUAL,
  MENSAGEM_INICIAL,
  responder
} from "./respostas.js";
import "../../styles/chat/chat.css";

const PERGUNTAS_RAPIDAS = [
  { pergunta: "O que é ColdTrack?", rotulo: "O projeto" },
  { pergunta: "Como funciona o monitoramento?", rotulo: "Monitoramento" },
  { pergunta: "Quais sensores são utilizados?", rotulo: "Sensores" },
  { pergunta: "Quais são os limites de temperatura?", rotulo: "Temperatura" }
];

const ESTRELAS = [1, 2, 3, 4, 5];

// Tempo do "Digitando..." antes da resposta.
const ATRASO_RESPOSTA = 500;


function movimentoReduzido() {

  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

}


export default function ChatWidget() {

  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState([]);
  const [respondendo, setRespondendo] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [ultimaPergunta, setUltimaPergunta] = useState("");
  const [mostrarResolucao, setMostrarResolucao] = useState(false);
  const [mostrarAvaliacao, setMostrarAvaliacao] = useState(false);
  const [resolvida, setResolvida] = useState(null);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [retorno, setRetorno] = useState("");
  const [avaliacaoSalva, setAvaliacaoSalva] = useState(false);
  const [imagemFalhou, setImagemFalhou] = useState(false);

  const toggleRef = useRef(null);
  const inputRef = useRef(null);
  const mensagensRef = useRef(null);
  const infograficoRef = useRef(null);

  const iniciadoRef = useRef(false);
  const respondendoRef = useRef(false);
  const proximoId = useRef(0);
  const timerRef = useRef(null);

  // Foco pedido por uma ação ("input" ou "toggle"), aplicado depois do render,
  // quando o painel já apareceu / o campo já foi reabilitado.
  const focoRef = useRef(null);

  const temInfografico = mensagens.some(m => m.tipo === "infografico");


  useEffect(() => {

    // Com o painel fechado o campo não recebe foco (como o antigo).
    if (focoRef.current === "input" && !aberto) {
      focoRef.current = null;
      return;
    }

    const alvo = focoRef.current === "input" ? inputRef.current
      : focoRef.current === "toggle" ? toggleRef.current
        : null;

    if (alvo && !alvo.disabled) {
      alvo.focus();
      focoRef.current = null;
    }

  });


  // Mensagem nova sempre visível (o antigo messages.scrollTop = scrollHeight).
  useEffect(() => {

    const caixa = mensagensRef.current;

    if (caixa) {
      caixa.scrollTop = caixa.scrollHeight;
    }

  }, [mensagens]);


  // Sai da tela no meio de uma resposta: não deixa o timer solto.
  useEffect(() => () => clearTimeout(timerRef.current), []);


  function adicionar(...novas) {

    setMensagens(lista => [
      ...lista,
      ...novas.map(nova => ({ id: proximoId.current++, ...nova }))
    ]);

  }


  function abrir() {

    setAberto(true);

    if (!iniciadoRef.current) {
      adicionar({ tipo: "bot", texto: MENSAGEM_INICIAL });
      iniciadoRef.current = true;
    }

    focoRef.current = "input";

  }


  function fechar() {

    setAberto(false);
    focoRef.current = "toggle";

  }


  // Fechar com Escape, só enquanto o painel está aberto.
  useEffect(() => {

    if (!aberto) return undefined;

    function aoTeclar(evento) {
      if (evento.key === "Escape") {
        setAberto(false);
        focoRef.current = "toggle";
      }
    }

    document.addEventListener("keydown", aoTeclar);

    return () => document.removeEventListener("keydown", aoTeclar);

  }, [aberto]);


  function enviar(textoPergunta) {

    const texto = String(textoPergunta).trim();

    if (!texto || respondendoRef.current) return;

    setUltimaPergunta(texto);
    setPergunta("");
    setMostrarResolucao(false);

    respondendoRef.current = true;
    setRespondendo(true);

    const idDigitando = proximoId.current++;

    setMensagens(lista => [
      ...lista,
      { id: proximoId.current++, tipo: "user", texto },
      { id: idDigitando, tipo: "bot typing", texto: "Digitando..." }
    ]);

    const resultado = responder(texto);

    timerRef.current = setTimeout(() => {

      setMensagens(lista => lista.filter(m => m.id !== idDigitando));

      adicionar(
        { tipo: "bot", texto: resultado.texto },
        ...(resultado.encontrada ? [] : [{ tipo: "bot", texto: AVISO_WHATSAPP }])
      );

      setMostrarResolucao(true);
      respondendoRef.current = false;
      setRespondendo(false);

      // Volta o foco ao campo (o efeito ignora se o painel foi fechado).
      focoRef.current = "input";

    }, ATRASO_RESPOSTA);

  }


  function responderResolucao(foiResolvida) {

    setResolvida(foiResolvida);
    setMostrarResolucao(false);
    setMostrarAvaliacao(true);

    adicionar({
      tipo: "bot",
      texto: foiResolvida
        ? "Que bom! Você pode avaliar o atendimento abaixo."
        : "Entendi. Você pode falar com o desenvolvedor " +
          "pelo WhatsApp e também avaliar sua experiência."
    });

  }


  function salvarAvaliacao() {

    if (nota < 1 || nota > 5) {
      setRetorno("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }

    const avaliacao = {
      nota,
      resolvida,
      comentario: comentario.trim(),
      data: new Date().toISOString()
    };

    const existentes = lerJSON(AVALIACOES_KEY, []);
    const avaliacoes = Array.isArray(existentes) ? existentes : [];

    avaliacoes.push(avaliacao);

    const conteudo = JSON.stringify(avaliacoes);

    gravarJSON(AVALIACOES_KEY, avaliacoes);

    // gravarJSON não lança: confere a gravação relendo (navegador sem armazenamento).
    if (ler(AVALIACOES_KEY) !== conteudo) {
      setRetorno("Não foi possível salvar a avaliação neste navegador.");
      return;
    }

    setRetorno("Obrigado! Sua avaliação foi salva neste navegador.");
    setAvaliacaoSalva(true);
    adicionar({ tipo: "bot", texto: "Obrigado por avaliar nosso atendimento! ❄" });

  }


  function mostrarInfografico() {

    // Evita duplicar a prévia: só leva até a que já existe.
    if (temInfografico) {
      infograficoRef.current?.scrollIntoView({
        behavior: movimentoReduzido() ? "auto" : "smooth",
        block: "nearest"
      });
      return;
    }

    adicionar({ tipo: "infografico" });

  }


  function aoEnviarFormulario(evento) {

    evento.preventDefault();
    enviar(pergunta);

  }


  return (
    <div className="escopo-chat">
      <div id="ctChatWidget" className="ct-chat-widget">

        <button
          ref={toggleRef}
          type="button"
          className="ct-chat-toggle"
          id="ctChatToggle"
          aria-expanded={String(aberto)}
          aria-controls="ctChatPanel"
          onClick={() => (aberto ? fechar() : abrir())}
        >
          💬 Precisa de ajuda?
        </button>

        <section
          className="ct-chat-panel"
          id="ctChatPanel"
          aria-label="Assistente virtual ColdTrack"
          hidden={!aberto}
        >
          <header className="ct-chat-header">
            <div className="ct-chat-avatar" aria-hidden="true">❄</div>

            <div className="ct-chat-header-info">
              <strong>Assistente ColdTrack</strong>
              <small>Suporte virtual e atendimento humano</small>
            </div>

            <button
              type="button"
              className="ct-chat-close"
              id="ctChatClose"
              aria-label="Fechar chat"
              onClick={fechar}
            >×</button>
          </header>

          <div
            ref={mensagensRef}
            id="ctChatMessages"
            className="ct-chat-messages"
            role="log"
            aria-live="polite"
          >
            {mensagens.map(mensagem => (
              mensagem.tipo === "infografico" ? (
                <div
                  key={mensagem.id}
                  ref={infograficoRef}
                  id="ctChatInfografico"
                  className="ct-chat-infografico"
                >
                  <strong>Infográfico ColdTrack Control</strong>

                  <img
                    src={infografico}
                    alt={
                      "Infográfico do ColdTrack Control com módulos " +
                      "da plataforma e fluxo de monitoramento IoT."
                    }
                    loading="lazy"
                    hidden={imagemFalhou}
                    onError={() => setImagemFalhou(true)}
                  />

                  <p>
                    {imagemFalhou
                      ? "O infográfico não foi encontrado. Confira se " +
                        "o arquivo existe em assets/coldtrack-infografico.png."
                      : "Material ilustrativo. As telas e os indicadores " +
                        "da imagem não representam medições atuais."}
                  </p>

                  <a
                    href={infografico}
                    target="_blank"
                    rel="noopener noreferrer"
                    hidden={imagemFalhou}
                  >🔎 Ampliar infográfico</a>
                </div>
              ) : (
                <div key={mensagem.id} className={`ct-chat-message ${mensagem.tipo}`}>
                  {mensagem.texto}
                </div>
              )
            ))}
          </div>

          <div className="ct-chat-resolution" id="ctChatResolution" hidden={!mostrarResolucao}>
            <strong>Sua dúvida foi resolvida?</strong>

            <div className="ct-chat-resolution-actions">
              <button type="button" id="ctChatYes" onClick={() => responderResolucao(true)}>Sim</button>
              <button type="button" id="ctChatNo" onClick={() => responderResolucao(false)}>Não</button>
            </div>
          </div>

          <div className="ct-chat-rating" id="ctChatRating" hidden={!mostrarAvaliacao}>
            <strong>Avalie nosso atendimento</strong>
            <p>Como foi sua experiência com o assistente?</p>

            <div
              className="ct-chat-stars"
              id="ctChatStars"
              role="group"
              aria-label="Nota do atendimento"
            >
              {ESTRELAS.map(estrela => (
                <button
                  key={estrela}
                  type="button"
                  data-star={estrela}
                  aria-label={estrela === 1 ? "1 estrela" : `${estrela} estrelas`}
                  aria-pressed={nota ? String(estrela === nota) : undefined}
                  onClick={() => setNota(estrela)}
                >{estrela <= nota ? "★" : "☆"}</button>
              ))}
            </div>

            <label htmlFor="ctChatComment">Comentário (opcional)</label>
            <textarea
              id="ctChatComment"
              maxLength={500}
              rows={2}
              placeholder="Conte como podemos melhorar..."
              value={comentario}
              onChange={evento => setComentario(evento.target.value)}
            />

            <button
              type="button"
              id="ctChatSaveRating"
              disabled={avaliacaoSalva}
              onClick={salvarAvaliacao}
            >
              Enviar avaliação
            </button>

            <p id="ctChatRatingFeedback" role="status">{retorno}</p>
          </div>

          <div className="ct-chat-quick" id="ctChatQuick">
            <button
              type="button"
              data-action="manual"
              onClick={() => adicionar({ tipo: "bot", texto: MANUAL })}
            >
              📘 Manual do sistema
            </button>

            <button type="button" data-action="infografico" onClick={mostrarInfografico}>
              🖼️ Ver infográfico
            </button>

            {PERGUNTAS_RAPIDAS.map(({ pergunta: texto, rotulo }) => (
              <button key={rotulo} type="button" data-question={texto} onClick={() => enviar(texto)}>
                {rotulo}
              </button>
            ))}
          </div>

          <form className="ct-chat-form" id="ctChatForm" onSubmit={aoEnviarFormulario}>
            <input
              ref={inputRef}
              id="ctChatInput"
              className="ct-chat-input"
              type="text"
              maxLength={300}
              placeholder="Digite sua pergunta..."
              aria-label="Digite sua pergunta"
              autoComplete="off"
              required
              disabled={respondendo}
              value={pergunta}
              onChange={evento => setPergunta(evento.target.value)}
            />

            <button className="ct-chat-send" type="submit" aria-label="Enviar mensagem">➤</button>
          </form>

          <div className="ct-chat-human">
            <a
              id="ctChatWhatsApp"
              href={linkWhatsApp(ultimaPergunta)}
              target="_blank"
              rel="noopener noreferrer"
            >
              ☎ Falar com o desenvolvedor
            </a>
          </div>

          <div className="ct-chat-footer">
            Atendimento virtual gratuito · Avaliação local
          </div>
        </section>

      </div>
    </div>
  );

}
