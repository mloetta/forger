export type EventListenerFn<T extends any[], K extends any = any> = (...args: T) => K;

export default class EventListener<T extends Record<string, any>> {
  #cache = {} as { [K in keyof T]: EventListenerFn<T[K]>[] };

  public getListeners<K extends keyof T>(name: K) {
    return this.#cache[name] ?? null;
  }

  public removeListeners<K extends keyof T>(name: K) {
    let listeners = this.getListeners(name);

    if (listeners != null) {
      delete this.#cache[name];
    }

    return this;
  }

  public removeAllListeners() {
    Object.keys(this.#cache).forEach((key) => this.removeListeners(key));

    return this;
  }

  public on<K extends keyof T>(name: K, callback: EventListenerFn<T[K]>) {
    if (this.#cache[name] == undefined) {
      this.#cache[name] = [];
    }

    this.#cache[name].push(callback);

    return () => this.off(name, callback);
  }

  public once<K extends keyof T>(name: K, callback: EventListenerFn<T[K]>) {
    let dispose = this.on(name, () => {
      callback(...(arguments as any));
      dispose();
    });

    return dispose;
  }

  public off<K extends keyof T>(name: K, callback: EventListenerFn<T[K]>) {
    if (this.#cache[name] == undefined) {
      return -1;
    }

    let index = this.#cache[name].indexOf(callback);

    if (index >= 0) {
      this.#cache[name].splice(index, 1);
    }

    return index;
  }

  public emit<K extends keyof T>(name: K, ...args: T[K]) {
    if (this.#cache[name] == undefined) {
      return;
    }

    this.#cache[name].forEach((listener) => listener(...(args as any)));
  }
}
