#!/usr/bin/env bash
# Install whatever this space needs. Safe to run repeatedly.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\033[36m›\033[0m %s\n' "$*"; }

if [ -f package.json ]; then
  say "installing node dependencies"
  if [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then pnpm install
  elif [ -f bun.lockb ] && command -v bun >/dev/null 2>&1; then bun install
  elif [ -f package-lock.json ]; then npm ci
  else npm install
  fi
fi

if [ -f requirements.txt ]; then
  say "installing python dependencies"
  [ -d .venv ] || python3 -m venv .venv
  ./.venv/bin/pip install -q -r requirements.txt
fi

if [ -f pyproject.toml ] && command -v uv >/dev/null 2>&1; then
  say "syncing with uv"
  uv sync
fi

if [ ! -d .git ]; then
  say "initialising git (nothing here is versioned yet)"
  git init -q
  git add -A && git commit -qm "chore: initial agentspace scaffold" || true
fi

say "ready — run 'bash scripts/check.sh' to see the green gate"
