import { createHmac, createHash } from 'crypto';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { IncomingMessage } from 'http';

export interface MdocClientConfig {
  accessKeyId: string;
  secretAccessKey: string;
  baseUrl: string;
}

export interface RequestOptions {
  path: string;
  query?: Record<string, string>;
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * 构建 AWS Signature V4 Authorization 头
 *
 * 注意：Go 的 net/http 服务器会将 Host 头从 req.Header 移到 req.Host，
 * 导致 gohttpsig 的 CanonicalizeHeaders 无法找到 host 的值。
 * 因此这里签名时不包含 host 头，只签 x-amz-date。
 */
function buildAuthHeader(
  accessKeyId: string,
  secretAccessKey: string,
  method: string,
  path: string,
  query: string,
  dateTime: string,
  service: string,
  region: string
): string {
  const dateShort = dateTime.slice(0, 8);

  // 只签 x-amz-date（不含 host，因为服务端 Go HTTP 会将 Host 头移出 req.Header）
  const signedHeaders = 'x-amz-date';
  const canonicalHeaders = `x-amz-date:${dateTime}\n`;
  const payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA256("")

  const canonicalRequest = [
    method,
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateShort}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateTime,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = hmac(
    hmac(
      hmac(
        hmac(`AWS4${secretAccessKey}`, dateShort),
        region
      ),
      service
    ),
    'aws4_request'
  );

  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
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
  private readonly service = 'mdoc';
  private readonly region = 'us-east-1';

  constructor(config: MdocClientConfig) {
    this.config = config;
  }

  /**
   * 发起带 AWS Signature V4 签名的 GET 请求
   */
  async get(options: RequestOptions): Promise<string> {
    const url = new URL(this.config.baseUrl);
    const isHttps = url.protocol === 'https:';
    const host = url.hostname;
    const port = url.port
      ? parseInt(url.port)
      : isHttps ? 443 : 80;

    // 构建查询字符串（按 key 排序，符合 AWS 规范）
    let queryString = '';
    if (options.query && Object.keys(options.query).length > 0) {
      const filtered = Object.entries(options.query).filter(([, v]) => v !== undefined && v !== '');
      queryString = filtered
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .sort()
        .join('&');
    }

    const fullPath = queryString ? `${options.path}?${queryString}` : options.path;

    // 生成时间戳（ISO8601 格式，去除特殊字符）
    const dateTime = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    // 构建 Authorization 头
    const authHeader = buildAuthHeader(
      this.config.accessKeyId,
      this.config.secretAccessKey,
      'GET',
      options.path,
      queryString,
      dateTime,
      this.service,
      this.region
    );

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: host,
        port,
        path: fullPath,
        method: 'GET',
        headers: {
          'X-Amz-Date': dateTime,
          'Authorization': authHeader,
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
  const accessKeyId = process.env.MDOC_ACCESS_KEY_ID;
  const secretAccessKey = process.env.MDOC_SECRET_ACCESS_KEY;
  const baseUrl = process.env.MDOC_API_BASE_URL ?? 'https://mdoc.cc';

  if (!accessKeyId) {
    throw new Error('缺少环境变量 MDOC_ACCESS_KEY_ID');
  }
  if (!secretAccessKey) {
    throw new Error('缺少环境变量 MDOC_SECRET_ACCESS_KEY');
  }

  return new MdocClient({ accessKeyId, secretAccessKey, baseUrl });
}
