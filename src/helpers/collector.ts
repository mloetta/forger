import { EventEmitter } from 'events';

export interface CollectorOptions<Type> {
  filter?: (item: Type) => boolean | Promise<boolean>;
  duration?: number;
}

export class Collector<Type> extends EventEmitter {
  private filter?: (item: Type) => boolean | Promise<boolean>;
  private collected: Type[] = [];
  private timeout?: NodeJS.Timeout;

  constructor(options: CollectorOptions<Type> = {}) {
    super();
    this.filter = options.filter;
    if (options.duration) this.timeout = setTimeout(() => this.stop('time'), options.duration);
  }

  onCollect(callback: (item: Type) => unknown): void {
    this.on('collect', callback);
  }

  onEnd(callback: (collected: Type[], reason: string) => unknown): void {
    this.on('end', callback);
  }

  async collect(item: Type): Promise<void> {
    try {
      const pass = this.filter ? await this.filter(item) : true;
      if (!pass) return;
      this.collected.push(item);
      this.emit('collect', item);
    } catch (err) {
      this.emit('error', err);
    }
  }

  stop(reason: string = 'manual'): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.emit('end', this.collected, reason);
    this.removeAllListeners();
  }

  setFilter(filter: (item: Type) => boolean | Promise<boolean>): void {
    this.filter = filter;
  }
}
