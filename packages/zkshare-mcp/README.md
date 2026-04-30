# `zkshare-mcp`

Published on [npm](https://www.npmjs.com/package/zkshare-mcp). Stdio [Model Context Protocol](https://modelcontextprotocol.io/) server for **[ZKshare](https://zkshare.io)** — forwards tool calls to `POST /api/v1/context` with your API key.

**Registry name:** [`io.github.sp0oby/zkshare`](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.sp0oby/zkshare) on the official [Model Context Protocol Registry](https://github.com/modelcontextprotocol/registry) preview (verification field `mcpName` in [`package.json`](./package.json) must stay identical to the `name` field in [`server.json`](./server.json)).

## MCP Registry (`registry.modelcontextprotocol.io`)

ZKshare participates in (or prepares for) discovery via the **[official MCP Registry](https://github.com/modelcontextprotocol/registry)** preview. Metadata lives in **`server.json`** next to this package; the runnable artifact stays on npm.

Having **`zkshare-mcp`** on npm (e.g. v1.0.0) is only half the story: the registry **checks the tarball’s `package.json` for **`mcpName`** — that field was added in repo for **v1.0.1**. Until **1.0.1** is published to npm, `mcp-publisher publish` may fail verification. **`npx -y zkshare-mcp@1.0.0`** continues to work unchanged for users already on npm.

### One-time prerequisites

1. [npm account](https://www.npmjs.com) with publish rights to **`zkshare-mcp`**.
2. [GitHub account](https://github.com/login) (**`sp0oby`**) matching the `io.github.sp0oby/…` namespace when using **GitHub device login**.
3. Install the publisher CLI ([quickstart](https://github.com/modelcontextprotocol/registry/blob/main/docs/modelcontextprotocol-io/quickstart.mdx)).

### Publish flow (maintainers)

1. **Align versions** — bump `"version"` in `package.json`, `src/version.ts`, and the `version` fields in **`server.json`** together.
2. **Build & publish npm** — from this directory:
   - `pnpm install && pnpm run build`
   - `npm publish --access public` (`prepublishOnly` runs `pnpm run build`).
3. **Registry** — install `mcp-publisher`, then from **`packages/zkshare-mcp/`**:
   - `mcp-publisher login github` — device flow; GitHub user must match the namespace (**`sp0oby`**).
   - `mcp-publisher publish` — uploads `server.json` (omit if you intentionally only ship npm).

### Verify after publish

```bash
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.sp0oby/zkshare"
```

If **`mcp-publisher`** errors on validation, confirm `description` stays **≤100 characters** (registry JSON schema).

### Alternate namespaces

To use DNS or another auth method instead of **`io.github.sp0oby`** — change **`mcpName`**, **`server.json` → `name`**, and redo ownership verification — see registry docs on [authentication](https://github.com/modelcontextprotocol/registry/tree/main/docs) and DNS in the same docs tree.

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
