// Assistente virtual: abrir/fechar, FAQ por chips, campo livre via /chat, plano B no FAQ,
// limite 429, resolução, avaliação salva no navegador, manual e infográfico.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AVALIACOES_KEY, SEM_RESPOSTA } from "./respostas.js";
import ChatWidget from "./ChatWidget.jsx";

const fetchSimulado = vi.fn();

function respostaJson(corpo, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo };
}

const toggle = () => screen.getByRole("button", { name: /Precisa de ajuda/ });
const campo = () => screen.getByLabelText("Digite sua pergunta");
const espera = { timeout: 2000 };

async function abrir() {
  render(<ChatWidget />);
  await userEvent.click(toggle());
}

async function digitar(texto) {
  await userEvent.type(campo(), texto);
  await userEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal("fetch", fetchSimulado);
  fetchSimulado.mockResolvedValue(respostaJson({ resposta: "Resposta da IA.", fontes: ["manual"] }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ChatWidget", () => {

  it("começa fechado; abrir mostra a saudação uma vez e leva o foco ao campo", async () => {
    render(<ChatWidget />);
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByLabelText("Assistente virtual ColdTrack")).toHaveAttribute("hidden");
    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Bem-vindo ao ColdTrack Control/)).toBeInTheDocument();
    expect(campo()).toHaveFocus();
    await userEvent.click(toggle());
    await userEvent.click(toggle());
    expect(screen.getAllByText(/Bem-vindo ao ColdTrack Control/)).toHaveLength(1);
  });

  it("Escape e o × fecham e devolvem o foco ao botão", async () => {
    await abrir();
    await userEvent.keyboard("{Escape}");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveFocus();
    await userEvent.click(toggle());
    await userEvent.click(screen.getByRole("button", { name: "Fechar chat" }));
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("chip de FAQ responde pelo FAQ local, sem chamar a API", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Sensores" }));
    expect(screen.getByText("Quais sensores são utilizados?")).toBeInTheDocument();
    expect(screen.getByText("Digitando...")).toBeInTheDocument();
    expect(campo()).toBeDisabled();
    expect(await screen.findByText(/ESP32/, {}, espera)).toBeInTheDocument();
    expect(screen.queryByText("Digitando...")).not.toBeInTheDocument();
    expect(campo()).toBeEnabled();
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(screen.getByText("Sua dúvida foi resolvida?")).toBeVisible();
  });

  it("texto livre vai a POST /chat com a pergunta e mostra a resposta com as fontes", async () => {
    await abrir();
    await digitar("Como vejo a temperatura?");
    expect(await screen.findByText("Resposta da IA.")).toBeInTheDocument();
    expect(screen.getByText("Fontes: manual")).toBeInTheDocument();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    const [url, opcoes] = fetchSimulado.mock.calls[0];
    expect(url).toMatch(/\/chat$/);
    expect(opcoes.method).toBe("POST");
    expect(JSON.parse(opcoes.body)).toEqual({ pergunta: "Como vejo a temperatura?" });
    expect(campo()).toHaveValue("");
  });

  it("a segunda pergunta leva o histórico da primeira", async () => {
    await abrir();
    await digitar("Primeira?");
    await screen.findByText("Resposta da IA.");
    await waitFor(() => expect(campo()).toBeEnabled());
    await digitar("Segunda?");
    await waitFor(() => expect(fetchSimulado).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchSimulado.mock.calls[1][1].body).historico).toEqual([
      { papel: "usuario", texto: "Primeira?" },
      { papel: "assistente", texto: "Resposta da IA." }
    ]);
  });

  it("falha da rota cai no FAQ local", async () => {
    fetchSimulado.mockRejectedValue(new Error("rede"));
    await abrir();
    await digitar("quais sensores existem");
    expect(await screen.findByText(/ESP32/)).toBeInTheDocument();
    expect(screen.queryByText(SEM_RESPOSTA)).not.toBeInTheDocument();
  });

  it("falha da rota e FAQ sem resposta: avisa e mostra o aviso do WhatsApp", async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ erros: ["falhou"] }, 500));
    await abrir();
    await digitar("xyzzy qwerty");
    expect(await screen.findByText(SEM_RESPOSTA)).toBeInTheDocument();
    expect(screen.getByText(/Falar com o desenvolvedor está disponível/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Falar com o desenvolvedor/ }).getAttribute("href"))
      .toContain(encodeURIComponent("xyzzy qwerty"));
  });

  it("429 por minuto mostra o aviso da própria API", async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ erros: ["Muitas perguntas seguidas. Tente de novo em 1 min."] }, 429));
    await abrir();
    await digitar("quais sensores existem");
    expect(await screen.findByText("Muitas perguntas seguidas. Tente de novo em 1 min.")).toBeInTheDocument();
    expect(screen.queryByText(/ESP32/)).not.toBeInTheDocument();
  });

  it("429 de limite diário cai no FAQ", async () => {
    fetchSimulado.mockResolvedValue(respostaJson({ erros: ["O chat atingiu o limite de perguntas de hoje."] }, 429));
    await abrir();
    await digitar("quais sensores existem");
    expect(await screen.findByText(/ESP32/)).toBeInTheDocument();
    expect(screen.queryByText(/atingiu o limite/)).not.toBeInTheDocument();
  });

  it("campo só com espaços não envia", async () => {
    await abrir();
    await userEvent.type(campo(), "   {Enter}");
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(screen.queryByText("Digitando...")).not.toBeInTheDocument();
  });

  it("Manual do sistema e infográfico (sem duplicar a prévia, com fallback de imagem)", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: /Manual do sistema/ }));
    expect(screen.getByText(/MANUAL DO USUÁRIO/)).toBeInTheDocument();
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    await userEvent.click(screen.getByRole("button", { name: /Ver infográfico/ }));
    expect(screen.getAllByText("Infográfico ColdTrack Control")).toHaveLength(1);
    const imagem = screen.getByRole("img", { name: /Infográfico do ColdTrack Control/ });
    await userEvent.click(screen.getByRole("button", { name: /Ver infográfico/ }));
    expect(screen.getAllByText("Infográfico ColdTrack Control")).toHaveLength(1);
    expect(rolar).toHaveBeenCalledWith({ behavior: "smooth", block: "nearest" });
    imagem.dispatchEvent(new Event("error"));
    expect(await screen.findByText(/não foi encontrado/)).toBeInTheDocument();
  });

  it("Sim abre a avaliação; sem nota avisa; com nota e comentário salva no navegador", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Temperatura" }));
    await screen.findByRole("button", { name: "Sim" }, espera);
    await userEvent.click(screen.getByRole("button", { name: "Sim" }));
    expect(screen.getByText(/Que bom!/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(screen.getByRole("status")).toHaveTextContent("Selecione uma nota de 1 a 5 estrelas.");
    await userEvent.click(screen.getByRole("button", { name: "4 estrelas" }));
    expect(screen.getByRole("button", { name: "4 estrelas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5 estrelas" })).toHaveTextContent("☆");
    await userEvent.type(screen.getByLabelText(/Comentário/), "  Ótimo  ");
    await userEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(screen.getByRole("status")).toHaveTextContent("Obrigado! Sua avaliação foi salva neste navegador.");
    expect(screen.getByRole("button", { name: "Enviar avaliação" })).toBeDisabled();
    const salvas = JSON.parse(localStorage.getItem(AVALIACOES_KEY));
    expect(salvas).toHaveLength(1);
    expect(salvas[0]).toMatchObject({ nota: 4, resolvida: true, comentario: "Ótimo" });
  });

  it("Não oferece o WhatsApp e a avaliação acrescenta às já salvas", async () => {
    localStorage.setItem(AVALIACOES_KEY, JSON.stringify([{ nota: 1 }]));
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "O projeto" }));
    await screen.findByRole("button", { name: "Sim" }, espera);
    await userEvent.click(screen.getByRole("button", { name: "Não" }));
    expect(screen.getByText(/falar com o desenvolvedor pelo WhatsApp/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "5 estrelas" }));
    await userEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    const salvas = JSON.parse(localStorage.getItem(AVALIACOES_KEY));
    expect(salvas).toHaveLength(2);
    expect(salvas[1]).toMatchObject({ nota: 5, resolvida: false });
  });

  it("armazenamento indisponível: avisa que não salvou", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "Sensores" }));
    await screen.findByRole("button", { name: "Sim" }, espera);
    await userEvent.click(screen.getByRole("button", { name: "Sim" }));
    await userEvent.click(screen.getByRole("button", { name: "3 estrelas" }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("cheio"); });
    await userEvent.click(screen.getByRole("button", { name: "Enviar avaliação" }));
    expect(screen.getByRole("status")).toHaveTextContent("Não foi possível salvar a avaliação neste navegador.");
  });

  it("sair da tela no meio do pedido aborta o pedido", async () => {
    fetchSimulado.mockImplementation((_url, { signal }) => new Promise((_ok, falha) => {
      signal.addEventListener("abort", () => falha(new Error("abortado")));
    }));
    const { unmount } = render(<ChatWidget />);
    await userEvent.click(toggle());
    await digitar("pergunta longa");
    expect(screen.getByText("Digitando...")).toBeInTheDocument();
    unmount();
    expect(fetchSimulado.mock.calls[0][1].signal.aborted).toBe(true);
  });

});
