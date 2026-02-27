[English](README.md) | 简体中文

# mdoc-mcp

[mdoc](https://mdoc.cc) 的 MCP (Model Context Protocol) Server，让 AI 能够直接读取 mdoc 文档的目录结构和文章内容。

## 功能

- **`get_manifest`** — 获取文档目录清单（Markdown 格式），包含所有文章的层级结构和链接
- **`get_article_content`** — 获取文章的原始 Markdown 内容

## 安装与配置

### 1. 克隆并构建

```bash
git clone https://github.com/muleiwu/mdoc-mcp.git
cd mdoc-mcp
npm install
npm run build
```

### 2. 配置 API Key

在 [mdoc](https://mdoc.cc) 用户设置页面创建 API Key，获取 `AccessKeyID` 和 `SecretAccessKey`。

鉴权使用 AWS Signature Version 4 协议，与服务端完全兼容。

### 3. 在 Cursor / Claude Desktop 中配置

编辑 MCP 配置文件（如 `~/.cursor/mcp.json` 或 Claude Desktop 的配置），添加：

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

如果使用私有部署的 mdoc，额外添加：

```json
"MDOC_API_BASE_URL": "https://your-mdoc-instance.com"
```

## 工具说明

### `get_manifest` — 获取文档目录

获取文档的完整目录清单，AI 可据此了解文档结构并选择要读取的文章。

**参数**（提供 `url` 或 `orgSlug` + `docSlug` 之一）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | string (可选) | mdoc 网址，如 `https://mdoc.cc/mliev/1ms` 或带版本 `https://mdoc.cc/mliev/1ms/v1.0.0` |
| `orgSlug` | string (可选) | 组织标识，如 `mliev` |
| `docSlug` | string (可选) | 文档标识，如 `1ms` |
| `version` | string (可选) | 版本名称，如 `v1.0.0`，不指定则使用默认版本 |

**返回**：Markdown 格式的文档目录，包含文章链接（可直接用于 `get_article_content`）

### `get_article_content` — 获取文章内容

获取指定文章的原始 Markdown 内容。

**参数**（提供 `url` 或 `orgSlug` + `docSlug` + `articleId` 之一）：

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | string (可选) | 网址或 manifest 中的 content.md 链接 |
| `orgSlug` | string (可选) | 组织标识 |
| `docSlug` | string (可选) | 文档标识 |
| `articleId` | string (可选) | 文章 ID |
| `version` | string (可选) | 版本名称 |

支持的 `url` 格式：
- `https://mdoc.cc/mliev/1ms/v1.0.0/16`（mdoc 网址，第 4 段为 articleId）
- `https://mdoc.cc/openapi/organizations/mliev/documents/1ms/articles/16/content.md`（manifest 返回的 API 链接）

## 典型使用流程

1. AI 调用 `get_manifest` 获取文档目录
2. 从目录中找到相关文章的链接
3. AI 调用 `get_article_content` 读取具体文章内容

## 环境变量

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `MDOC_ACCESS_KEY_ID` | 是 | — | API Key 的 Access Key ID |
| `MDOC_SECRET_ACCESS_KEY` | 是 | — | API Key 的 Secret Access Key |
| `MDOC_API_BASE_URL` | 否 | `https://mdoc.cc` | API 基础地址（私有部署时使用） |

## License

MIT
