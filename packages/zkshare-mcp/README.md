# `zkshare-mcp`

Published on [npm](https://www.npmjs.com/package/zkshare-mcp). Stdio [Model Context Protocol](https://modelcontextprotocol.io/) server for **[ZKshare](https://zkshare.io)** — forwards tool calls to `POST /api/v1/context` with your API key.

## Use (no repo clone)

Needs **Node.js ≥ 18**.

```bash
npx -y zkshare-mcp
```

Your IDE normally runs this; set env in MCP settings.

### Env

| Variable | Required | Description |
|----------|----------|-------------|
| `ZKSHARE_API_KEY` | Yes | From [zkshare.io/api-key](https://zkshare.io/api-key) |
| `ZKSHARE_API_URL` | No | Default `https://zkshare.io`. Use `http://localhost:3000` only for a self-hosted API. |

### Cursor `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "zkshare": {
      "command": "npx",
      "args": ["-y", "zkshare-mcp"],
      "env": {
        "ZKSHARE_API_KEY": "zk_live_YOUR_KEY_HERE",
        "ZKSHARE_API_URL": "https://zkshare.io"
      }
    }
  }
}
```

On Windows, `npx` ships with Node (`npx.cmd`).

## Develop in the zkShare repo

```bash
pnpm install
pnpm mcp
```

Source: `src/cli.ts`. Version is duplicated in `package.json` and `src/version.ts` for maintainers’ release bumps.
