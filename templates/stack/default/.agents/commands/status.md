---
description: Orient in this space — what it is, what state the work is in, what to do next.
---

Report the current state of this workspace. Be brief and concrete.

1. Run `abox status` and report the isolation settings.
2. List `docs/specs/`, `docs/plans/`, `docs/decisions/`, `docs/research/` and
   summarise each in one line, newest first.
3. For the most recent plan, report which steps are ticked and which is next.
4. Run `git status --short` and `git log --oneline -5`.
5. Read the last entry in `notes/journal.md`.
6. Run `bash scripts/check.sh` and report pass/fail with the key output lines.

Finish with: **where the work stands** in one sentence, and **the single next
action** in one sentence. Then remind the user whether anything here has left
the space yet — this workspace is destroyed on `abox leave`.
