import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import CallStack from 'libs/stack';

export const readableFileSizeUnits = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

export function readableFileSize(bytes: number, micro: boolean = false, precision = 1): string {
  const thresh = micro ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`;
  }

  let unit = -1;
  const round = 10 ** precision;

  do {
    bytes /= thresh;
    ++unit;
  } while (Math.round(Math.abs(bytes) * round) / round >= thresh && unit < readableFileSizeUnits.length - 1);

  return `${bytes.toFixed(precision)} ${readableFileSizeUnits[unit]}`;
}

export function msToReadableTime(duration: number | string): string {
  let totalMs = Number(duration);
  if (isNaN(totalMs) || totalMs < 0) throw new Error(`Invalid duration: ${duration}`);

  const units = [
    { label: 'w', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: 'd', ms: 24 * 60 * 60 * 1000 },
    { label: 'h', ms: 60 * 60 * 1000 },
    { label: 'm', ms: 60 * 1000 },
    { label: 's', ms: 1000 },
  ];

  const parts: string[] = [];

  for (const unit of units) {
    const value = Math.floor(totalMs / unit.ms);
    if (value > 0) {
      parts.push(`${value}${unit.label}`);
      totalMs -= value * unit.ms;
    }
  }

  if (parts.length === 0) return '0s';

  return parts.join(' ');
}

export function readableTimeToMs(input: string): number {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error(`Invalid format: ${input}`);
  }

  const regex = /(\d+(?:\.\d+)?)([smhdw])/gi;
  let totalMs = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    if (!match[1] || !match[2]) throw new Error(`Invalid format: ${input}`);

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's':
        totalMs += value * 1000;
        break;
      case 'm':
        totalMs += value * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'w':
        totalMs += value * 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        throw new Error(`Invalid unit: ${unit}`);
    }
  }

  if (totalMs === 0) throw new Error(`Invalid format: ${input}`);
  return totalMs;
}

export function timestamp() {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function commas(num: number | string) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function debounce(fn: any, delay: number) {
  let timeout: any;

  return function (...args: any) {
    clearTimeout(timeout);
    timeout = setTimeout(fn.bind(null, ...args), delay);
  };
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c;
}

export function CRC32(string: string): string {
  let crc = -1;
  for (let i = 0; i < string.length; i++) {
    crc = table[(crc ^ string.charCodeAt(i)) & 0xff]! ^ (crc >>> 8);
  }

  const hash = -(crc + 1) >>> 0;

  return hash.toString(16).padStart(8, '0');
}

export function closestMatch(input: string, strings: readonly string[]): string | null {
  if (typeof input !== 'string') throw new TypeError('Input must be a string.');
  if (!Array.isArray(strings)) throw new TypeError('Strings must be an array.');
  for (const s of strings) {
    if (typeof s !== 'string') throw new TypeError('Strings must only contain strings.');
  }

  if (strings.length === 0) return null;
  if (strings.length === 1) {
    const [only] = strings;
    return only ?? null;
  }

  let minDistance = Number.MAX_VALUE;
  let best: string | null = null;

  for (const candidate of strings) {
    const distance = levenshteinDistance(input, candidate);
    if (distance < minDistance) {
      minDistance = distance;
      best = candidate;
    }
  }

  return best;
}

export function levenshteinDistance(a: string, b: string): number {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new TypeError('Levenshtein Distance expects two strings.');
  }

  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;

  let prev: Uint32Array = new Uint32Array(m + 1);
  let curr: Uint32Array = new Uint32Array(m + 1);

  for (let j = 0; j <= m; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);

    for (let j = 1; j <= m; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;

      const del = (prev[j] as number) + 1;
      const ins = (curr[j - 1] as number) + 1;
      const sub = (prev[j - 1] as number) + cost;

      curr[j] = Math.min(del, ins, sub);
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[m] as number;
}

export async function readDirectory(dir: string): Promise<any[]> {
  if (!path.isAbsolute(dir)) {
    throw new Error('The provided path must be absolute.');
  }

  const results = fs.readdirSync(path.resolve(dir), {
    recursive: true,
    encoding: 'utf-8',
  });
  const stack = new CallStack();
  const modules: any[] = [];

  for (const file of results) {
    const filepath = path.resolve(dir, file);
    if (fs.statSync(filepath).isDirectory()) continue;

    const module = await stack.add(async () => import(pathToFileURL(filepath).href));
    modules.push(module);
  }

  return modules;
}

export default function or<Value1 = any, Value2 = any>(ifExists: Value1, ifNot: Value2): NonNullable<Value1> | Value2 {
  return ifExists !== null && ifExists !== undefined ? (ifExists as NonNullable<Value1>) : ifNot;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>;
}

export function decimalToFraction(value: number, maxDenominator = 1000000): string {
  let numerator = 1;
  let denominator = 1;
  let bestError = Math.abs(value - numerator / denominator);

  for (let d = 1; d <= maxDenominator; d++) {
    const n = Math.round(value * d);
    const error = Math.abs(value - n / d);
    if (error < bestError) {
      numerator = n;
      denominator = d;
      bestError = error;
      if (error === 0) break;
    }
  }

  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const divisor = gcd(numerator, denominator);

  const formattedNumerator = (numerator / divisor).toLocaleString('en-US');
  const formattedDenominator = (denominator / divisor).toLocaleString('en-US');

  return `${formattedNumerator}/${formattedDenominator}`;
}
