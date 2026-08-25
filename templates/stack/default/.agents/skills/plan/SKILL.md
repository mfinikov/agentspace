---
name: plan
description: Turn a spec into an ordered, independently verifiable sequence of steps before writing code. Use after the spec is agreed and before implementation, especially for multi-file or multi-session work.
---

# plan

The plan exists so that work can stop and resume without loss, and so that
wrong turns are cheap.

## Do this

1. **Read the spec.** The plan must cite it and must cover every acceptance
   criterion. Any criterion with no step is a hole.
2. **Order steps so each one leaves the tree green.** After every step,
   `scripts/check.sh` should pass. If a step cannot, split it.
3. **Make each step independently verifiable.** State the check inline:
   the command to run, the file to inspect, the behaviour to try.
4. **Front-load the risky and the unknown.** Do the step that could invalidate
   the design first, not last.
5. **Mark parallelisable steps.** Independent steps can be delegated to
   subagents simultaneously; dependent ones cannot.
6. **Keep steps to roughly 15–45 minutes.** Bigger means the plan is hiding a
   decision; smaller means you are writing a transcript.

## Output

`docs/plans/<slug>.md`:

```markdown
# Plan: <title>
**Spec:** docs/specs/<slug>.md

## Steps
- [ ] 1. <action> — files: `<paths>` — verify: `<command or observation>`
- [ ] 2. …  *(parallel with 3)*

## Rollback
How to undo this if it goes wrong.

## Open decisions
- <decision> — resolve by <step N>
```

Keep the checkboxes updated **as you go**, in the file. The plan file is the
handoff: it must be true at every moment, not just at the end.
