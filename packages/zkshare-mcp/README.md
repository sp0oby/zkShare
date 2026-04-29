# `zkshare-mcp`

Stdio [Model Context Protocol](https://modelcontextprotocol.io/) server for **[ZKshare](https://zkshare.io)**. It forwards tool calls to `POST /api/v1/context` with your API key.

## Install (end users — no repo clone)

Needs **Node.js ≥ 18**.

```bash
npx -y zkshare-mcp
```

That command is usually run **by your IDE** (Cursor, etc.) — you only set env and the process path in MCP settings.

## Env

| Variable | Required | Description |
|----------|----------|----------------|
| `ZKSHARE_API_KEY` | Yes | From [zkshare.io/api-key](https://zkshare.io/api-key) |
| `ZKSHARE_API_URL` | No | Default `https://zkshare.io`. Use `http://localhost:3000` only when targeting a self-hosted Next app. |

## Cursor `~/.cursor/mcp.json`

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

On Windows, `npx` is available if Node is installed (`npx.cmd`).

## Develop in this monorepo

From the repository root:

```bash
pnpm install
pnpm run build:mcp
pnpm mcp
```

## Publish to npm

Owners: from `packages/zkshare-mcp` after `pnpm run build`:

```bash
npm publish --access public
```

Bump `package.json` **version** and `src/version.ts` **VERSION** together before releases.
