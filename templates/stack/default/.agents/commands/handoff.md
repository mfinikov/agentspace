---
description: Write a handoff so a fresh agent (or a human) can resume this work with zero context.
---

Write a handoff to `notes/handoff.md`, overwriting the previous one.

Assume the reader knows nothing about this session and cannot ask you anything.
Give file paths, not descriptions of files.

```markdown
# Handoff — <YYYY-MM-DD>

## Goal
One paragraph: what we are trying to achieve and why.

## State
What works right now. What does not. What is half-built and where.

## Files that matter
- `<path>` — why it matters

## Next action
The single next thing to do, concretely enough to start without deciding.

## Landmines
Things that look fine and are not. Dead ends already tried — do not retry them.

## Getting this work out
This space is ephemeral. To keep it: <push target / `apen leave --keep` /
copy path>.
```

Then run `bash scripts/check.sh` and record its result in the handoff, so the
next agent knows whether they are starting from green.
