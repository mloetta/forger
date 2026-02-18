import http from 'http';
import https from 'https';
import { buildQueryString } from './utils';
import { RequestMethod, ResponseType, type RequestOptions, type RequestResponse } from 'types/types';

export function makeRequest<T extends ResponseType>(
  url: string,
  options: RequestOptions<T>,
): Promise<RequestResponse[T]> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      if (options.params) {
        urlObj.search = buildQueryString(options.params);
      }

      const req = protocol.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (protocol === https ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: options.method || RequestMethod.GET,
          headers: { 'Content-Type': 'application/json', ...options.headers },
          timeout: options.timeout || 10000,
        },
        (res) => {
          let buffer = Buffer.alloc(0);

          res.on('data', (chunk) => (buffer = Buffer.concat([buffer, chunk])));

          res.on('end', () => {
            const status = res.statusCode ?? 0;
            if (status >= 200 && status < 300) {
              try {
                switch (options.response) {
                  case ResponseType.JSON: {
                    const text = buffer.toString('utf-8').trim();
                    resolve(text ? (JSON.parse(text) as RequestResponse[T]) : ({} as RequestResponse[T]));
                    break;
                  }
                  case ResponseType.BUFFER: {
                    resolve(buffer as RequestResponse[T]);
                    break;
                  }
                  default: {
                    resolve(buffer.toString('utf-8') as RequestResponse[T]);
                  }
                }
              } catch (e) {
                reject(new Error(`Failed to parse response: ${(e as Error).message}`));
              }
            } else {
              reject(new Error(`Request failed (${status}): ${buffer.toString('utf-8')}`));
            }
          });
        },
      );

      req.on('error', (err) => reject(new Error(`Request error: ${err.message}`)));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      if (options.body && options.method !== RequestMethod.GET) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}
