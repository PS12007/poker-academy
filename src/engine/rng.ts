/**
 * Seedable PRNG: xoshiro128** seeded through splitmix32.
 * Every simulation in the app takes a seed and reports it, so any result can be reproduced.
 */
export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    let s = this.seed;
    const next = () => {
      s = (s + 0x9e3779b9) | 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
      return (z ^ (z >>> 16)) >>> 0;
    };
    this.a = next();
    this.b = next();
    this.c = next();
    this.d = next();
    if ((this.a | this.b | this.c | this.d) === 0) this.a = 1;
  }

  /** Uniform 32-bit unsigned integer. */
  u32(): number {
    const r = Math.imul(rotl(Math.imul(this.b, 5), 7), 9) >>> 0;
    const t = this.b << 9;
    this.c ^= this.a;
    this.d ^= this.b;
    this.b ^= this.c;
    this.a ^= this.d;
    this.c ^= t;
    this.d = rotl(this.d, 11);
    return r;
  }

  /** Uniform float in [0, 1). */
  float(): number {
    return this.u32() / 4294967296;
  }

  /** Uniform integer in [0, n). Uses rejection so there is no modulo bias. */
  int(n: number): number {
    const limit = 4294967296 - (4294967296 % n);
    let x = this.u32();
    while (x >= limit) x = this.u32();
    return x % n;
  }

  /** Standard normal via Box-Muller. */
  normal(): number {
    let u = this.float();
    while (u === 0) u = this.float();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.float());
  }

  /** In-place Fisher-Yates shuffle. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** A fresh seed for interactive runs. The value is displayed so the run can be repeated. */
export function randomSeed(): number {
  return (Math.random() * 4294967296) >>> 0;
}
