// Seção "Verificação em duas etapas": ativar (QR, primeiro código, códigos de
// recuperação uma vez só) e desativar, com a API simulada.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DoisFatores from "./DoisFatores.jsx";

const api = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("../../lib/api.js", () => api);

const URI = "otpauth://totp/ColdTrack:ana%40empresa.com?secret=JBSWY3DPEHPK3PXP&issuer=ColdTrack";
const CODIGOS = ["a1b2c3d4", "e5f6a7b8", "c9d0e1f2", "a3b4c5d6", "e7f8a9b0",
  "c1d2e3f4", "a5b6c7d8", "e9f0a1b2", "c3d4e5f6", "a7b8c9d0"];

function erroApi(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

function respostas(rotas) {
  api.api.mockImplementation(async (caminho, opcoes = {}) => {
    const valor = rotas[`${opcoes.metodo || "GET"} ${caminho}`];
    if (valor === undefined) throw new Error(`rota não simulada: ${caminho}`);
    if (typeof valor === "function") return valor(opcoes);
    if (valor instanceof Error) throw valor;
    return valor;
  });
}

async function chegarAoQr() {
  render(<DoisFatores />);
  await userEvent.click(screen.getByRole("button", { name: "Ativar verificação em duas etapas" }));
  return screen.findByRole("img", { name: /QR Code/ });
}

async function chegarAosCodigos() {
  await chegarAoQr();
  await userEvent.type(screen.getByLabelText("Código de 6 dígitos do aplicativo"), "123456");
  await userEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));
  await screen.findByRole("list", { name: "Códigos de recuperação" });
}

let espiaLocal;
let espiaConsole;

beforeEach(() => {
  vi.clearAllMocks();
  respostas({
    "POST /2fa/iniciar": { uri: URI },
    "POST /2fa/ativar": { recuperacao: CODIGOS },
    "POST /2fa/desativar": {}
  });
  espiaLocal = vi.spyOn(Storage.prototype, "setItem");
  espiaConsole = vi.spyOn(console, "log");
});

afterEach(() => {
  espiaLocal.mockRestore();
  espiaConsole.mockRestore();
  vi.unstubAllGlobals();
});


describe("Verificação em duas etapas (Configurações)", () => {

  it("sem saber o estado: mostra o botão de ativar e o atalho de desativar", () => {
    render(<DoisFatores />);
    expect(screen.getByRole("heading", { name: "Verificação em duas etapas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar verificação em duas etapas" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Já está ativa? Desativar" })).toBeInTheDocument();
    expect(api.api).not.toHaveBeenCalled();
  });

  it("desligada (totpAtivo false): diz que está desligada e só oferece ativar", () => {
    render(<DoisFatores ativo={false} />);
    expect(screen.getByText("A verificação em duas etapas está desligada nesta conta.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Desativar/ })).not.toBeInTheDocument();
  });

  it("ativa (totpAtivo true): mostra o estado e o botão de desativar", () => {
    render(<DoisFatores ativo />);
    expect(screen.getByText(/Verificação em duas etapas ativa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ativar verificação em duas etapas" })).not.toBeInTheDocument();
  });

  it("ativar mostra o QR Code desenhado no navegador e a chave para digitar", async () => {
    const qr = await chegarAoQr();
    expect(api.api).toHaveBeenCalledWith("/2fa/iniciar", { metodo: "POST" });
    // Desenho local em SVG: nenhuma imagem de site de terceiros.
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(qr.querySelector("path").getAttribute("d")).toMatch(/^M\d/);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("JBSW Y3DP EHPK 3PXP")).toBeInTheDocument();
    expect(screen.getByLabelText("Código de 6 dígitos do aplicativo")).toHaveFocus();
  });

  it("erro ao iniciar aparece e o botão volta", async () => {
    respostas({ "POST /2fa/iniciar": erroApi("Serviço indisponível.", 503) });
    render(<DoisFatores />);
    await userEvent.click(screen.getByRole("button", { name: "Ativar verificação em duas etapas" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Serviço indisponível.");
    expect(screen.getByRole("button", { name: "Ativar verificação em duas etapas" })).toBeEnabled();
  });

  it("confirma o primeiro código sem derrubar a sessão em caso de 401", async () => {
    await chegarAosCodigos();
    expect(api.api).toHaveBeenCalledWith("/2fa/ativar", {
      metodo: "POST",
      corpo: { codigo: "123456" },
      sessaoNo401: false
    });
  });

  it("primeiro código errado: mostra o erro, limpa o campo e continua no QR", async () => {
    respostas({
      "POST /2fa/iniciar": { uri: URI },
      "POST /2fa/ativar": erroApi("Código inválido.", 401)
    });
    await chegarAoQr();
    const campo = screen.getByLabelText("Código de 6 dígitos do aplicativo");
    await userEvent.type(campo, "000000");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));
    expect(await screen.findByText("Código inválido.")).toBeVisible();
    expect(campo).toHaveValue("");
    expect(screen.getByRole("img", { name: /QR Code/ })).toBeInTheDocument();
  });

  it("código incompleto: avisa sem chamar a API", async () => {
    await chegarAoQr();
    await userEvent.type(screen.getByLabelText("Código de 6 dígitos do aplicativo"), "12a3");
    expect(screen.getByLabelText("Código de 6 dígitos do aplicativo")).toHaveValue("123");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar e ativar" }));
    expect(screen.getByText("Digite os 6 dígitos que aparecem no aplicativo.")).toBeVisible();
    expect(api.api).toHaveBeenCalledTimes(1);
  });

  it("cancelar no QR descarta o segredo e volta ao início", async () => {
    await chegarAoQr();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("img", { name: /QR Code/ })).not.toBeInTheDocument();
    expect(screen.queryByText("JBSW Y3DP EHPK 3PXP")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ativar verificação em duas etapas" })).toBeInTheDocument();
  });

  it("depois do código certo, mostra os 10 códigos de recuperação com o aviso", async () => {
    await chegarAosCodigos();
    const lista = screen.getByRole("list", { name: "Códigos de recuperação" });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(10);
    expect(within(lista).getByText("a1b2c3d4")).toBeInTheDocument();
    expect(screen.getByText(/eles não aparecem de novo/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /QR Code/ })).not.toBeInTheDocument();
  });

  it("os códigos aparecem uma vez só: depois de 'Já guardei' somem da tela", async () => {
    await chegarAosCodigos();
    await userEvent.click(screen.getByRole("button", { name: "Já guardei os códigos" }));
    expect(screen.queryByText("a1b2c3d4")).not.toBeInTheDocument();
    expect(screen.getByText(/Verificação em duas etapas ativa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desativar" })).toBeInTheDocument();
  });

  it("nada do segredo ou dos códigos vai para o localStorage nem para o console", async () => {
    await chegarAosCodigos();
    expect(espiaLocal).not.toHaveBeenCalled();
    expect(espiaConsole).not.toHaveBeenCalled();
  });

  it("Copiar põe os 10 códigos na área de transferência", async () => {
    const escrever = vi.fn().mockResolvedValue();
    await chegarAosCodigos();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));
    expect(escrever).toHaveBeenCalledWith(CODIGOS.join("\n"));
    expect(await screen.findByText(/Códigos copiados/)).toBeVisible();
  });

  it("Copiar sem permissão sugere baixar o .txt", async () => {
    await chegarAosCodigos();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("negado")) },
      configurable: true
    });
    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));
    expect(await screen.findByText(/Não foi possível copiar/)).toBeVisible();
  });

  it("Baixar .txt gera o arquivo no navegador com os códigos", async () => {
    const criar = vi.fn().mockReturnValue("blob:codigos");
    const revogar = vi.fn();
    const originais = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL };
    Object.assign(URL, { createObjectURL: criar, revokeObjectURL: revogar });
    const clique = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await chegarAosCodigos();
    await userEvent.click(screen.getByRole("button", { name: "Baixar .txt" }));

    const arquivo = criar.mock.calls[0][0];
    expect(arquivo).toBeInstanceOf(Blob);
    const texto = await new Promise(resolver => {
      const leitor = new FileReader();
      leitor.onload = () => resolver(leitor.result);
      leitor.readAsText(arquivo);
    });
    for (const codigo of CODIGOS) expect(texto).toContain(codigo);
    expect(clique).toHaveBeenCalledTimes(1);
    expect(clique.mock.contexts[0].download).toBe("coldtrack-codigos-de-recuperacao.txt");
    expect(revogar).toHaveBeenCalledWith("blob:codigos");
    clique.mockRestore();
    Object.assign(URL, originais);
  });

  it("desativar pede senha e código e volta ao estado desligado", async () => {
    render(<DoisFatores ativo />);
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await userEvent.type(screen.getByLabelText("Senha atual"), "segredo123");
    await userEvent.type(screen.getByLabelText("Código de 6 dígitos do aplicativo"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Desativar verificação" }));

    expect(api.api).toHaveBeenCalledWith("/2fa/desativar", {
      metodo: "POST",
      corpo: { senha: "segredo123", codigo: "654321" },
      sessaoNo401: false
    });
    expect(await screen.findByText(/Verificação em duas etapas desativada/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Ativar verificação em duas etapas" })).toBeInTheDocument();
  });

  it("desativar sem senha ou com código incompleto avisa sem chamar a API", async () => {
    render(<DoisFatores ativo />);
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await userEvent.click(screen.getByRole("button", { name: "Desativar verificação" }));
    expect(screen.getByText("Informe sua senha.")).toBeVisible();
    await userEvent.type(screen.getByLabelText("Senha atual"), "segredo123");
    await userEvent.type(screen.getByLabelText("Código de 6 dígitos do aplicativo"), "12");
    await userEvent.click(screen.getByRole("button", { name: "Desativar verificação" }));
    expect(screen.getByText("Digite os 6 dígitos que aparecem no aplicativo.")).toBeVisible();
    expect(api.api).not.toHaveBeenCalled();
  });

  it("desativar com senha ou código errado mostra o erro e continua ativa", async () => {
    respostas({ "POST /2fa/desativar": erroApi("Senha ou código incorretos.", 401) });
    render(<DoisFatores ativo />);
    await userEvent.click(screen.getByRole("button", { name: "Desativar" }));
    await userEvent.type(screen.getByLabelText("Senha atual"), "errada");
    await userEvent.type(screen.getByLabelText("Código de 6 dígitos do aplicativo"), "111111");
    await userEvent.click(screen.getByRole("button", { name: "Desativar verificação" }));
    expect(await screen.findByText("Senha ou código incorretos.")).toBeVisible();
    expect(screen.getByLabelText("Código de 6 dígitos do aplicativo")).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByText(/Verificação em duas etapas ativa/)).toBeInTheDocument();
  });

  it("estado desconhecido: o atalho abre o formulário de desativar", async () => {
    render(<DoisFatores />);
    await userEvent.click(screen.getByRole("button", { name: "Já está ativa? Desativar" }));
    expect(screen.getByLabelText("Senha atual")).toBeInTheDocument();
  });

});
