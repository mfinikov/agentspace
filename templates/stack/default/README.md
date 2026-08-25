# workspace

An [agentspace](https://github.com/mfinikov/agentspace): a disposable,
sandboxed machine for running AI agents.

- `/workspace` is shared with the host. Everything else is ephemeral.
- Nothing in here can reach the host filesystem.
- `aspace leave` destroys the space; `aspace leave --keep` detaches instead.

Start with **[AGENTS.md](./AGENTS.md)** — it is the operating contract for any
agent working here.

## Quick start

```bash
bash scripts/bootstrap.sh   # install what this space needs
bash scripts/check.sh       # the green gate
```
