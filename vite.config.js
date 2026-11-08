import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import prefixer from "postcss-prefix-selector";
import { ROTAS_LEGADAS } from "./src/rotas.js";

const raiz = fileURLToPath(new URL(".", import.meta.url));
const pastaEstilos = resolve(raiz, "src/styles");


// Cada pasta em src/styles/<familia>/ vira o escopo .escopo-<familia>.
// O CSS antigo redefine :root, body e classes iguais (.sidebar, .card...) em
// cada arquivo; com o prefixo, as famílias convivem no mesmo bundle.
// :root, html e body viram o próprio elemento raiz do escopo.
function familiasCss() {

  return readdirSync(pastaEstilos).filter(nome => statSync(join(pastaEstilos, nome)).isDirectory());

}

function transformar(prefixo, seletor, prefixado) {

  // "body", "body.pagina-login .x", ":root", "html" -> ".escopo-x", ".escopo-x.pagina-login .x"
  const raizDoc = seletor.match(/^(:root|html|body)(?![\w-])/);

  if (raizDoc) {
    return prefixo + seletor.slice(raizDoc[1].length);
  }

  // "*" sozinho vale também para o elemento raiz do escopo.
  if (seletor === "*") {
    return `${prefixo}, ${prefixo} *`;
  }

  return prefixado;

}

function escoposCss() {

  return familiasCss().map(familia => prefixer({
    prefix: `.escopo-${familia}`,
    includeFiles: [new RegExp(`[\\/]src[\\/]styles[\\/]${familia}[\\/]`)],
    transform: transformar
  }));

}


// Azure Storage (site estático) só responde 200 para arquivo que existe.
// Cópias de index.html com os nomes antigos mantêm /dashboard.html?veiculo=X
// (etiquetas QR) e os links salvos funcionando; o React Router redireciona.
function paginasLegadas() {

  return {
    name: "coldtrack-paginas-legadas",
    apply: "build",
    closeBundle() {
      const dist = resolve(raiz, "dist");
      const indice = join(dist, "index.html");
      if (!existsSync(indice)) {
        return;
      }
      Object.keys(ROTAS_LEGADAS)
        .filter(nome => nome !== "index")
        .forEach(nome => copyFileSync(indice, join(dist, `${nome}.html`)));
    }
  };

}


export default defineConfig({
  base: "/",
  plugins: [react(), paginasLegadas()],
  css: {
    postcss: {
      plugins: escoposCss()
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"]
  }
});
