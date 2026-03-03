import { MdocClient } from '../client.js';
import { parseMdocUrl } from '../url-parser.js';

export interface SearchInDocumentInput {
  url?: string;
  orgSlug?: string;
  docSlug?: string;
  version?: string;
  query: string;
  topK?: number;
  minScore?: number;
}

interface SearchArticleResult {
  article_id: number;
  title: string;
  score: number;
  content: string;
  markdown_url: string;
  browser_url: string;
}

interface SearchApiResponse {
  code: number;
  message: string;
  data?: {
    results: SearchArticleResult[];
    total: number;
  };
}

/**
 * 在文档中进行语义搜索
 * 对应 API: GET /openapi/organizations/:orgSlug/documents/:docSlug/search
 */
export async function searchInDocument(
  client: MdocClient,
  input: SearchInDocumentInput
): Promise<string> {
  let orgSlug: string;
  let docSlug: string;
  let version: string | undefined = input.version;

  if (input.url) {
    const parsed = parseMdocUrl(input.url);
    orgSlug = parsed.orgSlug;
    docSlug = parsed.docSlug;
    if (!version && parsed.version) {
      version = parsed.version;
    }
  } else if (input.orgSlug && input.docSlug) {
    orgSlug = input.orgSlug;
    docSlug = input.docSlug;
  } else {
    throw new Error('请提供 url 参数，或同时提供 orgSlug 和 docSlug 参数');
  }

  if (!input.query) {
    throw new Error('请提供 query 参数（搜索关键词）');
  }

  const path = `/openapi/organizations/${encodeURIComponent(orgSlug)}/documents/${encodeURIComponent(docSlug)}/search`;
  const query: Record<string, string> = {
    q: input.query,
  };
  if (version) {
    query['version'] = version;
  }
  if (input.topK !== undefined) {
    query['top_k'] = String(input.topK);
  }
  if (input.minScore !== undefined) {
    query['min_score'] = String(input.minScore);
  }

  const raw = await client.get({ path, query });

  let resp: SearchApiResponse;
  try {
    resp = JSON.parse(raw);
  } catch {
    throw new Error(`无法解析搜索响应: ${raw.slice(0, 200)}`);
  }

  if (resp.code !== 0) {
    throw new Error(`搜索失败: ${resp.message}`);
  }

  const data = resp.data;
  if (!data || data.results.length === 0) {
    return `未找到与「${input.query}」相关的文章。`;
  }

  const lines: string[] = [
    `共找到 ${data.total} 篇相关文章：`,
    '',
  ];

  for (const result of data.results) {
    lines.push(`### ${result.title}`);
    lines.push(`- 相关度: ${(result.score * 100).toFixed(1)}%`);
    lines.push(`- 文章 ID: ${result.article_id}`);
    if (result.content) {
      lines.push(`- 摘要: ${result.content}`);
    }
    lines.push(`- Markdown 全文 (需携带 token 调用，仅限 API 访问): ${result.markdown_url}`);
    lines.push(`- 浏览器链接: ${result.browser_url}`);
    lines.push('');
  }

  return lines.join('\n');
}
