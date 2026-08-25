# agentspace

**A disposable machine for your agents.** One folder goes in. Nothing comes
out. Everything is gone when you leave.

```bash
aspace new            # you are now inside a fresh, isolated environment
claude                # or codex, or whatever you run — it lives in here
aspace leave          # the environment and everything in it is deleted
```

Giving a coding agent your whole computer means giving it your SSH keys, your
other projects, your browser profile and whatever is listening on localhost.
`agentspace` gives it one folder and a container instead.

---

## The guarantee

```
  shared     /workspace      <->   ~/.agentspace/spaces/<name>/workspace
  blocked    your home directory, your SSH keys, your other repos,
             anything listening on your machine's localhost
  gone       everything, the moment you run `aspace leave`
```

You can open, edit and watch the workspace from your machine like any other
folder. From inside, there is no path back out.

## Install

```bash
npm install -g agentspace
```

Requires **Node 20+** and **Docker** ([Docker Desktop](https://docs.docker.com/desktop/)
is fine). Without Docker on macOS it falls back to a weaker Seatbelt sandbox and
tells you so — see [Backends](#backends).

```bash
aspace doctor    # check this machine can run spaces
```

## Use it

```bash
aspace new                  # random name, drops you straight in
aspace new scratch          # name it
aspace new --net none       # no network at all
aspace new --keep           # survives `leave`, re-enter later
aspace new --env OPENAI_API_KEY   # forward one host variable in
```

Once inside, every command runs in the space. When you are done:

```bash
aspace leave                # destroy it, return to your machine
aspace leave --keep         # detach, keep it for `aspace enter`
aspace status               # what is shared, what is blocked
```

From the host:

| Command | What it does |
|---|---|
| `aspace ls` | every space, its state, size and lifetime |
| `aspace enter <name>` | go back into a kept space |
| `aspace exec -- <cmd>` | run one command inside without attaching |
| `aspace status [name]` | isolation settings and disk usage |
| `aspace rm <name...>` | destroy specific spaces |
| `aspace prune` | destroy every ephemeral space |
| `aspace doctor` | check backends, templates and config |
| `aspace config` | view or change defaults |

## Ephemeral means ephemeral

`aspace leave` deletes the container **and** the workspace. Git commits inside
a space die with it. To keep work, do one of:

- `git push` to a real remote from inside,
- `aspace leave --keep` (or create it with `--keep`),
- copy it out from the host: `cp -r ~/.agentspace/spaces/<name>/workspace .`

If the shell just ends — `exit`, Ctrl-D, a crash — agentspace **asks** before
deleting anything rather than assuming. Only an explicit `aspace leave` destroys
without a prompt. Turn the prompt off with `aspace config set confirmOnLeave false`.

## What is preinstalled

Every space is seeded with a working agent stack, so an agent that lands in it
has structure to follow instead of an empty directory. It synthesises the
conventions that [gstack](https://github.com/garrytan/gstack),
[Get Shit Done](https://getshitdone.help/) and Superpowers converged on:
phase-based work, state written to disk, role-specialised subagents.

```
/workspace
├── AGENTS.md          the contract — read first, obeyed by every agent
├── CLAUDE.md          imports AGENTS.md, so Claude Code reads the same thing
├── .agents/
│   ├── skills/        frame · research · write-spec · plan · implement
│   │                  verify · ship · retro · debug
│   ├── subagents/     architect · implementer · reviewer · qa · researcher
│   ├── commands/      /loop · /status · /handoff
│   ├── hooks/         lifecycle hooks (incl. a secret-blocking pre-commit)
│   └── mcp/           MCP server config, scoped to /workspace
├── .claude/           symlinks into .agents/ — one set of definitions, not two
├── docs/
│   ├── specs/         what we are building, with observable acceptance criteria
│   ├── plans/         ordered steps, each independently verifiable
│   ├── decisions/     ADRs for the calls that are expensive to reverse
│   └── research/      external findings, with sources and versions
├── notes/journal.md   what actually happened, including the dead ends
├── src/ tests/
└── scripts/           bootstrap.sh · check.sh (the green gate)
```

The workflow it encodes:

**frame → research → spec → plan → implement → verify → ship → retro**

Each phase writes a file the next phase reads, so a fresh agent — or you,
tomorrow — can resume from disk instead of from a lost context window.

Run `/loop <what you want>` inside a space to drive the whole thing.

## Backends

| | `docker` (default) | `native` (fallback) |
|---|---|---|
| Isolation | full container: own filesystem, PID and network namespace | macOS Seatbelt profile around a host shell |
| Host filesystem | invisible | unreadable (`$HOME` denied), unwritable |
| Host localhost | unreachable — `host.docker.internal` is pinned to `127.0.0.1` | reachable |
| Installed tools | only what the image has | whatever is on your `PATH` |
| Privilege escalation | `no-new-privileges`, all capabilities dropped | inherits your user |

`auto` (the default) picks docker and falls back to native with a warning. The
native backend is a convenience, not an equivalent — it shares your kernel and
your binaries. When the isolation actually matters, use docker.

```bash
aspace config set backend docker    # never silently fall back
```

## Network

`--net full` (default) gives the space the internet but not your machine.
`--net none` gives it nothing.

Nothing about the network is a substitute for judgement: a space with internet
access can still exfiltrate whatever you put in `/workspace`. Forward secrets
in deliberately (`--env`), and use `--net none` when the task does not need to
be online.

## Configuration

```bash
aspace config                        # show everything
aspace config set network none       # default new spaces to offline
aspace config set confirmOnLeave false
aspace config set forwardEnv ANTHROPIC_API_KEY,GITHUB_TOKEN
```

| Key | Default | Meaning |
|---|---|---|
| `backend` | `auto` | `auto`, `docker` or `native` |
| `network` | `full` | default `--net` for new spaces |
| `confirmOnLeave` | `true` | ask before deleting when a shell ends without `aspace leave` |
| `image` | `agentspace/base:0.2` | container image |
| `memory` / `cpus` | `4g` / `2` | resource limits |
| `forwardEnv` | API key names | host variables every space may see |

State lives in `~/.agentspace` (override with `AGENTSPACE_HOME`).

## Threat model

agentspace defends against an agent that wanders — reading files it was not
pointed at, writing outside its project, poking at your local services. That is
the realistic failure mode and the one it stops.

It is **not** a defence against a determined attacker with a container escape,
and it does not protect the contents of `/workspace` itself: anything you put
in there, or any credential you forward in, is exposed to whatever runs inside.
Treat a space as untrusted, and give it only what the task needs.

## Development

```bash
npm install
npm run build
npm run typecheck
node dist/cli.js doctor
```

## License

MIT
