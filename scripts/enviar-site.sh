#!/usr/bin/env bash
# Envia dist/ para o container $web do site estático no Azure Storage.
# Usado pelo workflow publicar-site.yml e pelo publicar.sh (mesmos passos).
#
# Uso:    bash scripts/enviar-site.sh <pasta-dist>
# Requer: Azure CLI e as variáveis AZURE_STORAGE_ACCOUNT e AZURE_STORAGE_KEY
#         (o az storage lê as duas do ambiente).
#
# Passos:
#   1. assets/<nome>-<hash>.* (arquivos do build com hash no nome):
#      Cache-Control "public, max-age=31536000, immutable".
#   2. Todo o resto (index.html, cópias *.html das páginas antigas, sw.js,
#      manifest.json, ícones): Cache-Control "no-cache" (o navegador revalida
#      a cada visita; publicação nova chega na hora).
#   3. Apaga do $web todo arquivo que não está em dist/ (js/, css/ e imagens
#      do site antigo, chunks de builds anteriores).
#   4. Garante index.html como documento inicial e de erro (rotas da SPA).
#
# Os arquivos com hash sobem antes do index.html: quem abrir o site no meio
# do envio nunca recebe um index.html apontando para um chunk que ainda não existe.
set -euo pipefail

DIST="${1:?Uso: bash scripts/enviar-site.sh <pasta-dist>}"
: "${AZURE_STORAGE_ACCOUNT:?defina AZURE_STORAGE_ACCOUNT}"
: "${AZURE_STORAGE_KEY:?defina AZURE_STORAGE_KEY}"

CONTAINER='$web'
CACHE_LONGO="public, max-age=31536000, immutable"
CACHE_CURTO="no-cache"

if [ ! -f "$DIST/index.html" ] || [ ! -d "$DIST/assets" ]; then
  echo "Build incompleto em $DIST (falta index.html ou assets/). Nada foi enviado." >&2
  exit 1
fi

# No Git Bash do Windows, o Azure CLI precisa do caminho no formato do Windows.
caminho() {
  if command -v cygpath >/dev/null; then cygpath -w "$1"; else printf '%s\n' "$1"; fi
}

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Separa os dois grupos: só os arquivos soltos em dist/assets têm hash
# (dist/assets/icons vem de public/ e mantém o nome).
mkdir -p "$TMP/hash/assets" "$TMP/resto"
find "$DIST/assets" -maxdepth 1 -type f -exec cp {} "$TMP/hash/assets/" \;
cp -R "$DIST/." "$TMP/resto/"
find "$TMP/resto/assets" -maxdepth 1 -type f -delete

enviar() {
  # $1 pasta de origem, $2 Cache-Control, demais: argumentos extras
  local origem="$1" cache="$2"
  shift 2
  az storage blob upload-batch -s "$(caminho "$origem")" -d "$CONTAINER" \
    --overwrite --content-cache-control "$cache" "$@" -o none
}

echo "1/4 Enviando arquivos com hash (cache longo)..."
enviar "$TMP/hash" "$CACHE_LONGO"
# O tipo de .webp nem sempre é reconhecido pelo Python do Azure CLI.
if compgen -G "$TMP/hash/assets/*.webp" >/dev/null; then
  enviar "$TMP/hash" "$CACHE_LONGO" --pattern 'assets/*.webp' --content-type image/webp
fi

echo "2/4 Enviando páginas, service worker e ícones (no-cache)..."
enviar "$TMP/resto" "$CACHE_CURTO"

echo "3/4 Removendo do \$web o que não está no build..."
(cd "$DIST" && find . -type f | sed 's#^\./##' | LC_ALL=C sort) > "$TMP/locais.txt"
az storage blob list -c "$CONTAINER" --num-results '*' --query '[].name' -o tsv \
  | tr -d '\r' | LC_ALL=C sort > "$TMP/remotos.txt"
LC_ALL=C comm -23 "$TMP/remotos.txt" "$TMP/locais.txt" > "$TMP/sobrando.txt"

removidos=0
while IFS= read -r nome; do
  [ -n "$nome" ] || continue
  az storage blob delete -c "$CONTAINER" -n "$nome" -o none
  echo "   removido: $nome"
  removidos=$((removidos + 1))
done < "$TMP/sobrando.txt"
echo "   $removidos arquivo(s) antigo(s) removido(s)."

echo "4/4 Conferindo documento inicial e de erro do site estático..."
az storage blob service-properties update --static-website \
  --index-document index.html --404-document index.html -o none

echo "Envio concluído: $(wc -l < "$TMP/locais.txt" | tr -d ' ') arquivo(s) em \$web."
