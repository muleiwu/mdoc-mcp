import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { IncomingMessage } from 'http';

export interface MdocClientConfig {
  accessToken: string;
  baseUrl: string;
}

export interface RequestOptions {
  path: string;
  query?: Record<string, string>;
}

function readBody(res: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    res.on('error', reject);
  });
}

export class MdocClient {
  private config: MdocClientConfig;

  constructor(config: MdocClientConfig) {
    this.config = config;
  }

  async get(options: RequestOptions): Promise<string> {
    const url = new URL(this.config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const host = url.hostname;
    const port = url.port
      ? parseInt(url.port)
      : isHttps ? 443 : 80;

    let queryString = '';
    if (options.query && Object.keys(options.query).length > 0) {
      const filtered = Object.entries(options.query).filter(([, v]) => v !== undefined && v !== '');
      queryString = filtered
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .sort()
        .join('&');
    }

    const fullPath = queryString ? `${options.path}?${queryString}` : options.path;

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: host,
        port,
        path: fullPath,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        } as Record<string, string>,
      };

      const req = (isHttps ? httpsRequest : httpRequest)(reqOptions, async (res) => {
        const body = await readBody(res);
        const statusCode = res.statusCode ?? 0;

        if (statusCode >= 400) {
          reject(new Error(`HTTP ${statusCode}: ${body}`));
          return;
        }

        resolve(body);
      });

      req.on('error', reject);
      req.end();
    });
  }
}

/**
 * 从环境变量创建客户端实例
 */
export function createClientFromEnv(): MdocClient {
  const accessToken = process.env.MDOC_ACCESS_TOKEN;
  const baseUrl = process.env.MDOC_API_BASE_URL ?? 'https://mdoc.cc';

  if (!accessToken) {
    throw new Error('缺少环境变量 MDOC_ACCESS_TOKEN');
  }

  return new MdocClient({ accessToken, baseUrl });
}
