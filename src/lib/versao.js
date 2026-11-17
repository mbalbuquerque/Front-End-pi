// Publicação nova x aba aberta (issue #69). Cada tela é um pedaço do bundle com
// hash no nome; a publicação apaga os pedaços antigos do Azure. Uma aba aberta
// antes dela (ou um index.html antigo) pede um pedaço que já não existe, o
// import() falha e a tela ficaria em branco. Aqui: recarrega a página uma vez
// para buscar a versão nova; se falhar de novo logo depois, quem mostra a
// mensagem com "Atualizar" é o ErroTela (components/ErroTela.jsx).

export const CHAVE_RECARGA = "coldtrack.recarga-versao";

// Dentro desta janela, uma segunda falha não recarrega de novo (evita laço).
export const JANELA_RECARGA_MS = 60_000;

// Mensagens dos navegadores quando o pedaço não carrega (Chrome, Firefox,
// Safari) e quando o Azure devolve o index.html (404) no lugar do .js.
const ERRO_DE_VERSAO = new RegExp([
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "Unable to preload CSS",
  "is not a valid JavaScript MIME type",
  "ChunkLoadError",
  "Loading chunk"
].join("|"), "i");


export function ehErroDeVersao(erro) {

  return ERRO_DE_VERSAO.test(String(erro?.message ?? erro ?? ""));

}


function armazenamentoDaSessao() {

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }

}


// true quando mandou recarregar; false quando já recarregou há pouco (ou não
// tem onde guardar a marca, para não arriscar um laço de recargas).
export function recarregarUmaVez({
  armazenamento = armazenamentoDaSessao(),
  recarregar = () => window.location.reload(),
  agora = Date.now()
} = {}) {

  try {

    const anterior = Number(armazenamento.getItem(CHAVE_RECARGA));

    if (anterior && agora - anterior < JANELA_RECARGA_MS) {
      return false;
    }

    armazenamento.setItem(CHAVE_RECARGA, String(agora));

  } catch {

    return false;

  }

  recarregar();

  return true;

}


// lazy(importarTela(() => import("./pages/X/X.jsx"))): em erro de versão,
// recarrega e fica pendente (a página vai embora); senão, repassa o erro.
// No build, o Vite embrulha o import() e, quando o "vite:preloadError" já
// mandou recarregar (preventDefault), resolve com undefined: também fica
// pendente, em vez de o lazy() quebrar enquanto a página recarrega.
const PENDENTE = () => new Promise(() => {});

export function importarTela(importador, recarga = recarregarUmaVez) {

  return () => importador().then(modulo => modulo ?? PENDENTE(), erro => {

    if (ehErroDeVersao(erro) && recarga()) {
      return PENDENTE();
    }

    throw erro;

  });

}


// O Vite dispara "vite:preloadError" quando o CSS/JS pré-carregado de um
// pedaço falha. preventDefault() evita o erro solto quando já vai recarregar.
export function instalarRecargaDeVersao(alvo = window, recarga = recarregarUmaVez) {

  function aoFalhar(evento) {

    if (recarga()) {
      evento.preventDefault();
    }

  }

  alvo.addEventListener("vite:preloadError", aoFalhar);

  return () => alvo.removeEventListener("vite:preloadError", aoFalhar);

}
