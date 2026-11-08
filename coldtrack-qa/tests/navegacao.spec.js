
const { test, expect } = require("@playwright/test");

const paginas = [
  "/index.html",
  "/login.html",
  "/cadastro.html",
  "/usuarios.html",
  "/auditoria.html",
  "/dashboard.html",
  "/logistica.html"
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
    "/login.html",
    "/cadastro.html"
  ];

  for (const caminho of paginas) {
    await page.goto(caminho);

    const links = page.locator("a[href]:visible");
    const totalLinks = await links.count();

    console.log(
      `[QA-021] ${caminho}: ${totalLinks} links visíveis`
    );

    if (paginasAutenticacao.includes(caminho)) {
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
    await page.goto("/index.html");

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

});
