# docs

The memory of this space. Agents lose their context; these files do not.

| Folder       | Holds | Written by |
|--------------|-------|------------|
| `specs/`     | what we are building and how we will know it works | `write-spec` |
| `plans/`     | ordered, verifiable steps for one spec | `plan` |
| `decisions/` | ADRs — the calls that are expensive to reverse | `architect` |
| `research/`  | external facts, with sources and versions | `research` |

A fresh agent should be able to read this folder and resume the work without
asking anything. If that is not true, the documents are stale — fix them before
continuing.
