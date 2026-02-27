English | [简体中文](README.zh-CN.md)

# mdoc-mcp

An MCP (Model Context Protocol) Server for [mdoc](https://mdoc.cc), enabling AI to directly read the table of contents and article content from mdoc documentation.

## Features

- **`get_manifest`** — Retrieve the document manifest (Markdown format), including the hierarchical structure and links of all articles
- **`get_article_content`** — Retrieve the raw Markdown content of an article

## Installation & Configuration

### 1. Clone and Build

```bash
git clone https://github.com/muleiwu/mdoc-mcp.git
cd mdoc-mcp
npm install
npm run build
```

### 2. Configure API Key

Create an API Key on the [mdoc](https://mdoc.cc) user settings page to obtain your `AccessKeyID` and `SecretAccessKey`.

Authentication uses the AWS Signature Version 4 protocol, fully compatible with the server.

### 3. Configure in Cursor / Claude Desktop

Edit the MCP configuration file (e.g. `~/.cursor/mcp.json` or the Claude Desktop config) and add:

```json
{
  "mcpServers": {
    "mdoc": {
      "command": "npx",
      "args": [
        "-y",
        "@muleiwu/mdoc-mcp"
      ],
      "env": {
        "MDOC_ACCESS_KEY_ID": "your_access_key_id",
        "MDOC_SECRET_ACCESS_KEY": "your_secret_access_key"
      }
    }
  }
}
```

For a self-hosted mdoc instance, additionally add:

```json
"MDOC_API_BASE_URL": "https://your-mdoc-instance.com"
```

## Tools

### `get_manifest` — Get Document Manifest

Retrieves the full table of contents for a document. AI can use this to understand the document structure and select articles to read.

**Parameters** (provide either `url` or `orgSlug` + `docSlug`):

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string (optional) | mdoc URL, e.g. `https://mdoc.cc/mliev/1ms` or with version `https://mdoc.cc/mliev/1ms/v1.0.0` |
| `orgSlug` | string (optional) | Organization identifier, e.g. `mliev` |
| `docSlug` | string (optional) | Document identifier, e.g. `1ms` |
| `version` | string (optional) | Version name, e.g. `v1.0.0`. Uses the default version if not specified. |

**Returns**: The document table of contents in Markdown format, including article links (usable directly with `get_article_content`)

### `get_article_content` — Get Article Content

Retrieves the raw Markdown content of a specified article.

**Parameters** (provide either `url` or `orgSlug` + `docSlug` + `articleId`):

| Parameter | Type | Description |
|-----------|------|-------------|
| `url` | string (optional) | Article URL or a content.md link from the manifest |
| `orgSlug` | string (optional) | Organization identifier |
| `docSlug` | string (optional) | Document identifier |
| `articleId` | string (optional) | Article ID |
| `version` | string (optional) | Version name |

Supported `url` formats:
- `https://mdoc.cc/mliev/1ms/v1.0.0/16` (mdoc URL where the 4th segment is the articleId)
- `https://mdoc.cc/openapi/organizations/mliev/documents/1ms/articles/16/content.md` (API link returned by the manifest)

## Typical Workflow

1. AI calls `get_manifest` to retrieve the document table of contents
2. Locate the relevant article link from the manifest
3. AI calls `get_article_content` to read the specific article content

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MDOC_ACCESS_KEY_ID` | Yes | — | Access Key ID of the API Key |
| `MDOC_SECRET_ACCESS_KEY` | Yes | — | Secret Access Key of the API Key |
| `MDOC_API_BASE_URL` | No | `https://mdoc.cc` | API base URL (for self-hosted instances) |

## License

MIT
