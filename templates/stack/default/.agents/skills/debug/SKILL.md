---
name: debug
description: Find the actual cause of a failure instead of guessing at fixes. Use when something is broken, when a fix did not work, or when you are about to change code you do not understand.
---

# debug

The rule: **do not change anything until you can explain the failure.** Every
guess-and-check cycle costs time and adds noise to the diff.

## Do this

1. **Reproduce it deterministically.** A bug you cannot reproduce on demand is
   a bug you cannot verify you fixed. Write the smallest command that fails.
2. **Read the whole error.** The full stack trace, not the last line. The first
   frame in *your* code is usually the answer.
3. **Bisect the distance between "works" and "fails."** By commit
   (`git bisect`), by input size, by config flag, by commenting out half.
4. **State a hypothesis that predicts something.** "If X is the cause, then Y
   will be true." Then check Y. If Y is false, the hypothesis is dead — do not
   patch it, replace it.
5. **Instrument before you edit.** Print the actual value. Assumed values are
   where bugs live.
6. **Fix the cause, not the symptom.** A `try/except` around a crash is a
   symptom fix unless you can say why the exception is expected.

## When stuck after three hypotheses

Stop and write down: what you know for certain, what you assumed, and what you
have not checked. The unchecked assumption is almost always the bug. Then
delegate a fresh read to `.agents/subagents/researcher.md` — someone without
your assumptions.

## After the fix

Add the regression test that would have caught it. A bug fixed without a test
is a bug scheduled to return. Then record it in `notes/journal.md` via `retro`.
