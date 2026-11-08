// Limpeza avulsa da suíte real: apaga, pela API, todo registro de teste que
// tenha sobrado (viagens, veículos, sensores e usuários com prefixo QA-<número>)
// na empresa do gestor. Não toca em nada sem esse prefixo.
//
//   npm run test:e2e:real:limpar
//
// Usa a sessão salva pelo login.setup.js se ainda valer; senão faz UM login
// do gestor pela API (com a senha das variáveis de ambiente).

import { existsSync } from "node:fs";

// Credenciais: variáveis de ambiente, ou um .env.local (fora do git).
// Carregado antes do apoio-real.js, que lê as variáveis ao ser importado.
if (existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

const {
  CONTAS,
  MOTIVO_SEM_CREDENCIAIS,
  TEM_CREDENCIAIS,
  entrarPelaApi,
  limparQa,
  restantesQa,
  sessaoSalva
} = await import("./apoio-real.js");

async function token() {

  const salva = sessaoSalva("gestor");

  if (salva && salva.expiraEm > Date.now() + 60000) {
    console.log("Usando a sessão salva do gestor.");
    return salva.token;
  }

  if (!TEM_CREDENCIAIS) {
    throw new Error(`Sem sessão salva e sem credenciais: ${MOTIVO_SEM_CREDENCIAIS}`);
  }

  console.log("Entrando como gestor pela API (um login).");
  return (await entrarPelaApi(CONTAS.gestor.email, CONTAS.gestor.senha)).token;

}


try {

  const t = await token();

  const { removidos, falhas } = await limparQa(t, { log: linha => console.log(`  ${linha}`) });
  console.log(`Removidos: ${removidos.length}.`);

  for (const falha of falhas) console.error(`  FALHA ${falha}`);

  const restantes = await restantesQa(t);

  if (restantes.length) {
    console.error(`Ainda restam registros QA:\n  ${restantes.join("\n  ")}`);
    process.exit(1);
  }

  console.log("Nenhum registro QA-* na API.");

} catch (erro) {

  console.error(erro.message);
  process.exit(1);

}
