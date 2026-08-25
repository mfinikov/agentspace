#!/usr/bin/env bash
# Refuse to stage anything that looks like a credential.
# Wire as a pre-commit hook: ln -sf ../../.agents/hooks/example-block-secrets.sh .git/hooks/pre-commit
set -euo pipefail

patterns=(
  'sk-ant-[A-Za-z0-9_-]{20,}'
  'sk-[A-Za-z0-9]{32,}'
  'ghp_[A-Za-z0-9]{36}'
  'AKIA[0-9A-Z]{16}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)

staged=$(git diff --cached --name-only --diff-filter=ACM || true)
[ -z "$staged" ] && exit 0

fail=0
for pattern in "${patterns[@]}"; do
  if echo "$staged" | xargs -r grep -nEI "$pattern" 2>/dev/null; then
    echo "refusing to commit: the match above looks like a credential" >&2
    fail=1
  fi
done

exit "$fail"
