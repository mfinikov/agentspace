# agentspace base image — a small, self-contained "PC" for agents.
FROM node:22-bookworm-slim

ARG AGENT_UID=1000
ARG AGENT_GID=1000

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8

RUN apt-get update && apt-get install -y --no-install-recommends \
      bash ca-certificates curl git gnupg jq less nano openssh-client \
      procps python3 python3-pip python3-venv ripgrep sudo tini tree unzip \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

# node:22 ships a `node` user at uid 1000 — reuse it as `agent` when the ids line up.
RUN if getent group "${AGENT_GID}" >/dev/null; then \
      groupmod -n agent "$(getent group "${AGENT_GID}" | cut -d: -f1)"; \
    else groupadd -g "${AGENT_GID}" agent; fi \
 && if getent passwd "${AGENT_UID}" >/dev/null; then \
      usermod -l agent -d /home/agent -m -g agent "$(getent passwd "${AGENT_UID}" | cut -d: -f1)"; \
    else useradd -u "${AGENT_UID}" -g agent -m -s /bin/bash agent; fi \
 && mkdir -p /home/agent/.local/bin /workspace /run/agentspace \
 && chown -R agent:agent /home/agent /workspace /run/agentspace

COPY shim/aspace /usr/local/bin/aspace
COPY shim/agentspace.sh /etc/profile.d/agentspace.sh
COPY shim/bashrc /home/agent/.bashrc
RUN chmod 0755 /usr/local/bin/aspace /etc/profile.d/agentspace.sh \
 && chown agent:agent /home/agent/.bashrc

USER agent
WORKDIR /workspace

# A user-owned npm prefix: the agent CLIs install here, and so can anything an
# agent decides to `npm i -g` later without needing root it does not have.
ENV NPM_CONFIG_PREFIX=/home/agent/.local \
    PNPM_HOME=/home/agent/.local/share/pnpm \
    PATH=/home/agent/.local/bin:/home/agent/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin

# Best-effort so a network-restricted build still produces a usable image.
RUN npm install -g @anthropic-ai/claude-code \
      || echo "agentspace: skipped claude-code install (offline build)"

ENV AGENTSPACE=1 \
    AGENTSPACE_INSIDE=1 \
    HOME=/home/agent

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
