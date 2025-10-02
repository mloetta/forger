import fs from 'fs';

export default new (class Env {
  private cache = new Map<string, string>();

  public has(key: string) {
    return this.cache.has(key);
  }

  public get(key: string, required = false) {
    if (required && !this.has(key)) {
      throw new Error(`Env error: '${key}' is required`);
    }

    return this.cache.get(key)!;
  }

  constructor() {
    if (fs.existsSync(`${process.cwd()}/.env`)) {
      fs.readFileSync(`${process.cwd()}/.env`, `utf-8`).replace(/^(.+?)=(.+?)$/gm, (_, key, name) => {
        this.cache.set(key, name);

        return '';
      });
    }
  }
})();
