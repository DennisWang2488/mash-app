#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/../../sidecar/mash_cv"
poetry install --no-root
exec poetry run python build_sidecar.py "$@"
