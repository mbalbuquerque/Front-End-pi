#!/usr/bin/env bash
# Publica o painel no site estático do Azure Storage, pela máquina local.
# Faz os mesmos passos do workflow .github/workflows/publicar-site.yml.
#
# Requer: Azure CLI logado na assinatura do projeto (az login), git e Node 20+.
# Publica o que está commitado na branch atual (nada que esteja só na máquina).
# Uso (na raiz do repositório):  bash publicar.sh
set -euo pipefail

GRUPO="rg-coldtrack"
CONTA="stcoldtrackweb7319"

cd "$(dirname "$0")"

PASTA="$(mktemp -d)"
trap 'rm -rf "$PASTA"' EXIT
git archive HEAD | tar -x -C "$PASTA"

# Build do que está commitado (lint e testes antes; para se algum falhar).
(cd "$PASTA" && npm ci && npm run lint && npm test && npm run build)

AZURE_STORAGE_ACCOUNT="$CONTA"
AZURE_STORAGE_KEY="$(az storage account keys list -n "$CONTA" -g "$GRUPO" --query "[0].value" -o tsv | tr -d '\r')"
export AZURE_STORAGE_ACCOUNT AZURE_STORAGE_KEY

bash "$PASTA/scripts/enviar-site.sh" "$PASTA/dist"

echo "Publicado em $(az storage account show -n "$CONTA" -g "$GRUPO" --query primaryEndpoints.web -o tsv)"
