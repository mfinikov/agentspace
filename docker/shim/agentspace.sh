# shellcheck shell=sh
# `aspace leave` must be able to end the interactive shell, so it is a function.
aspace() {
  if [ "$1" = "leave" ]; then
    command aspace "$@" >/dev/null || return 1
    exit 0
  fi
  command aspace "$@"
}

if [ -n "$BASH_VERSION" ] || [ -n "$ZSH_VERSION" ]; then
  export AGENTSPACE_NAME="$(cat /run/agentspace/name 2>/dev/null)"
  PS1="\[\033[36m\]aspace:${AGENTSPACE_NAME}\[\033[0m\] \w \$ "
fi
