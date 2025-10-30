import { EventEmitter } from 'events';

export interface CollectorOptions<Type> {
  filter?: (item: Type) => boolean | Promise<boolean>;
  duration?: number;
  max?: number; // número máximo de itens a coletar
}

export class Collector<Type> extends EventEmitter {
  #filter?: (item: Type) => boolean | Promise<boolean>;
  #collected: Type[] = [];
  #timeout?: NodeJS.Timeout;
  #stopped = false;
  #max?: number;

  constructor(options: CollectorOptions<Type> = {}) {
    super();
    this.#filter = options.filter;
    this.#max = options.max;
    if (options.duration) {
      this.#timeout = setTimeout(() => this.stop('time'), options.duration);
    }
  }

  public onCollect(callback: (item: Type) => unknown): this {
    this.on('collect', callback);
    return this;
  }

  public onEnd(callback: (collected: Type[], reason: string) => unknown): this {
    this.on('end', callback);
    return this;
  }

  public async collect(item: Type): Promise<void> {
    try {
      const pass = this.#filter ? await this.#filter(item) : true;
      if (!pass) return;

      this.#collected.push(item);
      this.emit('collect', item);

      // verifica se atingiu o limite
      if (this.#max && this.#collected.length >= this.#max) {
        this.stop('max');
      }
    } catch (err) {
      this.emit('error', err);
    }
  }

  public stop(reason: string = 'manual'): void {
    if (this.#stopped) return;
    this.#stopped = true;

    if (this.#timeout) clearTimeout(this.#timeout);
    this.emit('end', this.#collected, reason);
    this.removeAllListeners();
  }

  public setFilter(filter: (item: Type) => boolean | Promise<boolean>): void {
    this.#filter = filter;
  }
}
