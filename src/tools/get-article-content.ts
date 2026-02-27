import { MdocClient } from '../client.js';
import { parseMdocUrl } from '../url-parser.js';

export interface GetArticleContentInput {
  url?: string;
  orgSlug?: string;
  docSlug?: string;
  articleId?: string;
  version?: string;
}

/**
 * 获取文章的原始 Markdown 内容
 * 对应 API: GET /openapi/organizations/:orgSlug/documents/:docSlug/articles/:articleId/content.md
 *
 * url 参数支持两种格式：
 * 1. mdoc.cc 网址: https://mdoc.cc/:orgSlug/:docSlug/:version/:articleId
 * 2. API content URL: .../openapi/organizations/.../articles/:articleId/content.md
 */
export async function getArticleContent(
  client: MdocClient,
  input: GetArticleContentInput
): Promise<string> {
  let orgSlug: string;
  let docSlug: string;
  let articleId: string;
  let version: string | undefined = input.version;

  if (input.url) {
    const parsed = parseMdocUrl(input.url);

    if (!parsed.articleId) {
      throw new Error(
        `无法从 URL 中解析出 articleId，请确认 URL 格式正确（如 https://mdoc.cc/org/doc/v1.0.0/16），` +
        `或单独提供 orgSlug、docSlug 和 articleId 参数`
      );
    }

    orgSlug = parsed.orgSlug;
    docSlug = parsed.docSlug;
    articleId = parsed.articleId;
    if (!version && parsed.version) {
      version = parsed.version;
    }
  } else if (input.orgSlug && input.docSlug && input.articleId) {
    orgSlug = input.orgSlug;
    docSlug = input.docSlug;
    articleId = input.articleId;
  } else {
    throw new Error(
      '请提供 url 参数，或同时提供 orgSlug、docSlug 和 articleId 参数'
    );
  }

  const path =
    `/openapi/organizations/${encodeURIComponent(orgSlug)}` +
    `/documents/${encodeURIComponent(docSlug)}` +
    `/articles/${encodeURIComponent(articleId)}/content.md`;

  const query: Record<string, string> = {};
  if (version) {
    query['version'] = version;
  }

  return client.get({ path, query });
}
