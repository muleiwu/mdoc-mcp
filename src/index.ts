#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { createClientFromEnv } from './client.js';
import { getManifest } from './tools/get-manifest.js';
import { getArticleContent } from './tools/get-article-content.js';

const server = new McpServer({
  name: 'mdoc-mcp',
  version: '0.1.0',
});

// Tool: get_manifest
server.registerTool(
  'get_manifest',
  {
    title: '获取文档目录清单',
    description:
      '获取 mdoc 文档的目录清单（Markdown 格式），包含所有文章的标题和链接。' +
      '可以通过 mdoc.cc 网址或 orgSlug/docSlug 参数指定文档。' +
      '示例网址格式：https://mdoc.cc/mliev/1ms 或 https://mdoc.cc/mliev/1ms/v1.0.0',
    inputSchema: {
      url: z
        .string()
        .optional()
        .describe(
          'mdoc 文档网址，如 https://mdoc.cc/mliev/1ms 或 https://mdoc.cc/mliev/1ms/v1.0.0。' +
          '提供 url 时，orgSlug 和 docSlug 可省略。'
        ),
      orgSlug: z
        .string()
        .optional()
        .describe('组织标识，如 mliev。当未提供 url 时必填。'),
      docSlug: z
        .string()
        .optional()
        .describe('文档标识，如 1ms。当未提供 url 时必填。'),
      version: z
        .string()
        .optional()
        .describe('版本名称，如 v1.0.0。不指定则使用文档默认版本。'),
    },
  },
  async (args) => {
    try {
      const client = createClientFromEnv();
      const content = await getManifest(client, args);
      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `错误: ${message}` }],
        isError: true,
      };
    }
  }
);

// Tool: get_article_content
server.registerTool(
  'get_article_content',
  {
    title: '获取文章内容',
    description:
      '获取 mdoc 文档中某篇文章的原始 Markdown 内容。' +
      '可通过 mdoc.cc 网址（含 articleId）、manifest 返回的 content.md 链接，' +
      '或 orgSlug/docSlug/articleId 参数指定文章。' +
      '示例网址格式：https://mdoc.cc/mliev/1ms/v1.0.0/16',
    inputSchema: {
      url: z
        .string()
        .optional()
        .describe(
          '文章网址，支持两种格式：\n' +
          '1. mdoc.cc 网址：https://mdoc.cc/mliev/1ms/v1.0.0/16\n' +
          '2. manifest 中返回的 content.md API 链接，如 ' +
          'https://mdoc.cc/openapi/organizations/mliev/documents/1ms/articles/16/content.md'
        ),
      orgSlug: z
        .string()
        .optional()
        .describe('组织标识，如 mliev。当未提供 url 时必填。'),
      docSlug: z
        .string()
        .optional()
        .describe('文档标识，如 1ms。当未提供 url 时必填。'),
      articleId: z
        .string()
        .optional()
        .describe('文章 ID，如 16。当未提供 url 时必填。'),
      version: z
        .string()
        .optional()
        .describe('版本名称，如 v1.0.0。不指定则使用文档默认版本。'),
    },
  },
  async (args) => {
    try {
      const client = createClientFromEnv();
      const content = await getArticleContent(client, args);
      return {
        content: [{ type: 'text', text: content }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `错误: ${message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // 使用 stderr 避免干扰 stdio 传输协议
  process.stderr.write('mdoc MCP server 已启动（stdio 模式）\n');
}

main().catch((error) => {
  process.stderr.write(`启动失败: ${error}\n`);
  process.exit(1);
});
