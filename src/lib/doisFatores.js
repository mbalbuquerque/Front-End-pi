// Verificação em duas etapas (TOTP): limpeza dos campos de código e leitura do
// endereço otpauth:// que a API devolve. Sem React, para testar sozinho.
// Nada aqui guarda o segredo ou os códigos: tudo vive só no estado da tela.


// Só dígitos, no máximo 6: aceita colar "123 456" ou "123-456".
export function limparCodigo(texto) {

  return String(texto).replace(/\D/g, "").slice(0, 6);

}


// Código de recuperação: 8 caracteres (a1b2c3d4), sem espaço nem traço.
export function limparRecuperacao(texto) {

  return String(texto).replace(/[^0-9a-z]/gi, "").toLowerCase().slice(0, 8);

}


// Segredo em base32 de otpauth://totp/ColdTrack:email?secret=...&issuer=ColdTrack,
// para quem digita a chave no aplicativo em vez de ler o QR. "" se não achar.
export function segredoDaUri(uri) {

  const achado = /[?&]secret=([^&]+)/i.exec(String(uri || ""));

  return achado ? decodeURIComponent(achado[1]).toUpperCase() : "";

}


// "JBSWY3DPEHPK3PXP" vira "JBSW Y3DP EHPK 3PXP": mais fácil de conferir ao digitar.
export function agruparSegredo(segredo) {

  return (segredo.match(/.{1,4}/g) || []).join(" ");

}


// Conteúdo do .txt dos códigos de recuperação.
export function textoCodigos(codigos) {

  return [
    "ColdTrack Control: códigos de recuperação da verificação em duas etapas",
    "Cada código entra uma vez só. Guarde em lugar seguro, longe do celular.",
    "",
    ...codigos
  ].join("\n") + "\n";

}
