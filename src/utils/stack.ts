export interface Stack {
  reject(res?: unknown): any;
  resolve(val: unknown): any;
  callback: () => any;
}

export default class CallStack {
  public stack = [] as Stack[];

  public add<T = undefined>(callback: any) {
    return new Promise<T>((resolve, reject) => {
      this.stack.push({ reject, resolve, callback });

      if (this.stack.length == 1) {
        this.execute();
      }
    });
  }

  public async execute() {
    const data = this.stack[0];

    if (!data) {
      return null;
    }

    try {
      const output = data.callback();

      if (!(output instanceof Promise)) data.resolve(output);
      else await output.then((output: any) => data.resolve(output)).catch((output: any) => data.reject(output));
    } catch (error) {
      data.reject(error);
    }

    this.stack.shift();

    this.execute();
  }
}
