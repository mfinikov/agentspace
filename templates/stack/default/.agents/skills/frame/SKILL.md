---
name: frame
description: Turn a vague request into a sharp, falsifiable problem statement before any work starts. Use at the very start of a task, whenever the goal is stated as a solution rather than a problem, or when you notice you are about to guess.
---

# frame

You cannot solve a problem you have not stated. Framing costs two minutes and
routinely saves an hour of building the wrong thing.

## Do this

1. **Restate the request in one paragraph** in your own words. If you cannot,
   you do not understand it yet — ask.
2. **Name the actual user and the actual pain.** Who is blocked right now, and
   by what? "Users want X" is not a pain; "importing a 50MB CSV times out" is.
3. **Separate the problem from the proposed solution.** Requests usually arrive
   as solutions. Ask what the solution is *for*, and keep the answer.
4. **Write down what is out of scope.** Two or three items, explicitly.
5. **State the done condition** as something observable: a command that exits
   zero, a number that moves, a behaviour a human can check.
6. **List your assumptions.** Anything you would have to guess. Each one is a
   risk; mark the ones that would invalidate the whole plan if wrong.

## Ask, do not guess, when

- Two readings of the request lead to materially different builds.
- Proceeding on the wrong assumption would waste more than ~20 minutes.
- The change is hard to reverse.

Otherwise pick the most reasonable reading, **state it explicitly**, and move.

## Output

Append to the task note (or open `docs/specs/<slug>.md` if this is heading
straight for a spec):

```markdown
## Frame
**Problem:** …
**Who is blocked:** …
**Done when:** …
**Out of scope:** …
**Assumptions:** …
```

Then move to `research` if you lack facts, or `write-spec` if you do not.
