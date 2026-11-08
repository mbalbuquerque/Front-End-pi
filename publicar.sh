#!/usr/bin/env bash
# Publica o painel no site estático do Azure Storage.
#
# Requer: Azure CLI logado na assinatura do projeto (az login), git e Node 20+.
# Publica o que está commitado na branch atual (nada que esteja só na máquina).
# Uso (na raiz do repositório):  bash publicar.sh
set -euo pipefail

GRUPO="rg-coldtrack"
CONTA="stcoldtrackweb7319"

cd "$(dirname "$0")"

PASTA="$(mktemp -d)"
git archive HEAD | tar -x -C "$PASTA"

# Build do que está commitado (lint e testes antes; para se algum falhar).
(cd "$PASTA" && npm ci && npm run lint && npm test && npm run build)
SITE="$PASTA/dist"

# No Git Bash do Windows, o Azure CLI precisa do caminho no formato do Windows.
ORIGEM="$SITE"
command -v cygpath >/dev/null && ORIGEM="$(cygpath -w "$SITE")"

CHAVE="$(az storage account keys list -n "$CONTA" -g "$GRUPO" --query "[0].value" -o tsv)"
az storage blob upload-batch --account-name "$CONTA" --account-key "$CHAVE" \
  -s "$ORIGEM" -d '$web' --overwrite -o none

rm -rf "$PASTA"
echo "Publicado em $(az storage account show -n "$CONTA" -g "$GRUPO" --query primaryEndpoints.web -o tsv)"
