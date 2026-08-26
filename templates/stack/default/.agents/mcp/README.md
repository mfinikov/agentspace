# mcp

MCP servers give agents in this space extra tools. Copy
`servers.example.json` to `servers.json` and edit.

Two rules that matter inside an agentspace:

1. **An MCP server is a hole in the sandbox.** A server that reaches the
   filesystem, the network, or a remote API extends the agent's reach past this
   container. Add one deliberately, and only for the tools the task needs.
2. **Secrets come in as environment variables**, never in the JSON. Forward
   them from the host with `abox new --env KEY`, and never commit
   `servers.json` if it ends up containing one.
