export default class Jitter {
    constructor(
        private readonly random = Math.random,
        private readonly min: number = 0,
        private readonly max = 1
    ) {}
    public getRandom(): number {
        return this.min + 1e3 * this.random() * (this.max - this.min);
    }
}

export type { Jitter };
