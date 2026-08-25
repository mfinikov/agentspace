---
name: verify
description: Prove the change does what the spec promised and did not break anything else, by running things and reading output. Use before shipping, and any time you are about to say "done".
---

# verify

Verification is adversarial. Your job is to break your own work before someone
else does.

## Do this

1. **Run `bash scripts/check.sh`.** Paste the real output. A summary of output
   is not output.
2. **Walk the acceptance criteria one by one.** For each, name the concrete
   evidence: the test that covers it, the command you ran, the value you saw.
   A criterion with no evidence is not met.
3. **Try to break it.** Empty input, huge input, wrong types, missing file,
   no network, two callers at once, a second run over the first run's output.
4. **Check the blast radius.** `git diff --stat`. For every file touched that
   the plan did not mention, explain why.
5. **Re-read the diff as a hostile reviewer.** Look for: swallowed errors,
   off-by-one, unhandled null, resource leaks, secrets, changed defaults,
   silently loosened validation.
6. **Delegate a second opinion** to `.agents/subagents/reviewer.md` for
   anything security-sensitive or hard to reverse. Ask it to refute, not to
   confirm.

## Output

```markdown
## Verify: <slug>
- check.sh: <pass/fail> — <paste key lines>
- [x] <criterion> — evidence: <what you ran / saw>
- [ ] <criterion> — NOT MET: <why>

### Found
- <bug or risk> → filed as <plan step / issue>
```

If something is not met, say so plainly and stop. Shipping a known-broken
change because the deadline is near is never your call to make.
