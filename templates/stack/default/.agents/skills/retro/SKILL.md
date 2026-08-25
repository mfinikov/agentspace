---
name: retro
description: Record what actually happened after a task so the next agent starts smarter — surprises, dead ends, and reusable facts. Use at the end of a task or session, and after any bug that took more than one attempt to fix.
---

# retro

Context dies with the session. The journal is the only thing that does not.

## Do this

Append to `notes/journal.md`. Be brief and specific; a retro nobody reads is
wasted, and generalities are unreadable.

```markdown
## <YYYY-MM-DD> — <task>
**Outcome:** shipped | partial | abandoned
**Surprised me:** the thing that was not what I expected.
**Cost me time:** the dead end, and the signal that should have warned me.
**Reusable:** the fact worth knowing next time (command, gotcha, file path).
**Next:** what the next agent should pick up.
```

## Promote what deserves promoting

- A recurring gotcha → a line in `AGENTS.md`.
- An irreversible choice and its reasoning → an ADR in `docs/decisions/`.
- A repeated procedure → a new skill under `.agents/skills/`.
- A fact about the outside world → `docs/research/`.

## Be honest

Record the failures, not just the wins. "I assumed the API returned an array;
it returns `{data: [...]}`, and I lost 40 minutes" is the single most valuable
sentence you can leave behind.
