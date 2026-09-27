#!/usr/bin/env bash
# Publica o painel no site estático do Azure Storage.
#
# Requer: Azure CLI logado na assinatura do projeto (az login) e git.
# Publica o que está commitado na branch atual (nada que esteja só na máquina).
# Uso (na raiz do repositório):  bash publicar.sh
set -euo pipefail

GRUPO="rg-coldtrack"
CONTA="stcoldtrackweb7319"

cd "$(dirname "$0")"

for f in js/*.js sw.js; do node --check "$f"; done

PASTA="$(mktemp -d)"
git archive HEAD | tar -x -C "$PASTA"
rm -rf "$PASTA/.vscode" "$PASTA/.github" "$PASTA/README.md" "$PASTA/publicar.sh"

CHAVE="$(az storage account keys list -n "$CONTA" -g "$GRUPO" --query "[0].value" -o tsv)"
az storage blob upload-batch --account-name "$CONTA" --account-key "$CHAVE" \
  -s "$PASTA" -d '$web' --overwrite -o none

rm -rf "$PASTA"
echo "Publicado em $(az storage account show -n "$CONTA" -g "$GRUPO" --query primaryEndpoints.web -o tsv)"
