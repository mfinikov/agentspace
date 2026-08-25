---
description: Run the full agentspace loop on a task — frame, research, spec, plan, build, verify, ship, retro.
argument-hint: <what you want built>
---

Run the full loop from `AGENTS.md` on: **$ARGUMENTS**

Work through the phases in order. After each phase, state which phase you are
leaving, what file you wrote, and what you are doing next.

1. `frame` — sharpen the request into a problem with a done condition.
   Stop and ask if two readings would lead to materially different builds.
2. `research` — only if a decision depends on an external fact. Cite sources.
3. `write-spec` — `docs/specs/<slug>.md` with observable acceptance criteria.
4. `plan` — `docs/plans/<slug>.md`, ordered, each step verifiable, tree green
   after every step.
5. `implement` — execute steps in order. Tick each box in the plan file as you
   finish it. Delegate independent steps to the `implementer` subagent.
6. `verify` — run `scripts/check.sh`, walk every acceptance criterion with
   evidence, try to break it. Delegate to `reviewer` and `qa`.
7. `ship` — commit, and say explicitly how the work leaves this ephemeral space.
8. `retro` — append to `notes/journal.md`.

Skip a phase only when the task is genuinely too small, and say which and why.
