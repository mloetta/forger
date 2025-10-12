import type { RateLimitManagerType } from 'types/types';

export class RateLimitManager {
  public rateLimits: RateLimitManagerType;
  public id: bigint;
  private duration: number = 0;
  private limit: number = 0;
  private uses: number[] = [];

  constructor(rateLimits: RateLimitManagerType, id: bigint) {
    this.rateLimits = rateLimits;
    this.id = id;

    if (!this.rateLimits.has(this.id)) {
      this.rateLimits.set(this.id, this);
    }
  }

  public apply(duration: number, limit: number): void {
    this.duration = duration;
    this.limit = limit;
    this.uses.push(Date.now());
  }

  public check(): { limited: boolean; duration: number; limit: number } {
    if (!this.uses.length) return { limited: false, duration: 0, limit: this.limit };

    const now = Date.now();
    this.uses = this.uses.filter((t) => now - t < this.duration);

    const limited = this.uses.length >= this.limit;
    const retryAfter = limited ? this.duration - (now - this.uses[0]) : 0;

    return { limited, duration: retryAfter, limit: this.limit };
  }

  public remove(): void {
    this.uses.shift();
  }
}
