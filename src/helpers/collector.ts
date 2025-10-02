import { EventEmitter } from 'events';

export interface CollectorOptions<Type> {
  filter?: (item: Type) => boolean;
  duration?: number;
}

export class Collector<Type> extends EventEmitter {
  private filter?: (item: Type) => boolean;
  private collected: Type[] = [];
  private timeout?: NodeJS.Timeout;
  private endReason?: string;

  constructor(options: CollectorOptions<Type> = {}) {
    super();
    this.filter = options.filter;

    if (options.duration) {
      this.timeout = setTimeout(() => this.stop('time'), options.duration);
    }
  }

  onCollect(callback: (item: Type) => unknown): void {
    this.on('collect', callback);
  }

  onEnd(callback: (collected: Type[], reason: string) => unknown): void {
    this.on('end', () => callback(this.collected, this.endReason!));
  }

  collect(item: Type): void {
    if (!this.filter || this.filter(item)) {
      this.collected.push(item);
      this.emit('collect', item);
    }
  }

  stop(reason: string = 'manual'): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.endReason = reason;
    this.emit('end');
    this.removeAllListeners();
  }

  setFilter(filter: (item: Type) => boolean): void {
    this.filter = filter;
  }
}
