---
name: write-spec
description: Write the spec that says what is being built and how anyone can tell it works. Use after framing, before planning, for any change touching more than one file or lasting more than an hour.
---

# write-spec

A spec is not documentation. It is the agreement that lets a different agent
finish your work and lets a reviewer tell whether it is done.

## Do this

1. **One spec per user-visible outcome.** If you need "and" in the title,
   you probably need two specs.
2. **Write acceptance criteria as checks, not adjectives.** Every criterion
   must be something a person or a script can evaluate to true/false.
   - Bad: "the importer should be fast and robust"
   - Good: "importing `fixtures/50mb.csv` completes in under 30s and rejects
     malformed rows with the row number in the error"
3. **Describe behaviour, not implementation.** The plan chooses the how.
4. **Enumerate the edge cases you know of** — empty input, duplicate input,
   concurrent callers, the failure of every external call.
5. **State what will NOT change**: public APIs, on-disk formats, existing
   behaviour that must survive.

## Output

`docs/specs/<slug>.md`:

```markdown
# <title>

**Status:** draft | agreed | built | shipped
**Frame:** <link to the frame, or inline it>

## Behaviour
What the system does after this change, from the outside.

## Acceptance criteria
- [ ] <observable check>
- [ ] <observable check>

## Edge cases
| Case | Expected |
|------|----------|
|      |          |

## Non-goals
- …

## Risks
- <risk> → <mitigation>
```

Do not start building until the acceptance criteria are written. They are the
only thing that makes `verify` possible.
