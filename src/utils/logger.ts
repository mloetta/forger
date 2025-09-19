import { formatAnsi, type ColorsType } from './ansi';
import { inspect } from 'util';
import { timestamp } from './utils';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs'
import { Env } from './env';

export type LogLevel = 'Info' | 'Error' | 'Debug'

export interface LoggerOptions {
  level?: LogLevel;
  file?: string;
}

export class Logger {
  private level: LogLevel
  private file?: string;
  private enabled: boolean;

  constructor(options: LoggerOptions) {
    this.level = options.level ?? 'Info'
    const envLevel = Env.get('LogLevel', 'Info').toString();
    
    this.enabled = envLevel === this.level

    if (options.file) {
      this.file = path.resolve(options.file);
    }
  }

  public Write(color: ColorsType = 'reset', ...message: any): string | undefined {
    if (!this.enabled) return;

    const id = randomBytes(4).toString('hex');

    const time = timestamp();
    const formatted =
      typeof message === "string"
        ? message
        : Array.isArray(message)
          ? message.join(' ')
          : inspect(message, {
              depth: 3,
              colors: false,
              breakLength: Infinity,
            });


    const output = `${color ? formatAnsi(`[${time}]`, color) : `[${time}]`} ${formatted}`;

    process.stdout.write(output + '\n');
    if (this.file) {
      fs.appendFileSync(this.file, output + '\n', { encoding: 'utf-8' })
    }

    return id;
  }
}