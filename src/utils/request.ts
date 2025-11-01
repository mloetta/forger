import http from 'http';
import https from 'https';

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum ResponseType {
  TEXT = 'TEXT',
  JSON = 'JSON',
  BUFFER = 'BUFFER',
}

export type Response = {
  [ResponseType.TEXT]: string;
  [ResponseType.JSON]: { [key: string]: any };
  [ResponseType.BUFFER]: Buffer;
};

export type Options<T extends ResponseType> = {
  data?: any;
  method?: RequestMethod;
  response?: T;
  params?: { [key: string]: any };
  headers?: { [key: string]: any };
  timeout?: number;
};

function buildQueryString(params: Record<string, any>): string {
  return new URLSearchParams(params).toString();
}

export function makeRequest<T extends ResponseType>(url: string, options: Options<T>): Promise<Response[T]> {
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
                    resolve(text ? (JSON.parse(text) as Response[T]) : ({} as Response[T]));

                    break;
                  }
                  case ResponseType.BUFFER: {
                    resolve(buffer as Response[T]);

                    break;
                  }
                  default: {
                    resolve(buffer.toString('utf-8') as Response[T]);
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

      if (options.data && options.method !== RequestMethod.GET) {
        req.write(JSON.stringify(options.data));
      }

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}
