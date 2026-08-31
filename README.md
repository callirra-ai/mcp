# @callirra/mcp

MCP server for Callirra — lets Claude Code, Cursor, Codex and other MCP-compatible agents discover models, generate images/videos, upload references, poll tasks and check balances.

## Configure

```bash
export CALLIRRA_API_KEY=sk-cal-xxxxxxxxxxxxxxxx
```

Optional:

```bash
export CALLIRRA_API_BASE=https://api.callirra.com
```

## Run with MCP clients

```bash
callirra-mcp
```

For Claude Code / Cursor / Codex, configure the server command to run `callirra-mcp` with the API key in its environment.

## Available tools

- `list_models`
- `get_balance`
- `get_usage`
- `generate_image`
- `create_video`
- `get_task`
- `cancel_task`
- `upload_media`
- `list_prompt_templates`
- `enhance_prompt`
- `get_creative_knowledge`

Each tool reports errors in `isError` responses so agents can handle failures gracefully.

---

→ Start free at [callirra.com](https://callirra.com?utm_source=github-mcp)
