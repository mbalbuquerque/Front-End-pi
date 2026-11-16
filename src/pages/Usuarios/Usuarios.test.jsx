// Tela demonstrativa de usuários: filtros, detalhes e ações ainda não integradas.

import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Usuarios from "./Usuarios.jsx";

function abrir() {
  return renderizarNaRota(<Usuarios />, "/usuarios", ["/cadastro-usuario"]);
}

const linhas = () => within(document.getElementById("usuariosTabela")).queryAllByRole("row");

describe("Usuarios", () => {

  it("mostra os indicadores e os 4 usuários de exemplo", () => {
    abrir();
    expect(document.getElementById("totalUsuarios")).toHaveTextContent("4");
    expect(document.getElementById("usuariosAtivos")).toHaveTextContent("3");
    expect(document.getElementById("usuariosInativos")).toHaveTextContent("1");
    expect(linhas()).toHaveLength(4);
    expect(screen.getByText("DADOS DEMONSTRATIVOS")).toBeInTheDocument();
  });

  it("pesquisa por nome, e-mail ou função", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText("Pesquisar"), "qualidade");
    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]).toHaveTextContent("Mariana Costa");
  });

  it("filtra por perfil e por situação", async () => {
    abrir();
    await userEvent.selectOptions(screen.getByLabelText("Perfil"), "operador");
    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]).toHaveTextContent("Carlos Mendes");
    await userEvent.selectOptions(screen.getByLabelText("Perfil"), "");
    await userEvent.selectOptions(screen.getByLabelText("Situação"), "inativo");
    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]).toHaveTextContent("Mariana Costa");
  });

  it("sem resultado: mostra a mensagem de vazio", async () => {
    abrir();
    expect(document.getElementById("semResultados")).not.toBeVisible();
    await userEvent.type(screen.getByLabelText("Pesquisar"), "zzzz");
    expect(linhas()).toHaveLength(0);
    expect(document.getElementById("semResultados")).toBeVisible();
  });

  it("Visualizar abre o diálogo com os dados e Fechar encerra", async () => {
    abrir();
    await userEvent.click(within(linhas()[0]).getByRole("button", { name: "Visualizar" }));
    const dialogo = document.getElementById("detalhesDialog");
    expect(dialogo).toHaveAttribute("open");
    expect(within(dialogo).getByText("ana@empresa-exemplo.com", { exact: false })).toBeInTheDocument();
    expect(within(dialogo).getByText("Gestor Logístico", { exact: false })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fechar", hidden: true }));
    expect(dialogo).not.toHaveAttribute("open");
    expect(document.getElementById("detalhesConteudo")).toBeEmptyDOMElement();
  });

  it("Editar e Desativar/Ativar avisam que a ação será integrada", async () => {
    abrir();
    await userEvent.click(within(linhas()[0]).getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("status")).toHaveTextContent('A ação "Editar" será integrada à API ColdTrack.');
    await userEvent.click(within(linhas()[0]).getByRole("button", { name: "Desativar" }));
    expect(screen.getByRole("status")).toHaveTextContent('A ação "Desativar"');
    await userEvent.click(within(linhas()[2]).getByRole("button", { name: "Ativar" }));
    expect(screen.getByRole("status")).toHaveTextContent('A ação "Ativar"');
  });

});
