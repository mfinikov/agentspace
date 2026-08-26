# AGENTS.md

You are working in an **agentspace**: a disposable container. `/workspace` is
the only thing shared with the human's machine, and the only thing that
survives. Everything else is thrown away when the space is destroyed.

## Rules

1. **YOU MUST keep durable work inside `/workspace`.** Files written anywhere
   else are unrecoverable.
2. **Write state to disk, not to your context.** Notes in `docs/`. A fresh
   agent must be able to resume from the files alone.
3. **NEVER fabricate a result.** If a command failed, say so and paste the
   output.
4. **Verify before you claim.** "Done" means you ran the check and read it.
5. **Smallest change that fully solves the problem.** No opportunistic
   refactors, no placeholders, no `TODO` left behind.
6. **NEVER print, log or commit a credential** forwarded into this space.

## Commands

```
bash scripts/check.sh    lint + typecheck + test — the gate before "done"
apen status            this space's isolation settings
apen leave             destroy the space and return to the host
```

Committing is not saving: `apen leave` deletes the git history with
everything else. Push to a remote, or use `apen leave --keep`.

Add skills under `.agents/skills/<name>/SKILL.md` when you have done the same
procedure twice. For the full phase-based stack, create a space without
`--stack minimal`.
