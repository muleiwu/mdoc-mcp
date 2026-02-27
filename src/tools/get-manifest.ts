import { MdocClient } from '../client.js';
import { parseMdocUrl } from '../url-parser.js';

export interface GetManifestInput {
  url?: string;
  orgSlug?: string;
  docSlug?: string;
  version?: string;
}

/**
 * 获取文档目录清单（Markdown 格式）
 * 对应 API: GET /openapi/organizations/:orgSlug/documents/:docSlug/manifest
 */
export async function getManifest(
  client: MdocClient,
  input: GetManifestInput
): Promise<string> {
  let orgSlug: string;
  let docSlug: string;
  let version: string | undefined = input.version;

  if (input.url) {
    const parsed = parseMdocUrl(input.url);
    orgSlug = parsed.orgSlug;
    docSlug = parsed.docSlug;
    // URL 中解析到的版本优先级低于显式传入的 version 参数
    if (!version && parsed.version) {
      version = parsed.version;
    }
  } else if (input.orgSlug && input.docSlug) {
    orgSlug = input.orgSlug;
    docSlug = input.docSlug;
  } else {
    throw new Error('请提供 url 参数，或同时提供 orgSlug 和 docSlug 参数');
  }

  const path = `/openapi/organizations/${encodeURIComponent(orgSlug)}/documents/${encodeURIComponent(docSlug)}/manifest`;
  const query: Record<string, string> = {};
  if (version) {
    query['version'] = version;
  }

  return client.get({ path, query });
}
