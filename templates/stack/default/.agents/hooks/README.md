# hooks

Shell commands the agent harness runs on lifecycle events. Keep them fast
(they run in the critical path) and make them fail loudly.

`example-block-secrets.sh` in this folder refuses to let a commit through if it
contains something that looks like a credential. Wire it up as a pre-commit or
pre-tool hook in your harness's settings.
