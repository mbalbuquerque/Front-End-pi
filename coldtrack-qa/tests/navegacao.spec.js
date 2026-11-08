
import { entrarComo, expect, simularApi, test } from "./apoio.js";

// As telas são carregadas sob demanda (React.lazy): só conta os links depois
// que a tela montou.
async function esperarTela(page) {
  await page.locator("a[href]:visible").first().waitFor();
}

const paginas = [
  "/",
  "/login",
  "/cadastro",
  "/usuarios",
  "/auditoria",
  "/dashboard",
  "/logistica"
];

test.describe("QA - Navegação ColdTrack", () => {

  test("QA-018: páginas principais estão acessíveis", async ({ page }) => {
    for (const caminho of paginas) {
      const resposta = await page.goto(caminho);

      expect(
        resposta,
        `Sem resposta ao acessar ${caminho}`
      ).not.toBeNull();

      expect(
        resposta.status(),
        `Erro HTTP ao acessar ${caminho}`
      ).toBeLessThan(400);
    }
  });

  test("QA-019: links internos levam ao destino correto", async ({ page }) => {
    for (const caminho of paginas) {
      await page.goto(caminho);
      await esperarTela(page);

      const links = await page.locator("a[href]").evaluateAll(elementos =>
        elementos.map(elemento => ({
          href: elemento.getAttribute("href"),
          texto: elemento.textContent.trim()
        }))
      );

      for (const link of links) {
        if (
          !link.href ||
          link.href.startsWith("#") ||
          link.href.startsWith("mailto:") ||
          link.href.startsWith("tel:") ||
          link.href.startsWith("javascript:")
        ) {
          continue;
        }

        const destino = new URL(link.href, page.url());

        if (destino.origin !== new URL(page.url()).origin) {
          continue;
        }

        const resposta = await page.request.get(destino.href);

        expect(
          resposta.status(),
          `Link quebrado em ${caminho}: ${link.texto} → ${link.href}`
        ).toBeLessThan(400);
      }
    }
  });

  test("QA-020: não existem links internos para páginas inexistentes", async ({ page }) => {
    const erros = [];

    for (const caminho of paginas) {
      await page.goto(caminho);
      await esperarTela(page);

      const links = await page.locator("a[href]").evaluateAll(elementos =>
        elementos.map(elemento => elemento.href)
      );

      for (const link of links) {
        const destino = new URL(link);

        if (destino.origin !== new URL(page.url()).origin) {
          continue;
        }

        const resposta = await page.request.get(destino.href);

        if (resposta.status() === 404) {
          erros.push(`${caminho} → ${destino.pathname}`);
        }
      }
    }

    expect(
      erros,
      `Links inexistentes encontrados:\n${erros.join("\n")}`
    ).toEqual([]);
  });

  
test("QA-021: navegação visível e acessível", async ({ page }) => {
  const problemas = [];

  const paginasAutenticacao = [
    "/login",
    "/cadastro"
  ];

  for (const caminho of paginas) {
    await page.goto(caminho);

    // A tela é carregada sob demanda (React.lazy): espera o primeiro link aparecer.
    await page.locator("a[href]:visible").first().waitFor();

    const links = page.locator("a[href]:visible");
    const totalLinks = await links.count();

    console.log(
      `[QA-021] ${caminho}: ${totalLinks} links visíveis`
    );

    // Tela logada sem sessão (/dashboard) termina no login: vale a URL final.
    if (paginasAutenticacao.includes(new URL(page.url()).pathname)) {
      // Login e cadastro não precisam de menu lateral.
      // Mas devem permitir navegação por pelo menos um link.
      if (totalLinks === 0) {
        problemas.push(
          `${caminho}: nenhuma navegação visível`
        );
      }
    } else {
      // Nas páginas operacionais, esperamos navegação.
      const linksMenu = page.locator(
        "nav a:visible, aside a:visible, header a:visible"
      );

      if (await linksMenu.count() === 0) {
        problemas.push(
          `${caminho}: menu principal não encontrado`
        );
      }
    }
  }

  expect(
    problemas,
    `Falhas encontradas:\n${problemas.join("\n")}`
  ).toEqual([]);
});


  test("QA-022: links da página inicial funcionam", async ({ page }) => {
    await page.goto("/");
    await esperarTela(page);

    const links = await page.locator("a[href]").all();

    for (const link of links) {
      const href = await link.getAttribute("href");

      if (!href || href.startsWith("#")) {
        continue;
      }

      const destino = new URL(href, page.url());

      if (destino.origin !== new URL(page.url()).origin) {
        continue;
      }

      const resposta = await page.request.get(destino.href);

      expect(
        resposta.status(),
        `Link quebrado na página inicial: ${href}`
      ).toBeLessThan(400);
    }
  });

  test("QA-039: URLs antigas .html redirecionam para as rotas novas", async ({ page }) => {
    // Link salvo da tela antiga (sem sessão).
    await page.goto("/login.html");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("#loginForm")).toBeVisible();

    // Etiqueta QR impressa: /dashboard.html?veiculo=X (o arquivo existe no build).
    await entrarComo(page, "gestor");
    await simularApi(page);

    const resposta = await page.goto("/dashboard.html?veiculo=VAN-01");
    expect(resposta.status()).toBe(200);
    await expect(page).toHaveURL(/\/dashboard\?veiculo=VAN-01$/);
    await expect(page.getByRole("heading", { level: 1, name: "Visão Geral" })).toBeVisible();
  });

  test("QA-040: rota inexistente volta para a página inicial", async ({ page }) => {
    await page.goto("/pagina-que-nao-existe");
    await expect(page).toHaveURL(/\/$/);
  });

});
