---
name: ship
description: Land verified work — commit with a message that explains why, and hand off so a human or a fresh agent can pick it up. Use once verification is green.
---

# ship

## Gate

Do not ship unless: `scripts/check.sh` is green, every acceptance criterion has
evidence, and the diff contains nothing the plan did not call for.

## Commit

- One commit per coherent change. Not one per file, not one per session.
- Subject: imperative, under 72 characters, no trailing period.
  `fix: reject CSV rows with a bad delimiter` — not `fixed some csv stuff`.
- Body: **why**, not what. The diff already says what. Explain the reason the
  change exists and anything a reader would otherwise have to guess.
- Reference the spec: `Spec: docs/specs/<slug>.md`.
- NEVER commit secrets, `.env` files, credentials, or large binaries. Check
  `git diff --cached --name-only` before every commit.

## Remember where you are

This is an ephemeral space. **Committing is not saving.** When the space is
destroyed, its git history goes with it unless the work left the space:

- push to a remote, or
- `abox leave --keep` to keep the space on disk, or
- copy the result out from the host side.

Say which one applies in your handoff. An agent that reports "committed" and
lets the human destroy the space has lost the work.

## Handoff

```markdown
## Shipped: <title>
**What changed:** one paragraph.
**Why:** one paragraph.
**Verified by:** <commands run, evidence>
**Not done / follow-ups:** …
**To keep this work:** <push target / --keep / copy path>
```
