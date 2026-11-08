// Apoio da suíte real: fala com o site publicado e com a API de produção.
// Nada aqui é simulado. Regras de segurança em coldtrack-qa/real/README.md.
//
// - Credenciais só por variável de ambiente (nunca no código).
// - Tudo o que a suíte cria leva o prefixo QA-<timestamp> (veículo, sensor,
//   viagem, usuário) e é apagado no afterAll e pelo limpar-qa.js.
// - Login das contas fixas acontece uma vez por execução (login.setup.js);
//   os outros arquivos reaproveitam o storageState salvo em .auth/.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PASTA = dirname(fileURLToPath(import.meta.url));

export const SITE = (process.env.COLDTRACK_SITE_URL || "https://stcoldtrackweb7319.z15.web.core.windows.net").replace(/\/$/, "");
export const API = (process.env.COLDTRACK_API_URL || "https://func-coldtrack-7319.azurewebsites.net/api").replace(/\/$/, "");

export const CONTAS = {
  gestor: {
    email: process.env.COLDTRACK_GESTOR_EMAIL || "",
    senha: process.env.COLDTRACK_GESTOR_SENHA || ""
  },
  operador: {
    email: process.env.COLDTRACK_OPERADOR_EMAIL || "",
    senha: process.env.COLDTRACK_OPERADOR_SENHA || ""
  }
};

export const TEM_CREDENCIAIS = Object.values(CONTAS).every(c => c.email && c.senha);

export const MOTIVO_SEM_CREDENCIAIS =
  "defina COLDTRACK_GESTOR_EMAIL/SENHA e COLDTRACK_OPERADOR_EMAIL/SENHA (veja coldtrack-qa/real/README.md)";

// storageState de cada conta fixa, gravado pelo login.setup.js.
export const ESTADO = {
  gestor: join(PASTA, ".auth", "gestor.json"),
  operador: join(PASTA, ".auth", "operador.json")
};

// Marca de tudo o que a suíte cria. Vale para a execução inteira.
export const CARIMBO = process.env.COLDTRACK_QA_CARIMBO || String(Date.now());
process.env.COLDTRACK_QA_CARIMBO = CARIMBO;

export const PREFIXO = `QA-${CARIMBO}`;

// Ids com o prefixo, nas regras da API:
// veículo [A-Z0-9-]{3,20}; sensor [a-z0-9_-]{3,40} (gravado em minúsculas).
export const QA = {
  veiculo: PREFIXO,
  sensor: PREFIXO.toLowerCase(),
  usuarioEmail: `qa-${CARIMBO}@teste.coldtrack.app`,
  usuarioNome: `${PREFIXO} Operador`,
  origem: `${PREFIXO} Petrolina/PE`
};


// ---------------------------------------------------------
// SESSÃO
// ---------------------------------------------------------

// Lê a sessão (coldtrack.sessao) de um storageState salvo.
export function sessaoSalva(perfil) {

  const arquivo = ESTADO[perfil];

  if (!existsSync(arquivo)) {
    return null;
  }

  const estado = JSON.parse(readFileSync(arquivo, "utf8"));
  const origem = estado.origins.find(o => o.origin === SITE);
  const item = origem?.localStorage.find(i => i.name === "coldtrack.sessao");

  return item ? JSON.parse(item.value) : null;

}


export function tokenDe(perfil) {

  const sessao = sessaoSalva(perfil);

  if (!sessao || sessao.expiraEm <= Date.now()) {
    throw new Error(`Sem sessão válida de ${perfil}: rode o projeto "login" (login.setup.js) antes.`);
  }

  return sessao.token;

}


// ---------------------------------------------------------
// API
// ---------------------------------------------------------

// fetch direto na API. Devolve { status, dados } sem lançar em erro HTTP.
export async function chamarApi(caminho, { metodo = "GET", token, corpo, corpoCru } = {}) {

  const headers = {};

  if (token) headers.Authorization = `Bearer ${token}`;
  if (corpo !== undefined || corpoCru !== undefined) headers["Content-Type"] = "application/json";

  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers,
    body: corpoCru !== undefined ? corpoCru : corpo !== undefined ? JSON.stringify(corpo) : undefined
  });

  const texto = await resposta.text();
  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }

  return { status: resposta.status, dados };

}


// Login direto na API. Use só com senha certa: 5 erros seguidos bloqueiam a conta.
export async function entrarPelaApi(email, senha) {

  const { status, dados } = await chamarApi("/login", { metodo: "POST", corpo: { email, senha } });

  if (status !== 200) {
    throw new Error(`Login de ${email} recusado (${status}): ${JSON.stringify(dados)}. Não repita: 5 erros bloqueiam a conta por 15 min.`);
  }

  return dados;

}


// ---------------------------------------------------------
// LIMPEZA
// ---------------------------------------------------------

const ehQa = texto => typeof texto === "string" && /^qa-\d+/i.test(texto);

// Apaga os registros de teste da empresa do token. Com `carimbo`, só os desta
// execução; sem, qualquer QA-<número> que tenha sobrado. Nunca toca no resto.
// Ordem: viagens -> veículos -> sensores -> usuários (dependências da API).
export async function limparQa(token, { carimbo = null, log = () => {} } = {}) {

  const deste = texto => ehQa(texto) && (!carimbo || texto.toLowerCase().startsWith(`qa-${carimbo}`));

  const removidos = [];
  const falhas = [];

  async function apagar(rota, id) {
    const { status, dados } = await chamarApi(`${rota}/${encodeURIComponent(id)}`, { metodo: "DELETE", token });
    if (status === 204 || status === 404) {
      removidos.push(`${rota}/${id}`);
      log(`removido ${rota}/${id} (${status})`);
    } else {
      falhas.push(`${rota}/${id}: ${status} ${JSON.stringify(dados)}`);
    }
  }

  const { dados: v } = await chamarApi("/viagens", { token });
  for (const viagem of v?.viagens || []) {
    if (deste(viagem.veiculo) || deste(viagem.origem)) await apagar("/viagens", viagem.id);
  }

  const { dados: ve } = await chamarApi("/veiculos", { token });
  for (const veiculo of ve?.veiculos || []) {
    if (deste(veiculo.id)) await apagar("/veiculos", veiculo.id);
  }

  const { dados: d } = await chamarApi("/dispositivos", { token });
  for (const dispositivo of d?.dispositivos || []) {
    if (deste(dispositivo.id)) await apagar("/dispositivos", dispositivo.id);
  }

  const { dados: u } = await chamarApi("/usuarios", { token });
  for (const usuario of u?.usuarios || []) {
    if (deste(usuario.id) && usuario.id.endsWith("@teste.coldtrack.app")) await apagar("/usuarios", usuario.id);
  }

  return { removidos, falhas };

}


// Quanto sobrou com prefixo QA (para conferir depois da limpeza).
export async function restantesQa(token) {

  const [v, ve, d, u] = await Promise.all(
    ["/viagens", "/veiculos", "/dispositivos", "/usuarios"].map(r => chamarApi(r, { token }))
  );

  return [
    ...(v.dados?.viagens || []).filter(x => ehQa(x.veiculo) || ehQa(x.origem)).map(x => `viagem ${x.id}`),
    ...(ve.dados?.veiculos || []).filter(x => ehQa(x.id)).map(x => `veículo ${x.id}`),
    ...(d.dados?.dispositivos || []).filter(x => ehQa(x.id)).map(x => `sensor ${x.id}`),
    ...(u.dados?.usuarios || []).filter(x => ehQa(x.id)).map(x => `usuário ${x.id}`)
  ];

}


// ---------------------------------------------------------
// PÁGINA
// ---------------------------------------------------------

// console.error e exceções da página.
export function errosDoConsole(page) {

  const erros = [];

  page.on("console", mensagem => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });

  page.on("pageerror", erro => erros.push(erro.message));

  return erros;

}


// confirm() e alert() do app: aceita e guarda o texto.
export function aceitarDialogos(page) {

  const textos = [];

  page.on("dialog", dialogo => {
    textos.push(dialogo.message());
    dialogo.accept();
  });

  return textos;

}


export async function semRolagemHorizontal(page) {

  return page.evaluate(() => ({
    conteudo: document.documentElement.scrollWidth,
    tela: window.innerWidth
  }));

}
