// Tabela de rotas: cada caminho abre a tela certa, URLs antigas (.html) redirecionam e o resto volta ao início.

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { ROTAS_LEGADAS } from "./rotas.js";

// Cada tela vira um marcador com o nome e a busca da URL; as telas têm testes próprios.
const tela = nome => ({
  default: function Tela() {
    const { search } = useLocation();
    return <p data-testid="tela">{`${nome}${search}`}</p>;
  }
});

vi.mock("./pages/Home/Home.jsx", () => tela("Home"));
vi.mock("./pages/Login/Login.jsx", () => tela("Login"));
vi.mock("./pages/Cadastro/Cadastro.jsx", () => tela("Cadastro"));
vi.mock("./pages/Dashboard/Dashboard.jsx", () => tela("Dashboard"));
vi.mock("./pages/Alertas/Alertas.jsx", () => tela("Alertas"));
vi.mock("./pages/Relatorios/Relatorios.jsx", () => tela("Relatorios"));
vi.mock("./pages/Veiculos/Veiculos.jsx", () => tela("Veiculos"));
vi.mock("./pages/Sensores/Sensores.jsx", () => tela("Sensores"));
vi.mock("./pages/Viagens/Viagens.jsx", () => tela("Viagens"));
vi.mock("./pages/Configuracoes/Configuracoes.jsx", () => tela("Configuracoes"));
vi.mock("./pages/Usuarios/Usuarios.jsx", () => tela("Usuarios"));
vi.mock("./pages/Auditoria/Auditoria.jsx", () => tela("Auditoria"));
vi.mock("./pages/CadastroUsuario/CadastroUsuario.jsx", () => tela("CadastroUsuario"));
vi.mock("./pages/Logistica/Logistica.jsx", () => tela("Logistica"));
vi.mock("./pages/Monitoramento/Monitoramento.jsx", () => tela("Monitoramento"));
vi.mock("./pages/Motorista/Motorista.jsx", () => tela("Motorista"));

// A guarda de sessão tem teste próprio; aqui deixa passar.
vi.mock("./components/RequireAuth.jsx", () => ({ default: ({ children }) => children ?? <Outlet /> }));

async function abrir(caminho) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <App />
    </MemoryRouter>
  );
  return screen.findByTestId("tela");
}

describe("App - rotas", () => {

  it.each([
    ["/", "Home"],
    ["/login", "Login"],
    ["/cadastro", "Cadastro"],
    ["/dashboard", "Dashboard"],
    ["/alertas", "Alertas"],
    ["/relatorios", "Relatorios"],
    ["/veiculos", "Veiculos"],
    ["/sensores", "Sensores"],
    ["/viagens", "Viagens"],
    ["/configuracoes", "Configuracoes"],
    ["/usuarios", "Usuarios"],
    ["/auditoria", "Auditoria"],
    ["/cadastro-usuario", "CadastroUsuario"],
    ["/logistica", "Logistica"],
    ["/monitoramento", "Monitoramento"],
    ["/motorista", "Motorista"]
  ])("%s abre %s", async (caminho, nome) => {
    expect(await abrir(caminho)).toHaveTextContent(new RegExp(`^${nome}$`));
  });

  it("etiqueta QR antiga (/dashboard.html?veiculo=X) vai ao dashboard mantendo o veículo", async () => {
    expect(await abrir("/dashboard.html?veiculo=VAN-01")).toHaveTextContent("Dashboard?veiculo=VAN-01");
  });

  it("toda URL antiga da tabela de legados leva à tela da rota nova", async () => {
    for (const [nome, rota] of Object.entries(ROTAS_LEGADAS)) {
      cleanup();
      const resultado = await abrir(`/${nome}.html`);
      const esperado = rota === "/" ? "Home" : rota.slice(1).replace(/(^|-)(\w)/g, (_, __, letra) => letra.toUpperCase());
      expect(resultado.textContent).toBe(esperado);
    }
  });

  it("caminho que não existe volta ao início", async () => {
    expect(await abrir("/nao-existe")).toHaveTextContent(/^Home$/);
  });

});
