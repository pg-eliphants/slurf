export default interface Enqueue<T> {
    enqueue(data: T): void;
}
