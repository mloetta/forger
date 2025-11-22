import { EventEmitter } from 'events';

export interface CollectorOptions<T> {
  filter?: (item: T) => boolean | Promise<boolean>;
  duration?: number;
  max?: number;
}

export class Collector<T> extends EventEmitter {
  #filter?: (item: T) => boolean | Promise<boolean>;
  #collected: T[] = [];
  #timeout?: NodeJS.Timeout;
  #stopped = false;
  #max?: number;

  constructor(options: CollectorOptions<T> = {}) {
    super();
    this.#filter = options.filter;
    this.#max = options.max;

    if (options.duration) {
      this.#timeout = setTimeout(() => this.stop('time'), options.duration);
    }
  }

  public onCollect(callback: (item: T) => unknown): this {
    this.on('collect', callback);

    return this;
  }

  public onEnd(callback: (collected: T[], reason: string) => unknown): this {
    this.on('end', callback);

    return this;
  }

  public async collect(item: T): Promise<void> {
    try {
      const pass = this.#filter ? await this.#filter(item) : true;
      if (!pass) return;

      this.#collected.push(item);
      this.emit('collect', item);

      if (this.#max && this.#collected.length >= this.#max) {
        this.stop('max');
      }
    } catch (e) {
      this.emit('error', e);
    }
  }

  public stop(reason: string = 'manual'): void {
    if (this.#stopped) return;
    this.#stopped = true;

    if (this.#timeout) clearTimeout(this.#timeout);
    this.emit('end', this.#collected, reason);
    this.removeAllListeners();
  }

  public setFilter(filter: (item: T) => boolean | Promise<boolean>): void {
    this.#filter = filter;
  }
}
