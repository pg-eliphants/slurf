export default class Jitter {
    constructor(
        private readonly random = Math.random,
        private readonly min: number = 0, // seconds
        private readonly max = 1 // seconds
    ) {}
    public getRandom(): number {
        return this.min + this.random() * (this.max - this.min);
    }
    public getRandomDelayInMs() {
        return this.getRandom() * 1000;
    }
}

export type { Jitter };
