---
name: research
description: Gather external facts before deciding — library APIs, prior art, protocol details, error causes. Use whenever a decision depends on something you would otherwise recall from memory, or when a library or API version matters.
---

# research

Memory of an API is a guess. Treat it as one.

## Do this

1. **Write the question first**, precisely, at the top of the note. Vague
   questions produce vague research.
2. **Prefer primary sources**: the project's own docs, the source code in
   `node_modules/` or the installed package, the RFC, the changelog. Blog posts
   are leads, not evidence.
3. **Check the version you actually have.** `cat node_modules/<pkg>/package.json`
   or `pip show <pkg>` before trusting any documentation page.
4. **Read the code when the docs are ambiguous.** The implementation is the
   only source that cannot be out of date.
5. **Collect at least two independent sources** for anything load-bearing.
6. **Record what you could NOT establish.** Unknowns are findings.

## Output

Write `docs/research/<topic>.md`:

```markdown
# <topic>

**Question:** …
**Date:** <YYYY-MM-DD>
**Verdict:** the two-sentence answer.

## Findings
- <claim> — source: <url or path>, version <x.y.z>

## Open questions
- …

## Implications for this space
- …
```

Cite every claim. A finding without a source is an opinion, and future agents
have no way to tell the difference.
