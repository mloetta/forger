export default class List<T> extends Array<T> {
  public looping: boolean = false;
  #current: T;
  #pointer: number;

  constructor(...items: T[]) {
    super(...items);

    if (items.length === 0) {
      throw new Error('List must have at least one item');
    }

    this.#pointer = 0;
    this.#current = items[this.#pointer]!;
  }

  public get current() {
    return this.#current;
  }

  public get pointer() {
    return this.#pointer;
  }

  public loop(enable: boolean = true) {
    this.looping = enable;

    return this;
  }

  public goTo(index: number) {
    if (this.looping) {
      index = ((index % this.length) + this.length) % this.length;
    } else {
      index = Math.min(Math.max(index, 0), this.length - 1);
    }

    this.#current = this[index]!;
    this.#pointer = index;

    return this;
  }

  public next() {
    return this.goTo(this.#pointer + 1);
  }

  public back() {
    return this.goTo(this.#pointer - 1);
  }

  public hasNext() {
    return this.looping || this.#pointer < this.length - 1;
  }

  public hasPrevious() {
    return this.looping || this.#pointer > 0;
  }

  public getNext() {
    return this[this.#pointer + 1];
  }

  public getPrevious() {
    return this[this.#pointer - 1];
  }
}
