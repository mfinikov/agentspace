# .agents

Everything that configures the agents working in this space.

| Folder       | What lives here | Loaded by |
|--------------|-----------------|-----------|
| `skills/`    | One folder per skill, each with a `SKILL.md` describing *how* to do a kind of work | auto, by description match |
| `subagents/` | Role personas with their own system prompt and tools | on delegation |
| `commands/`  | Slash commands — canned prompts you invoke by name | on `/name` |
| `hooks/`     | Shell hooks fired on agent lifecycle events | by the harness |
| `mcp/`       | MCP server configuration | at startup |

`.claude/` symlinks `skills`, `agents` and `commands` back here, so Claude Code
and any AGENTS.md-native tool read the same definitions. Edit these files, not
the symlinks.

## Adding a skill

```
.agents/skills/<name>/SKILL.md
```

```markdown
---
name: <name>
description: What it does, and — critically — WHEN to use it. The description
  is the only thing an agent sees when deciding whether to load the skill, so
  write the trigger conditions into it.
---

# <name>
Imperative instructions. Steps, not essays. Under ~150 lines.
```

Add a skill when you have done the same procedure twice. Promote gotchas from
`notes/journal.md` into skills — that is how this space gets smarter.
