/**
 * mdoc URL 解析器
 *
 * 支持以下格式：
 * 1. mdoc.cc 网站 URL:
 *    - https://mdoc.cc/:orgSlug/:docSlug
 *    - https://mdoc.cc/:orgSlug/:docSlug/:version
 *    - https://mdoc.cc/:orgSlug/:docSlug/:version/:articleId
 *
 * 2. OpenAPI content URL (从 manifest 返回的链接):
 *    - .../openapi/organizations/:orgSlug/documents/:docSlug/articles/:articleId/content.md
 */

export interface ParsedMdocUrl {
  orgSlug: string;
  docSlug: string;
  version?: string;
  articleId?: string;
}

/**
 * 判断字符串是否看起来像版本号（以字母开头，如 v1.0.0，或纯数字组成的版本）
 * 版本号特征：包含字母前缀或包含点号
 */
function looksLikeVersion(segment: string): boolean {
  return /^v\d/.test(segment) || /^\d+\.\d+/.test(segment);
}

/**
 * 判断字符串是否看起来像文章 ID（纯数字）
 */
function looksLikeArticleId(segment: string): boolean {
  return /^\d+$/.test(segment);
}

/**
 * 解析 mdoc URL，提取参数
 * @throws {Error} 如果 URL 格式无法识别
 */
export function parseMdocUrl(rawUrl: string): ParsedMdocUrl {
  // 补全协议头
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = 'https://' + rawUrl;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`无效的 URL 格式: ${rawUrl}`);
  }

  const pathname = url.pathname;
  // 去掉首尾斜杠，拆分路径段
  const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);

  // 尝试匹配 OpenAPI content URL:
  // /openapi/organizations/:orgSlug/documents/:docSlug/articles/:articleId/content.md
  const openapiMatch = pathname.match(
    /\/openapi\/organizations\/([^/]+)\/documents\/([^/]+)\/articles\/([^/]+)\/content\.md/
  );
  if (openapiMatch) {
    return {
      orgSlug: openapiMatch[1],
      docSlug: openapiMatch[2],
      articleId: openapiMatch[3],
    };
  }

  // 尝试匹配 OpenAPI manifest URL:
  // /openapi/organizations/:orgSlug/documents/:docSlug/manifest
  const manifestMatch = pathname.match(
    /\/openapi\/organizations\/([^/]+)\/documents\/([^/]+)\/manifest/
  );
  if (manifestMatch) {
    const version = url.searchParams.get('version') ?? undefined;
    return {
      orgSlug: manifestMatch[1],
      docSlug: manifestMatch[2],
      version,
    };
  }

  // 解析 mdoc.cc 风格的网址: /:orgSlug/:docSlug[/:version[/:articleId]]
  if (segments.length < 2) {
    throw new Error(
      `URL 路径段不足，期望格式: /:orgSlug/:docSlug[/:version[/:articleId]]，实际路径: ${pathname}`
    );
  }

  const [orgSlug, docSlug, seg3, seg4] = segments;
  let version: string | undefined;
  let articleId: string | undefined;

  if (seg3) {
    if (looksLikeArticleId(seg3) && !seg4) {
      // 只有纯数字且没有第四段：当做 articleId
      articleId = seg3;
    } else if (looksLikeVersion(seg3)) {
      version = seg3;
      if (seg4) {
        articleId = seg4;
      }
    } else {
      // 第三段既不像版本也不像 articleId，作为 version 兜底处理
      version = seg3;
      if (seg4) {
        articleId = seg4;
      }
    }
  }

  return { orgSlug, docSlug, version, articleId };
}
