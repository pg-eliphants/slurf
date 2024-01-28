import SocketIOManager from '../io/SocketIOManager';
import { SocketAttributes } from '../io/types';

export type JournalEntry = {
    code: number;
    origin: Object;
    [index: string]: unknown;
};

export type JournalEntryInternal = JournalEntry & {
    ts: number;
};

export class JournalReducer {
    constructor(private readonly now: () => number) {
        this.now = this.now.bind(this);
    }
    reduce(history: JournalEntryInternal[], newEntry: JournalEntry): void {
        const e: JournalEntryInternal = { ts: this.now(), ...newEntry };
        history.unshift(e);
        history.splice(100);
    }
}

export class Journal<T extends Object> {
    constructor(
        private readonly history: Map<Number, JournalEntryInternal[]>,
        private readonly reducer: JournalReducer,
        private readonly origin: T
    ) {}
    add(socketId: Number, code: number, ...args: unknown[]) {
        const extended = Object.fromEntries(args.map((v, i) => [`arg${i}`, v]));
        const histInternal = this.history.get(socketId) || [];
        this.history.set(socketId, histInternal);
        const pl: JournalEntry = { code, origin: this.origin, ...extended };
        this.reducer.reduce(histInternal, pl);
        console.log({ code, ...extended });
    }
    remove(socketId: Number) {}
    consolidate(socketId: Number): unknown {
        return null;
    }
}

export function JournalFactory(reducer: JournalReducer) {
    const history: Map<Number, JournalEntryInternal[]> = new Map();
    return function <T extends Object>(origin: T) {
        return new Journal<T>(history, reducer, origin);
    };
}
