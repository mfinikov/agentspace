# skills

One folder per skill, each holding a `SKILL.md`:

```markdown
---
name: <name>
description: What it does and WHEN to use it — the description is all an agent
  sees when deciding whether to load it, so put the trigger conditions here.
---

# <name>
Imperative steps, not essays. Under ~150 lines.
```

`.claude/skills` symlinks here, so Claude Code reads the same definitions.
