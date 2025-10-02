export default class List<T> extends Array<T> {
  #current;
  #pointer;

  public get current() {
    return this.#current;
  }

  public get pointer() {
    return this.#pointer;
  }

  public goTo(index: number) {
    index = Math.min(Math.max(index, 0), this.length);

    this.#current = this[index];
    this.#pointer = index;

    return this;
  }

  public next() {
    let prev = this.#current;

    this.#pointer++;
    this.#current = this[this.#pointer];

    return prev!;
  }

  public back() {
    let prev = this.#current;

    this.#pointer--;
    this.#current = this[this.#pointer];

    return prev!;
  }

  public hasNext() {
    return this.#pointer < this.length;
  }

  public hasPrevious() {
    return this.#pointer > 0;
  }

  public getNext() {
    return this[this.#pointer + 1]!;
  }

  public getPrevious() {
    return this[this.#pointer - 1]!;
  }

  constructor(...items: T[]) {
    super(...items);

    this.#pointer = 0;
    this.#current = items[this.#pointer];
  }
}
