# agentsandbox

**A disposable machine for your agents.** One folder goes in. Nothing comes
out. Everything is gone when you leave.

> Installs as `agentsandbox`; the command is `abox`.

```bash
abox new            # you are now inside a fresh, isolated environment
claude                # or codex, or whatever you run — it lives in here
abox leave          # the environment and everything in it is deleted
```

Giving a coding agent your whole computer means giving it your SSH keys, your
other projects, your browser profile and whatever is listening on localhost.
`agentspace` gives it one folder and a container instead.

---

## The guarantee

```
  shared     /workspace      <->   ~/.agentspace/spaces/<name>/workspace
  blocked    your home directory, your SSH keys, your other repos
  gone       everything, the moment you run `abox leave`
```

You can open, edit and watch the workspace from your machine like any other
folder. From inside, there is no path back out to your filesystem.

**The network is a separate question.** A space with `--net full` (the default)
can reach the internet — and on a container backend it can also reach services
on your machine's network. Use `--net none` when that matters; see
[Network](#network) for the measured behaviour.

## Install

```bash
npm install -g agentsandbox
```

Requires **Node 20+**. A container runtime is optional — agentspace picks the
best one that is actually present and tells you which it chose:

| Runtime | Install | Anything running in the background? |
|---|---|---|
| Apple `container` (macOS 26+) | `brew install container` then `container system start` | a terminal-managed helper |
| Docker | [Docker Desktop](https://docs.docker.com/desktop/) | the Desktop app |
| native Seatbelt (macOS) | nothing | **nothing at all** |

With none of them installed, macOS still gets the native backend, so
`abox new` works out of the box.

```bash
abox doctor    # check this machine can run spaces
```

## Use it

```bash
abox new                  # random name, drops you straight in
abox new scratch          # name it
abox new --net none       # no network at all
abox new --keep           # survives `leave`, re-enter later
abox new --env OPENAI_API_KEY   # forward one host variable in
abox new --stack minimal        # just the rules, none of the scaffolding
```

Once inside, every command runs in the space. When you are done:

```bash
abox leave                # destroy it, return to your machine
abox leave --keep         # detach, keep it for `abox enter`
abox status               # what is shared, what is blocked
```

From the host:

| Command | What it does |
|---|---|
| `abox ls` | every space, its state, size and lifetime |
| `abox enter <name>` | go back into a kept space |
| `abox exec -- <cmd>` | run one command inside without attaching |
| `abox status [name]` | isolation settings and disk usage |
| `abox stop [name]` | halt a space, keep its files, release its memory |
| `abox down` | stop every space and the build VM |
| `abox rm <name...>` | destroy specific spaces |
| `abox prune` | destroy every ephemeral space |
| `abox doctor` | check backends, templates and config |
| `abox config` | view or change defaults |

## Ephemeral means ephemeral

`abox leave` deletes the container **and** the workspace. Git commits inside
a space die with it. To keep work, do one of:

- `git push` to a real remote from inside,
- `abox leave --keep` (or create it with `--keep`),
- copy it out from the host: `cp -r ~/.agentspace/spaces/<name>/workspace .`

If the shell just ends — `exit`, Ctrl-D, a crash — agentspace **asks** before
deleting anything rather than assuming. Only an explicit `abox leave` destroys
without a prompt. Turn the prompt off with `abox config set confirmOnLeave false`.

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

| | `apple` | `docker` | `native` |
|---|---|---|---|
| What it is | Apple's container runtime, macOS 26+ | Docker Desktop / any Docker daemon | macOS Seatbelt around a host shell |
| Background process | terminal-managed helper | the Desktop app | **none** |
| Host filesystem | invisible | invisible | `$HOME` unreadable, writes confined to the workspace |
| Services on your machine | reachable on `--net full` | reachable on `--net full` | **refused, always** |
| Kernel | separate VM | separate VM | **shared with your Mac** |
| Installed tools | image only | image only | whatever is on your `PATH` |
| Privilege escalation | all capabilities dropped | `no-new-privileges`, all caps dropped | runs as you |
| Startup | seconds | seconds | instant |

`auto` (the default) tries **apple → docker → native** and prints which one it
picked and why it skipped the others. Pin one if you never want a fallback:

```bash
abox config set backend apple
```

The native backend is a genuine trade: it is the only one that needs nothing
installed and leaves nothing running, and it is the only one that blocks your
own machine's services outright — but it shares your kernel and your binaries.
For untrusted code, use a container backend.

## Network

`--net full` (the default) gives the space the internet. `--net none` gives it
nothing. Measured from inside a live space against a real service on the host:

| | `apple` / `docker` | `native` |
|---|---|---|
| internet, `--net full` | reachable | reachable |
| this machine's services, `--net full` | **reachable** | refused |
| anything, `--net none` | refused | refused |

So on a container backend, `--net full` is *not* a wall between the space and
your local network — a container gets an address on a host-visible network and
can dial your machine back on its LAN address. If an agent must not touch your
local services, run it with `--net none`, or use the native backend.

Network policy is also not a data boundary: a space with internet access can
send whatever is in `/workspace` anywhere. Forward secrets in deliberately
(`--env`), and prefer `--net none` for anything that does not need to be online.

## Configuration

```bash
abox config                        # show everything
abox config set network none       # default new spaces to offline
abox config set confirmOnLeave false
abox config set forwardEnv ANTHROPIC_API_KEY,GITHUB_TOKEN
```

| Key | Default | Meaning |
|---|---|---|
| `backend` | `auto` | `auto`, `apple`, `docker` or `native` |
| `network` | `full` | default `--net` for new spaces |
| `confirmOnLeave` | `true` | ask before deleting when a shell ends without `abox leave` |
| `image` | `agentspace/base:0.5` | container image |
| `memory` / `cpus` | `2g` / `2` | per-space ceiling (a VM commits only what it touches) |
| `forwardEnv` | API key names | host variables every space may see |

State lives in `~/.agentspace` (override with `AGENTSPACE_HOME`).

## Resource use

A container backend runs each space in its own lightweight VM, so this is worth
knowing. Measured on macOS with `footprint`, the number Activity Monitor shows:

| | Cost |
|---|---|
| an idle space (`--memory 2g`) | **~310 MB** |
| the same space at `--memory 4g` | ~430 MB |
| Apple's build VM, after building an image | **~2.2 GB** |
| a stopped space | **0** |
| a native-backend space | **0** — no VM at all |

Two things follow, and agentspace now does both for you:

- **The build VM is reclaimed after every image build.** It used to sit at
  2.2 GB indefinitely; it restarts on demand the next time an image is built.
- **`abox leave --keep` stops the environment**, it does not just detach.
  Keeping your files should not mean keeping a VM resident. `abox enter`
  brings it back with everything intact.

Check what is running at any time:

```bash
abox doctor        # reports guest VMs and their combined memory
abox stop <name>   # halt one space, keep its files
abox down          # stop everything agentspace started
container system stop   # shut the runtime down entirely (Apple backend)
```

If memory is tight, the native backend costs nothing at all:

```bash
abox new quick --backend native
```

## Threat model

agentspace defends against an agent that wanders — reading files it was not
pointed at, writing outside its project, poking at your local services. That is
the realistic failure mode and the one it stops.

It is **not** a defence against a determined attacker with a container escape.
It does not protect the contents of `/workspace` itself: anything you put in
there, or any credential you forward in, is exposed to whatever runs inside.
And on a container backend it does not, by default, stand between the space and
services on your own network — `--net none` does that.

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
