// Cadastro demonstrativo de usuário: validações em ordem, máscara de CPF e nenhuma chamada de rede.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import CadastroUsuario from "./CadastroUsuario.jsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

function abrir() {
  return renderizarNaRota(<CadastroUsuario />, "/cadastro-usuario", ["/"]);
}

async function preencher({ nome = "Maria Souza", cpf = "52998224725", email = "maria@empresa.com", funcao = "Analista", perfil = "operador" } = {}) {
  if (nome) await userEvent.type(screen.getByLabelText(/Nome completo/), nome);
  if (cpf) await userEvent.type(screen.getByLabelText(/CPF/), cpf);
  if (email) await userEvent.type(screen.getByLabelText(/E-mail/), email);
  if (funcao) await userEvent.type(screen.getByLabelText(/Função/), funcao);
  if (perfil) await userEvent.selectOptions(screen.getByLabelText(/Perfil/), perfil);
}

const enviar = () => userEvent.click(screen.getByRole("button", { name: "Cadastrar usuário" }));
const mensagem = () => document.getElementById("mensagem");

describe("CadastroUsuario", () => {

  it("aplica a máscara de CPF enquanto digita", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText(/CPF/), "52998224725");
    expect(screen.getByLabelText(/CPF/)).toHaveValue("529.982.247-25");
  });

  it("nome sem sobrenome: pede o nome completo", async () => {
    abrir();
    await preencher({ nome: "Maria" });
    await enviar();
    expect(mensagem()).toHaveTextContent("Informe o nome completo.");
  });

  it("CPF inválido: avisa e devolve o foco ao campo", async () => {
    abrir();
    await preencher({ cpf: "11111111111" });
    await enviar();
    expect(mensagem()).toHaveTextContent("Informe um CPF válido.");
    expect(screen.getByLabelText(/CPF/)).toHaveFocus();
  });

  it("e-mail inválido: avisa e foca o e-mail", async () => {
    abrir();
    await preencher({ email: "sem-arroba" });
    await enviar();
    expect(mensagem()).toHaveTextContent("Informe um e-mail válido.");
    expect(screen.getByLabelText(/E-mail/)).toHaveFocus();
  });

  it("sem função ou sem perfil: pede os dois", async () => {
    abrir();
    await preencher({ perfil: "" });
    await enviar();
    expect(mensagem()).toHaveTextContent("Preencha a função e o perfil de acesso.");
  });

  it("dados corretos: valida sem chamar a API e Limpar zera a mensagem", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    abrir();
    await preencher();
    await enviar();
    expect(mensagem()).toHaveTextContent("Formulário validado. O cadastro estará disponível após a integração com a API.");
    expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Limpar" }));
    expect(mensagem()).toBeEmptyDOMElement();
    expect(screen.getByLabelText(/Nome completo/)).toHaveValue("");
  });

});
