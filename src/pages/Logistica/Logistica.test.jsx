// Gestão logística demonstrativa: filtros, cadastro, edição, conclusão e cancelamento (tudo em memória).

import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderizarNaRota } from "../../testes/apoio.jsx";
import Logistica from "./Logistica.jsx";

// A tela abre dentro da moldura do painel (PainelLayout), que lê a sessão.
vi.mock("../../hooks/useSessao.jsx", () => ({ useSessao: () => ({ usuario: null, sair: () => {} }) }));

function abrir() {
  return renderizarNaRota(<Logistica />, "/logistica");
}

const linhas = () => within(document.getElementById("tabelaCargas")).queryAllByRole("listitem");
const dialogo = id => document.getElementById(id);

async function detalhesDe(id) {
  const linha = linhas().find(l => l.textContent.includes(id));
  await userEvent.click(within(linha).getByRole("button", { name: "Detalhes" }));
}

async function preencherCarga(valores) {
  for (const [id, valor] of Object.entries(valores)) {
    await userEvent.clear(document.getElementById(id));
    await userEvent.type(document.getElementById(id), valor);
  }
}

const NOVA = { produto: "Maçã", origem: "Vacaria/RS", destino: "Porto Alegre/RS", sensor: "ESP32-09", tempMin: "0", tempMax: "4" };

describe("Logistica", () => {

  it("lista as 3 cargas de exemplo com indicadores e aviso de demonstração", () => {
    abrir();
    expect(linhas()).toHaveLength(3);
    expect(document.getElementById("totalCargas")).toHaveTextContent("3");
    expect(document.getElementById("cargasTransporte")).toHaveTextContent("2");
    expect(document.getElementById("cargasAtencao")).toHaveTextContent("1");
    expect(document.getElementById("totalSensores")).toHaveTextContent("3");
    expect(screen.getByText(/Ambiente demonstrativo/)).toBeInTheDocument();
  });

  it("pesquisa e filtro de status; sem resultado mostra a mensagem", async () => {
    abrir();
    await userEvent.type(screen.getByLabelText("Pesquisar cargas"), "manga");
    expect(linhas()).toHaveLength(1);
    await userEvent.clear(screen.getByLabelText("Pesquisar cargas"));
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por status"), "Atenção");
    expect(linhas()).toHaveLength(1);
    await userEvent.selectOptions(screen.getByLabelText("Filtrar por status"), "Cancelada");
    expect(linhas()).toHaveLength(0);
    expect(document.getElementById("semResultados")).toBeVisible();
  });

  it("Detalhes mostra a carga, a faixa e a temperatura", async () => {
    abrir();
    await detalhesDe("CT-002");
    expect(dialogo("modalDetalhes")).toHaveAttribute("open");
    const conteudo = document.getElementById("conteudoDetalhes");
    expect(conteudo).toHaveTextContent("Manga");
    expect(conteudo).toHaveTextContent("10 °C a 12 °C");
    expect(conteudo).toHaveTextContent("12.8 °C");
    await userEvent.click(document.getElementById("fecharDetalhes"));
    expect(dialogo("modalDetalhes")).not.toHaveAttribute("open");
  });

  it("Nova carga inválida (mínima >= máxima): mostra o erro e não cadastra", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Nova carga" }));
    expect(dialogo("modalCarga")).toHaveAttribute("open");
    await preencherCarga({ ...NOVA, tempMin: "5", tempMax: "5" });
    fireEvent.submit(document.getElementById("formCarga"));
    expect(document.getElementById("mensagemForm")).toHaveTextContent("Confira os campos e informe uma faixa de temperatura válida.");
    expect(linhas()).toHaveLength(3);
  });

  it("Nova carga válida: entra na lista como CT-004, sem temperatura", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Nova carga" }));
    await preencherCarga(NOVA);
    fireEvent.submit(document.getElementById("formCarga"));
    expect(linhas()).toHaveLength(4);
    const nova = linhas().find(l => l.textContent.includes("CT-004"));
    expect(nova).toHaveTextContent("Maçã");
    expect(nova).toHaveTextContent("Sem leitura");
    expect(nova).toHaveTextContent("Em transporte");
    expect(dialogo("modalCarga")).not.toHaveAttribute("open");
    expect(document.getElementById("totalCargas")).toHaveTextContent("4");
  });

  it("Fechar o formulário de carga não cadastra nada", async () => {
    abrir();
    await userEvent.click(screen.getByRole("button", { name: "Nova carga" }));
    await userEvent.click(document.getElementById("fecharModal"));
    expect(dialogo("modalCarga")).not.toHaveAttribute("open");
    expect(linhas()).toHaveLength(3);
  });

  it("Editar: abre com os dados da carga e salva as alterações", async () => {
    abrir();
    await detalhesDe("CT-001");
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(dialogo("modalDetalhes")).not.toHaveAttribute("open");
    expect(document.getElementById("tituloModalCarga")).toHaveTextContent("Editar carga CT-001");
    expect(document.getElementById("produto")).toHaveValue("Uva");
    await preencherCarga({ produto: "Uva Itália" });
    fireEvent.submit(document.getElementById("formCarga"));
    expect(linhas().find(l => l.textContent.includes("CT-001"))).toHaveTextContent("Uva Itália");
    expect(document.getElementById("feedbackOperacao")).toHaveTextContent("Carga atualizada (somente nesta sessão).");
  });

  it("Concluir entrega pede confirmação; Voltar não altera, Confirmar altera", async () => {
    abrir();
    await detalhesDe("CT-001");
    await userEvent.click(screen.getByRole("button", { name: "Concluir entrega" }));
    expect(dialogo("modalConfirmacao")).toHaveAttribute("open");
    expect(document.getElementById("textoConfirmacao")).toHaveTextContent("Confirma alterar a carga CT-001 para Entregue?");
    await userEvent.click(document.getElementById("cancelarConfirmacao"));
    expect(linhas().find(l => l.textContent.includes("CT-001"))).toHaveTextContent("Em transporte");

    await detalhesDe("CT-001");
    await userEvent.click(screen.getByRole("button", { name: "Concluir entrega" }));
    await userEvent.click(document.getElementById("confirmarOperacao"));
    expect(linhas().find(l => l.textContent.includes("CT-001"))).toHaveTextContent("Entregue");
    expect(document.getElementById("feedbackOperacao")).toHaveTextContent("Carga CT-001: Entregue (somente nesta sessão).");
    expect(document.getElementById("cargasTransporte")).toHaveTextContent("1");
  });

  it("Cancelar carga muda o status; carga entregue não oferece mais ações", async () => {
    abrir();
    await detalhesDe("CT-003");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar carga" }));
    expect(document.getElementById("confirmarOperacao")).toHaveTextContent("Confirmar cancelamento");
    await userEvent.click(document.getElementById("confirmarOperacao"));
    expect(linhas().find(l => l.textContent.includes("CT-003"))).toHaveTextContent("Cancelada");

    await detalhesDe("CT-003");
    expect(document.getElementById("acoesDetalhes")).toBeEmptyDOMElement();
  });

});
