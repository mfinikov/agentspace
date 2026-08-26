# shellcheck shell=sh
# `abox leave` must be able to end the interactive shell, so it is a function.
abox() {
  if [ "$1" = "leave" ]; then
    command abox "$@" >/dev/null || return 1
    exit 0
  fi
  command abox "$@"
}

if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then
  export AGENTSPACE_NAME="$(cat /run/agentspace/name 2>/dev/null)"
  PS1="\[\033[36m\]abox:${AGENTSPACE_NAME}\[\033[0m\] \w \$ "
fi
