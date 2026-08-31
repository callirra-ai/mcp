# @callirra/mcp

MCP server for Callirra — lets Claude Code, Cursor, Codex and other MCP-compatible agents discover models, generate images/videos, use Prompt Studio, upload references, poll tasks and check balances.

## Requirements

- Node.js 22+
- A Callirra API key (`sk-cal-...`)

## Install

```bash
npm install -g @callirra/mcp
```

Get an API key at [callirra.com](https://callirra.com?utm_source=github-mcp).

## Configure

```bash
export CALLIRRA_API_KEY=sk-cal-xxxxxxxxxxxxxxxx
```

Optional:

```bash
export CALLIRRA_API_BASE=https://api.callirra.com
```

## Run

```bash
callirra-mcp
```

### Claude Code

Add the MCP server to your Claude Code config with:

```json
{
  "mcpServers": {
    "callirra": {
      "command": "callirra-mcp",
      "env": {
        "CALLIRRA_API_KEY": "sk-cal-xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Cursor / Codex

Use the same `callirra-mcp` command as the MCP server entry and pass `CALLIRRA_API_KEY` in the environment.

## Available tools

| Tool | Purpose |
|---|---|
| `list_models` | List available image/video models |
| `get_balance` | Check credits and available balance |
| `get_usage` | Show recent usage |
| `generate_image` | Generate an image |
| `create_video` | Create an async video task |
| `get_task` | Get task status |
| `cancel_task` | Cancel task |
| `upload_media` | Upload a reference image |
| `list_prompt_templates` | List Prompt Studio templates |
| `enhance_prompt` | Enhance an idea with a built-in template |
| `get_creative_knowledge` | Get the full curated creative knowledge base |

Each tool returns `isError` responses on failures so agents can handle errors gracefully.

## License

MIT. Source: [github.com/callirra-ai/mcp](https://github.com/callirra-ai/mcp?utm_source=github-mcp)

---

→ Start free at [callirra.com](https://callirra.com?utm_source=github-mcp)
