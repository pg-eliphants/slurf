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

export class Journal {
    constructor(
        private readonly history: Map<Number, JournalEntryInternal[]>,
        private readonly reducer: JournalReducer
    ) {}
    add(socketId: Number, code: number, ...args: unknown[]) {
        const extended = Object.fromEntries(args.map((v, i) => [`arg${i}`, v]));
        const histInternal = this.history.get(socketId) || [];
        this.history.set(socketId, histInternal);
        this.reducer.reduce(histInternal, { code, origin, ...extended });
    }
    remove(socketId: Number) {}
}

export function JournalFactory(reducer: JournalReducer) {
    const history: Map<Number, JournalEntryInternal[]> = new Map();
    return function (origin: Object) {
        return new Journal(history, reducer);
    };
}
