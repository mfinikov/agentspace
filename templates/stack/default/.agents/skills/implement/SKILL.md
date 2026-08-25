---
name: implement
description: Write the code for a planned step — smallest correct change, tests alongside, tree green at the end. Use when executing a step from docs/plans/, or for any change small enough to skip planning.
---

# implement

## Before you type

- Read the surrounding code first. Match its naming, its structure, its
  error handling, its comment density. Code that reads as foreign is a defect
  even when it works.
- Find the existing helper before writing a new one. Duplicated logic is the
  most common failure in agent-written code.

## While you build

1. **Smallest change that fully solves the step.** Not the smallest change that
   makes the symptom go away, and not a refactor of the neighbourhood.
2. **Write the test with the code**, not after. If the step has an acceptance
   criterion, the test is that criterion.
3. **Handle the failure path.** Every external call fails eventually: network,
   disk, subprocess, parse. Decide what happens and write it down in code.
4. **No placeholders.** No `TODO: implement`, no stubbed return, no function
   that silently does nothing. If you cannot finish it, stop and say so.
5. **Do not touch what the step did not ask for.** Unrelated fixes get their
   own step, in the plan.
6. **Read your own diff before declaring done.** `git diff` and actually read
   it. Debug prints, stray files and half-renames all die here.

## After you build

- Run `bash scripts/check.sh`. Green, or it is not done.
- Tick the step in `docs/plans/<slug>.md`.
- If the plan turned out wrong, fix the plan file, then continue.

## Report honestly

State what you ran and what it printed. If a test fails, show the failure. If
you skipped part of the step, say which part and why. Never describe intended
behaviour as observed behaviour.
