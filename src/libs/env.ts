import fs from 'fs';
import path from 'path';

export default new (class Env {
  #cache = new Map<string, string>();

  constructor() {
    const envPath = path.resolve(process.cwd(), '.env');

    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf-8').replace(/^(.+?)=(.+?)$/gm, (_, key, name) => {
        this.#cache.set(key, name);

        return '';
      });
    }
  }

  public has(key: string) {
    return this.#cache.has(key);
  }

  public get(key: string, required: boolean = false) {
    if (required && !this.has(key)) {
      throw new Error(`Env error: '${key}' is required`);
    }

    return this.#cache.get(key)!;
  }
})();
