# AGENTS.md

Operating instructions for any agent working in this space. This file is the
contract. Read it before your first action, and re-read it when you are unsure.

> This workspace is an **agentspace**: a disposable container. `/workspace` is
> the only thing shared with the human's machine, and it is the only thing that
> survives. Everything else here is thrown away when the space is destroyed.

## Prime directives

1. **YOU MUST keep durable work inside `/workspace`.** Files written anywhere
   else vanish and cannot be recovered.
2. **YOU MUST write state to disk, not to your context.** Specs go in
   `docs/specs/`, plans in `docs/plans/`, findings in `docs/research/`,
   decisions in `docs/decisions/`. A fresh agent must be able to resume from
   the files alone.
3. **NEVER fabricate a result.** If a command failed, say it failed and paste
   the output. A wrong answer delivered confidently is the worst outcome here.
4. **Prefer the smallest change that fully solves the problem.** Do not widen
   scope, refactor opportunistically, or add abstractions with one caller.
5. **Verify before you claim.** "Done" means you ran the check and read the
   output.

## The loop

Every non-trivial task runs through these phases. Skip a phase only when the
task is genuinely too small for it, and say which phase you skipped and why.

| # | Phase     | Skill              | Output |
|---|-----------|--------------------|--------|
| 1 | Frame     | `frame`            | the problem in one paragraph, in the task note |
| 2 | Research  | `research`         | `docs/research/<topic>.md` |
| 3 | Spec      | `write-spec`       | `docs/specs/<slug>.md` |
| 4 | Plan      | `plan`             | `docs/plans/<slug>.md` with ordered steps |
| 5 | Build     | `implement`        | code in `src/`, tests in `tests/` |
| 6 | Verify    | `verify`           | test + review output, bugs filed |
| 7 | Ship      | `ship`             | commit / handoff summary |
| 8 | Retro     | `retro`            | append to `notes/journal.md` |

Phases feed forward: the plan cites the spec, the build cites the plan, the
verify step checks the build against the spec's acceptance criteria. If a
downstream phase reveals the upstream one was wrong, go back and fix the
upstream document — do not paper over it.

## Layout

```
/workspace
├── AGENTS.md          this file — the contract
├── CLAUDE.md          imports AGENTS.md for Claude Code
├── .agents/
│   ├── skills/        local skills, one folder per skill, each a SKILL.md
│   ├── subagents/     role personas to delegate to
│   ├── commands/      slash commands
│   ├── hooks/         lifecycle hooks
│   └── mcp/           MCP server configuration
├── .claude/           symlinks so Claude Code sees the same skills/agents
├── docs/
│   ├── specs/         what we are building and when it is done
│   ├── plans/         ordered steps, one file per spec
│   ├── decisions/     ADRs — irreversible calls and their reasons
│   └── research/      external findings, with sources
├── notes/journal.md   running log: what happened, what surprised you
├── src/               implementation
├── tests/             tests
└── scripts/           bootstrap.sh, check.sh — the repo's own commands
```

## Commands

```
bash scripts/bootstrap.sh   install dependencies for this space
bash scripts/check.sh       lint + typecheck + test; the gate before "done"
aspace status               show this space's isolation settings
aspace leave                destroy the space and return to the host
```

`scripts/check.sh` is the definition of green. If it does not cover your
change, extend it — do not work around it.

## Delegation

Delegate to a subagent in `.agents/subagents/` when work is (a) independently
verifiable, (b) large enough to pollute your context, or (c) better done by a
skeptic than by the person who wrote the code. Give the subagent file paths and
acceptance criteria, not a transcript. Read what it returns critically; a
subagent that agrees with you has told you nothing.

## Style

- Match the surrounding code: its naming, its idioms, its comment density.
- Comments explain **why**, never **what**. Delete a comment that restates code.
- No placeholder implementations, no `TODO` left behind without an entry in the
  plan, no dead code.
- Commit messages: imperative subject under 72 chars, body explaining why.

## Security

This space is sandboxed, but the sandbox protects the human's machine — not
their secrets. NEVER print, log, or commit an API key, token, or credential
that was forwarded into this environment. NEVER send workspace contents to a
service the task did not explicitly call for.
