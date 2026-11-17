// Excluir empresa: confirmação reforçada, repetição no 202, erros da API e fim da sessão.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExcluirEmpresa, { AVISO_EMPRESA_EXCLUIDA } from "./ExcluirEmpresa.jsx";

const sessao = vi.hoisted(() => ({ usuario: null, encerrarLocal: vi.fn() }));
const api = vi.hoisted(() => ({ api: vi.fn() }));

vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => sessao }));
vi.mock("../../lib/api.js", () => api);

const GESTOR = { id: "gestor@empresa.com", nome: "Gina", perfil: "gestor", empresa: "Frio Sul" };

async function abrirEPreencher({ nome = "frio sul ", senha = "segredo123" } = {}) {
  render(<ExcluirEmpresa />);
  await userEvent.click(screen.getByRole("button", { name: "Excluir empresa" }));
  const dialogo = document.getElementById("excluirEmpresaDialogo");
  if (nome) await userEvent.type(within(dialogo).getByLabelText(/nome da empresa/), nome);
  if (senha) await userEvent.type(within(dialogo).getByLabelText("Sua senha atual"), senha);
  return dialogo;
}

const confirmar = dialogo => within(dialogo).getByRole("button", { name: "Excluir empresa para sempre" });

describe("ExcluirEmpresa", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    sessao.usuario = GESTOR;
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  });

  it("explica o que será apagado e mantém o botão desabilitado até nome e senha", async () => {
    render(<ExcluirEmpresa />);
    await userEvent.click(screen.getByRole("button", { name: "Excluir empresa" }));
    const dialogo = document.getElementById("excluirEmpresaDialogo");

    expect(dialogo).toHaveAttribute("open");
    expect(dialogo).toHaveTextContent(/não pode ser desfeita/);
    expect(confirmar(dialogo)).toBeDisabled();

    await userEvent.type(within(dialogo).getByLabelText(/nome da empresa/), "Outro nome");
    await userEvent.type(within(dialogo).getByLabelText("Sua senha atual"), "segredo123");
    expect(confirmar(dialogo)).toBeDisabled();

    await userEvent.clear(within(dialogo).getByLabelText(/nome da empresa/));
    await userEvent.type(within(dialogo).getByLabelText(/nome da empresa/), "Frio Sul");
    expect(confirmar(dialogo)).toBeEnabled();
  });

  it("200: chama DELETE /empresa e encerra a sessão com aviso", async () => {
    api.api.mockResolvedValue({ excluida: true, removidos: {} });
    const dialogo = await abrirEPreencher();

    await userEvent.click(confirmar(dialogo));

    await vi.waitFor(() => expect(sessao.encerrarLocal).toHaveBeenCalledWith(AVISO_EMPRESA_EXCLUIDA));
    expect(api.api).toHaveBeenCalledTimes(1);
    expect(api.api).toHaveBeenCalledWith("/empresa", {
      metodo: "DELETE",
      corpo: { confirmacao: "frio sul", senha: "segredo123" }
    });
  });

  it("202: repete o mesmo pedido até o 200", async () => {
    api.api
      .mockResolvedValueOnce({ excluida: false })
      .mockResolvedValueOnce({ excluida: false })
      .mockResolvedValueOnce({ excluida: true });
    const dialogo = await abrirEPreencher();

    await userEvent.click(confirmar(dialogo));

    await vi.waitFor(() => expect(sessao.encerrarLocal).toHaveBeenCalledTimes(1));
    expect(api.api).toHaveBeenCalledTimes(3);
    const corpos = api.api.mock.calls.map(c => JSON.stringify(c[1].corpo));
    expect(new Set(corpos).size).toBe(1);
  });

  it("202: mostra o progresso e trava o diálogo enquanto exclui", async () => {
    let liberar;
    api.api
      .mockResolvedValueOnce({ excluida: false })
      .mockImplementationOnce(() => new Promise(resolver => { liberar = resolver; }));
    const dialogo = await abrirEPreencher();

    await userEvent.click(confirmar(dialogo));

    await vi.waitFor(() => expect(within(dialogo).getByRole("status")).toHaveTextContent("pedido 2"));
    expect(within(dialogo).getByRole("button", { name: "Cancelar" })).toBeDisabled();

    liberar({ excluida: true });
    await vi.waitFor(() => expect(sessao.encerrarLocal).toHaveBeenCalled());
  });

  it("400: mostra a mensagem da API, mantém o nome e apaga a senha", async () => {
    api.api.mockRejectedValue(Object.assign(new Error("senha: senha atual incorreta"), { status: 400 }));
    const dialogo = await abrirEPreencher();

    await userEvent.click(confirmar(dialogo));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("senha: senha atual incorreta");
    expect(within(dialogo).getByLabelText(/nome da empresa/)).toHaveValue("frio sul ");
    expect(within(dialogo).getByLabelText("Sua senha atual")).toHaveValue("");
    expect(sessao.encerrarLocal).not.toHaveBeenCalled();
    expect(confirmar(dialogo)).toBeDisabled();
  });

  it("429: mostra a mensagem da API", async () => {
    api.api.mockRejectedValue(Object.assign(new Error("muitos pedidos de exclusão. Tente de novo em 1 hora."), { status: 429 }));
    const dialogo = await abrirEPreencher();

    await userEvent.click(confirmar(dialogo));

    expect(await within(dialogo).findByRole("alert")).toHaveTextContent("Tente de novo em 1 hora");
  });

  it("401 depois de um 202: a conta já sumiu, conclui", async () => {
    api.api
      .mockResolvedValueOnce({ excluida: false })
      .mockRejectedValueOnce(Object.assign(new Error("Sessão encerrada."), { status: 401 }));
    const dialogo = await abrirEPreencher();

    await userEvent.click(confirmar(dialogo));

    await vi.waitFor(() => expect(sessao.encerrarLocal).toHaveBeenCalledWith(AVISO_EMPRESA_EXCLUIDA));
  });

  it("cancelar fecha sem chamar a API", async () => {
    const dialogo = await abrirEPreencher();
    await userEvent.click(within(dialogo).getByRole("button", { name: "Cancelar" }));
    expect(api.api).not.toHaveBeenCalled();
    expect(document.getElementById("excluirEmpresaDialogo")).toBeNull();
  });

});
