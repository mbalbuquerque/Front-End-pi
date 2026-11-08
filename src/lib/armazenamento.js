// Único ponto de acesso ao localStorage. Navegador sem armazenamento
// (modo privado, bloqueio) não quebra a tela: leitura vira null, escrita é ignorada.

export function ler(chave) {

  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }

}


export function gravar(chave, valor) {

  try {
    localStorage.setItem(chave, valor);
  } catch {
    // sem armazenamento
  }

}


export function remover(chave) {

  try {
    localStorage.removeItem(chave);
  } catch {
    // nada a limpar
  }

}


export function lerJSON(chave, padrao = null) {

  try {
    const valor = JSON.parse(ler(chave) ?? "null");
    return valor ?? padrao;
  } catch {
    return padrao;
  }

}


export function gravarJSON(chave, valor) {

  gravar(chave, JSON.stringify(valor));

}
