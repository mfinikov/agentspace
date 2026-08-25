#!/usr/bin/env bash
# The green gate. "Done" means this exits zero.
# Extend it as the space grows — never work around it.
set -uo pipefail
cd "$(dirname "$0")/.."

status=0
run() {
  local label="$1"; shift
  printf '\033[36m›\033[0m %s\n' "$label"
  if "$@"; then
    printf '\033[32m✓\033[0m %s\n' "$label"
  else
    printf '\033[31m✗\033[0m %s\n' "$label"
    status=1
  fi
}

has_script() { [ -f package.json ] && node -e "process.exit(require('./package.json').scripts?.['$1']?0:1)" 2>/dev/null; }

if has_script lint;      then run "lint"      npm run --silent lint; fi
if has_script typecheck; then run "typecheck" npm run --silent typecheck; fi
if has_script test;      then run "test"      npm run --silent test; fi

if [ -d tests ] && ls tests/test_*.py >/dev/null 2>&1; then
  run "pytest" python3 -m pytest -q
fi

if [ "$status" -eq 0 ]; then
  printf '\n\033[32mgreen\033[0m\n'
else
  printf '\n\033[31mred — do not ship\033[0m\n'
fi
exit "$status"
